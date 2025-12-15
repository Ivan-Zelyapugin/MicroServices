using AuthService.Common;
using AuthService.DataAcces.Models;
using AuthService.DataAcces.Repositories.Interfaces;
using AuthService.Models;
using AuthService.Services.Exceptions;
using AuthService.Services.Interfaces;
using System.Text;

namespace AuthService.Services
{
    public class UserService(IUserRepository userRepository) : IUserService
    {
        private readonly byte[] _pepper =
            Encoding.UTF8.GetBytes(Environment.GetEnvironmentVariable("AUTH_PEPPER")
                                   ?? throw new InvalidOperationException("Pepper not set"));
        public async Task<UserDto> GetUser(int id)
        {
            var dbUser = await userRepository.GetUserById(id);
            if (dbUser == null) throw new Exception("User not found");

            return new UserDto
            {
                Id = dbUser.Id,
                Username = dbUser.Username,
                Email = dbUser.Email
            };
        }

        public async Task UpdateUser(UpdateUserRequest request)
        {
            var existingUser = await userRepository.GetUserById(request.Id);

            if (!string.IsNullOrEmpty(request.Username) &&
                !string.Equals(request.Username, existingUser.Username, StringComparison.OrdinalIgnoreCase))
            {
                if (await userRepository.IsUserExistsByUsername(request.Username))
                    throw new UsernameAlreadyTakenException(request.Username);
            }

            if (!string.IsNullOrEmpty(request.Email) &&
                !string.Equals(request.Email, existingUser.Email, StringComparison.OrdinalIgnoreCase))
            {
                if (await userRepository.IsUserExistsByEmail(request.Email))
                    throw new EmailAlreadyTakenException(request.Email);
            }

            await userRepository.UpdateUser(request);
        }

        public async Task ChangePassword(ChangePasswordRequest request)
        {
            var user = await userRepository.GetUserById(request.UserId)
        ?? throw new BadCredentialsException();

            if (!HashHelper.VerifyPassword(
            user.PasswordHash,
            request.CurrentPassword,
            _pepper))
            {
                throw new BadCredentialsException();
            }

            var newHash = HashHelper.HashPassword(request.NewPassword, _pepper);
            await userRepository.ChangePassword(user.Id, newHash);
        }
    }
}
