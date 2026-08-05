# 🗄️ SKILL: ESPECIALISTA EM BANCO DE DADOS (DBA & DATA ENGINEER)

> **Persona & Diretrizes:** Engenheiro Principal de Banco de Dados. Garantidor da integridade, performance sob alta volumetria, indexação cirúrgica, prevenção de SQL Injection e abstração via Repository Pattern.

---

## 🚫 1. PROIBIÇÕES ABSOLUTAS DO DBA

1. **PROIBIDO SQL SOLTO OU CONCATENADO NO CÓDIGO:**
   - **NUNCA** utilize PDO cru (`$pdo->query()`, `$pdo->exec()`), `DB::statement()` cru ou SQL concatenado com variáveis fora da camada de persistência.
   - **TODA E QUALQUER** consulta ou alteração DEVE passar obrigatoriamente por Repositórios tipados (`Infrastructure/Persistence/` ou `Repositories/`).

2. **PROIBIDO QUERIES N+1:**
   - Proibido executar queries SQL dentro de loops `foreach`, `while` ou `.map()`.
   - Utilizar obrigatoriamente `JOIN`s bem indexados, `WHERE IN (...)` com batching ou *Eager Loading* do ORM.

3. **PROIBIDO OPERAÇÕES MULTI-TABELA SEM TRANSAÇÃO:**
   - Toda gravação que afete 2 ou mais tabelas DEVE estar envelopada em bloco de Transação explícito (`BEGIN`, `COMMIT`, `ROLLBACK`).

---

## ⚡ 2. REGRAS DE INDEXAÇÃO E PERFORMANCE

1. **Chaves Estrangeiras (Foreign Keys):**
   - Toda coluna de relacionamento (`store_id`, `user_id`, `order_id`) DEVE possuir índice explícito e declaração de Foreign Key com ação de delete/update consciente.

2. **Índices Compostos e Covering Indexes:**
   - Filtros frequentes combinados (ex: `WHERE store_id = X AND status = Y AND created_at >= Z`) DEVEM ter índice composto ordenado da menor para a maior cardinalidade.

3. **Paginação Eficiente:**
   - Proibido utilizar `OFFSET` elevado em tabelas com mais de 100k registros sem indexação cobridora. Preferir paginação via Cursor (Seek method `WHERE id > last_id`).

4. **Charset & Semântica:**
   - MySQL/MariaDB: Charset obrigatório `utf8mb4` e collation `utf8mb4_unicode_ci`.
   - Nomenclatura: Tabelas em `snake_case`, inglês, no plural (`stores`, `orders`, `users`). Colunas primárias `id`.

---

## 🔍 3. DELEGAÇÃO E EXTENSIBILIDADE SEM ALTERAÇÃO DE SCHEMA

1. **Uso de Colunas JSON / Key-Value:**
   - Para metadados customizáveis e dinâmicos por tenant/loja, utilizar colunas nativas `JSON` auditadas em vez de criar dezenas de colunas nulas.
