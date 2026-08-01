namespace Wms.Domain.Models;

public class Usuario
{
    public int Id { get; set; }
    public required string Username { get; set; }
    public required string PasswordHash { get; set; } // Senha criptografada por segurança
    public required string Role { get; set; } // Ex: "Gerente" ou "Operador"
}