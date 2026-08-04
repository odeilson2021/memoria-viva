# 🧠 Memória Viva — AI Context & Governance Engine

> **Memória que sobrevive entre chats.**
> Instala em qualquer projeto PHP + MySQL em menos de 60 segundos e deixa os agentes de IA
> (Cursor, Claude, Gemini, OpenCode, Windsurf, Antigravity) prontos para trabalhar com
> contexto completo, regras de negócio e MCP MySQL configurado.

---

## ⚡ Instalação Rápida

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

- **Node.js 18+** (para o CLI e o MCP MySQL)
- **Git** (para detectar a raiz do projeto)
- **PHP 8.2+** e **MySQL** (para projetos PHP)

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

*Memória Viva — Feito para times que usam IAs no dia a dia sem perder contexto entre sessões.*
