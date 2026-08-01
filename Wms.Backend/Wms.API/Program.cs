using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;
using Wms.Application;
using Wms.Infrastructure.Data;
using Wms.Domain.Models;
using WmsLogistica.Models;

Environment.SetEnvironmentVariable("ASPNETCORE_URLS", "http://localhost:5000");

var builder = WebApplication.CreateBuilder(args);
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
                       ?? Environment.GetEnvironmentVariable("DATABASE_URL");

// 1. Configuração do Banco de Dados (SQLite)
builder.Services.AddDbContext<AppDbContext>(options =>
{
    if (!string.IsNullOrEmpty(connectionString) && connectionString.StartsWith("Host="))
    {
        // Se houver dados do PostgreSQL, usa o Npgsql
        options.UseNpgsql(connectionString, b => b.MigrationsAssembly("Wms.API"));
    }
    else
    {
        // Fallback de segurança para desenvolvimento local offline
        var bancoCaminho = Path.Combine(Path.GetTempPath(), "wms_clean.db");
        options.UseSqlite($"Data Source={bancoCaminho}");
    }
});

builder.Services.AddAuthorization();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi();

var app = builder.Build();

// Automação: Garante a criação do banco de dados ao iniciar
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();

    if (!db.PosicoesArmazem.Any())
    {
        var vagasPadrao = new List<PosicaoArmazem>
        {
            new() { Corredor = "A", Prateleira = 1, Nivel = 1, Ocupada = false },
            new() { Corredor = "A", Prateleira = 1, Nivel = 2, Ocupada = false },
            new() { Corredor = "A", Prateleira = 2, Nivel = 1, Ocupada = false },
            new() { Corredor = "B", Prateleira = 1, Nivel = 1, Ocupada = false },
            new() { Corredor = "B", Prateleira = 1, Nivel = 2, Ocupada = false }
        };

        db.PosicoesArmazem.AddRange(vagasPadrao);
        db.SaveChanges();
    }
}

app.UseCors();
app.UseAuthentication(); 
app.UseAuthorization();

app.MapOpenApi();
app.MapScalarApiReference(options => { options.WithTitle("Smart WMS - Clean & Secure API"); });

// ========================================================
// ROTAS DE AUTENTICAÇÃO (PÚBLICAS)
// ========================================================

app.MapPost("/api/auth/registrar", async (Usuario novoUsuario, AppDbContext db) =>
{
    var usuarioExiste = await db.Usuarios.AnyAsync(u => u.Username == novoUsuario.Username);
    if (usuarioExiste) return Results.BadRequest("Este nome de usuário já está em uso.");

    novoUsuario.PasswordHash = PasswordHasher.HashPassword(novoUsuario.PasswordHash);

    db.Usuarios.Add(novoUsuario);
    await db.SaveChangesAsync();

    return Results.Created($"/api/auth/usuario/{novoUsuario.Id}", new { novoUsuario.Username, novoUsuario.Role });
});

app.MapPost("/api/auth/login", async (LoginModel login, AppDbContext db) =>
{
    var usuario = await db.Usuarios.FirstOrDefaultAsync(u => u.Username == login.Username);
    if (usuario == null) return Results.Unauthorized();

    var senhaValida = PasswordHasher.VerifyPassword(login.Password, usuario.PasswordHash);
    if (!senhaValida) return Results.Unauthorized();

    var token = TokenService.GerarToken(usuario);

    return Results.Ok(new { Usuario = usuario.Username, NivelAcesso = usuario.Role, Token = token });
});

// ========================================================
// ROTAS LOGÍSTICAS (BLINDADAS COM REGRAS DE AUTORIZAÇÃO POR CARGO)
// ========================================================

// Qualquer usuário autenticado (Operador ou Gerente) pode visualizar produtos e vagas
app.MapGet("/api/produtos", async (AppDbContext db) =>
    await db.Produtos.Include(p => p.Posicao).ToListAsync())
    .RequireAuthorization();

app.MapGet("/api/posicoes", async (AppDbContext db) =>
    await db.PosicoesArmazem.ToListAsync())
    .RequireAuthorization();

app.MapGet("/api/logistica/auditoria", async (AppDbContext db) =>
    await db.HistoricosMovimentacao.Where(h => !h.Arquivado).OrderByDescending(h => h.DataHora).ToListAsync())
    .RequireAuthorization();

// REGRAS DE GERÊNCIA: Apenas usuários com a Role "Gerente" podem alterar a infraestrutura ou o estoque
app.MapPost("/api/posicoes", async (PosicaoArmazem novaPosicao, AppDbContext db) =>
{
    db.PosicoesArmazem.Add(novaPosicao);
    await db.SaveChangesAsync();
    return Results.Created($"/api/posicoes/{novaPosicao.Id}", novaPosicao);
}).RequireAuthorization(p => p.RequireRole("Gerente")); // <-- TRAVA DE SEGURANÇA

app.MapPost("/api/produtos", async (Produto novoProduto, AppDbContext db, HttpContext http) =>
{
    var posicaoLivre = await db.PosicoesArmazem.FirstOrDefaultAsync(p => !p.Ocupada);
    if (posicaoLivre == null) return Results.BadRequest("Não há vagas livres!");

    var usuarioAtual = http.User.Identity?.Name ?? "Sistema";

    posicaoLivre.Ocupada = true;
    novoProduto.PosicaoArmazemId = posicaoLivre.Id;
    novoProduto.Posicao = null;

    db.Produtos.Add(novoProduto);

    var auditoria = new HistoricoMovimentacao
    {
        Sku = novoProduto.Sku,
        ProdutoNome = novoProduto.Nome,
        TipoMovimentacao = "ENTRADA",
        Quantidade = novoProduto.Quantidade,
        EnderecoGalpao = $"{posicaoLivre.Corredor}-{posicaoLivre.Prateleira}-{posicaoLivre.Nivel}",
        UsuarioResponsavel = usuarioAtual
    };
    db.HistoricosMovimentacao.Add(auditoria);

    await db.SaveChangesAsync();
    return Results.Created($"/api/produtos/{novoProduto.Id}", novoProduto);
}).RequireAuthorization(p => p.RequireRole("Gerente")); // <-- TRAVA DE SEGURANÇA

app.MapPost("/api/logistica/auditoria/limpar", async (AppDbContext db) =>
{
    var logsAtivos = await db.HistoricosMovimentacao.Where(h => !h.Arquivado).ToListAsync();
    if (!logsAtivos.Any()) return Results.Ok(new { Mensagem = "O histórico já está limpo!" });

    foreach (var log in logsAtivos) { log.Arquivado = true; }
    await db.SaveChangesAsync();
    return Results.Ok(new { Mensagem = "Histórico operacional limpo." });
}).RequireAuthorization(p => p.RequireRole("Gerente")); // <-- TRAVA DE SEGURANÇA

app.MapPost("/api/produtos/saida/{sku}", async (string sku, AppDbContext db, HttpContext http) =>
{
    var usuarioAtual = http.User.Identity?.Name ?? "Sistema";

    var produto = await db.Produtos
        .Include(p => p.Posicao)
        .FirstOrDefaultAsync(p => p.Sku.ToLower() == sku.ToLower());

    if (produto == null) return Results.NotFound($"Produto com SKU '{sku}' não localizado.");

    string enderecoLiberado = produto.Posicao != null 
        ? $"{produto.Posicao.Corredor}-{produto.Posicao.Prateleira}-{produto.Posicao.Nivel}" 
        : "Doca";

    var auditoriaSaida = new HistoricoMovimentacao
    {
        Sku = produto.Sku,
        ProdutoNome = produto.Nome,
        TipoMovimentacao = "SAÍDA", 
        Quantidade = produto.Quantidade,
        EnderecoGalpao = enderecoLiberado,
        UsuarioResponsavel = usuarioAtual
    };
    db.HistoricosMovimentacao.Add(auditoriaSaida);
    
    if (produto.Posicao != null) { produto.Posicao.Ocupada = false; }

    db.Produtos.Remove(produto);
    await db.SaveChangesAsync();

    return Results.Ok(new { Mensagem = $"Carga {sku} despachada com sucesso!" });
}).RequireAuthorization(p => p.RequireRole("Gerente")); // <-- TRAVA DE SEGURANÇA BLOQUEANDO OPERADORES

app.Run();

public record LoginModel(string Username, string Password);
