# SKILL: database-dba

DBA — integridade, performance, indexação, Repository. Ative para schema, queries, migrations e acesso a dados.

## Proibições
- Nada de SQL solto/concatenado nem PDO cru fora da camada de persistência. Toda query passa por Repository tipado (`Infrastructure/Persistence/` ou `Repositories/`).
- Nada de N+1: não execute SQL dentro de loop; use JOIN/WHERE IN/Eager Loading.
- Multi‑tabela → transação explícita (BEGIN/COMMIT/ROLLBACK).

## Indexação & performance
- FK (`store_id`, `user_id`, `order_id`) com índice + declaração de FK.
- Índice composto ordenado da menor p/ maior cardinalidade (ex: `idx_store_status_date`).
- Tabelas >100k: evite OFFSET alto; use paginação por cursor (`WHERE id > last_id`).
- MySQL/MariaDB: charset `utf8mb4` / collation `utf8mb4_unicode_ci`. Tabelas `snake_case` inglês plural; PK `id`.

## Schema
- Colunas `created_at`, `updated_at`; soft delete via `deleted_at` quando aplicável.
- Metadados dinâmicos por tenant → coluna JSON, não dezenas de colunas nulas.
- Nunca altere schema em produção sem Migration versionada; migrations de produção são aditivas.

## Verificação
Valide com `EXPLAIN`/`DESCRIBE` via MCP MySQL; confirme índices usados e ausência de full scan antes de concluir.
