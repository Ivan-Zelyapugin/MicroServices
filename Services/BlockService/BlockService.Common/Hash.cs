using System.Security.Cryptography;
using System.Text;

namespace BlockService.Common
{
    public static class Hash
    {
        public static string GetHash(string str)
        {
            var hash = MD5.HashData(Encoding.ASCII.GetBytes(str));
            var output = new StringBuilder(hash.Length);
            foreach (var b in hash)
            {
                output.Append(b.ToString("X2"));
            }

            return output.ToString();
        }
    }
}
