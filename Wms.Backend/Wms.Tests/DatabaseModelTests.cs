using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using Wms.Domain.Models;
using Wms.Infrastructure.Data;
using WmsLogistica.Models;

namespace Wms.Tests;

public class DatabaseModelTests
{
    private static AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite("Data Source=:memory:")
            .Options;

        return new AppDbContext(options);
    }

    [Fact]
    public void Product_ShouldHaveUniqueSkuAndPositionIndexes()
    {
        using var db = CreateContext();
        var entity = db.Model.FindEntityType(typeof(global::Produto));

        Assert.NotNull(entity);
        Assert.True(FindIndex(entity!, "Sku").IsUnique);
        Assert.True(FindIndex(entity!, "PosicaoArmazemId").IsUnique);

        var foreignKey = Assert.Single(entity!.GetForeignKeys());
        Assert.Equal(DeleteBehavior.SetNull, foreignKey.DeleteBehavior);
    }

    [Fact]
    public void User_ShouldHaveUniqueUsernameIndex()
    {
        using var db = CreateContext();
        var entity = db.Model.FindEntityType(typeof(Usuario));

        Assert.NotNull(entity);
        Assert.True(FindIndex(entity!, "Username").IsUnique);
    }

    [Fact]
    public void Position_ShouldHaveUniquePhysicalAddressIndex()
    {
        using var db = CreateContext();
        var entity = db.Model.FindEntityType(typeof(PosicaoArmazem));

        Assert.NotNull(entity);
        Assert.True(
            FindIndex(entity!, "Corredor", "Prateleira", "Nivel").IsUnique);
    }

    private static IIndex FindIndex(
        IEntityType entity,
        params string[] propertyNames)
    {
        return Assert.Single(entity.GetIndexes().Where(index =>
            index.Properties.Select(property => property.Name)
                .SequenceEqual(propertyNames)));
    }
}
