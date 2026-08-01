# 📦 Smart WMS

Sistema de gestão de armazém para controle de posições físicas, entrada e saída de cargas, inventário, auditoria e indicadores operacionais.

## Tecnologias

- .NET 10, ASP.NET Core Minimal APIs e Entity Framework Core
- PostgreSQL em produção e SQLite no desenvolvimento local
- Autenticação JWT, autorização por perfil e senhas PBKDF2
- React, TypeScript, Vite, Tailwind CSS e Axios
- xUnit e GitHub Actions

## Estrutura

- `Wms.Domain`: entidades do domínio.
- `Wms.Application`: autenticação e serviços de aplicação.
- `Wms.Infrastructure`: persistência com Entity Framework Core.
- `Wms.API`: endpoints HTTP, autorização e inicialização.
- `Wms.Tests`: testes automatizados do backend.
- `Wms.FrontModerno`: aplicação React.

## Desenvolvimento local

### Backend

A chave JWT é obrigatória e deve possuir pelo menos 32 bytes.

```bash
git clone https://github.com/LeoST25/SmartWMS.git
cd SmartWMS/Wms.Backend

export Jwt__SecretKey="$(openssl rand -base64 48)"
dotnet restore WmsSolution.slnx
dotnet run --project Wms.API
```

Sem uma conexão PostgreSQL configurada, o backend utiliza SQLite localmente.

Documentação da API: `http://localhost:5000/scalar/v1`.

### Frontend

```bash
cd Wms.FrontModerno
npm ci
npm run dev
```

Frontend local: `http://localhost:5173`.

### Validações

```bash
dotnet test Wms.Backend/WmsSolution.slnx
npm --prefix Wms.FrontModerno run lint
npm --prefix Wms.FrontModerno run build
```

## Configuração de produção

Configure as variáveis abaixo no serviço do backend:

| Variável | Obrigatória | Uso |
|---|---:|---|
| `Jwt__SecretKey` | Sim | Chave secreta nova com pelo menos 32 bytes |
| `Jwt__Issuer` | Não | Emissor do token; padrão `SmartWMS.API` |
| `Jwt__Audience` | Não | Audiência; padrão `SmartWMS.Frontend` |
| `Jwt__ExpirationHours` | Não | Validade do token; padrão 4 horas |
| `DATABASE_URL` | Produção | PostgreSQL em formato URI ou chave/valor |
| `BootstrapAdmin__Username` | Primeiro deploy | Usuário do primeiro gerente |
| `BootstrapAdmin__Password` | Primeiro deploy | Senha inicial com pelo menos 12 caracteres |

Gere uma nova chave JWT:

```bash
openssl rand -base64 48
```

A chave antiga que apareceu no histórico do repositório não deve ser reutilizada. Depois que o primeiro gerente for criado com sucesso, remova as duas variáveis `BootstrapAdmin__*` do ambiente.

No frontend, configure:

```env
VITE_API_URL=https://smart-wms-backend-latb.onrender.com/api
```

## Segurança operacional

- Cadastros públicos recebem exclusivamente o perfil `Operador`.
- Ações de entrada, expedição, criação de vagas e arquivamento exigem `Gerente`.
- O putaway utiliza transação serializável e restrição única por posição.
- As migrations do PostgreSQL são aplicadas na inicialização.
- Logs de auditoria são arquivados por soft delete.

Deploy atual: https://smart-wms-frontend.onrender.com/
