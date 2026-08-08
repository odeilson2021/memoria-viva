<!-- MEMORIA_VIVA:MANAGED_REFERENCE -->

# SKILLS DISPONÍVEIS (carga sob demanda)

Cada skill abaixo tem seu corpo detalhado em `.agent/skills/<arquivo>.md` no projeto alvo. O agente carrega o corpo **somente ao acionar** a skill.

| Skill | Gatilho (1 linha) — ative quando a tarefa envolver: |
|-------|------------------------------------------------------|
| `software-architect` | Arquitetura, camadas, DI/IoC, escalabilidade, decisão de estrutura de pastas. |
| `code-reviewer` | Revisão de PR, debug por evidência, anti‑retrabalho, checklist de qualidade. |
| `database-dba` | Schema, índices, N+1, transações, camada de dados existente e paginação. |
| `security-expert` | OWASP, sanitização, CSRF/XSS, sessões existentes e secrets. |
| `ui-ux-designer` | Respeitar `docs/ai/DESIGN_SYSTEM.md`, reaproveitar componentes, a11y, responsivo. |

> Criar ou alterar uma skill é uma tarefa de manutenção separada; não amplie o escopo sem solicitação.

## Referência de Prompt Engineering
- `.agent/PROMPT_ENGINE.md` — base copiada para o projeto alvo. Consulte ao criar/auditar prompts ou regras.
