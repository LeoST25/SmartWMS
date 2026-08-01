using WmsLogistica.Models;

public class Produto
{
    public int Id { get; set; }
    public required string Nome { get; set; }
    public required string Sku { get; set; } // Código único do produto (Ex: PROD-123)
    public int Quantidade { get; set; }
    public double Peso { get; set; }
    
    public int EstoqueMinimo { get; set;} = 5; // Padrão de 5 unidades se não for informado
    public int? PosicaoArmazemId { get; set; }
    public PosicaoArmazem? Posicao { get; set; }
}