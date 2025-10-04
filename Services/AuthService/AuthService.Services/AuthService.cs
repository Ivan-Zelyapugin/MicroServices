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

namespace AuthService.Services
{
    public class AuthService(
        IUserRepository userRepository,
        ITokenService tokenService,
        IAuthSettings authSettings,
        IKafkaProducer kafkaProducer,
        ICodeRepository codeRepository,
        IConfiguration config) : IAuthService
    {
        private readonly byte[] _pepper =
            Encoding.UTF8.GetBytes(Environment.GetEnvironmentVariable("AUTH_PEPPER")
                                   ?? throw new InvalidOperationException("Pepper not set"));

        public async Task<int> Register(RegisterModel registerModel)
        {
            if (string.IsNullOrWhiteSpace(registerModel.Email) ||
                string.IsNullOrWhiteSpace(registerModel.Username) ||
                string.IsNullOrWhiteSpace(registerModel.Password))
                throw new InvalidInputException("Все поля обязательны.");

            if (registerModel.Password != registerModel.ConfirmPassword)
                throw new InvalidInputException("Пароли не совпадают.");

            var existingByUsername = await userRepository.IsUserExistsByUsername(registerModel.Username);
            var existingByEmail = await userRepository.IsUserExistsByEmail(registerModel.Username);
            var user = await userRepository.GetUserByLogin(registerModel.Username);

            if (user != null)
            {
                if (user.IsEmailConfirmed)
                {
                    if (existingByUsername)
                        throw new UsernameAlreadyTakenException(registerModel.Username);

                    if (existingByEmail)
                        throw new EmailAlreadyTakenException(registerModel.Email);

                }
            }

            int userId;
            if (!existingByUsername && !existingByEmail)
            {
                var passwordHash = HashHelper.HashPassword(registerModel.Password, _pepper);

                userId = await userRepository.CreateUser(new DbUser
                {
                    Role = (int)Role.User,
                    Username = registerModel.Username,
                    Email = registerModel.Email,
                    PasswordHash = passwordHash,
                    IsEmailConfirmed = false,
                    RefreshToken = string.Empty,
                    RefreshTokenExpiredAfter = DateTime.UtcNow
                });
            }
            else
            {
                userId = user.Id;
            }

            var code = new Random().Next(1000, 9999).ToString();
            var confirmationCode = new ConfirmationCode
            {
                Email = registerModel.Email,
                Code = code,
                ExpiresAt = DateTime.UtcNow.AddMinutes(10)
            };

            await codeRepository.SaveAsync(confirmationCode);

            var evt = new SendEmailCodeEvent
            {
                Email = registerModel.Email,
                Code = code
            };

            var topic = config["Kafka:Topics:SendEmailCode"];
            await kafkaProducer.ProduceAsync(topic, evt);

            return userId;
        }

        public async Task<AuthResponse> Login(LoginModel loginModel)
        {
            if (string.IsNullOrWhiteSpace(loginModel.Login) ||
                string.IsNullOrWhiteSpace(loginModel.Password))
                throw new InvalidInputException("Логин и пароль обязательны.");

            var user = await userRepository.GetUserByLogin(loginModel.Login);
            if (user == null || !HashHelper.VerifyPassword(user.PasswordHash, loginModel.Password, _pepper))
                throw new BadCredentialsException();

            Console.WriteLine(user.IsEmailConfirmed);

            if (!user.IsEmailConfirmed)
                throw new InvalidOperationException("Email не подтвержден. Проверьте почту.");

            var refreshToken = TokenService.GenerateRefreshToken();
            await userRepository.UpdateRefreshToken(
                user.Id,
                refreshToken,
                DateTime.UtcNow.AddDays(authSettings.RefreshTokenExpiresInDays)
            );

            var claims = Jwt.GetClaims(user.Id, user.Role, user.Email, user.Username);
            var accessToken = tokenService.CreateAccessToken(claims);

            return new AuthResponse
            {
                AccessToken = accessToken,
                RefreshToken = refreshToken
            };
        }

        public async Task<AuthResponse> ConfirmEmail(int userId, string code)
        {
            var user = await userRepository.GetUserById(userId);
            if (user == null)
                throw new InvalidInputException("Пользователь не найден");

            var saved = await codeRepository.GetAsync(user.Email);
            if (saved == null || saved.IsExpired() || saved.Code != code)
                throw new InvalidInputException("Неверный код или истёк срок действия");

            await codeRepository.DeleteAsync(user.Email);
            await userRepository.ConfirmEmail(user.Email);

            var userCreatedEvent = new UserCreatedEvent
            {
                Id = user.Id,
                Email = user.Email
            };

            var topic = config["Kafka:Topics:UserCreated"];
            await kafkaProducer.ProduceAsync(topic, userCreatedEvent);

            var claims = Jwt.GetClaims(user.Id, user.Role, user.Email, user.Username);
            var accessToken = tokenService.CreateAccessToken(claims);

            var refreshToken = TokenService.GenerateRefreshToken();
            await userRepository.UpdateRefreshToken(
                user.Id,
                refreshToken,
                DateTime.UtcNow.AddDays(authSettings.RefreshTokenExpiresInDays)
            );

            return new AuthResponse
            {
                AccessToken = accessToken,
                RefreshToken = refreshToken
            };
        }

        public Task Logout(int userId)
        {
            return userRepository.UpdateRefreshToken(userId, null, null);
        }
    }
}
