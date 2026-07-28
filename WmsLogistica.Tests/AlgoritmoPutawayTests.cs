using Microsoft.EntityFrameworkCore;
using WmsLogistica.Data;
using WmsLogistica.Models;
using Xunit;

namespace WmsLogistica.Tests;

public class AlgoritmoPutawayTests
{
    private AppDbContext CriarContextoEmMemoria()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new AppDbContext(options);
    }

    [Fact]
    public async Task Deve_Alocar_Produto_Na_Primeira_Vaga_Livre_Disponivel()
    {
        using var db = CriarContextoEmMemoria();
        
        var vagaOcupada = new PosicaoArmazem { Id = 1, Corredor = "A", Prateleira = 1, Nivel = 1, Ocupada = true };
        var vagaLivre = new PosicaoArmazem { Id = 2, Corredor = "B", Prateleira = 1, Nivel = 1, Ocupada = false };
        
        db.PosicoesArmazem.AddRange(vagaOcupada, vagaLivre);
        await db.SaveChangesAsync();

        var novoProduto = new Produto { Nome = "Teclado Mecânico", Sku = "TEC-01", Quantidade = 5, Peso = 1.2 };

        var posicaoLivreEncontrada = await db.PosicoesArmazem.FirstOrDefaultAsync(p => !p.Ocupada);
        
        if (posicaoLivreEncontrada != null)
        {
            posicaoLivreEncontrada.Ocupada = true;
            novoProduto.PosicaoArmazemId = posicaoLivreEncontrada.Id;
            db.Produtos.Add(novoProduto);
            await db.SaveChangesAsync();
        }

        Assert.NotNull(posicaoLivreEncontrada);
        Assert.Equal(2, novoProduto.PosicaoArmazemId);
        Assert.True(vagaLivre.Ocupada);
    }
}
