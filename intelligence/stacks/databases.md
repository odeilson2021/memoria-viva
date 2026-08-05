# 🗄️ DIRETRIZES DE TECNOLOGIA: BANCO DE DADOS (MYSQL / POSTGRESQL)

> **Escopo:** Diretrizes de integridade, schema, ORMs, migrations e otimização para MySQL, MariaDB e PostgreSQL.

---

## 📐 1. CONVENÇÃO DE SCHEMA E PADRÕES DE TABELA

1. **Nomenclatura Padrão:**
   - Tabelas em `snake_case`, em inglês, no plural: `users`, `stores`, `order_items`, `auth_sessions`.
   - Colunas em `snake_case`: `first_name`, `created_at`, `updated_at`, `deleted_at`.
   - Chave Primária: Sempre `id` (BIGINT UNSIGNED AUTO_INCREMENT no MySQL ou UUID / BIGSERIAL no Postgres).
   - Chaves Estrangeiras: `<singular_table>_id` (ex: `store_id`, `user_id`).

2. **Gerenciamento de Datas:**
   - Toda tabela DEVE ter colunas `created_at` e `updated_at` (TIMESTAMP / DATETIME UTC).
   - Se suporte a Soft Delete for necessário, utilizar `deleted_at` (DATETIME NULLable).

---

## ⚡ 2. REGRAS DE INDEXAÇÃO E CONSULTAS

1. **Indexação Consciente:**
   - Índices em todas as Foreign Keys (`WHERE store_id = ?`).
   - Índices compostos para consultas de ordenação e filtro frequente (ex: `INDEX idx_store_status_date (store_id, status, created_at)`).

2. **Integridade Transacional:**
   - Operações em múltiplas tabelas DEVEM estar dentro de blocos de transação com suporte a Rollback em caso de exceção.

3. **Migrations:**
   - NUNCA alterar o schema diretamente no banco de produção sem uma Migration versionada em código.
   - Migrations de produção DEVEM ser estritamente aditivas para evitar downtime.
