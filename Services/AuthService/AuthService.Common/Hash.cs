using System.Security.Cryptography;
using System.Text;

namespace AuthService.Common
{
    public static class HashHelper
    {
        private const int HashVersion = 1;

        public static string HashPassword(string password, byte[] pepper)
        {
            using var rng = RandomNumberGenerator.Create();
            byte[] salt = new byte[32];
            rng.GetBytes(salt);

            byte[] pepperedPassword = CombinePepperAndPassword(password, pepper);

            var pbkdf2 = new Rfc2898DeriveBytes(pepperedPassword, salt, 100_000, HashAlgorithmName.SHA256);
            byte[] hash = pbkdf2.GetBytes(32);

            var hashBytes = new byte[64]; 
            Array.Copy(salt, 0, hashBytes, 0, 32);
            Array.Copy(hash, 0, hashBytes, 32, 32);

            return $"{HashVersion}:{Convert.ToBase64String(hashBytes)}";
        }

        public static bool VerifyPassword(string storedHash, string password, byte[] pepper)
        {
            var parts = storedHash.Split(':');
            if (parts.Length != 2) return false;

            int version = int.Parse(parts[0]);
            byte[] hashBytes = Convert.FromBase64String(parts[1]);

            if (version == 1)
            {
                byte[] salt = new byte[32];
                Array.Copy(hashBytes, 0, salt, 0, 32);

                byte[] pepperedPassword = CombinePepperAndPassword(password, pepper);

                var pbkdf2 = new Rfc2898DeriveBytes(pepperedPassword, salt, 100_000, HashAlgorithmName.SHA256);
                byte[] hash = pbkdf2.GetBytes(32);

                return CryptographicOperations.FixedTimeEquals(hashBytes.AsSpan(32), hash);
            }

            throw new NotSupportedException($"Hash version {version} not supported");
        }

        private static byte[] CombinePepperAndPassword(string password, byte[] pepper)
        {
            byte[] passwordBytes = Encoding.UTF8.GetBytes(password);
            byte[] combined = new byte[pepper.Length + passwordBytes.Length];
            Array.Copy(pepper, 0, combined, 0, pepper.Length);
            Array.Copy(passwordBytes, 0, combined, pepper.Length, passwordBytes.Length);
            return combined;
        }
    }

}
