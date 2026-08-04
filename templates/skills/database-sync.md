---
name: database-sync
description: "Memória Viva — Skill para inspeção do schema MySQL via MCP, detecção de divergências entre banco e ORM, e geração de Migrations seguras. Ativa quando o agente precisa auditar tabelas, criar migrations ou comparar o schema real com as entidades do código."
---

# 🗄️ Skill: Database Sync — Inspeção e Migrations via MCP

## 🎯 Objetivo
Inspecionar o schema real do banco via MCP MySQL, comparar com as entidades ORM,
detectar divergências e gerar migrations seguras (sem destruir dados).

---

## 📋 Protocolo de Execução

### Passo 1 — Ler o Contexto
- `docs/ai/CONTEXTO_ATUAL.md` → tabelas canônicas e entidades mapeadas
- `docs/ai/HANDOFF_ATUAL.md` → migrations pendentes ou em andamento

### Passo 2 — Inspecionar via MCP MySQL
```
list_tables                         → Lista todas as tabelas
read_table_schema({table: "nome"})  → Schema completo (colunas, tipos, índices, FKs)
get_database_summary                → Resumo geral do banco
run_select_query({sql: "..."})      → Leitura segura (apenas SELECT)
search_schema({keyword: "..."})     → Busca por nome de coluna ou tabela
```

### Passo 3 — Comparar com as Entidades ORM
- Listar entidades em `app/Domain/Entity/` ou `app/Models/`
- Comparar cada entidade com o schema real via `read_table_schema`
- Identificar: colunas faltando, tipos divergentes, índices ausentes

### Passo 4 — Gerar Migration
```bash
# Listar status
php bin/console doctrine:migrations:status

# Gerar diff automático (SafeMigrationGuard bloqueia DROP/TRUNCATE)
MIGRATION_SAFE_GUARD=1 php bin/console doctrine:migrations:diff

# Dry-run antes de aplicar
MIGRATION_SAFE_GUARD=1 php bin/console doctrine:migrations:migrate --dry-run

# Aplicar localmente
MIGRATION_SAFE_GUARD=1 php bin/console doctrine:migrations:migrate --no-interaction
```

### Passo 5 — Verificar e Registrar
1. Confirmar via MCP que o schema foi atualizado corretamente.
2. Atualizar `docs/ai/CONTEXTO_ATUAL.md` com as tabelas/colunas novas.
3. Registrar no `docs/ai/HANDOFF_ATUAL.md`:
   - Nome da migration gerada
   - Tabelas afetadas
   - Tipo: `ADD COLUMN`, `CREATE TABLE`, `CREATE INDEX`
   - ⚠️ Nenhum `DROP` sem aprovação explícita do usuário

---

## ⚠️ SafeMigrationGuard
O sistema bloqueia automaticamente:
- `DROP TABLE` | `DROP COLUMN` | `TRUNCATE` | `RENAME COLUMN`

Operações destrutivas exigem: aprovação do usuário + documentação no HANDOFF.

---

## 🔑 Referências
- Entidades: `app/Domain/*/Entity/*.php` ou `app/Models/`
- Repositórios: `app/Infrastructure/Persistence/*Repository.php`
- Migrations: `database/migrations/`
