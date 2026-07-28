# 📦 Smart WMS - Sistema de Gestão de Armazém Inteligente

Este é um sistema de **Warehouse Management System (WMS)** focado em otimização logística de galpões e centros de distribuição, desenvolvido com as tecnologias mais modernas do ecossistema .NET.

## 🚀 Tecnologias Utilizadas
* **C# 14 / .NET 10** (Minimal APIs e recursos modernos de sintaxe)
* **Entity Framework Core** (Persistência de dados ágil)
* **SQLite** (Banco de dados embarcado)
* **Scalar OpenAPI** (Interface interativa moderna para documentação de rotas)
* **xUnit & EF InMemory** (Arquitetura de testes unitários isolados)

## 🧠 Recursos e Inteligência Logística
1. **Algoritmo de Putaway Automático:** O sistema analisa as dimensões e o inventário atual e aloca automaticamente os produtos que chegam na primeira vaga física livre (Corredor/Prateleira/Nível) disponível no galpão.
2. **Dashboard de Ocupação:** Endpoint gerencial que calcula em tempo real a taxa percentual de ocupação do armazém e emite alertas caso o galpão atinja níveis críticos de espaço.
3. **Alertas de Reposição Crítica:** Monitoramento inteligente que compara o estoque atual com o limite mínimo de segurança, gerando relatórios de compras automatizados.
4. **Auditoria por Logs:** Rastreabilidade completa de entrada, saída e reabastecimento de cargas com logs estruturados no terminal para auditorias de segurança.

## 🔧 Como Rodar o Projeto Localmente

1. Clone o repositório para sua máquina Linux:
```bash
git clone <link-do-seu-repositorio>
```

2. Acesse a pasta da API principal e inicie o servidor:
```bash
cd "c#"
dotnet run
```

3. Acesse a interface visual do **Scalar** para testar as rotas com cliques:
👉 `http://localhost:5000/scalar/v1`

## 🧪 Como Rodar os Testes Automáticos
Para garantir que nenhuma regra de negócio ou algoritmo foi quebrado, execute a suíte de testes unitários:
```bash
cd "WmsLogistica.Tests"
dotnet test
```
