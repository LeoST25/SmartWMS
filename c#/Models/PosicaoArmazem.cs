namespace WmsLogistica.Models;

// Representa a vaga física no galpão onde o produto será guardado
public class PosicaoArmazem
{
    public int Id { get; set; }
    public required string Corredor { get; set; } // Ex: "A"
    public int Prateleira { get; set; }          // Ex: 2
    public int Nivel { get; set; }               // Ex: 3
    public bool Ocupada { get; set; }
    
    // Propriedade calculada usando C# moderno para facilitar a leitura do endereço
    public string CodigoEndereco => $"{Corredor}-{Prateleira}-{Nivel}";
}