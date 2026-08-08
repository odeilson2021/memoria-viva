<!-- MEMORIA_VIVA:MANAGED_REFERENCE -->

# PROMPT ENGINE — PROMPTS EXECUTÁVEIS E VERIFICÁVEIS

> Referência copiada para `.agent/PROMPT_ENGINE.md`. Use ao criar ou auditar prompts, regras e skills.

## Objetivo

Um bom prompt permite agir com autonomia sem ampliar escopo, diferencia fatos de suposições e define como provar a conclusão. Código, testes, manifests e fontes reais prevalecem sobre memória narrativa.

## Contrato proporcional da tarefa

Inclua o que for necessário entre:

- **Objetivo observável**
- **Sintoma, esperado e reprodução** (bugs)
- **Restrições/ambiente e contratos a preservar**
- **Fora de escopo**
- **Formato/saída**
- **Critério de pronto verificável**
- **Exemplo** somente quando reduz ambiguidade

O agente completa lacunas com evidência e suposições reversíveis. Pergunta apenas quando uma escolha material altera resultado, risco ou escopo. Modelo: `.agent/BRIEFING.md`.

## Recuperação de contexto

1. Leia `.agent/memory.json` e `.agent/rules.md`.
2. Leia `docs/ai/HANDOFF_ATUAL.md` e `docs/ai/MODULOS_E_REGRAS.md`.
3. Para interface, leia `docs/ai/DESIGN_SYSTEM.md`.
4. Execute `memoria-viva check`; sincronize antes de confiar em memória divergente.
5. Inspecione somente o fluxo e os consumidores necessários ao objetivo, ampliando a busca quando a causa ainda não estiver localizada.

## Workflow obrigatório para bugs

1. Reproduzir o sintoma e registrar o baseline.
2. Rastrear execução, dados, contratos e consumidores.
3. Formular e testar hipóteses; não editar com base em palpite.
4. Provar a causa-raiz.
5. Aplicar a menor correção segura, preservando comportamento válido.
6. Criar regressão que falhe antes e passe depois, quando aplicável.
7. Executar as validações reais do projeto.
8. Relatar comandos e resultados sem mascarar falhas.

## Limites de escopo

- Não criar funcionalidades, camadas, frameworks, tabelas, rotas, módulos ou tarefas não necessárias ao pedido.
- Não apagar/recriar código funcional como atalho de investigação.
- Não impor Repository, ORM, sessão, papéis, multi-tenancy, design tokens ou convenções sem evidência no projeto.
- Não criar uma skill apenas porque algo se repetiu; manutenção de skills precisa estar no escopo.
- Migração, deploy, push, envio externo e escrita em produção exigem ambiente apropriado e autorização explícita.

## Planejamento e skills

Para mudança multi-arquivo, faça um plano curto ligando arquivo/fluxo a ação e validação. Carregue apenas a skill pertinente listada em `.agent/SKILLS.md`; ela orienta a investigação, não autoriza trabalho adicional.

## Verificação honesta

Use somente ferramentas e scripts disponíveis no projeto. Para cada comando, registre:

- `passou`: executado, exit/resultados conferidos;
- `falhou`: executado e ainda não aprovado;
- `não executado`: motivo explícito.

Nunca chame de sucesso um teste não executado, falha ignorada, output não conferido ou health check que não prova a revisão implantada.

## Auditoria de uma regra/prompt

Para cada linha, pergunte:

1. Ela previne um erro observável?
2. É fato comprovado, condição explícita ou exemplo claramente rotulado?
3. Pode induzir trabalho fora de escopo ou ação destrutiva?
4. Define evidência e critério de conclusão?
5. Aponta para um arquivo/comando que realmente existe?

Remova preenchimento, prescrições universais e referências quebradas. Prefira menos tokens e mais comportamento testável.
