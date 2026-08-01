using WmsLogistica.Models;

public class Produto
{
    public int Id { get; set; }
    public required string Nome { get; set; }
    public required string Sku { get; set; }
    public int Quantidade { get; set; }
    public double Peso { get; set; }
    public int EstoqueMinimo { get; set; } = 5;
    public int? PosicaoArmazemId { get; set; }
    public PosicaoArmazem? Posicao { get; set; }
}
