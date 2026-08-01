using Microsoft.EntityFrameworkCore;
using Wms.Domain.Models;
using WmsLogistica.Models;

namespace Wms.Infrastructure.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Produto> Produtos => Set<Produto>();
    public DbSet<PosicaoArmazem> PosicoesArmazem => Set<PosicaoArmazem>();
    public DbSet<Usuario> Usuarios => Set<Usuario>();
    public DbSet<HistoricoMovimentacao> HistoricosMovimentacao =>
        Set<HistoricoMovimentacao>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        var produto = modelBuilder.Entity<Produto>();

        produto
            .HasOne(p => p.Posicao)
            .WithMany()
            .HasForeignKey(p => p.PosicaoArmazemId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);

        produto
            .HasIndex(p => p.Sku)
            .IsUnique();

        produto
            .HasIndex(p => p.PosicaoArmazemId)
            .IsUnique();

        modelBuilder.Entity<Usuario>()
            .HasIndex(u => u.Username)
            .IsUnique();

        modelBuilder.Entity<PosicaoArmazem>()
            .HasIndex(p => new { p.Corredor, p.Prateleira, p.Nivel })
            .IsUnique();
    }
}
