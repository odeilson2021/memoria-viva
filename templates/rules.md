<!-- DNA DO PROJETO DETECTADO: {{LANG}} | {{FRAMEWORK}} | {{DB}} | {{ORM}} | {{UI}} -->

# MEMÓRIA VIVA — REGRAS DE EXECUÇÃO (inviolável)

Estas regras são mandatórias. Desvio = falha de execução.

## 1. Protocolo de Continuidade (Análise antes de Criar)

Para qualquer pedido (correção, ajuste, refatoração, melhoria, novo recurso):

1. **Inspeção obrigatória:** localize o código/rota/Action/Repository que JÁ responde pela função (grep global no repo). Não presuma inexistência sem busca.
2. **Ajuste/Evolução:** se já existe, edite/refatore o código atual. Proibido criar duplicata ou reescrever do zero.
3. **Criação (exceção):** só crie arquivo/tabela/rota se a etapa 1 provar que é 100% inexistente.

## 2. Proibições Absolutas

- Não apague/destrúa código funcional para "simplificar". Debug por evidências (logs, `error_log`, MCP MySQL).
- Não use SQL solto/concatenado nem PDO cru. Todo acesso a banco passa por Repositories tipados (`Infrastructure/Persistence/` ou `Repositories/`).
- Não quebre auth/login (`auth_sessions`), rotas de Admin Master, Lojista, Entregador ou Cliente.

## 3. Antes de Gerar Código (Briefing + Leitura)

- Toda tarefa do usuário DEVE vir como Briefing (5 itens): **Objetivo · Restrições/Ambiente · Formato · Exemplo · Critério de Pronto**. Se faltar algum, pergunte ANTES de codar. Modelo: `docs/ai/BRIEFING.md`.
- Leia antes de agir: `docs/ai/CONTEXTO_ATUAL.md`, `MODULOS_E_REGRAS.md`, `DESIGN_SYSTEM.md`, `HANDOFF_ATUAL.md`.
- Para multi‑arquivo: monte **plano passo a passo** (arquivo → ação) e siga‑o. Sem buscas exploratórias desnecessárias: use os caminhos exatos.

## 4. Skill sob Demanda (carregue só ao acionar)

Cada skill tem 1 linha‑gatilho abaixo; o corpo está em `.agent/skills/<nome>.md` (ou `intelligence/skills/`). Ative só quando a tarefa couber:
- `software-architect` — decisão de arquitetura, camadas, DI, escalabilidade.
- `code-reviewer` — revisão, debug por evidência, anti‑retrabalho.
- `database-dba` — schema, índices, N+1, transações, Repository.
- `security-expert` — OWASP, sanitização, sessões `auth_sessions`.
- `ui-ux-designer` — respeitar `DESIGN_SYSTEM.md`, reaproveitar componentes.

## 5. Verificação Autônoma (loop fechado)

Ao terminar, rode o comando de validação da stack e corrija erros sozinho (sem intervenção):
- **PHP:** `find app config routes -name '*.php' -print0 | xargs -0 -n1 php -l` · `composer analyse` · `vendor/bin/phpunit`
- **Node/AdonisJS:** `tsc --noEmit` · `npm run lint` · `npm test` · `node ace migration:run`
Só conclua quando o comando passar e o Critério de Pronto for atendido.

## 6. Governança de Sessão e Modelo

- **1 conversa = 1 tarefa.** Ao concluir, registre em `HANDOFF_ATUAL.md` (feito, arquivos, pendências) e encerre a sessão. Não encadeie novos assuntos em chat antigo.
- **Modelo:** use rápido/pequeno (ex: Haiku) para formatação, renomeação, resumo, edições diretas e verificáveis; use avançado (ex: Sonnet/Opus) para planejamento, arquitetura, decisões críticas e bugs difíceis.

## 7. Sustentabilidade

- Arquitetura: Controllers (Single Action/Invokable) + Repository Pattern + DI via Container.
- Sessões em `auth_sessions` (MySQL) — imunes a deploy/restart.
- Nenhuma rota estoura 500 sem tratamento; capture e retorne JSON ou renderize view tratada.
