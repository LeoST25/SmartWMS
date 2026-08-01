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

// 1. Configuração do Banco de Dados (SQLite)
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite("Data Source=wms_clean.db"));

// 2. Configuração do CORS (Liberação para o Front-end)
builder.Services.AddCors(options => 
    options.AddDefaultPolicy(p => p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

// 3. CONFIGURAÇÃO DE SEGURANÇA: Autenticação JWT
var key = Encoding.ASCII.GetBytes(TokenService.SecretKey);
builder.Services.AddAuthentication(x =>
{
    x.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    x.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(x =>
{
    x.RequireHttpsMetadata = false;
    x.SaveToken = true;
    x.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = false,
        ValidateAudience = false
    };
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

    // Se não houver nenhuma vaga física cadastrada, cria automaticamente um setor inicial de testes
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
app.UseAuthentication(); // Obrigatório antes do Authorization
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
// ROTAS LOGÍSTICAS (BLINDADAS COM AUTENTICAÇÃO)
// ========================================================

app.MapGet("/api/produtos", async (AppDbContext db) =>
    await db.Produtos.Include(p => p.Posicao).ToListAsync())
    .RequireAuthorization();

app.MapGet("/api/posicoes", async (AppDbContext db) =>
    await db.PosicoesArmazem.ToListAsync())
    .RequireAuthorization();

app.MapPost("/api/posicoes", async (PosicaoArmazem novaPosicao, AppDbContext db) =>
{
    db.PosicoesArmazem.Add(novaPosicao);
    await db.SaveChangesAsync();
    return Results.Created($"/api/posicoes/{novaPosicao.Id}", novaPosicao);
}).RequireAuthorization();

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
}).RequireAuthorization();

app.MapGet("/api/logistica/auditoria", async (AppDbContext db) =>
{
    var relatorio = await db.HistoricosMovimentacao
        .Where(h => !h.Arquivado) // CORREÇÃO: Filtra para trazer apenas os logs ativos na tela
        .OrderByDescending(h => h.DataHora) 
        .ToListAsync();

    return Results.Ok(relatorio);
}).RequireAuthorization();

app.MapPost("/api/logistica/auditoria/limpar", async (AppDbContext db) =>
{
    // Captura todas as movimentações que ainda aparecem na tela
    var logsAtivos = await db.HistoricosMovimentacao.Where(h => !h.Arquivado).ToListAsync();
    
    if (!logsAtivos.Any()) return Results.Ok(new { Mensagem = "O histórico já está limpo!" });

    // Varre a lista mudando o status para arquivado (Soft Delete)
    foreach (var log in logsAtivos)
    {
        log.Arquivado = true;
    }

    await db.SaveChangesAsync();
    return Results.Ok(new { Mensagem = "Histórico operacional limpo." });
}).RequireAuthorization();

// CORREÇÃO: Adicionado o parâmetro HttpContext http para capturar o usuário autenticado
app.MapPost("/api/produtos/saida/{sku}", async (string sku, AppDbContext db, HttpContext http) =>
{
    var usuarioAtual = http.User.Identity?.Name ?? "Sistema";

    var produto = await db.Produtos
        .Include(p => p.Posicao)
        .FirstOrDefaultAsync(p => p.Sku.ToLower() == sku.ToLower());

    if (produto == null)
    {
        return Results.NotFound($"Produto com SKU '{sku}' não localizado.");
    }

    // CORREÇÃO: Montagem segura da string de endereço físico da vaga
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
    
    if (produto.Posicao != null)
    {
        produto.Posicao.Ocupada = false;
    }

    db.Produtos.Remove(produto);
    await db.SaveChangesAsync();

    return Results.Ok(new { Mensagem = $"Carga {sku} despachada com sucesso!" });
}).RequireAuthorization();

app.Run();

public record LoginModel(string Username, string Password);
