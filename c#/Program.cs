using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;
using WmsLogistica.Data;
using WmsLogistica.Models;

var builder = WebApplication.CreateBuilder(args);

// 1. Configura o Banco de Dados (SQLite neste exemplo)
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite("Data Source=wms.db"));

// 2. Ativa o Swagger (Documentação da API)
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi(); // Recurso nativo moderno do .NET

var app = builder.Build();

// AUTOMAÇÃO: Garante que o banco de dados e as tabelas sejam criados se não existirem
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<WmsLogistica.Data.AppDbContext>();
    db.Database.EnsureCreated();
}

// Força a ativação do OpenAPI e do Scalar para corrigir o erro 404
app.MapOpenApi();
app.MapScalarApiReference(options => 
{
    options.WithTitle("WMS Logística API");
});

app.UseHttpsRedirection();

// ==========================================
// ROTAS DA API (ENDPOINTS)
// ==========================================

// Rota de teste
app.MapGet("/", () => "WMS API rodando com sucesso no .NET 10!");

// Listar todos os produtos no estoque
app.MapGet("/api/produtos", async (AppDbContext db) =>
    await db.Produtos.Include(p => p.Posicao).ToListAsync());

// Cadastrar uma nova posição de armazenamento (vaga no galpão)
app.MapPost("/api/posicoes", async (PosicaoArmazem novaPosicao, AppDbContext db) =>
{
    db.PosicoesArmazem.Add(novaPosicao);
    await db.SaveChangesAsync();
    return Results.Created($"/api/posicoes/{novaPosicao.Id}", novaPosicao);
});

// Cadastrar um produto (com alocação automática e LOGS)
app.MapPost("/api/produtos", async (Produto novoProduto, AppDbContext db, ILogger<Program> log) =>
{
    log.LogInformation("📦 Nova tentativa de recebimento de carga. SKU: {Sku}, Peso: {Peso}kg", novoProduto.Sku, novoProduto.Peso);

    if (novoProduto.Quantidade <= 0 || novoProduto.Peso <= 0)
    {
        log.LogWarning("⚠️ Falha no recebimento: Produto {Sku} enviado com valores inválidos (Qtd: {Qtd}, Peso: {Peso})", novoProduto.Sku, novoProduto.Quantidade, novoProduto.Peso);
        return Results.BadRequest("Erro de operação: Quantidade e peso devem ser maiores que zero.");
    }

    var skuExiste = await db.Produtos.AnyAsync(p => p.Sku == novoProduto.Sku);
    if (skuExiste)
    {
        log.LogWarning("⚠️ Conflito de inventário: Tentativa de duplicar o SKU {Sku}", novoProduto.Sku);
        return Results.BadRequest($"Conflito de inventário: O SKU '{novoProduto.Sku}' já está cadastrado.");
    }

    var posicaoLivre = await db.PosicoesArmazem.FirstOrDefaultAsync(p => p.Ocupada == false);
    if (posicaoLivre == null)
    {
        log.LogCritical("🚨 ARMAZÉM LOTADO! Carga do SKU {Sku} não pôde ser descarregada por falta de espaço físico.", novoProduto.Sku);
        return Results.BadRequest("Logística travada: Não hay vagas livres no armazém!");
    }

    posicaoLivre.Ocupada = true;
    novoProduto.PosicaoArmazemId = posicaoLivre.Id;
    novoProduto.Posicao = null; 

    db.Produtos.Add(novoProduto);
    await db.SaveChangesAsync();

    log.LogInformation("✅ Sucesso: SKU {Sku} alocado automaticamente no endereço {Endereco}", novoProduto.Sku, posicaoLivre.CodigoEndereco);

    var produtoSalvo = await db.Produtos.Include(p => p.Posicao).FirstOrDefaultAsync(p => p.Id == novoProduto.Id);
    return Results.Created($"/api/produtos/{novoProduto.Id}", produtoSalvo);
});


// Saída de Carga: Remove o produto e LIBERA a vaga do galpão automaticamente
app.MapPost("/api/produtos/saida/{sku}", async (string sku, AppDbContext db, ILogger<Program> log) =>
{
    log.LogInformation("🚚 Solicitação de despacho/saída para o SKU: {Sku}", sku);

    var produto = await db.Produtos.Include(p => p.Posicao).FirstOrDefaultAsync(p => p.Sku == sku);
    if (produto == null)
    {
        log.LogWarning("⚠️ Falha de expedição: Tentativa de despachar o SKU {Sku}, mas ele não existe no estoque.", sku);
        return Results.NotFound($"Produto com SKU '{sku}' não localizado.");
    }

    string enderecoLiberado = produto.Posicao?.CodigoEndereco ?? "Nenhum";
    if (produto.Posicao != null)
    {
        produto.Posicao.Ocupada = false;
    }

    db.Produtos.Remove(produto);
    await db.SaveChangesAsync();

    log.LogInformation("✅ Sucesso: SKU {Sku} despachado da doca. Endereço {Endereco} agora está LIVRE.", sku, enderecoLiberado);
    return Results.Ok(new { Mensagem = $"Carga do SKU {sku} despachada! Vaga liberada." });
});

// Indicadores do Dashboard: Retorna estatísticas de ocupação do galpão
app.MapGet("/api/dashboard", async (AppDbContext db) =>
{
    // Conta o total de posições cadastradas no armazém
    int totalVagas = await db.PosicoesArmazem.CountAsync();

    if (totalVagas == 0)
    {
        return Results.Ok(new { Mensagem = "Nenhuma vaga cadastrada no armazém ainda." });
    }

    // Filtra e conta quantas posições estão ocupadas e quantas estão livres
    int vagasOcupadas = await db.PosicoesArmazem.CountAsync(p => p.Ocupada);
    int vagasLivres = totalVagas - vagasOcupadas;

    // Calcula a porcentagem de ocupação usando conversão para double
    double taxaOcupacao = Math.Round(((double)vagasOcupadas / totalVagas) * 100, 2);

    // Retorna um objeto consolidado para alimentar relatórios ou gráficos
    return Results.Ok(new
    {
        TotalVagas = totalVagas,
        VagasOcupadas = vagasOcupadas,
        VagasLivres = vagasLivres,
        TaxaOcupacaoPercentual = $"{taxaOcupacao}%",
        StatusArmazem = taxaOcupacao >= 90 ? "Crítico (Galpão Quase Cheio)" : "Operação Normal"
    });
});

// Alertas de Reposição: Lista produtos com quantidade igual ou menor que o estoque mínimo
app.MapGet("/api/produtos/alertas-reposicao", async (AppDbContext db) =>
{
    var produtosCriticos = await db.Produtos
        .Include(p => p.Posicao)
        .Where(p => p.Quantidade <= p.EstoqueMinimo)
        .Select(p => new
        {
            p.Sku,
            p.Nome,
            QuantidadeAtual = p.Quantidade,
            LimiteMinimo = p.EstoqueMinimo,
            UnidadesFaltantes = p.EstoqueMinimo - p.Quantidade,
            Localizacao = p.Posicao != null ? p.Posicao.CodigoEndereco : "Não alocado"
        })
        .ToListAsync();

    if (!produtosCriticos.Any())
    {
        return Results.Ok(new { Mensagem = "Todos os produtos estão com níveis de estoque saudáveis!" });
    }

    return Results.Ok(new
    {
        Mensagem = $"Atenção: Foram encontrados {produtosCriticos.Count} itens com estoque crítico!",
        ItensParaComprar = produtosCriticos
    });
});

// Reabastecimento: Adiciona novas unidades ao estoque de um produto existente
app.MapPut("/api/produtos/reabastecer/{sku}", async (string sku, int quantidadeNovasUnidades, AppDbContext db, ILogger<Program> log) =>
{
    log.LogInformation("🔄 Processando reabastecimento para o SKU: {Sku}. Novas unidades chegando: {Qtd}", sku, quantidadeNovasUnidades);

    if (quantidadeNovasUnidades <= 0)
    {
        log.LogWarning("⚠️ Falha de reabastecimento: Quantidade informada ({Qtd}) é inválida.", quantidadeNovasUnidades);
        return Results.BadRequest("A quantidade deve ser maior que zero.");
    }

    var produto = await db.Produtos.FirstOrDefaultAsync(p => p.Sku == sku);
    if (produto == null)
    {
        log.LogWarning("⚠️ Falha de reabastecimento: SKU {Sku} não encontrado para incremento de saldo.", sku);
        return Results.NotFound($"Produto com SKU '{sku}' não encontrado.");
    }

    produto.Quantidade += quantidadeNovasUnidades;
    await db.SaveChangesAsync();

    log.LogInformation("✅ Estoque atualizado: SKU {Sku} incrementado em +{Novas}. Novo saldo total: {Total}", sku, quantidadeNovasUnidades, produto.Quantidade);
    return Results.Ok(new { Mensagem = "Estoque atualizado com sucesso!" });
});

// 9. Busca Avançada: Filtra produtos por SKU ou por Corredor de forma opcional e dinâmica
app.MapGet("/api/produtos/busca", async (string? sku, string? corredor, AppDbContext db, ILogger<Program> log) =>
{
    log.LogInformation("🔍 Executando busca avançada. Filtros recebidos - SKU: {Sku}, Corredor: {Corredor}", sku ?? "Nenhum", corredor ?? "Nenhum");

    // Cria a base da consulta incluindo os dados da posição física
    var consulta = db.Produtos.Include(p => p.Posicao).AsQueryable();

    // Filtro dinâmico 1: Se o SKU foi informado, filtra por ele (ignora maiúsculas/minúsculas)
    if (!string.IsNullOrWhiteSpace(sku))
    {
        consulta = consulta.Where(p => p.Sku.ToLower() == sku.ToLower());
    }

    // Filtro dinâmico 2: Se o corredor foi informado, filtra pela posição física correspondente
    if (!string.IsNullOrWhiteSpace(corredor))
    {
        consulta = consulta.Where(p => p.Posicao != null && p.Posicao.Corredor.ToLower() == corredor.ToLower());
    }

    // Executa a consulta customizada no banco de dados
    var resultado = await consulta.ToListAsync();

    log.LogInformation("✅ Busca concluída. Foram encontrados {Total} produtos correspondentes.", resultado.Count);

    return Results.Ok(new
    {
        TotalResultados = resultado.Count,
        ProdutosEncontrados = resultado
    });
});


app.Run();
