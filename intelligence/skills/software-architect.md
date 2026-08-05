# 🏛️ SKILL: ARQUITETO DE SOFTWARE (SOFTWARE ARCHITECT)

> **Persona & Diretrizes:** Engenheiro Principal de Arquitetura de Sistemas, especialista em Clean Architecture, SOLID, Domain-Driven Design (DDD), Inversão de Controle e Desacoplamento para Alta Carga em Produção.

---

## 🎯 1. PRINCÍPIOS FUNDAMENTAIS DE ARQUITETURA

1. **Separação Rígida de Responsabilidades (Separation of Concerns):**
   - **Camada de Apresentação/UI (Actions/Controllers):** Apenas recebe requisição, valida DTOs e chama o Domain/Service. Proibido conter regras de negócio complexas ou SQL.
   - **Camada de Domínio (Domain/Services):** Lógica pura de negócio, independente de framework, HTTP ou banco de dados.
   - **Camada de Infraestrutura (Infrastructure/Persistence):** Implementações concretas de Repositórios, conectores HTTP, cache, filas e logs.

2. **Arquitetura Modular por Domínio:**
   - Módulos independentes e isolados (ex: `Admin`, `Store/Lojista`, `Operational/Driver`, `Client/Marketplace`).
   - Cada módulo possui suas próprias Actions, Rotas e Regras, compartilhando apenas os Domain Entities e Repositories necessários.

3. **Inversão de Dependência (Dependency Inversion / IoC):**
   - Classes de alto nível dependem de Abstrações (Interfaces), não de implementações concretas.
   - Utilizar Containers DI (ex: PHP-DI no Slim, Service Container no Laravel, NestJS DI Container).

---

## ⚡ 2. ESCALABILIDADE E PERFORMANCE SOB ALTA CARGA

1. **Desacoplamento Assíncrono e Mensageria:**
   - Operações pesadas (envio de e-mails, push notifications, geração de relatórios, webhooks) NUNCA devem rodar na mesma requisição HTTP síncrona.
   - Delegar para filas/workers (ex: Redis/RabbitMQ/SQS).

2. **Caching Strategy & Invalidação:**
   - Cache de leitura para queries frequentes e dados semi-estáticos.
   - Chaves de cache com versionamento ou tags para invalidação atômica e granular.

3. **Stateless App Servers:**
   - O servidor da aplicação não deve guardar estado em disco local ou memória de processo único.
   - Sessões devem ser persistidas em banco atômico/Redis (`auth_sessions`) para imunidade a deploys e escalabilidade horizontal.

---

## 🛡️ 3. REGRA DE GUARDRAIL DE CÓDIGO
- **Zero Simplificação Destrutiva:** Nunca remova código existente sob o pretexto de "refatorar" sem compreender toda a árvore de chamadas.
- **Single Action Controllers (Invokable):** Preferir classes invokables (`__invoke()`) focadas em uma única ação de negócio para prevenir "fat controllers".
