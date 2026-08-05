# 🟢 DIRETRIZES DE TECNOLOGIA: NODE.JS

> **Escopo:** Diretrizes de desenvolvimento, arquitetura, assincronismo e performance para projetos Node.js (Express, NestJS, Fastify, Next.js).

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

## 🏗️ 2. PADRÕES DE FRAMEWORKS

### Express / Fastify:
- **Router Modular:** Separar rotas em arquivos por domínio de negócio.
- **Middlewares Desacoplados:** Autenticação, validação de payload (ex: Zod, Yup, Joi) e log de requisições extraídos para middlewares isolados.

### NestJS:
- **Arquitetura Modular:** Módulos (`@Module`), Controllers (`@Controller`), Services (`@Injectable`) e Repositories devidamente declarados.
- **Dependency Injection:** Utilizar o sistema de DI nativo do NestJS.

---

## 🧪 3. QUALIDADE E RECURSOS
- **ESLint & Prettier:** Configuração padronizada.
- **Jest / Vitest:** Testes unitários para serviços e e2e para endpoints HTTP.
