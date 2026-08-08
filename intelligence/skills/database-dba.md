<!-- MEMORIA_VIVA:MANAGED_REFERENCE -->

# SKILL: database-dba

Ative para schema, queries, migrations, integridade, concorrência e performance de dados.

## Evidência antes da mudança

- Confirme engine/versão, schema real, migration history, camada de acesso usada e consultas afetadas.
- Use `EXPLAIN`/plano de execução e métricas representativas antes de afirmar gargalo ou benefício de índice.
- Preserve convenções existentes; não introduza Repository, ORM, soft delete, timestamps, multi-tenancy ou nomenclatura sem evidência/requisito.

## Integridade

- Parametrize entrada externa e respeite a abstração de dados vigente.
- Use transação quando o conjunto precisa ser atômico; trate retry/idempotência conforme o banco e o fluxo reais.
- Migrations devem ser versionadas, testadas em ambiente descartável e acompanhadas de compatibilidade/rollback. Nunca aplique em produção como simples verificação.
- Índices derivam das consultas, filtros, ordenação, seletividade e custo de escrita — não de uma regra fixa de cardinalidade.

## Verificação

Teste migration para frente/rollback quando suportado, integridade e concorrência relevantes, e compare o plano de execução. Registre o que não pôde ser confirmado no banco vivo.
