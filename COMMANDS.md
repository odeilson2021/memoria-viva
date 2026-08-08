# Comandos do Memória Viva

## Memória

```bash
memoria-viva init [--root <path>] [--dry-run] [--silent]
memoria-viva sync [--root <path>] [--dry-run] [--silent]
memoria-viva check [--root <path>] [--silent]
memoria-viva status [--root <path>] [--silent]
memoria-viva context [--root <path>] [--json]
memoria-viva graph [--root <path>] [--silent]
memoria-viva skins [<nome>] [--root <path>] [--silent]
memoria-viva update [--root <path>] [--dry-run] [--silent]
```

- `init`: cria arquivos ausentes, mapeia o projeto e grava o primeiro snapshot.
- `sync`/`update`: atualiza blocos gerenciados, referências normativas do pacote, o mapa do projeto, o grafo e o estado canônico; conteúdo humano fora dos blocos é preservado.
- `check`/`status`: valida conteúdo, marcadores, schema e fingerprint. Retorna `1` quando inválido/desatualizado.
- `context`: recupera o resumo; `--json` retorna `.agent/memory.json` validado.
- `graph`: imprime o grafo de conhecimento (nós, conexões e backlinks) em Mermaid.
- `skins`: lista as skins (`front`, `back`, `database`) ou imprime uma skin para enviar junto com o prompt.
- `mcp`: configura credenciais e MCP MySQL de forma interativa.

## MCP MySQL opcional

```bash
memoria-viva mcp [--global]
memoria-viva configure [--global] [--silent]
```

`mcp` é interativo. `configure --silent` usa `.env.mcp` ou `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD` e `MYSQL_CHARSET`. Sem `--global`, nenhuma configuração fora do projeto é alterada.

## Utilitários

```bash
memoria-viva --help
memoria-viva --version
```

`--dry-run` nunca grava e relata ações como planejadas. `--silent` suprime saída informativa, mas erros continuam em `stderr` e no exit code.
