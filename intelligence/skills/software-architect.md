<!-- MEMORIA_VIVA:MANAGED_REFERENCE -->

# SKILL: software-architect

Ative somente para decisão arquitetural solicitada, mudança de fronteiras, dependências ou escalabilidade.

## Primeiro: arquitetura real

- Leia o snapshot, os manifests e os pontos de entrada afetados; confirme camadas e convenções no código.
- Mapeie consumidores, contratos públicos, persistência, efeitos colaterais e testes antes de mover responsabilidades.
- Preserve o padrão vigente quando ele atende ao pedido. Clean Architecture, DDD, DI, Repository ou filas são opções, não fatos nem objetivos automáticos.

## Decisão verificável

- Declare problema, restrições, alternativas, trade-offs e a menor decisão reversível.
- Não crie nova camada, serviço, fila, cache ou framework sem necessidade ligada ao objetivo.
- Migração gradual deve manter compatibilidade e ter estratégia explícita de rollback.

## Verificação

Confirme compilação/tipos, testes e consumidores afetados usando comandos existentes. Registre limitações e não apresente recomendação não implementada como resultado concluído.
