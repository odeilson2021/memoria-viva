# 🛡️ MEMÓRIA VIVA - PROMPT ENGINE & GUARDIÃO INVIOLÁVEL DE CONTEXTO

⚠️ ATENÇÃO AGENTE DE IA (CURSOR, CLAUDE, GEMINI, WINDSURF, OPENCODE, ETC.):
ESTE ARQUIVO NÃO É UMA SUGESTÃO. É UM PROTOCOLO DE EXECUÇÃO RÍGIDO E MANDATÓRIO.
QUALQUER DESVIO DAS REGRAS ABAIXO SERÁ CONSIDERADO UMA FALHA GRAVE DE EXECUÇÃO.

---

## 🚫 1. PROTOCOLO DE PRIORIDADE EXISTENCIAL (ANÁLISE ANTES DE CRIAR)

Toda requisição do usuário (correção, ajuste, refatoração, melhoria ou novo recurso) DEVE OBRIGATORIAMENTE seguir este fluxo:

1. **ETAPA 1 - INSPEÇÃO OBRIGATÓRIA:**
   - Procure no projeto o código, arquivo, rota, Action ou Repository que JÁ RESPONDE por essa função.
   - NUNCA assuma que uma funcionalidade não existe sem antes fazer um grep/search global no repositório.

2. **ETAPA 2 - AJUSTE E EVOLUÇÃO (CONTINUIDADE):**
   - Se a funcionalidade JÁ EXISTE: **Ajuste, corrija, refatore ou faça o upgrade do código existente.**
   - É ESTREITAMENTE PROIBIDO criar uma nova função duplicada ou apagar o arquivo atual para reescrevê-lo do zero com outra lógica. Preserve o DNA da arquitetura.

3. **ETAPA 3 - CRIAÇÃO (EXCEÇÃO):**
   - Só é permitido criar um novo arquivo, tabela ou rota se a ETAPA 1 provar conclusivamente que a funcionalidade é 100% INEXISTENTE no sistema.

---

## 🛑 2. PROIBIÇÕES ABSOLUTAS (ZERO RETRABALHO E ZERO AMNÉSIA)

1. **PROIBIDO APAGAR OU DESTRUIR CÓDIGO FUNCIONAL:**
   - NUNCA "simplifique", "resuma" ou remova blocos de código ou funções inteiras para resolver um bug. O debug DEVE ser feito por evidências (logs do PHP/Monolog, `error_log()`, inspeção MCP do MySQL).
2. **PROIBIDO CÓDIGO LEGADO OU SQL SOLTO:**
   - NUNCA use PDO cru, `$pdo->prepare()`, `DB::statement()` soltos ou SQL concatenado no código.
   - Toda interação com o banco DEVE passar obrigatoriamente pelos Repositories tipados (`Infrastructure/Persistence/` ou `Repositories/`).
3. **PROIBIDO QUEBRAR MÓDULOS OU ROTAS NATIVAS:**
   - Nenhuma alteração pode quebrar autenticação, logins (`auth_sessions`), rotas do Admin Master, Lojista, Entregador ou Cliente.

---

## 🧠 3. PROTOCOLO DE LEITURA E ENRIQUECIMENTO DE MEMÓRIA

Antes de responder ou gerar código para qualquer prompt:
1. **LER OS ARQUIVOS DE CONTEXTO:**
   - `docs/ai/CONTEXTO_ATUAL.md` (Arquitetura e Stack)
   - `docs/ai/MODULOS_E_REGRAS.md` (Regras de Negócio e Mapeamento de Arquivos)
   - `docs/ai/DESIGN_SYSTEM.md` (DNA Visual e Estilo)
   - `docs/ai/HANDOFF_ATUAL.md` (Histórico da última sessão)
2. **ATUALIZAR A MEMÓRIA VIVA AO FINAL DA TAREFA:**
   - Nenhuma tarefa é considerada concluída se o agente não registrar no `docs/ai/HANDOFF_ATUAL.md` o que foi feito, os arquivos alterados e eventuais dependências deixadas para o próximo agente.

---

## 🎯 4. DIRETRIZES DE SUSTENTABILIDADE E ESCALABILIDADE
- **Arquitetura:** Single Action Controllers (Invokable Classes) + Repository Pattern + Dependency Injection via Container.
- **Resiliência:** Sessões gravadas na tabela `auth_sessions` no MySQL (imune a deploys/restarts).
- **Tratamento de Erro:** NENHUMA rota pode estourar Erro 500 sem tratamento. Toda exceção deve ser capturada e retornar JSON amigável ou renderizar a view tratada.
