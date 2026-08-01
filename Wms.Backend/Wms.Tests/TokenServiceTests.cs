using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using Wms.Application;
using Wms.Domain.Models;

namespace Wms.Tests;

public class TokenServiceTests
{
    private const string Secret =
        "smart-wms-integration-test-secret-key-with-more-than-32-bytes";

    [Fact]
    public void GerarToken_ShouldIssueValidTokenWithUserAndRole()
    {
        var user = new Usuario
        {
            Id = 42,
            Username = "leonardo",
            PasswordHash = "not-used",
            Role = "Gerente"
        };
        var settings = new JwtSettings(
            Secret,
            "SmartWMS.API",
            "SmartWMS.Frontend",
            1);

        var token = TokenService.GerarToken(user, settings);

        var validation = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(Secret)),
            ValidateIssuer = true,
            ValidIssuer = settings.Issuer,
            ValidateAudience = true,
            ValidAudience = settings.Audience,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero,
            NameClaimType = ClaimTypes.Name,
            RoleClaimType = ClaimTypes.Role
        };

        var handler = new JwtSecurityTokenHandler();
        var principal = handler.ValidateToken(
            token,
            validation,
            out var validatedToken);

        var jwt = Assert.IsType<JwtSecurityToken>(validatedToken);
        Assert.Equal("leonardo", principal.Identity?.Name);
        Assert.True(principal.IsInRole("Gerente"));
        Assert.Equal("SmartWMS.API", jwt.Issuer);
        Assert.Contains("SmartWMS.Frontend", jwt.Audiences);
        Assert.NotNull(principal.FindFirst(ClaimTypes.NameIdentifier));
        Assert.NotNull(principal.FindFirst(JwtRegisteredClaimNames.Jti));
    }

    [Fact]
    public void GerarToken_ShouldRejectInvalidExpiration()
    {
        var user = new Usuario
        {
            Id = 1,
            Username = "operador",
            PasswordHash = "not-used",
            Role = "Operador"
        };
        var settings = new JwtSettings(
            Secret,
            "SmartWMS.API",
            "SmartWMS.Frontend",
            0);

        Assert.Throws<ArgumentOutOfRangeException>(
            () => TokenService.GerarToken(user, settings));
    }
}
