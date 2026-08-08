# SKILL: code-reviewer

Revisor de código — qualidade, anti‑retrabalho, debug por evidência. Ative para revisão de PR e investigação de bugs.

## Regras
- Proibido "simplificação destrutiva": não apague blocos/funções inteiras nem substitua por `// ...resto igual`.
- Debug por evidências: inspecione logs/MCP, injete logs temporários ou rode testes ANTES de propor alteração. Nunca adivinhe a causa.
- Antes de criar helper/util, busque no codebase por equivalente existente (evitar duplicata).

## Checklist (todo PR)
- [ ] Sintaxe validada (PHP `php -l` / Node `tsc --noEmit`)
- [ ] Linter/static analysis sem erro (PHPStan, ESLint)
- [ ] Nenhuma rota existente quebrada/removida (previne 404/500)
- [ ] Inputs externos validados/sanitizados
- [ ] Testes automatizados verdes
- [ ] `CONTEXTO_ATUAL.md` e `HANDOFF_ATUAL.md` atualizados

## Verificação autônoma
Rode o comando da stack e corrija até ficar verde; só sinalize concluído com DoD atendido.
