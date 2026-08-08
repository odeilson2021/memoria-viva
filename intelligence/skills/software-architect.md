# SKILL: software-architect

Arquiteto de software — Clean Architecture, SOLID, DDD, IoC. Ative para decisões de arquitetura, camadas e escalabilidade.

## Princípios
- Separação rígida: Actions/Controllers (recebe req, valida DTO, chama Domain) → Domain/Services (regra pura) → Infrastructure/Persistence (Repositories, conectores).
- Módulos por domínio isolados (Admin, Store, Driver, Client), compartilhando só entidades/repos necessários.
- Inversão de Dependência: alto nível depende de abstração; use Container DI (PHP‑DI, Laravel Container, AdonisJS IoC, NestJS DI).

## Escalabilidade
- Operações pesadas (e‑mail, push, relatórios, webhooks) → fila/worker (Redis/RabbitMQ/SQS), fora da requisição HTTP.
- Cache de leitura com chaves versionadas/tags para invalidação atômica.
- App stateless: sessões em `auth_sessions` (banco/Redis), não em memória de processo.

## Guardrails
- Não remova código existente sob pretexto de "refatorar" sem mapear a árvore de chamadas.
- Prefira Single Action Controllers (Invokable) a "fat controllers".

## Verificação
Após propor mudança arquitetural, confirme compilação/tipos e testes da stack (PHP: `composer analyse` + `phpunit`; AdonisJS: `tsc --noEmit` + `npm test`).
