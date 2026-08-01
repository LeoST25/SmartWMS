using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using Wms.Domain.Models;

namespace Wms.Application;

public sealed record JwtSettings(
    string SecretKey,
    string Issuer,
    string Audience,
    int ExpirationHours);

public static class TokenService
{
    public static string GerarToken(Usuario usuario, JwtSettings settings)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(settings.SecretKey);
        ArgumentException.ThrowIfNullOrWhiteSpace(settings.Issuer);
        ArgumentException.ThrowIfNullOrWhiteSpace(settings.Audience);

        if (settings.ExpirationHours <= 0)
        {
            throw new ArgumentOutOfRangeException(
                nameof(settings),
                "O tempo de expiração do token deve ser maior que zero.");
        }

        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.UTF8.GetBytes(settings.SecretKey);

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(
            [
                new Claim(ClaimTypes.NameIdentifier, usuario.Id.ToString()),
                new Claim(ClaimTypes.Name, usuario.Username),
                new Claim(ClaimTypes.Role, usuario.Role),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            ]),
            Issuer = settings.Issuer,
            Audience = settings.Audience,
            Expires = DateTime.UtcNow.AddHours(settings.ExpirationHours),
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(key),
                SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }
}
