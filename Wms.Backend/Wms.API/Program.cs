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
}

app.UseCors();
app.UseAuthentication(); // Obrigatório antes do Authorization
app.UseAuthorization();

app.MapOpenApi();
app.MapScalarApiReference(options => { options.WithTitle("Smart WMS - Clean & Secure API"); });

// ========================================================
// ROTAS DE AUTENTICAÇÃO (PÚBLICAS)
// ========================================================

// Registro de novos usuários/operadores do galpão
app.MapPost("/api/auth/registrar", async (Usuario novoUsuario, AppDbContext db) =>
{
    var usuarioExiste = await db.Usuarios.AnyAsync(u => u.Username == novoUsuario.Username);
    if (usuarioExiste) return Results.BadRequest("Este nome de usuário já está em uso.");

    // Criptografa a senha usando nosso utilitário antes de salvar no banco
    novoUsuario.PasswordHash = PasswordHasher.HashPassword(novoUsuario.PasswordHash);

    db.Usuarios.Add(novoUsuario);
    await db.SaveChangesAsync();

    return Results.Created($"/api/auth/usuario/{novoUsuario.Id}", new { novoUsuario.Username, novoUsuario.Role });
});

// Endpoint de Login: Valida as credenciais e devolve o Token JWT
app.MapPost("/api/auth/login", async (LoginModel login, AppDbContext db) =>
{
    var usuario = await db.Usuarios.FirstOrDefaultAsync(u => u.Username == login.Username);
    if (usuario == null) return Results.Unauthorized();

    // Compara a senha digitada com o Hash salvo no banco
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
    .RequireAuthorization(); // Exige o Token no cabeçalho

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

    // Descobre o nome do usuário autenticado que enviou o Token JWT
    var usuarioAtual = http.User.Identity?.Name ?? "Sistema";

    posicaoLivre.Ocupada = true;
    novoProduto.PosicaoArmazemId = posicaoLivre.Id;
    novoProduto.Posicao = null;

    db.Produtos.Add(novoProduto);

    // GRAVAÇÃO NA AUDITORIA: Registra a entrada física
    var auditoria = new HistoricoMovimentacao
    {
        Sku = novoProduto.Sku,
        ProdutoNome = novoProduto.Nome,
        TipoMovimentacao = "ENTRADA",
        Quantidade = novoProduto.Quantidade,
        EnderecoGalpao = posicaoLivre.CodigoEndereco,
        UsuarioResponsavel = usuarioAtual
    };
    db.HistoricosMovimentacao.Add(auditoria);

    await db.SaveChangesAsync();
    return Results.Created($"/api/produtos/{novoProduto.Id}", novoProduto);
}).RequireAuthorization();

// 2. NOVA ROTA: Relatório Geral de Auditoria de Cargas (Apenas para consulta dos Gerentes)
app.MapGet("/api/logistica/auditoria", async (AppDbContext db) =>
{
    var relatorio = await db.HistoricosMovimentacao
        .OrderByDescending(h => h.DataHora) // Mostra as movimentações mais recentes primeiro
        .ToListAsync();

    return Results.Ok(relatorio);
}).RequireAuthorization();

app.Run();

// DTOs (Data Transfer Objects) auxiliares para requisições limpas
public record LoginModel(string Username, string Password);
