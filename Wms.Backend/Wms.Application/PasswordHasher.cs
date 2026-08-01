using System.Security.Cryptography;

namespace Wms.Application;

public static class PasswordHasher
{
    private const int KeySize = 32; // 256 bits
    private const int Iterations = 100000;
    private static readonly HashAlgorithmName HashAlgorithm = HashAlgorithmName.SHA256;

    public static string HashPassword(string password)
    {
        byte[] salt = RandomNumberGenerator.GetBytes(KeySize);
        
        // CORREÇÃO: Instanciação correta exigida pelo .NET
        using var pbkdf2 = new Rfc2898DeriveBytes(password, salt, Iterations, HashAlgorithm);
        byte[] hash = pbkdf2.GetBytes(KeySize);

        return $"{Convert.ToBase64String(salt)}.{Convert.ToBase64String(hash)}";
    }

    public static bool VerifyPassword(string password, string hashedPassword)
    {
        var partes = hashedPassword.Split('.');
        if (partes.Length != 2) return false;

        byte[] salt = Convert.FromBase64String(partes[0]);
        byte[] hashOriginal = Convert.FromBase64String(partes[1]);

        // CORREÇÃO: Instanciação correta usando o salt original recuperado
        using var pbkdf2 = new Rfc2898DeriveBytes(password, salt, Iterations, HashAlgorithm);
        byte[] hashNovo = pbkdf2.GetBytes(KeySize);

        return CryptographicOperations.FixedTimeEquals(hashOriginal, hashNovo);
    }
}
