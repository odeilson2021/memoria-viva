# 🧠 Memória Viva — AI Context & Governance Engine

> **Memória que sobrevive entre chats.**
> Instala em qualquer projeto em menos de 60 segundos e deixa os agentes de IA
> (Cursor, Claude, Gemini, OpenCode, Windsurf, Antigravity) prontos para trabalhar com
> contexto completo, regras de negócio e MCP MySQL configurado.

---

## 🌐 Instalação Global (Recomendado para Agentes)

Instale o Memória Viva globalmente no sistema para que ele esteja disponível em todos os projetos e IDEs:

### Opção 1 — npm global (Qualquer plataforma)
```bash
npm install -g memoria-viva
```

### Opção 2 — curl (Linux / Mac / WSL)
```bash
curl -fsSL https://raw.githubusercontent.com/yuslen/memoria-viva/main/install.sh --global | bash
```

### Opção 3 — PowerShell (Windows)
```powershell
irm https://raw.githubusercontent.com/yuslen/memoria-viva/main/install.ps1 -Global | iex
```

### Verificando a instalação global
```bash
memoria-viva --help
```

### Como funciona a instalação global

Quando instalado globalmente, o Memória Viva:
1. Cria um diretório de configuração global:
   - **Windows:** `%APPDATA%/memoria-viva/`
   - **Linux/Mac:** `~/.memoria-viva/`
2. Armazena todos os templates e configurações nesse diretório
3. Permite que qualquer agente de IA o utilize de qualquer projeto
4. Funciona com qualquer IDE (Cursor, Claude, Gemini, OpenCode, Windsurf, Antigravity)

### Usando o Memória Viva em qualquer projeto

Após a instalação global, basta navegar até qualquer projeto e executar:

```bash
cd /caminho/para/seu/projeto
npx memoria-viva init
```

Ou, se o projeto já tiver o Memória Viva instalado localmente:

```bash
npx memoria-viva sync
```

O Memória Viva detectará automaticamente:
- A raiz do projeto (via Git)
- A stack do projeto (PHP Slim 4, Laravel, Node.js, etc.)
- A estrutura de pastas existente
- Os arquivos de configuração já instalados

---

## ⚡ Instalação Rápida (Local)

### Opção 1 — npx (Qualquer plataforma)
```bash
npx memoria-viva init
```

### Opção 2 — curl (Linux / Mac / WSL)
```bash
curl -fsSL https://raw.githubusercontent.com/yuslen/memoria-viva/main/install.sh | bash
```

### Opção 3 — PowerShell (Windows)
```powershell
irm https://raw.githubusercontent.com/yuslen/memoria-viva/main/install.ps1 | iex
```

### Opção 4 — Clone e rode
```bash
git clone https://github.com/yuslen/memoria-viva.git /tmp/memoria-viva
cd /tmp/memoria-viva && node cli.js
```

---

## 📦 Como Clonar o Memória Viva no Seu Projeto

Para utilizar o Memória Viva em um projeto existente, clone o repositório dentro do projeto:

```bash
# Dentro do diretório do seu projeto:
git clone https://github.com/yuslen/memoria-viva.git memoria-viva

# Ou use npx diretamente (não precisa clonar manualmente):
npx memoria-viva init
```

Após clonar, execute o instalador:

```bash
cd memoria-viva && node cli.js
```

O instalador detectará automaticamente a raiz do seu projeto (via Git) e copiará
todos os arquivos de configuração para os locais corretos.

---

## 🎯 O que o instalador faz

| # | Ação | Detalhe |
|---|------|---------|
| 1 | **Cria a estrutura** | `.agent/`, `docs/ai/`, `skills/`, `tools/`, `config/` |
| 2 | **Copia guardrails** | `rules.md`, `AGENTS.md`, `.cursorrules` com regras invioláveis |
| 3 | **Configura MCP MySQL** | `.mcp.json`, `.cursor/mcp.json`, `opencode.json`, `.vscode/mcp.json` |
| 4 | **Gera `.env.mcp`** | Credenciais do banco (não versionadas) |
| 5 | **Instala skills** | `database-sync.md`, `route-sanitizer.md` |
| 6 | **Gera instruções de sync** | `SYNC_INSTRUCTIONS.md` — guia para o agente sincronizar o projeto |
| 7 | **Inicializa docs** | Templates de contexto para o agente preencher com o projeto real |
| 8 | **Configura CI/CD** | `.github/workflows/deploy.yml` template genérico |

---

## 🧩 Suporte por Stack

O Memória Viva suporta múltiplas stacks de projeto. Ao executar `npx memoria-viva init`,
o instalador detecta automaticamente a stack do seu projeto.

### PHP — Slim 4

| Item | Detalhe |
|------|---------|
| **Stack detectada** | `php-slim4` |
| **Estrutura esperada** | `app/`, `config/`, `routes/`, `database/`, `public/` |
| **ORM/Migrations** | Doctrine ORM + Migrations |
| **Padrão de controllers** | Single Action Controllers (Invokable Classes) |
| **Injeção de dependência** | PHP-DI Container |
| **Banco de dados** | MySQL / MariaDB (`utf8mb4_unicode_ci`) |
| **Testes** | PHPUnit |
| **Análise estática** | PHPStan |
| **CI/CD** | `.github/workflows/deploy.yml` — deploy via SSH rsync |

**Como usar em um projeto Slim 4 existente:**
```bash
cd /caminho/para/seu/projeto-slim4
npx memoria-viva init
```

Após a instalação, o agente de IA terá contexto completo sobre:
- Rotas em `routes/web/` e `routes/api/v1/`
- Controllers como Single Action Controllers
- Repositories em `app/Infrastructure/Persistence/`
- Tabelas do banco via MCP MySQL

---

### PHP — Laravel

| Item | Detalhe |
|------|---------|
| **Stack detectada** | `php-laravel` |
| **Estrutura esperada** | `app/`, `config/`, `routes/`, `database/`, `resources/` |
| **ORM/Migrations** | Eloquent ORM + Laravel Migrations |
| **Padrão de controllers** | Controller classes com métodos resource |
| **Injeção de dependência** | Laravel Service Container |
| **Banco de dados** | MySQL / PostgreSQL / SQLite |
| **Testes** | PHPUnit / Pest |
| **CI/CD** | `.github/workflows/deploy.yml` — adaptável para Laravel Forge, Vapor, etc. |

**Como usar em um projeto Laravel existente:**
```bash
cd /caminho/para/seu/projeto-laravel
npx memoria-viva init
```

Após a instalação, o agente de IA terá contexto sobre:
- Rotas resource e rotas API
- Models Eloquent e Migrations
- Service Providers e Dependency Injection
- Tabelas do banco via MCP MySQL

---

### Node.js

| Item | Detalhe |
|------|---------|
| **Stack detectada** | `node` |
| **Estrutura esperada** | `src/`, `config/`, `routes/`, `models/`, `tests/` |
| **ORM** | Prisma / TypeORM / Sequelize |
| **Padrão de controllers** | Express / Fastify handlers |
| **Banco de dados** | MySQL / PostgreSQL / SQLite |
| **Testes** | Jest / Vitest / Mocha |
| **CI/CD** | `.github/workflows/deploy.yml` — adaptável para Node.js deployments |

**Como usar em um projeto Node.js existente:**
```bash
cd /caminho/para/seu/projeto-node
npx memoria-viva init
```

---

### Outras Stacks

O Memória Viva também funciona com outras stacks. Ao executar o instalador,
ele detectará automaticamente a stack com base nos arquivos do projeto:

| Stack | Como detectada | Arquivo-chave |
|-------|---------------|---------------|
| PHP genérico | `composer.json` presente | `composer.json` |
| Python | `requirements.txt` ou `pyproject.toml` | `requirements.txt` |
| Ruby | `Gemfile` presente | `Gemfile` |
| Go | `go.mod` presente | `go.mod` |
| .NET | `.csproj` presente | `*.csproj` |

Se a stack não for detectada automaticamente, você pode especificá-la manualmente:
```bash
npx memoria-viva init --silent
# Defina a variável de ambiente STACK antes de executar:
# STACK=php-slim4 npx memoria-viva init --silent
```

---

## 🧰 Comandos CLI

| Comando | Descrição |
|---------|-----------|
| `npx memoria-viva init` | Inicializa o Memória Viva no projeto (wizard interativo) |
| `npx memoria-viva init --silent` | Modo não interativo (usa env vars) |
| `npx memoria-viva init --dry-run` | Simula sem alterar arquivos |
| `npx memoria-viva sync` | Sincroniza o contexto do projeto com o Memória Viva |
| `npx memoria-viva sync --wizard` | Sync interativo com perguntas guiadas |
| `npx memoria-viva sync --silent` | Sync não interativo |
| `npx memoria-viva sync --dry-run` | Simula sync sem alterar arquivos |
| `npx memoria-viva status` | Verifica o estado atual da instalação |
| `npx memoria-viva configure` | Configura MCP e integração com IDEs |
| `npx memoria-viva update` | Atualiza os arquivos do Memória Viva |
| `npx memoria-viva help` | Mostra os comandos disponíveis |

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

Após o sync, o agente de IA tem todo o contexto do projeto organizado e pronto para trabalhar.

---

## 📊 Comando `status` — Verificação de Estado

O comando `status` verifica quais arquivos do Memória Viva estão presentes no projeto e quais estão ausentes, fornecendo um resumo claro do estado da instalação.

---

## ⚙️ Comando `configure` — Configuração de MCP e IDEs

O comando `configure` configura os arquivos de MCP (`.mcp.json`, `.cursor/mcp.json`, `.vscode/mcp.json`, `opencode.json`) e atualiza o `.gitignore` com as entradas necessárias.

---

## 🔄 Comando `update` — Atualização de Arquivos

O comando `update` compara os arquivos do template do kit com os arquivos instalados no projeto e atualiza os que diferem, criando backups dos arquivos modificados pelo usuário.

---

## 📁 O que é instalado no seu projeto

```
seu-projeto/
├── .agent/rules.md               ← Guardrails invioláveis para qualquer IA
├── AGENTS.md                     ← Regras para Claude Code / Antigravity
├── .cursorrules                  ← Regras para Cursor
├── SYNC_INSTRUCTIONS.md          ← Instruções de sincronização para o agente
├── .env.mcp                      ← Credenciais MySQL (NÃO versionado)
├── .env.mcp.example              ← Template de credenciais
├── .mcp.json                     ← Config MCP para Claude Code
├── .cursor/mcp.json              ← Config MCP para Cursor
├── .vscode/mcp.json              ← Config MCP para VS Code
├── opencode.json                 ← Config MCP para OpenCode
├── config/mcp_config.json        ← Template de conexão MCP
├── docs/ai/
│   ├── CONTEXTO_ATUAL.md         ← Cérebro técnico do projeto
│   ├── MODULOS_E_REGRAS.md       ← Regras de negócio por módulo
│   └── HANDOFF_ATUAL.md          ← Diário de bordo entre agentes
├── skills/
│   ├── database-sync.md          ← Skill: Inspeção e Migrations via MCP
│   └── route-sanitizer.md        ← Skill: Diagnóstico de 404/500
└── tools/mcp-mysql.js            ← Runner seguro do servidor MCP MySQL
```

---

## 🔧 Após a Instalação

### 1. Sincronize o projeto com o Memória Viva

Cole este comando para o agente de IA:

```
npx memoria-viva sync
```

Ou leia o arquivo `SYNC_INSTRUCTIONS.md` para instruções detalhadas.

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
| **Python 3+** | Projetos Python (opcional) |
| **Go 1.21+** | Projetos Go (opcional) |

---

## 🧩 Modos de Uso

| Modo | Comando |
|------|---------|
| Wizard interativo | `npx memoria-viva` |
| Inicializar | `npx memoria-viva init` |
| Sincronizar | `npx memoria-viva sync` |
| Verificar estado | `npx memoria-viva status` |
| Configurar | `npx memoria-viva configure` |
| Atualizar | `npx memoria-viva update` |
| Silencioso (CI/automação) | `npx memoria-viva init --silent` |
| Dry run (simular) | `npx memoria-viva init --dry-run` |
| Via env vars | `PROJECT_NAME="X" DB_HOST="Y" npx memoria-viva init --silent` |

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
- **`AGENTS.md`** — Diretrizes para Claude Code e Antigravity
- **`.cursorrules`** — Regras específicas para o Cursor

---

## 🔄 CI/CD — Deploy em Produção

O Memória Viva inclui um template genérico de GitHub Actions para deploy em produção:

```yaml
# .github/workflows/deploy.yml
# Template configurado para NÃO fazer deploy automático
# Use `npx memoria-viva configure` para gerar o workflow
```

O workflow inclui:
- CI (lint + análise estática + testes)
- Deploy SSH via rsync
- Migrations do banco de dados
- Health check pós-deploy
- Rollback automático em falha

---

## 📦 Estrutura do Repositório Memória Viva

```
memoria-viva/
├── cli.js                        ← CLI principal com todos os comandos
├── package.json                  ← Configuração do pacote npm
├── install.sh                    ← Instalador Linux / Mac / WSL
├── install.ps1                   ← Instalador Windows PowerShell
├── README.md                     ← Esta documentação
├── LICENSE                       ← Licença MIT
├── templates/                    ← Templates instalados nos projetos
│   ├── .agent/rules.md
│   ├── AGENTS.md
│   ├── .cursorrules
│   ├── .github/workflows/deploy.yml  ← Template CI/CD genérico
│   ├── config/mcp_config.json
│   ├── docs/ai/
│   │   ├── CONTEXTO_ATUAL.md
│   │   ├── MODULOS_E_REGRAS.md
│   │   └── HANDOFF_ATUAL.md
│   ├── env.mcp.example
│   ├── skills/
│   │   ├── database-sync.md
│   │   └── route-sanitizer.md
│   ├── SYNC_INSTRUCTIONS.md     ← Instruções de sincronização
│   └── tools/mcp-mysql.js
└── .github/workflows/
    └── deploy.yml                ← Workflow de deploy do próprio projeto
```

---

*Memória Viva — Feito para times que usam IAs no dia a dia sem perder contexto entre sessões.*
