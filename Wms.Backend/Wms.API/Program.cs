using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Npgsql;
using Scalar.AspNetCore;
using Wms.Application;
using Wms.Infrastructure.Data;
using Wms.Domain.Models;
using WmsLogistica.Models;

// Inicialização obrigatória do Builder do WebApplication
var builder = WebApplication.CreateBuilder(args);

// Configuração de portas dinâmicas para a nuvem do Render
var portaRender = Environment.GetEnvironmentVariable("PORT") ?? "5000";
builder.WebHost.ConfigureKestrel(options =>
{
    options.ListenAnyIP(int.Parse(portaRender));
});

// 1. Configuração híbrida de banco de dados (SQLite local / PostgreSQL na nuvem)
var configuredConnectionString =
    builder.Configuration.GetConnectionString("DefaultConnection")
    ?? Environment.GetEnvironmentVariable("DATABASE_URL");

var usePostgres = IsPostgresConnectionString(configuredConnectionString);
var connectionString = usePostgres
    ? NormalizePostgresConnectionString(configuredConnectionString!)
    : configuredConnectionString
      ?? $"Data Source={Path.Combine(Path.GetTempPath(), "wms_clean.db")}";

builder.Services.AddDbContext<AppDbContext>(options =>
{
    if (usePostgres)
    {
        options.UseNpgsql(
            connectionString,
            postgres => postgres.MigrationsAssembly("Wms.API"));
        return;
    }

    options.UseSqlite(connectionString);
});

// 2. CORREÇÃO CRÍTICA DO CORS: Mapeamento explícito das origens de desenvolvimento e produção corporativa
builder.Services.AddCors(options => 
{
    options.AddPolicy("WmsCorsPolicy", p => p
        .WithOrigins(
            "https://smart-wms-frontend.onrender.com", // Seu domínio oficial do Front-end na nuvem
            "http://localhost:5173",                   // Seu ambiente de testes local do Vite
            "http://localhost:3000"
        )
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials()); // Permite tráfego seguro de tokens e cookies autenticados
});

// 3. CONFIGURAÇÃO DE SEGURANÇA: Autenticação & Autorização JWT
var jwtSecret = builder.Configuration["Jwt:SecretKey"]
    ?? throw new InvalidOperationException(
        "A configuração obrigatória 'Jwt:SecretKey' não foi definida. Use a variável de ambiente Jwt__SecretKey.");

if (Encoding.UTF8.GetByteCount(jwtSecret) < 32)
{
    throw new InvalidOperationException("A chave JWT deve possuir pelo menos 32 bytes.");
}

var jwtSettings = new JwtSettings(
    jwtSecret,
    builder.Configuration["Jwt:Issuer"] ?? "SmartWMS.API",
    builder.Configuration["Jwt:Audience"] ?? "SmartWMS.Frontend",
    builder.Configuration.GetValue<int?>("Jwt:ExpirationHours") ?? 4);

var key = Encoding.UTF8.GetBytes(jwtSettings.SecretKey);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.SaveToken = false;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = true,
        ValidIssuer = jwtSettings.Issuer,
        ValidateAudience = true,
        ValidAudience = jwtSettings.Audience,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.FromMinutes(1)
    };
});

builder.Services.AddAuthorization();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi();

var app = builder.Build();

// Inicialização determinística da infraestrutura
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    if (usePostgres)
    {
        db.Database.Migrate();
    }
    else
    {
        db.Database.EnsureCreated();
    }
}

// Aplicação obrigatória da política antes dos middlewares de segurança de rotas
app.UseCors("WmsCorsPolicy");

app.UseAuthentication(); 
app.UseAuthorization();

app.MapOpenApi();
app.MapScalarApiReference(options => { options.WithTitle("Smart WMS - Clean & Secure API"); });

// ========================================================
// ROTAS DE AUTENTICAÇÃO (PÚBLICAS)
// ========================================================

app.MapPost("/api/auth/registrar", async (RegisterModel registro, AppDbContext db) =>
{
    var username = registro.Username.Trim();

    if (username.Length is < 3 or > 50)
    {
        return Results.ValidationProblem(new Dictionary<string, string[]>
        {
            ["username"] = ["O nome de usuário deve possuir entre 3 e 50 caracteres."]
        });
    }

    if (registro.Password.Length is < 8 or > 128)
    {
        return Results.ValidationProblem(new Dictionary<string, string[]>
        {
            ["password"] = ["A senha deve possuir entre 8 e 128 caracteres."]
        });
    }

    var usernameNormalizado = username.ToUpper();
    var usuarioExiste = await db.Usuarios
        .AnyAsync(u => u.Username.ToUpper() == usernameNormalizado);

    if (usuarioExiste)
    {
        return Results.Conflict("Este nome de usuário já está em uso.");
    }

    var novoUsuario = new Usuario
    {
        Username = username,
        PasswordHash = PasswordHasher.HashPassword(registro.Password),
        Role = "Operador"
    };

    db.Usuarios.Add(novoUsuario);
    await db.SaveChangesAsync();

    return Results.Created(
        $"/api/auth/usuario/{novoUsuario.Id}",
        new { novoUsuario.Username, novoUsuario.Role });
});

app.MapPost("/api/auth/login", async (LoginModel login, AppDbContext db) =>
{
    var usernameNormalizado = login.Username.Trim().ToUpper();
    var usuario = await db.Usuarios
        .FirstOrDefaultAsync(u => u.Username.ToUpper() == usernameNormalizado);

    if (usuario == null) return Results.Unauthorized();

    var senhaValida = PasswordHasher.VerifyPassword(login.Password, usuario.PasswordHash);
    if (!senhaValida) return Results.Unauthorized();

    var token = TokenService.GerarToken(usuario, jwtSettings);

    return Results.Ok(new { Usuario = usuario.Username, NivelAcesso = usuario.Role, Token = token });
});

// ========================================================
// ROTAS LOGÍSTICAS (BLINDADAS COM REGRAS DE AUTORIZAÇÃO)
// ========================================================

app.MapGet("/api/produtos", async (AppDbContext db) =>
    await db.Produtos.Include(p => p.Posicao).ToListAsync())
    .RequireAuthorization();

app.MapGet("/api/posicoes", async (AppDbContext db) =>
    await db.PosicoesArmazem.ToListAsync())
    .RequireAuthorization();

app.MapGet("/api/logistica/auditoria", async (AppDbContext db) =>
    await db.HistoricosMovimentacao.Where(h => !h.Arquivado).OrderByDescending(h => h.DataHora).ToListAsync())
    .RequireAuthorization();

app.MapPost("/api/posicoes", async (PosicaoArmazem novaPosicao, AppDbContext db) =>
{
    db.PosicoesArmazem.Add(novaPosicao);
    await db.SaveChangesAsync();
    return Results.Created($"/api/posicoes/{novaPosicao.Id}", novaPosicao);
}).RequireAuthorization(p => p.RequireRole("Gerente"));

app.MapPost("/api/produtos", async (Produto novoProduto, AppDbContext db, HttpContext http) =>
{
    var posicaoLivre = await db.PosicoesArmazem.FirstOrDefaultAsync(p => !p.Ocupada);
    if (posicaoLivre == null) return Results.BadRequest("Não há vagas livres no galpão público!");

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
}).RequireAuthorization(p => p.RequireRole("Gerente"));

app.MapPost("/api/logistica/auditoria/limpar", async (AppDbContext db) =>
{
    var logsAtivos = await db.HistoricosMovimentacao.Where(h => !h.Arquivado).ToListAsync();
    if (!logsAtivos.Any()) return Results.Ok(new { Mensagem = "O histórico já está limpo!" });

    foreach (var log in logsAtivos) { log.Arquivado = true; }
    await db.SaveChangesAsync();
    return Results.Ok(new { Mensagem = "Histórico operacional limpo." });
}).RequireAuthorization(p => p.RequireRole("Gerente"));

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
}).RequireAuthorization(p => p.RequireRole("Gerente"));

app.Run();

static bool IsPostgresConnectionString(string? value)
{
    if (string.IsNullOrWhiteSpace(value))
    {
        return false;
    }

    if (Uri.TryCreate(value, UriKind.Absolute, out var uri))
    {
        return uri.Scheme is "postgres" or "postgresql";
    }

    return value.Contains("Host=", StringComparison.OrdinalIgnoreCase)
        || value.Contains("Server=", StringComparison.OrdinalIgnoreCase);
}

static string NormalizePostgresConnectionString(string value)
{
    if (!Uri.TryCreate(value, UriKind.Absolute, out var uri)
        || uri.Scheme is not ("postgres" or "postgresql"))
    {
        return value;
    }

    var credentials = uri.UserInfo.Split(':', 2);
    if (credentials.Length != 2)
    {
        throw new InvalidOperationException(
            "DATABASE_URL deve conter usuário e senha para o PostgreSQL.");
    }

    var connection = new NpgsqlConnectionStringBuilder
    {
        Host = uri.Host,
        Port = uri.IsDefaultPort ? 5432 : uri.Port,
        Database = Uri.UnescapeDataString(uri.AbsolutePath.TrimStart('/')),
        Username = Uri.UnescapeDataString(credentials[0]),
        Password = Uri.UnescapeDataString(credentials[1]),
        SslMode = SslMode.Require
    };

    return connection.ConnectionString;
}

public sealed record RegisterModel(string Username, string Password);
public sealed record LoginModel(string Username, string Password);
