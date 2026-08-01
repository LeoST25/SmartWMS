using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using Wms.Domain.Models;

namespace Wms.Application;

public static class TokenService
{
    // Chave secreta de teste para assinar digitalmente o token
    public const string SecretKey = "ChaveSuperSecretaEProtegidaDaLogistica2026!";

    public static string GerarToken(Usuario usuario)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.ASCII.GetBytes(SecretKey);

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.Name, usuario.Username),
                new Claim(ClaimTypes.Role, usuario.Role) // Define o nível de acesso (Gerente/Operador)
            }),
            Expires = DateTime.UtcNow.AddHours(4), // Token expira em 4 horas
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }
}
