# 🛡️ MEMÓRIA VIVA — REGRAS E DIRETRIZES INVIOLÁVEIS DO AGENTE

⚠️ LEITURA OBRIGATÓRIA: Qualquer Agente de IA DEVE ler estritamente os arquivos `docs/ai/CONTEXTO_ATUAL.md`, `docs/ai/MODULOS_E_REGRAS.md` e `docs/ai/HANDOFF_ATUAL.md` ANTES de gerar, alterar ou deletar qualquer linha de código.

---

## 🚫 1. PROIBIÇÕES ABSOLUTAS (COMO EVITAR RETRABALHO E QUEBRAS)
1. **PROIBIDO CÓDIGO LEGADO OU CONSULTAS SOLTAS:**
   - NUNCA use PDO cru, `$pdo->prepare()`, `DB::statement()` soltos ou SQL bruto fora da camada de persistência.
   - Toda consulta ao banco DEVE passar obrigatoriamente por Repositórios tipados (`Infrastructure/Persistence/` no Slim ou `Repositories/` no Laravel).
2. **PROIBIDO DESTROÇAR OU APAGAR MÓDULOS EXISTENTES:**
   - É estritamente proibido remover funcionalidades, rotas ou tabelas em uso sem autorização explícita.
   - Se uma refatoração quebrar telas ou fluxos de autenticação, o código DEVE ser revertido e corrigido imediatamente.
3. **PROIBIDO CONCLUIR TAREFAS SEM ATUALIZAR A MEMÓRIA VIVA:**
   - Nenhuma alteração, correção ou nova funcionalidade é considerada concluída se a documentação do projeto (`docs/ai/CONTEXTO_ATUAL.md` e `docs/ai/HANDOFF_ATUAL.md`) não for atualizada no mesmo commit.

---

## 🚀 2. PADRÕES PARA ALTA ESCALABILIDADE E PERFORMANCE
- **PHP Standard:** PHP 8.2+ Strict Types (`declare(strict_types=1);`).
- **Arquitetura Backend:** Single Action Controllers (Invokable Classes) ou Action Services desassociados de estado.
- **Sessões Resilientes no Banco (`auth_sessions`):**
  * Toda autenticação grava o token/session_hash na tabela `auth_sessions`.
  * Isso garante que os usuários **nunca percam o login** quando o servidor for reiniciado, atualizado ou receber um deploy via Git.
  * Prazos: Admin/Master (24h estritas) | Operacional/Lojista/App/Cliente (7 dias com Idle Refresh).
- **Banco de Dados:** MySQL/MariaDB com charset `utf8mb4_unicode_ci` e tabelas nomeadas em `snake_case` no inglês e no plural (`stores`, `orders`, `users`).

---

## 🔄 3. PROTOCOLO DE MEMÓRIA INCREMENTAL (CONTINUIDADE ENTRE CHATS)
Como novos chats iniciam sem histórico prévio, o agente É OBRIGADO A:
1. Ler a documentação da Memória Viva antes de codificar.
2. Adicionar referências dos arquivos criados/alterados em `docs/ai/MODULOS_E_REGRAS.md`.
3. Registrar o que foi feito no `docs/ai/HANDOFF_ATUAL.md` informando eventuais dependências para o próximo agente.

---

## 📂 5. PADRÃO DE ESTRUTURA DE PASTAS

Todo projeto que utiliza o Memória Viva deve seguir esta estrutura de diretórios:

```
projeto/
├── .agent/
│   └── rules.md               ← Guardrails invioláveis da IA
├── app/
│   ├── Actions/               ← Single Action Controllers (Invokable)
│   │   ├── Admin/             ← Módulo Admin Master
│   │   ├── Store/             ← Módulo Lojista
│   │   ├── Driver/            ← Módulo Entregador
│   │   └── Client/            ← Módulo Cliente / Marketplace
│   ├── Domain/                ← Entidades de Negócio
│   └── Infrastructure/
│       ├── Persistence/       ← Repositories (Slim + Doctrine)
│       └── Middleware/        ← SessionValidation, Permissions, ErrorHandler
├── database/
│   └── migrations/            ← Migrações oficiais do banco
├── docs/
│   └── ai/
│       ├── CONTEXTO_ATUAL.md  ← Cérebro técnico do projeto
│       ├── MODULOS_E_REGRAS.md ← Regras de negócio por módulo
│       └── HANDOFF_ATUAL.md   ← Diário de bordo entre agentes
└── routes/
    ├── index.php              ← Entrypoint mestre das rotas
    ├── web/                   ← Rotas WEB (admin.php, store.php, client.php, site.php)
    └── api/v1/                ← APIs RESTful (auth.php, stores.php, orders.php, drivers.php)
```

> ⚠️ **Agente: Siga esta estrutura de pastas ao criar novos arquivos ou módulos.**

---

## 🚀 4. PROTOCOLO DE COMMIT E DEPLOY (OBRIGATÓRIO)

Sempre que concluir uma alteração no código, execute na ordem:
1. `git status && git branch --show-current`
2. `find app config routes -name '*.php' -print0 | xargs -0 -n1 php -l` (sintaxe PHP)
3. `composer analyse` (análise estática PHPStan)
4. `vendor/bin/phpunit` (todos os testes DEVEM passar)
5. Atualizar `docs/ai/CONTEXTO_ATUAL.md` (se houve mudança de rota ou banco) e `docs/ai/HANDOFF_ATUAL.md`.
6. `git add <arquivos>` → `git commit -m "[tipo]: mensagem clara e objetiva"`
7. `git push origin main` → dispara CI/CD automático em produção.

**Padrão de mensagem de commit:**
- `feat:` nova funcionalidade | `fix:` correção de bug | `docs:` documentação
- `refactor:` refatoração | `test:` testes | `chore:` manutenção
- ✅ `"fix: corrige calculo de frete no checkout modo bairro"`
- ⛔ `"fix"`, `"ajustes"`, `"update"`, `"teste"` são **proibidos**

> O `git push` na `main` dispara `.github/workflows/deploy.yml` automaticamente:
> CI (lint + PHPStan + PHPUnit) → deploy SSH rsync → Migrations → health check → rollback automático em falha.
