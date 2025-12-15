using AuthService.Common;
using AuthService.DataAcces.Models;
using AuthService.DataAcces.Repositories.Interfaces;
using AuthService.Models;
using AuthService.Models.Enums;
using AuthService.Models.Events;
using AuthService.Models.Interfaces;
using AuthService.Services.Exceptions;
using AuthService.Services.Interfaces;
using Microsoft.Extensions.Configuration;
using System.Text;

namespace AuthService.Tests;

public class AuthServiceTests
{
    private const string PEPPER = "6h5nDgI5vV4kYbL0lmB6eJTTdD0w2w5d2NZJwX4xYYkB0QF7C1mV2xM7yQtJbRkS";

    static AuthServiceTests()
    {
        Environment.SetEnvironmentVariable("AUTH_PEPPER", PEPPER);
    }

    // Успешная регистрация пользователя
    [Theory, AutoMoqWithPepper]
    public async Task Register_ValidModel_Success(
        [Frozen] Mock<IUserRepository> userRepositoryMock,
        [Frozen] Mock<ICodeRepository> codeRepositoryMock,
        [Frozen] Mock<IKafkaProducer> kafkaProducerMock,
        [Frozen] Mock<IConfiguration> configMock,
        RegisterModel registerModel,
        Services.AuthService authService)
    {
        // Arrange
        registerModel.ConfirmPassword = registerModel.Password;

        var dbUser = new DbUser
        {
            Id = 999,
            Username = registerModel.Username,
            Email = registerModel.Email,
            PasswordHash = "hashed",
            IsEmailConfirmed = false,
            Role = (int)Role.User,
            RefreshToken = string.Empty,
            RefreshTokenExpiredAfter = DateTime.UtcNow
        };

        userRepositoryMock.Setup(x => x.IsUserExistsByUsername(registerModel.Username)).ReturnsAsync(false);
        userRepositoryMock.Setup(x => x.IsUserExistsByEmail(registerModel.Email)).ReturnsAsync(false);
        userRepositoryMock.Setup(x => x.GetUserByLogin(registerModel.Username)).ReturnsAsync((DbUser)null);
        userRepositoryMock.Setup(x => x.CreateUser(It.IsAny<DbUser>())).ReturnsAsync(dbUser.Id);

        codeRepositoryMock.Setup(x => x.SaveAsync(It.IsAny<ConfirmationCode>())).Returns(Task.CompletedTask);

        const string topic = "email-code-topic";
        configMock.Setup(x => x["Kafka:Topics:SendEmailCode"]).Returns(topic);
        kafkaProducerMock.Setup(x => x.ProduceAsync(topic, It.IsAny<SendEmailCodeEvent>())).Returns(Task.CompletedTask);

        // Act
        var userId = await authService.Register(registerModel);

        // Assert
        Assert.Equal(dbUser.Id, userId);

        userRepositoryMock.Verify(x => x.CreateUser(It.Is<DbUser>(u =>
            u.Username == registerModel.Username &&
            u.Email == registerModel.Email &&
            u.IsEmailConfirmed == false &&
            u.Role == (int)Role.User)), Times.Once);

        codeRepositoryMock.Verify(x => x.SaveAsync(It.Is<ConfirmationCode>(c =>
            c.Email == registerModel.Email &&
            c.Code.Length == 4 &&
            c.ExpiresAt > DateTime.UtcNow)), Times.Once);

        kafkaProducerMock.Verify(x => x.ProduceAsync(topic, It.Is<SendEmailCodeEvent>(e =>
            e.Email == registerModel.Email)), Times.Once);
    }

    // Ошибка при неверном пароле
    [Theory, AutoMoqWithPepper]
    public async Task Register_PasswordsDoNotMatch_ThrowsInvalidInputException(RegisterModel registerModel,Services.AuthService authService)
    {
        registerModel.ConfirmPassword = registerModel.Password + "x";
        await Assert.ThrowsAsync<InvalidInputException>(() => authService.Register(registerModel));
    }

    // Ошибка при пустых полях
    [Theory, AutoMoqWithPepper]
    public async Task Register_EmptyFields_ThrowsInvalidInputException(Services.AuthService authService)
    {
        await Assert.ThrowsAsync<InvalidInputException>(() => authService.Register(new RegisterModel()));
    }

    // Ошибка при занятом имени
    [Theory, AutoMoqWithPepper]
    public async Task Register_UsernameAlreadyTaken_ThrowsUsernameAlreadyTakenException(
        [Frozen] Mock<IUserRepository> userRepositoryMock,
        RegisterModel registerModel,
        Services.AuthService authService)
    {
        registerModel.ConfirmPassword = registerModel.Password;
        userRepositoryMock.Setup(x => x.IsUserExistsByUsername(registerModel.Username)).ReturnsAsync(true);
        userRepositoryMock.Setup(x => x.IsUserExistsByEmail(registerModel.Email)).ReturnsAsync(false);
        userRepositoryMock.Setup(x => x.GetUserByLogin(registerModel.Username))
            .ReturnsAsync(new DbUser { IsEmailConfirmed = true });

        await Assert.ThrowsAsync<UsernameAlreadyTakenException>(() => authService.Register(registerModel));
    }

    // Ошибка при занятом Email
    [Theory, AutoMoqWithPepper]
    public async Task Register_EmailAlreadyTaken_ThrowsEmailAlreadyTakenException(
        [Frozen] Mock<IUserRepository> userRepositoryMock,
        RegisterModel registerModel,
        Services.AuthService authService)
    {
        registerModel.ConfirmPassword = registerModel.Password;
        userRepositoryMock.Setup(x => x.IsUserExistsByUsername(registerModel.Username)).ReturnsAsync(false);
        userRepositoryMock.Setup(x => x.IsUserExistsByEmail(registerModel.Email)).ReturnsAsync(true);
        userRepositoryMock.Setup(x => x.GetUserByLogin(registerModel.Username))
            .ReturnsAsync(new DbUser { IsEmailConfirmed = true });

        await Assert.ThrowsAsync<EmailAlreadyTakenException>(() => authService.Register(registerModel));
    }

    // Успешный вход при правильных кредах и подтвержденном Email
    [Theory, AutoMoqWithPepper]
    public async Task Login_ValidCredentials_Success(
        [Frozen] Mock<IUserRepository> userRepositoryMock,
        [Frozen] Mock<ITokenService> tokenServiceMock,
        [Frozen] Mock<IAuthSettings> authSettingsMock,
        LoginModel loginModel,
        Services.AuthService authService)
    {
        // Arrange
        var password = "SecurePass123!";
        loginModel.Password = password;

        var passwordHash = HashHelper.HashPassword(password, Encoding.UTF8.GetBytes(PEPPER));
        var user = new DbUser
        {
            Id = 777,
            Username = loginModel.Login,
            Email = "user@example.com",
            PasswordHash = passwordHash,
            IsEmailConfirmed = true,
            Role = (int)Role.User
        };

        userRepositoryMock.Setup(x => x.GetUserByLogin(loginModel.Login)).ReturnsAsync(user);
        tokenServiceMock.Setup(x => x.CreateAccessToken(It.IsAny<IEnumerable<System.Security.Claims.Claim>>()))
            .Returns("access-token-123");

        authSettingsMock.Setup(x => x.RefreshTokenExpiresInDays).Returns(30);

        // Act
        var result = await authService.Login(loginModel);

        // Assert
        Assert.Equal("access-token-123", result.AccessToken);
        Assert.NotNull(result.RefreshToken);
        Assert.NotEmpty(result.RefreshToken);

        userRepositoryMock.Verify(x => x.UpdateRefreshToken(
            user.Id,
            It.IsNotNull<string>(),
            It.Is<DateTime>(d => d > DateTime.UtcNow.AddDays(29))), Times.Once);
    }

    // Ошибка если пользователя нет
    [Theory, AutoMoqWithPepper]
    public async Task Login_InvalidCredentials_ThrowsBadCredentialsException(
        [Frozen] Mock<IUserRepository> userRepositoryMock,
        LoginModel loginModel,
        Services.AuthService authService)
    {
        userRepositoryMock.Setup(x => x.GetUserByLogin(loginModel.Login)).ReturnsAsync((DbUser)null);
        await Assert.ThrowsAsync<BadCredentialsException>(() => authService.Login(loginModel));
    }

    // Ошибка при входе с неподтвержденным Email
    [Theory, AutoMoqWithPepper]
    public async Task Login_EmailNotConfirmed_ThrowsInvalidOperationException(
     [Frozen] Mock<IUserRepository> userRepositoryMock,
     LoginModel loginModel, 
     Services.AuthService authService)
    {
        var testLogin = "testuser";
        var testPassword = "pass";

        loginModel.Login = testLogin;
        loginModel.Password = testPassword;

        var pepperBytes = Encoding.UTF8.GetBytes(PEPPER);
        var passwordHash = HashHelper.HashPassword(testPassword, pepperBytes);

        Assert.True(HashHelper.VerifyPassword(passwordHash, testPassword, pepperBytes));

        var user = new DbUser
        {
            Id = 555,
            Username = testLogin,    
            Email = "unconfirmed@example.com",
            PasswordHash = passwordHash,
            IsEmailConfirmed = false,
            Role = (int)Role.User
        };

        userRepositoryMock.Setup(x => x.GetUserByLogin(testLogin)).ReturnsAsync(user);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => authService.Login(loginModel));
        Assert.Contains("Email не подтвержден", ex.Message);
    }

    [Theory, AutoMoqWithPepper]
    public async Task ConfirmEmail_ValidCode_Success(
        [Frozen] Mock<IUserRepository> userRepositoryMock,
        [Frozen] Mock<ICodeRepository> codeRepositoryMock,
        [Frozen] Mock<IKafkaProducer> kafkaProducerMock,
        [Frozen] Mock<IConfiguration> configMock,
        [Frozen] Mock<ITokenService> tokenServiceMock,
        [Frozen] Mock<IAuthSettings> authSettingsMock,
        Services.AuthService authService)
    {
        // Arrange
        var userId = 101;
        var email = "test@example.com";
        var code = "1234";

        var user = new DbUser
        {
            Id = userId,
            Email = email,
            Username = "testuser",
            Role = (int)Role.User,
            IsEmailConfirmed = false
        };

        var confirmationCode = new ConfirmationCode
        {
            Email = email,
            Code = code,
            ExpiresAt = DateTime.UtcNow.AddMinutes(10)
        };

        userRepositoryMock.Setup(x => x.GetUserById(userId)).ReturnsAsync(user);
        codeRepositoryMock.Setup(x => x.GetAsync(email)).ReturnsAsync(confirmationCode);
        codeRepositoryMock.Setup(x => x.DeleteAsync(email)).Returns(Task.CompletedTask);
        userRepositoryMock.Setup(x => x.ConfirmEmail(email)).Returns(Task.CompletedTask);

        tokenServiceMock.Setup(x => x.CreateAccessToken(It.IsAny<IEnumerable<System.Security.Claims.Claim>>()))
            .Returns("new-access-token");
        authSettingsMock.Setup(x => x.RefreshTokenExpiresInDays).Returns(7);

        const string topic = "user-created-topic";
        configMock.Setup(x => x["Kafka:Topics:UserCreated"]).Returns(topic);
        kafkaProducerMock.Setup(x => x.ProduceAsync(topic, It.IsAny<UserCreatedEvent>())).Returns(Task.CompletedTask);

        // Act
        var result = await authService.ConfirmEmail(userId, code);

        // Assert
        Assert.Equal("new-access-token", result.AccessToken);
        Assert.NotNull(result.RefreshToken);

        codeRepositoryMock.Verify(x => x.DeleteAsync(email), Times.Once);
        userRepositoryMock.Verify(x => x.ConfirmEmail(email), Times.Once);
        kafkaProducerMock.Verify(x => x.ProduceAsync(topic, It.Is<UserCreatedEvent>(e => e.Id == userId && e.Email == email)), Times.Once);
        userRepositoryMock.Verify(x => x.UpdateRefreshToken(userId, It.IsNotNull<string>(), It.Is<DateTime>(d => d > DateTime.UtcNow.AddDays(6))), Times.Once);
    }

    [Theory, AutoMoqWithPepper]
    public async Task ConfirmEmail_UserNotFound_ThrowsInvalidInputException(
        [Frozen] Mock<IUserRepository> userRepositoryMock,
        Services.AuthService authService)
    {
        userRepositoryMock.Setup(x => x.GetUserById(999)).ReturnsAsync((DbUser)null);
        await Assert.ThrowsAsync<InvalidInputException>(() => authService.ConfirmEmail(999, "1234"));
    }

    // Ошибка пользователь код не верный в ConfirmEmail
    [Theory, AutoMoqWithPepper]
    public async Task ConfirmEmail_InvalidCode_ThrowsInvalidInputException(
        [Frozen] Mock<IUserRepository> userRepositoryMock,
        [Frozen] Mock<ICodeRepository> codeRepositoryMock,
        Services.AuthService authService)
    {
        var user = new DbUser { Id = 1, Email = "test@example.com" };
        userRepositoryMock.Setup(x => x.GetUserById(1)).ReturnsAsync(user);
        codeRepositoryMock.Setup(x => x.GetAsync("test@example.com"))
            .ReturnsAsync(new ConfirmationCode { Code = "1111", ExpiresAt = DateTime.UtcNow.AddMinutes(5) });

        await Assert.ThrowsAsync<InvalidInputException>(() => authService.ConfirmEmail(1, "2222"));
    }

    // Ошибка пользователь код истек в ConfirmEmail
    [Theory, AutoMoqWithPepper]
    public async Task ConfirmEmail_ExpiredCode_ThrowsInvalidInputException(
        [Frozen] Mock<IUserRepository> userRepositoryMock,
        [Frozen] Mock<ICodeRepository> codeRepositoryMock,
        Services.AuthService authService)
    {
        var user = new DbUser { Id = 1, Email = "test@example.com" };
        userRepositoryMock.Setup(x => x.GetUserById(1)).ReturnsAsync(user);
        codeRepositoryMock.Setup(x => x.GetAsync("test@example.com"))
            .ReturnsAsync(new ConfirmationCode { Code = "1234", ExpiresAt = DateTime.UtcNow.AddMinutes(-1) });

        await Assert.ThrowsAsync<InvalidInputException>(() => authService.ConfirmEmail(1, "1234"));
    }

    // Успешное обнуление токена при выходе
    [Theory, AutoMoqWithPepper]
    public async Task Logout_CallsUpdateRefreshTokenWithNulls(
        [Frozen] Mock<IUserRepository> userRepositoryMock,
        Services.AuthService authService)
    {
        // Act
        await authService.Logout(42);

        // Assert
        userRepositoryMock.Verify(x => x.UpdateRefreshToken(42, null, null), Times.Once);
    }

}