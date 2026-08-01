namespace Wms.Domain.Models;

public class HistoricoMovimentacao
{
    public int Id { get; set; }
    public required string Sku { get; set; }
    public required string ProdutoNome { get; set; }
    public required string TipoMovimentacao { get; set; } // "ENTRADA", "SAÍDA", "REABASTECIMENTO"
    public int Quantidade { get; set; }
    public required string EnderecoGalpao { get; set; }
    public DateTime DataHora { get; set; } = DateTime.UtcNow;
    
    // Identifica qual operador ou gerente realizou a ação
    public required string UsuarioResponsavel { get; set; } 
}
