using Wms.Application;

namespace Wms.Tests;

public class PasswordHasherTests
{
    [Fact]
    public void HashPassword_ShouldCreateSaltedVerifiableHash()
    {
        const string password = "SenhaCorporativa#2026";

        var firstHash = PasswordHasher.HashPassword(password);
        var secondHash = PasswordHasher.HashPassword(password);

        Assert.NotEqual(password, firstHash);
        Assert.NotEqual(firstHash, secondHash);
        Assert.True(PasswordHasher.VerifyPassword(password, firstHash));
        Assert.False(PasswordHasher.VerifyPassword("senha-incorreta", firstHash));
    }

    [Theory]
    [InlineData("")]
    [InlineData("hash-invalido")]
    [InlineData("%%%%.%%%%")]
    [InlineData("YQ==.Yg==")]
    public void VerifyPassword_ShouldRejectMalformedHashes(string hash)
    {
        var result = PasswordHasher.VerifyPassword("SenhaCorporativa#2026", hash);

        Assert.False(result);
    }
}
