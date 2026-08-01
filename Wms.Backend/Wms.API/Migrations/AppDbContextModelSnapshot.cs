using System;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;
using Wms.Infrastructure.Data;

#nullable disable

namespace Wms.API.Migrations;

[DbContext(typeof(AppDbContext))]
partial class AppDbContextModelSnapshot : ModelSnapshot
{
    protected override void BuildModel(ModelBuilder modelBuilder)
    {
#pragma warning disable 612, 618
        modelBuilder
            .HasAnnotation("ProductVersion", "10.0.10")
            .HasAnnotation("Relational:MaxIdentifierLength", 63);

        NpgsqlModelBuilderExtensions.UseIdentityByDefaultColumns(modelBuilder);

        modelBuilder.Entity("Produto", entity =>
        {
            entity.Property<int>("Id")
                .ValueGeneratedOnAdd()
                .HasColumnType("integer");

            NpgsqlPropertyBuilderExtensions.UseIdentityByDefaultColumn(
                entity.Property<int>("Id"));

            entity.Property<int>("EstoqueMinimo")
                .HasColumnType("integer");

            entity.Property<string>("Nome")
                .IsRequired()
                .HasColumnType("text");

            entity.Property<double>("Peso")
                .HasColumnType("double precision");

            entity.Property<int?>("PosicaoArmazemId")
                .HasColumnType("integer");

            entity.Property<int>("Quantidade")
                .HasColumnType("integer");

            entity.Property<string>("Sku")
                .IsRequired()
                .HasColumnType("text");

            entity.HasKey("Id");
            entity.HasIndex("PosicaoArmazemId").IsUnique();
            entity.HasIndex("Sku").IsUnique();
            entity.ToTable("Produtos");
        });

        modelBuilder.Entity("Wms.Domain.Models.HistoricoMovimentacao", entity =>
        {
            entity.Property<int>("Id")
                .ValueGeneratedOnAdd()
                .HasColumnType("integer");

            NpgsqlPropertyBuilderExtensions.UseIdentityByDefaultColumn(
                entity.Property<int>("Id"));

            entity.Property<bool>("Arquivado").HasColumnType("boolean");
            entity.Property<DateTime>("DataHora").HasColumnType("timestamp with time zone");
            entity.Property<string>("EnderecoGalpao").IsRequired().HasColumnType("text");
            entity.Property<string>("ProdutoNome").IsRequired().HasColumnType("text");
            entity.Property<int>("Quantidade").HasColumnType("integer");
            entity.Property<string>("Sku").IsRequired().HasColumnType("text");
            entity.Property<string>("TipoMovimentacao").IsRequired().HasColumnType("text");
            entity.Property<string>("UsuarioResponsavel").IsRequired().HasColumnType("text");

            entity.HasKey("Id");
            entity.ToTable("HistoricosMovimentacao");
        });

        modelBuilder.Entity("Wms.Domain.Models.Usuario", entity =>
        {
            entity.Property<int>("Id")
                .ValueGeneratedOnAdd()
                .HasColumnType("integer");

            NpgsqlPropertyBuilderExtensions.UseIdentityByDefaultColumn(
                entity.Property<int>("Id"));

            entity.Property<string>("PasswordHash").IsRequired().HasColumnType("text");
            entity.Property<string>("Role").IsRequired().HasColumnType("text");
            entity.Property<string>("Username").IsRequired().HasColumnType("text");

            entity.HasKey("Id");
            entity.HasIndex("Username").IsUnique();
            entity.ToTable("Usuarios");
        });

        modelBuilder.Entity("WmsLogistica.Models.PosicaoArmazem", entity =>
        {
            entity.Property<int>("Id")
                .ValueGeneratedOnAdd()
                .HasColumnType("integer");

            NpgsqlPropertyBuilderExtensions.UseIdentityByDefaultColumn(
                entity.Property<int>("Id"));

            entity.Property<string>("Corredor").IsRequired().HasColumnType("text");
            entity.Property<int>("Nivel").HasColumnType("integer");
            entity.Property<bool>("Ocupada").HasColumnType("boolean");
            entity.Property<int>("Prateleira").HasColumnType("integer");

            entity.HasKey("Id");
            entity.HasIndex("Corredor", "Prateleira", "Nivel").IsUnique();
            entity.ToTable("PosicoesArmazem");
        });

        modelBuilder.Entity("Produto", entity =>
        {
            entity.HasOne(
                    "WmsLogistica.Models.PosicaoArmazem",
                    "Posicao")
                .WithMany()
                .HasForeignKey("PosicaoArmazemId")
                .OnDelete(DeleteBehavior.SetNull);

            entity.Navigation("Posicao");
        });
#pragma warning restore 612, 618
    }
}
