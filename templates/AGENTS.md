# 🧠 AGENTS.md — Memória Viva — Regras e Diretrizes para Agentes de IA

> **LEITURA OBRIGATÓRIA:** Qualquer Agente de IA (Gemini, Claude, OpenCode, Cursor, Antigravity, etc.) ou Desenvolvedor DEVE ler estritamente os arquivos de contexto antes de gerar ou alterar qualquer linha de código.

---

## 📐 Arquitetura de Documentação (Apenas 4 Arquivos)

1. 🧠 **Manual de Contexto Mestre:** `docs/ai/CONTEXTO_ATUAL.md` — O "cérebro" do projeto (stack, arquitetura, mapeamento das tabelas, rotas e sessões).
2. 🛡️ **Regras e Guardrails Invioláveis:** `AGENTS.md` e `.agent/rules.md` — O "código de conduta". Regras rígidas do que PODE e NÃO PODE ser feito.
3. 📖 **Manual Operacional dos Módulos:** `docs/ai/MODULOS_E_REGRAS.md` — Especificações de negócio por módulo.
4. 📋 **Checklist de Handoff e Evolução:** `docs/ai/HANDOFF_ATUAL.md` — Arquivo vivo com o status de cada tarefa, pendências e checklist obrigatoriamente atualizado a cada refatoração.

---

## 📂 Padrão de Estrutura de Pastas

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

## 🛤️ Roteamento

Módulos isolados em `routes/web/` (`admin.php`, `store.php`, `client.php`, `site.php`) e APIs versionadas em `routes/api/v1/`.

---

## 🔐 Sistema de Sessões (`auth_sessions`)

| Módulo | Validade | Renovação |
|--------|---------|-----------|
| Admin / Master | **24 horas** | Sem renovação automática |
| Operacional / Lojista / App / Cliente | **7 dias** | Idle Refresh automático |

> As sessões são persistidas no banco de dados na tabela `auth_sessions`.
> Isso garante que logins sobrevivam a reinícios de servidor e deploys via Git.

---

## 🚫 1. PROIBIÇÕES ABSOLUTAS (O QUE NUNCA FAZER)

1. **PROIBIDO CÓDIGO LEGADO OU SQL SOLTO:** Nunca use PDO cru, `$pdo->prepare()`, `query()` ou rotas fora do Slim 4. Toda consulta DEVE passar pelos Repositories em `app/Infrastructure/Persistence/`.
2. **PROIBIDO APAGAR OU QUEBRAR MÓDULOS EXISTENTES:** É proibido remover funcionalidades, rotas ou tabelas ativas sem ordem explícita do usuário. Se uma alteração quebrar logins (Admin, Lojista, Entregador ou Cliente), o código deve ser revertido e corrigido imediatamente.
3. **PROIBIDO CRIAR TABELAS REPETIDAS:** O banco de dados foi padronizado em tabelas canônicas. É estritamente proibido recriar tabelas legadas (ex: `motoboys`, `entregadores_loja`, `config`, `city_*`).
4. **PROIBIDO FINALIZAR UMA TAREFA SEM ATUALIZAR A DOCUMENTAÇÃO:** NENHUMA refatoração, correção de bug ou nova funcionalidade é considerada concluída se a documentação (`docs/ai/CONTEXTO_ATUAL.md` e `docs/ai/HANDOFF_ATUAL.md`) não for atualizada no mesmo commit.

---

## ✅ 2. PADRÕES OBRIGATÓRIOS DO SISTEMA

- **Stack:** PHP 8.2 Strict Types + Slim Framework 4 + Doctrine ORM/Migrations + MySQL (utf8mb4) + Monolog + WhatsApp Evolution API + MP Split.
- **Arquitetura:** Single Action Controllers (Invokable Classes) + Repository Pattern + Injeção de Dependência via PHP-DI Container.
- **Nomenclatura do Banco:** Tabelas em `snake_case` no inglês e no plural (ex: `stores`, `orders`, `drivers`, `business_settings`).
- **Servidor MCP MySQL:** Para consultar o schema ou dados do banco durante o desenvolvimento, utilize sempre as ferramentas do MCP MySQL (`list_tables`, `read_table_schema`, `run_select_query`).

---

## 🔄 3. PROTOCOLO DE ATUALIZAÇÃO E COMMIT OBRIGATÓRIO

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

---

## 🔄 4. REGRA FUNDAMENTAL DE TRANSIÇÃO E CONTINUIDADE ENTRE AGENTES

> **TODO DOCUMENTO DE CONTEXTO É A MEMÓRIA VIVA COMPARTILHADA DOS AGENTES DE IA.**

1. **SEMPRE ATUALIZE O CONTEXTO ANTES DE ENCERRAR UMA SESSÃO:** Ao concluir qualquer tarefa, refatoração, criação de arquivo ou correção de bug, o Agente de IA é OBRIGADO a atualizar a documentação (`docs/ai/CONTEXTO_ATUAL.md` e `docs/ai/HANDOFF_ATUAL.md`).
2. **REGISTRO DE REFERÊNCIAS CLARAS PARA O PRÓXIMO AGENTE:** O registro deve conter:
   - Exatamente o que foi feito (arquivos modificados, funções/métodos criados ou alterados e repositórios afetados).
   - O motivo técnico e a lógica de negócio adotada.
   - Instruções e alertas específicos sobre quais comportamentos, APIs ou contratos NÃO PODEM ser alterados ou removidos.
3. **NUNCA DESTRUIR, APENAS IMPLEMENTAR OU MELHORAR:** Quando um novo agente iniciar uma sessão em um novo chat, ele lerá os arquivos de contexto e entenderá perfeitamente o estado atual do sistema, impedindo que apague, refatore sem necessidade ou quebre funcionalidades previamente construídas.