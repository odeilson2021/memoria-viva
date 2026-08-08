# Diretrizes condicionais — Node.js

> Ative somente após confirmar runtime, framework, module system, linguagem e scripts em `package.json`/configuração.

## Preservação

- Não converta Node genérico, Express, Fastify, Nest, Next, React/Vite ou outro projeto para AdonisJS.
- Preserve CommonJS/ESM, JavaScript/TypeScript, estrutura, DI, validação e camada de dados existentes salvo mudança explicitamente solicitada.
- Use APIs assíncronas no caminho de I/O e trate erros conforme o mecanismo já adotado; callbacks não são defeito por si só.

## Por framework comprovado

- **AdonisJS:** confirme `@adonisjs/core` e use seus comandos/IoC apenas se já fizerem parte do projeto.
- **NestJS:** preserve módulos/providers e o container nativo.
- **Express/Fastify:** preserve routers, hooks/middlewares e tratamento central de erro existentes.
- **Next.js/frontends:** diferencie código servidor/cliente e não imponha arquitetura de backend não existente.

## Verificação

Execute somente scripts declarados (`lint`, `typecheck`, `test`, `build`). Não use migration/deploy como validação neutra e não mascare falhas com `|| true`.
