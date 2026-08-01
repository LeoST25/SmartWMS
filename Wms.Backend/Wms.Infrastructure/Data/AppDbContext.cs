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
    public DbSet<HistoricoMovimentacao> HistoricosMovimentacao => Set<HistoricoMovimentacao>(); // Nova Tabela

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Produto>().HasIndex(p => p.Sku).IsUnique();
        modelBuilder.Entity<Usuario>().HasIndex(u => u.Username).IsUnique();
            
        base.OnModelCreating(modelBuilder);
    }
}
