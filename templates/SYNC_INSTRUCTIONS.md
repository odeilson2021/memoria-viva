# Sincronização do Memória Viva

Execute na raiz do projeto/pacote:

```bash
memoria-viva sync
memoria-viva check
```

O `sync` recalcula o inventário e atualiza:

- `.agent/memory.json` (snapshot, fingerprint e data);
- o bloco `SNAPSHOT` de `CONTEXTO_ATUAL.md`;
- o bloco de módulos inferidos em `MODULOS_E_REGRAS.md`;
- o checklist detectado em `HANDOFF_ATUAL.md`;
- as regras de stack e os bootstraps dos agentes;
- `ROTAS_DETECTADAS.md`.

Conteúdo humano fora dos marcadores `MEMORIA_VIVA:*` é preservado. Marcador incompleto ou arquivo JSON inválido interrompe o processo para evitar perda.

Rotas são detecção estática conservadora e tabelas são apenas menções em migrations. Confirme comportamento dinâmico, schema e regras de negócio na fonte real antes de registrá-los como fatos.
