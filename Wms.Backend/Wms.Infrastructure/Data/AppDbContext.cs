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
    base.OnModelCreating(modelBuilder);

    // Configuração Sênior de Relacionamento Híbrido para PostgreSQL
    modelBuilder.Entity<Produto>()
        .HasOne(p => p.Posicao)
        .WithMany()
        .HasForeignKey(p => p.PosicaoArmazemId)
        .IsRequired(false) // Define que o produto não exige uma vaga obrigatória no ato do cadastro
        .OnDelete(DeleteBehavior.SetNull); // Se a vaga for excluída, o produto permanece na Doca

    // Garante que o SKU permaneça único no cluster do PostgreSQL
    modelBuilder.Entity<Produto>()
        .HasIndex(p => p.Sku)
        .IsUnique();
}
}
