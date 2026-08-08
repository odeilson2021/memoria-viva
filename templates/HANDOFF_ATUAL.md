# HANDOFF ATUAL — ESTADO E EVIDÊNCIAS

> Memória incremental entre sessões. O agente acrescenta registros; `memoria-viva sync` atualiza apenas o checklist delimitado e nunca fabrica trabalho realizado.

## Estado funcional confirmado

- **Base/revisão:** *(registrar commit ou estado do worktree quando relevante)*
- **Funciona:** *(somente fatos verificados)*
- **Falha ou risco conhecido:** *(somente fatos reproduzidos)*
- **Próximo passo diretamente relacionado:** *(se existir)*

## Registro de sessões — mais recente primeiro

### *(data)* — Inicialização da Memória Viva

- **Objetivo:** criar o snapshot e os pontos de entrada dos agentes.
- **Escopo fora da tarefa:** regras de negócio ainda não confirmadas.
- **Resultado:** estrutura inicial criada; consulte `.agent/memory.json`.
- **Causa-raiz/evidência:** não se aplica à inicialização.
- **Arquivos alterados:** gerados pelo `memoria-viva init`.
- **Validações:** registrar comandos e resultados reais nas próximas sessões.
- **Pendências/limitações:** completar regras confirmadas conforme o projeto evoluir.

## Formato obrigatório para novos registros

```markdown
### YYYY-MM-DD HH:mm — Objetivo curto
- Objetivo e fora de escopo:
- Sintoma/reprodução (para bugs):
- Causa-raiz e evidência:
- Alterações e contratos preservados:
- Arquivos:
- Validações: comando — passou/falhou/não executado (motivo)
- Riscos, limitações e pendências diretamente relacionadas:
```

## Checklist de conclusão

<!-- MEMORIA_VIVA:STACK_CHECKLIST:START -->
<!-- Atualizado automaticamente conforme comandos declarados no projeto. -->
<!-- MEMORIA_VIVA:STACK_CHECKLIST:END -->

- [ ] O pedido e o fora de escopo foram respeitados
- [ ] A causa foi comprovada antes da correção (quando era bug)
- [ ] Teste de regressão cobre a falha (quando aplicável)
- [ ] Nenhum teste não executado foi descrito como sucesso
- [ ] Este handoff foi atualizado sem apagar o histórico
