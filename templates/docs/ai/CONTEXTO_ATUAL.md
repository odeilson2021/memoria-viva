# 🧠 CÉREBRO TÉCNICO — CONTEXTO ATUAL DO PROJETO

> **Memória Viva — Documento vivo.** Atualizado a cada sessão de desenvolvimento.
> Este arquivo é o ponto de partida obrigatório para qualquer agente de IA.

---

## 🏗️ Stack e Arquitetura

| Camada | Tecnologia |
|--------|-----------|
| **Backend** | PHP 8.2+ Strict Types |
| **Framework** | *(preencher: Slim 4, Laravel 10+, etc.)* |
| **Banco de dados** | MySQL / MariaDB (`utf8mb4_unicode_ci`) |
| **ORM / Migrations** | *(preencher: Doctrine, Eloquent, Phinx)* |
| **Injeção de Dependência** | *(preencher: PHP-DI, Laravel Container)* |
| **Logs** | Monolog |
| **Testes** | PHPUnit |
| **CI/CD** | GitHub Actions → `deploy.yml` |
| **Servidor MCP** | `@berthojoris/mcp-mysql-server` via `tools/mcp-mysql.js` |

> ⚠️ **Agente: Substitua os campos acima com a stack real do projeto.**

---

## 📁 Estrutura de Pastas

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

> ⚠️ **Agente: Atualize com a estrutura de pastas real do projeto.**

---

## 🗄️ Tabelas do Banco de Dados

> ⚠️ **Agente: Preencha usando MCP MySQL:**
> `list_tables` → `read_table_schema({table: "nome"})` para cada tabela

| Tabela | Descrição | Colunas Principais |
|--------|-----------|-------------------|
| *(use list_tables via MCP para preencher)* | | |

---

## 🛣️ Rotas por Módulo

> ⚠️ **Agente: Preencha com as rotas reais de `routes/`**

| Módulo | Prefixo | Middleware | Arquivo |
|--------|---------|-----------|---------|
| *(preencher)* | | | |

---

## 🔐 Sistema de Sessões (`auth_sessions`)

| Módulo | Validade | Renovação |
|--------|---------|-----------|
| Admin / Master | **24 horas** | Sem renovação automática |
| Operacional / Lojista / App / Cliente | **7 dias** | Idle Refresh automático |

> As sessões são persistidas no banco de dados na tabela `auth_sessions`.
> Isso garante que logins sobrevivam a reinícios de servidor e deploys via Git.

---

## 📅 Histórico de Atualizações

| Data | Agente | O que foi feito |
|------|--------|----------------|
| *(data)* | Instalador | Inicialização da Memória Viva |
