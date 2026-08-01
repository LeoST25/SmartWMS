# 📦 Smart WMS - Enterprise Warehouse Management System

Um sistema avançado de gestão de armazém inteligente (WMS) e controle de fluxo logístico de alta performance, projetado com as melhores práticas de engenharia de software de mercado.

## 🏛️ Arquitetura e Design de Software
O ecossistema foi totalmente fatiado utilizando o padrão **Clean Architecture (Arquitetura Limpa)**, desacoplando as regras de negócio logísticas das tecnologias de banco de dados e entrega web:
* **`Wms.Domain`:** Entidades físicas de domínio puras (`Produto`, `PosicaoArmazem`, `Usuario`, `Historico`).
* **`Wms.Application`:** Serviços inteligentes contendo as regras de negócio de *Putaway* e criptografia de credenciais.
* **`Wms.Infrastructure`:** Persistência de dados com Entity Framework Core e banco de dados embarcado SQLite.
* **`Wms.API`:** Camada de entrega REST configurada com Minimal APIs, documentação OpenAPI/Scalar e políticas de segurança.

## 🛡️ Segurança e Auditoria Logística
1. **Autenticação JWT (JSON Web Tokens):** Bloqueio e blindagem rigorosa de todos os endpoints logísticos, exigindo tokens criptografados com expiração automática.
2. **Criptografia de Senhas (PBKDF2):** Proteção ponta a ponta contra ataques de força bruta, utilizando *Salts* aleatórios gerados de forma nativa via criptografia com `SHA256`.
3. **Trilha de Auditoria Imutável:** Cada entrada e saída física no galpão registra permanentemente uma linha indelével contendo o operador responsável, carimbo de tempo no formato ISO e os endereços das vagas.
4. **Mecanismo de Soft Delete:** Permite que gerentes limpem a tela operacional do histórico do armazém, alterando o estado lógico dos logs sem excluir os registros históricos fiscais do banco de dados.

## 🎨 Front-end Moderno (React + TypeScript)
A interface de usuário foi migrada para uma SPA (Single Page Application) de alto padrão:
* **Vite + React + TypeScript:** Tipagem estrita de contratos de dados espelhados do C#.
* **Tailwind CSS v4:** Design corporativo premium com modo escuro nativo (*Slate 950*).
* **Lucide React:** Ícones vetoriais de alta definição tipados para sinalização logística.
* **Interceptador HTTP (Axios):** Gerenciamento inteligente de sessão que captura o Token JWT do navegador e o injeta automaticamente nos cabeçalhos de cada clique.

---

## 🔧 Como Rodar o Ecossistema Localmente

### 1. Clonar o Projeto
```bash
git clone <link-do-seu-repositorio>
cd SmartWMS
```

### 2. Iniciar o Back-end (C# .NET 10)
```bash
cd Wms.Backend
dotnet run --project Wms.API
```
👉 *Documentação interativa das rotas e cadeados de segurança:* `http://localhost:5000/scalar/v1`

### 3. Iniciar o Front-end (React + TS)
```bash
cd ../Wms.FrontModerno
npm install
npm run dev
```
👉 *Painel de controle visual do operador:* `http://localhost:5173`

Deploy: https://smart-wms-frontend.onrender.com/
