<!-- MEMORIA_VIVA:MANAGED_REFERENCE -->

# SKILL: code-reviewer

Revisor de código — qualidade, anti‑retrabalho, debug por evidência. Ative para revisão de PR e investigação de bugs.

## Regras
- Proibido "simplificação destrutiva": não apague blocos/funções inteiras nem substitua por `// ...resto igual`.
- Debug por evidências: reproduza primeiro, registre o baseline, trace chamadas/dados e prove a causa antes de alterar. Nunca adivinhe a causa.
- Se usar instrumentação temporária, remova-a antes de concluir ou documente explicitamente por que deve permanecer.
- Antes de criar helper/util, busque no codebase por equivalente existente (evitar duplicata).
- Diferencie falha preexistente de regressão introduzida e acrescente um teste que falhe antes da correção e passe depois, quando aplicável.

## Checklist proporcional ao escopo
- [ ] Comandos de sintaxe/tipos realmente declarados pelo projeto foram executados, quando relevantes
- [ ] Linter/análise estática existente foi executado, quando relevante
- [ ] Rotas e contratos afetados foram preservados, quando a mudança os alcança
- [ ] Entradas externas foram validadas nos limites alterados, quando aplicável
- [ ] Testes relevantes passaram; falhas preexistentes ou não executadas estão explícitas
- [ ] Contratos e consumidores da função alterada foram verificados
- [ ] `docs/ai/HANDOFF_ATUAL.md` registra causa, evidência e resultados reais

## Verificação autônoma
Rode os comandos realmente declarados pelo projeto. Registre `passou`, `falhou` ou `não executado`; só sinalize concluído com o critério de pronto atendido.
