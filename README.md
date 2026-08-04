# 🧠 Memória Viva — AI Context & Governance Engine

> **Memória que sobrevive entre chats.**
> Ferramenta CLI global que configura agentes de IA em qualquer projeto
> em menos de 60 segundos, com contexto completo, regras de negócio e
> MCP MySQL configurado.

---

## ⚡ Instalação Global

### Opção 1 — npm global (Qualquer plataforma)
```bash
npm install -g memoria-viva
```

### Opção 2 — curl (Linux / Mac / WSL)
```bash
curl -fsSL https://raw.githubusercontent.com/yuslen/memoria-viva/main/scripts/install-linux.sh | bash
```

### Opção 3 — PowerShell (Windows)
```powershell
irm https://raw.githubusercontent.com/yuslen/memoria-viva/main/scripts/install-windows.ps1 | iex
```

### Opção 4 — Clone e rode
```bash
git clone https://github.com/yuslen/memoria-viva.git
cd memoria-viva && npm install -g .
```

---

## 🎯 O que a instalação global faz

| # | Ação | Detalhe |
|---|------|---------|
| 1 | **Instala o CLI** | Comando `memoria-viva` disponível globalmente |
| 2 | **Configura PATH** | Adiciona automaticamente ao PATH do sistema |
| 3 | **Baixa templates** | Templates de regras, contexto, skills e MCP MySQL |
| 4 | **Prepara CI/CD** | Template genérico de `.github/workflows/deploy.yml` |

---

## 🧰 Comandos CLI

| Comando | Descrição |
|---------|-----------|
| `memoria-viva init` | Inicializa o Memória Viva no projeto atual |
| `memoria-viva init --silent` | Modo não interativo (usa env vars) |
| `memoria-viva init --dry-run` | Simula sem alterar arquivos |
| `memoria-viva sync` | Sincroniza o contexto do projeto com o Memória Viva |
| `memoria-viva sync --wizard` | Sync interativo com perguntas guiadas |
| `memoria-viva sync --silent` | Sync não interativo |
| `memoria-viva sync --dry-run` | Simula sync sem alterar arquivos |
| `memoria-viva status` | Verifica o estado atual da instalação no projeto |
| `memoria-viva configure` | Configura MCP e integração com IDEs |
| `memoria-viva update` | Atualiza os arquivos do Memória Viva |
| `memoria-viva check` | Valida se o projeto atual possui os arquivos da Memória Viva |
| `memoria-viva --help` | Mostra os comandos disponíveis |
| `memoria-viva --version` | Mostra a versão |

---

## 🔄 Comando `init` — Inicialização

O comando `memoria-viva init` cria a estrutura completa do Memória Viva no diretório onde for executado:

```bash
cd /caminho/para/seu/projeto
memoria-viva init
```

### O que ele cria:

```
seu-projeto/
├── .agent/
│   └── rules.md               ← Guardrails invioláveis para qualquer IA
├── bin/
│   └── memoria-viva.js        ← Runner seguro do servidor MCP MySQL
├── docs/
│   └── ai/
│       ├── CONTEXTO_ATUAL.md  ← Cérebro técnico do projeto
│       ├── MODULOS_E_REGRAS.md ← Regras de negócio por módulo
│       └── HANDOFF_ATUAL.md   ← Diário de bordo entre agentes
├── scripts/
│   ├── install-windows.ps1    ← Instalador Windows
│   └── install-linux.sh       ← Instalador Linux/Mac
├── templates/
│   ├── CONTEXTO_ATUAL.md
│   ├── HANDOFF_ATUAL.md
│   ├── MODULOS_E_REGRAS.md
│   ├── deploy.yml             ← Workflow CI/CD Zero-Downtime
│   ├── mcp_config.json        ← Template de conexão MCP
│   └── rules.md               ← Regras invioláveis dos agentes
├── .env.mcp                   ← Credenciais MySQL (NÃO versionado)
├── .env.mcp.example           ← Template de credenciais
├── .mcp.json                  ← Config MCP para Claude Code
├── .cursor/mcp.json           ← Config MCP para Cursor
├── .vscode/mcp.json           ← Config MCP para VS Code
├── opencode.json              ← Config MCP para OpenCode
├── .github/workflows/
│   └── deploy.yml             ← CI/CD template genérico
├── .gitignore
├── LICENSE
└── package.json
```

---

## 🔄 Comando `sync` — Sincronização de Contexto

O comando `sync` é o coração da integração do Memória Viva com o projeto. Ele:

1. **Detecta a stack** do projeto (PHP Slim 4, Laravel, Node.js, etc.)
2. **Verifica a presença** de todos os arquivos do Memória Viva
3. **Analisa a estrutura** do projeto (diretórios, rotas, controllers, models)
4. **Atualiza `CONTEXTO_ATUAL.md`** com a stack detectada e estrutura de pastas
5. **Atualiza `HANDOFF_ATUAL.md`** com o registro da sincronização
6. **Atualiza `MODULOS_E_REGRAS.md`** com os módulos identificados
7. **Verifica a configuração MCP** e do `.gitignore`

---

## 📊 Comando `status` — Verificação de Estado

O comando `status` verifica quais arquivos do Memória Viva estão presentes no projeto e quais estão ausentes, fornecendo um resumo claro do estado da instalação.

---

## ⚙️ Comando `configure` — Configuração de MCP e IDEs

O comando `configure` configura os arquivos de MCP (`.mcp.json`, `.cursor/mcp.json`, `.vscode/mcp.json`, `opencode.json`) e atualiza o `.gitignore` com as entradas necessárias.

---

## 🔄 Comando `update` — Atualização de Arquivos

O comando `update` compara os arquivos do template com os arquivos instalados no projeto e atualiza os que diferem, criando backups dos arquivos modificados pelo usuário.

---

## 🔍 Comando `check` — Validação

O comando `check` valida se o projeto atual possui os arquivos da Memória Viva ativos:

```bash
memoria-viva check
```

Retorna:
- ✅ Arquivos presentes
- ⚠️ Arquivos ausentes
- 📋 Próximos passos

---

## 📦 Suporte por Stack

O Memória Viva detecta automaticamente a stack do projeto e aplica as regras adequadas.

### PHP — Slim 4
- Single Action Controllers (Invokable Classes)
- Repository Pattern com PHP-DI Container
- Doctrine ORM/Migrations
- Rotas em `routes/web/` e `routes/api/v1/`

### PHP — Laravel
- Controller classes com métodos resource
- Eloquent ORM + Laravel Migrations
- Service Container para injeção de dependência

### Node.js
- Express / Fastify handlers
- Prisma / TypeORM / Sequelize
- Jest / Vitest para testes

### Outras Stacks
O Memória Viva também funciona com Python, Ruby, Go, .NET e outras stacks.
A stack é detectada automaticamente pelos arquivos do projeto.

---

## 📂 Padrão de Estrutura de Pastas

Todo projeto que utiliza o Memória Viva deve seguir esta estrutura:

```
projeto/
├── .agent/
│   └── rules.md               ← Guardrails invioláveis da IA
├── app/
│   ├── Actions/               ← Single Action Controllers (Invokable)
│   │   ├── Admin/             ← Módulo Admin Master
│   │   ├── Store/             ← Módulo Lojista
│   │   ├── Driver/            ← Módulo Entregador
│   │   └── Client/            ← Módulo Cliente / Marketplace
│   ├── Domain/                ← Entidades de Negócio
│   └── Infrastructure/
│       ├── Persistence/       ← Repositories (Slim + Doctrine)
│       └── Middleware/        ← SessionValidation, Permissions, ErrorHandler
├── database/
│   └── migrations/            ← Migrações oficiais do banco
├── docs/
│   └── ai/
│       ├── CONTEXTO_ATUAL.md  ← Cérebro técnico do projeto
│       ├── MODULOS_E_REGRAS.md ← Regras de negócio por módulo
│       └── HANDOFF_ATUAL.md   ← Diário de bordo entre agentes
└── routes/
    ├── index.php              ← Entrypoint mestre das rotas
    ├── web/                   ← Rotas WEB (admin.php, store.php, client.php, site.php)
    └── api/v1/                ← APIs RESTful (auth.php, stores.php, orders.php, drivers.php)
```

---

## 🔧 Após a Instalação

### 1. Sincronize o projeto com o Memória Viva

```bash
memoria-viva sync
```

Ou leia o arquivo `templates/SYNC_INSTRUCTIONS.md` para instruções detalhadas.

### 2. Preencha o `.env.mcp`
```env
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_DATABASE=seu_banco
MYSQL_USER=root
MYSQL_PASSWORD=sua_senha
MYSQL_CHARSET=utf8mb4
```

### 3. Reinicie a IDE

### 4. Peça ao agente para ler e preencher o contexto
```
"Leia o projeto todo. Atualize docs/ai/CONTEXTO_ATUAL.md com a stack,
tabelas (use MCP: list_tables), rotas e arquitetura reais.
Depois atualize docs/ai/MODULOS_E_REGRAS.md com as regras de negócio
e docs/ai/HANDOFF_ATUAL.md com o estado atual.
Siga todas as regras em .agent/rules.md."
```

---

## 📋 Requisitos

| Requisito | Para quê |
|-----------|----------|
| **Node.js 18+** | CLI e MCP MySQL |
| **Git** | Detectar a raiz do projeto |
| **PHP 8.2+** e **MySQL** | Projetos PHP |

---

## 🧩 Modos de Uso

| Modo | Comando |
|------|---------|
| Wizard interativo | `memoria-viva init` |
| Inicializar | `memoria-viva init` |
| Sincronizar | `memoria-viva sync` |
| Verificar estado | `memoria-viva status` |
| Configurar | `memoria-viva configure` |
| Atualizar | `memoria-viva update` |
| Validar | `memoria-viva check` |
| Silencioso (CI/automação) | `memoria-viva init --silent` |
| Dry run (simular) | `memoria-viva init --dry-run` |
| Via env vars | `PROJECT_NAME="X" DB_HOST="Y" memoria-viva init --silent` |

---

## 🔌 MCP MySQL

O Memória Viva inclui um servidor MCP MySQL que permite aos agentes de IA
consultar o banco de dados diretamente:

| Ferramenta | Descrição |
|------------|-----------|
| `list_tables` | Lista todas as tabelas do banco |
| `read_table_schema` | Lê o schema de uma tabela |
| `run_select_query` | Executa queries SELECT |
| `get_database_summary` | Resumo do banco de dados |
| `search_schema` | Busca em schemas |
| `analyze_query` | Analisa queries |

---

## 🔄 CI/CD — Deploy em Produção

O Memória Viva inclui um template genérico de GitHub Actions para deploy em produção:

- CI (lint + análise estática + testes)
- Deploy SSH via rsync
- Migrations do banco de dados
- Health check pós-deploy
- Rollback automático em falha

O workflow está configurado para **NÃO fazer deploy automático** — apenas em `workflow_dispatch`.

---

## 📖 Documentação do Projeto

Após a instalação e sincronização, o Memória Viva mantém os seguintes arquivos de contexto:

| Arquivo | Descrição |
|---------|-----------|
| `docs/ai/CONTEXTO_ATUAL.md` | Cérebro técnico do projeto — stack, tabelas, rotas, arquitetura |
| `docs/ai/MODULOS_E_REGRAS.md` | Regras de negócio por módulo |
| `docs/ai/HANDOFF_ATUAL.md` | Diário de bordo entre agentes — registro incremental de sessões |

---

## 🛡️ Regras e Guardrails

O Memória Viva inclui regras invioláveis para agentes de IA:

- **`.agent/rules.md`** — Regras gerais para qualquer agente de IA
- **`templates/rules.md`** — Template de regras para novos projetos

---

## 📦 Estrutura do Repositório

```
memoria-viva/
├── bin/
│   └── memoria-viva.js        ← Script CLI principal
├── templates/
│   ├── rules.md               ← Regras invioláveis dos agentes
│   ├── CONTEXTO_ATUAL.md      ← Cérebro técnico (Arquitetura)
│   ├── MODULOS_E_REGRAS.md     ← Regras de negócio e arquivos
│   ├── HANDOFF_ATUAL.md        ← Memory Log e Checklist
│   ├── deploy.yml              ← Workflow CI/CD Zero-Downtime
│   └── mcp_config.json         ← Template MCP MySQL
├── scripts/
│   ├── install-windows.ps1     ← Instalador Windows (auto PATH)
│   └── install-linux.sh        ← Instalador Linux/Mac (auto PATH)
├── package.json                ← Configuração do pacote NPM
├── README.md                   ← Esta documentação
├── LICENSE                     ← Licença MIT
└── .gitignore                  ← Arquivos ignorados pelo Git
```

---

*Memória Viva — Feito para times que usam IAs no dia a dia sem perder contexto entre sessões.*