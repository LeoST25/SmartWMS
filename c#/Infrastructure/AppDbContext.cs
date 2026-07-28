using Microsoft.EntityFrameworkCore;
using WmsLogistica.Models;

namespace WmsLogistica.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Produto> Produtos => Set<Produto>();
    public DbSet<PosicaoArmazem> PosicoesArmazem => Set<PosicaoArmazem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Garante que o SKU seja único no banco de dados para evitar duplicidade de itens
        modelBuilder.Entity<Produto>()
            .HasIndex(p => p.Sku)
            .IsUnique();
            
        base.OnModelCreating(modelBuilder);
    }
}
