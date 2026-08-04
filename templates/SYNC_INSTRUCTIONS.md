# 🔄 Instruções de Sincronização — Memória Viva

> **EXECUTE ESTE COMANDO após instalar o Memória Viva no projeto:**
>
> ```bash
> npx memoria-viva sync
> ```
>
> Ou, se preferir o modo interativo:
>
> ```bash
> npx memoria-viva sync --wizard
> ```
>
> Este comando instrui o agente de IA a sincronizar o Memória Viva com o projeto,
> extraindo regras de negócio, estruturando a organização de pastas, atualizando
> todos os arquivos de contexto, documentação e regras para que funcionem
> seguindo o padrão do Memória Viva.

---

## 📋 O que o comando `sync` faz

O comando `npx memoria-viva sync` executa os seguintes passos automaticamente:

### 1. 🔍 Análise do Projeto
- Detecta a stack do projeto (PHP Slim 4, Laravel, Node.js, etc.)
- Mapeia a estrutura de diretórios e arquivos existentes
- Identifica frameworks, bibliotecas e dependências utilizadas
- Detecta o padrão de roteamento, controllers e models

### 2. 📖 Extração de Regras de Negócio
- Lê os controllers, routes e services para identificar regras de negócio
- Analisa o schema do banco de dados (tabelas, relacionamentos, constraints)
- Identifica módulos, funcionalidades e fluxos do sistema
- Extrai regras de validação, permissões e autorizações

### 3. 📝 Atualização dos Arquivos de Contexto
- **`docs/ai/CONTEXTO_ATUAL.md`** — Preenche com a stack real, tabelas do banco (via MCP MySQL), rotas e arquitetura do projeto
- **`docs/ai/MODULOS_E_REGRAS.md`** — Atualiza com as regras de negócio por módulo identificadas no projeto
- **`docs/ai/HANDOFF_ATUAL.md`** — Registra o estado atual do projeto para continuidade entre agentes

### 4. 🛡️ Alinhamento de Regras e Guardrails
- Atualiza `.agent/rules.md` com regras específicas do projeto
- Atualiza `AGENTS.md` com diretrizes de agente para a stack detectada
- Atualiza `.cursorrules` com regras para o Cursor
- Garante que todas as regras estejam alinhadas com o padrão Memória Viva

### 5. 📂 Organização da Estrutura do Projeto
- Garante que a estrutura de diretórios siga o padrão Memória Viva:

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
├── routes/
│   ├── index.php              ← Entrypoint mestre das rotas
│   ├── web/                   ← Rotas WEB (admin.php, store.php, client.php, site.php)
│   └── api/v1/                ← APIs RESTful (auth.php, stores.php, orders.php, drivers.php)
├── skills/
│   ├── database-sync.md       ← Skill: Inspeção e Migrations via MCP
│   └── route-sanitizer.md     ← Skill: Diagnóstico de 404/500
├── tools/
│   └── mcp-mysql.js           ← Runner seguro do servidor MCP MySQL
├── config/
│   └── mcp_config.json        ← Template de conexão MCP
├── .github/workflows/
│   └── deploy.yml             ← CI/CD template genérico
├── .env.mcp                   ← Credenciais MySQL (NÃO versionado)
├── .env.mcp.example           ← Template de credenciais
├── .mcp.json                  ← Config MCP para Claude Code
├── .cursor/mcp.json           ← Config MCP para Cursor
├── .vscode/mcp.json           ← Config MCP para VS Code
├── opencode.json              ← Config MCP para OpenCode
├── AGENTS.md                  ← Regras para Claude Code / Antigravity
├── .cursorrules               ← Regras para Cursor
└── SYNC_INSTRUCTIONS.md       ← Instruções de sincronização para o agente
```

- Cria diretórios faltantes se necessário
- Verifica que todos os arquivos de configuração MCP estão presentes

### 6. ✅ Validação Final
- Verifica que todos os arquivos de contexto foram preenchidos
- Confirma que as regras estão consistentes com a estrutura do projeto
- Gera um relatório de sincronização com os itens atualizados

---

## 🔧 Como usar

### Modo Wizard (Interativo)
```bash
npx memoria-viva sync --wizard
```
O agente guia você passo a passo, fazendo perguntas sobre o projeto e preenchendo os arquivos de contexto.

### Modo Silencioso (CI/Automação)
```bash
npx memoria-viva sync --silent
```
Usa variáveis de ambiente para configuração automática:
```bash
PROJECT_NAME="meu-projeto" \
STACK="php-slim4" \
DB_HOST="127.0.0.1" \
DB_PORT="3306" \
DB_NAME="meu_banco" \
DB_USER="root" \
DB_PASS="senha" \
npx memoria-viva sync --silent
```

### Modo Dry Run (Simulação)
```bash
npx memoria-viva sync --dry-run
```
Simula a sincronização sem alterar nenhum arquivo, mostrando o que seria feito.

---

## 📌 Após a Sincronização

1. **Revise os arquivos de contexto** — Verifique se `docs/ai/CONTEXTO_ATUAL.md`, `docs/ai/MODULOS_E_REGRAS.md` e `docs/ai/HANDOFF_ATUAL.md` refletem corretamente o projeto
2. **Preencha credenciais** — Atualize `.env.mcp` com as credenciais do banco de dados
3. **Reinicie a IDE** — Para carregar o MCP MySQL e as novas regras
4. **Valide com o agente** — Peça ao agente para ler os arquivos de contexto e confirmar que tudo está correto

---

## 🧠 Princípios da Sincronização

- **Nunca apague código existente** — A sincronização organiza e documenta, não remove
- **Sempre atualize a documentação** — Nenhuma alteração é considerada completa sem atualizar os arquivos de contexto
- **Regras são invioláveis** — As regras em `.agent/rules.md` e `AGENTS.md` devem ser seguidas por todos os agentes
- **Memória persistente** — Todos os contextos e decisões são registrados para garantir continuidade entre sessões de agentes

---

*Memória Viva — Sincronize seu projeto com inteligência.*
