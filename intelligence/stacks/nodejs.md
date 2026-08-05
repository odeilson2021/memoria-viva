# 🟢 DIRETRIZES DE TECNOLOGIA: NODE.JS

> **Escopo:** Diretrizes de desenvolvimento, arquitetura, assincronismo e performance para projetos Node.js.
> **Stack padrão recomendada:** **AdonisJS** (full-stack estilo Laravel — backend + frontend unificados no mesmo app, espelhando o fluxo PHP Slim/Laravel). NestJS, Next.js, Express e Fastify continuam suportados.

---

## ⚡ 1. SINTAXE E ASSINCRONISMO

1. **Async / Await Mandatório:**
   - Proibido uso de callbacks legados estilo `(err, result) => {}`.
   - Utilizar obrigatoriamente `async/await` com blocos `try/catch` centralizados ou wrappers de tratamento de exceção.

2. **TypeScript Estrito:**
   - Preferir TypeScript com `strict: true` no `tsconfig.json`.
   - Proibido o uso indiscriminado do tipo `any`. Definir interfaces e tipos explícitos para DTOs, Entidades e Respostas.

3. **Event Loop Non-Blocking:**
   - Proibido executar algoritmos síncronos pesados (CPU-bound) na thread principal. Utilizar `Worker Threads` ou delegar para processos externos.

---

## 🏗️ 2. PADRÕES DE ARQUITETURA POR FRAMEWORK

### Node.js — AdonisJS (Padrão full-stack, espelha o fluxo PHP):
- **Controllers com responsabilidade única:** Uma classe (ou Single Action) por domínio em `app/Controllers/`, implementando os métodos HTTP (`index`, `store`, `update`, `destroy`).
- **Repository Pattern:** Toda regra de acesso a dados em `app/Repositories/` sobre Lucid Models; proibido SQL cru concatenado.
- **Injeção de Dependência via IoC Container:** Declarar dependências via construtor ou bindings em `providers/`. Proibido instanciar dependências manualmente ou usar singletons globais (`new X()`).
- **Frontend Unificado:** Views server-rendered com Edge (`resources/views/`) ou Inertia; backend e frontend no mesmo app, como no Laravel.
- **Sessões Resilientes:** Driver de sessão persistente (MySQL `auth_sessions`) via `@adonisjs/session`; logins sobrevivem a restart/deploy.
- **Tratamento de Erro:** Usar o Exception Handler do AdonisJS; nenhuma rota estoura 500 sem tratamento.

### NestJS (alternativa backend):
- **Arquitetura Modular:** Módulos (`@Module`), Controllers (`@Controller`), Services (`@Injectable`) e Repositories devidamente declarados.
- **Dependency Injection:** Utilizar o sistema de DI nativo do NestJS.

### Express / Fastify (alternativa leve):
- **Router Modular:** Separar rotas em arquivos por domínio de negócio.
- **Middlewares Desacoplados:** Autenticação, validação de payload (ex: Zod, Yup, Joi) e log de requisições extraídos para middlewares isolados.

---

## 🧪 3. QUALIDADE E RECURSOS
- **ESLint & Prettier:** Configuração padronizada.
- **Japa:** Testes unitários para Services/Repositories e e2e para rotas (padrão AdonisJS). Jest / Vitest para demais stacks Node.
