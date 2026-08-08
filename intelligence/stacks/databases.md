# Diretrizes condicionais — bancos de dados

> Confirme engine, versão, schema vivo, migrations e camada de acesso antes de propor alteração.

- Preserve nomenclatura, chaves, timestamps, estratégia de ID e soft delete existentes; não trate exemplos como padrão obrigatório.
- Queries com entrada externa devem ser parametrizadas pela abstração já adotada.
- Transações protegem conjuntos que precisam ser atômicos; isolamento, retry e idempotência dependem do fluxo real.
- Índices são justificados por consultas e planos de execução, considerando filtros, ordenação, seletividade e custo de escrita.
- Toda mudança de schema deve ser versionada e testada em ambiente descartável. Compatibilidade e rollback precisam ser avaliados; não aplique em produção como validação.
- Tabelas mencionadas em migrations não provam o schema atual. Confirme no banco quando a tarefa depender disso.
