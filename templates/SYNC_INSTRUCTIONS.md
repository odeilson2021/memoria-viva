# 🔄 INSTRUÇÕES DE SINCRONIZAÇÃO — MEMÓRIA VIVA

> Este arquivo explica como manter o contexto do projeto vivo entre sessões de IA.

---

## 🎯 O que o `sync` faz

O comando `memoria-viva sync` **reanalisa o DNA do projeto** e atualiza a memória viva:

1. **Cria os arquivos ausentes** (`.agent/rules.md`, `docs/ai/*`) sem sobrescrever os existentes.
2. **Detecta rotas automaticamente** (PHP `routes/web|api/v1/*.php`, AdonisJS `start/routes.ts` / `routes/**/*.ts`) e preenche a tabela de **Rotas por Módulo** em `docs/ai/CONTEXTO_ATUAL.md` quando ela ainda estiver com o placeholder `(preencher)`.
3. **Gera `docs/ai/ROTAS_DETECTADAS.md`** com o mapa completo de endpoints (método + caminho + arquivo) para o agente consultar.
4. **Atualiza o `docs/ai/HANDOFF_ATUAL.md`** registrando a sincronização.

> ⚠️ **Tabelas do banco:** a leitura de schema via MCP MySQL (`list_tables`) deve ser feita pelo próprio agente durante a sessão, pois exige o servidor MCP ativo. O `sync` cobre rotas e estrutura; o agente complementa tabelas e regras de negócio.

---

## 🚀 Como usar

```bash
# Na raiz do projeto alvo:
memoria-viva sync
```

Ou de forma não interativa (CI/automação):

```bash
memoria-viva sync --silent
```

Para simular sem gravar:

```bash
memoria-viva sync --dry-run
```

---

## 🧩 Após o sync, peça à IA:

```
"Leia docs/ai/ROTAS_DETECTADAS.md e docs/ai/CONTEXTO_ATUAL.md.
Atualize docs/ai/MODULOS_E_REGRAS.md com as regras de negócio reais
e docs/ai/HANDOFF_ATUAL.md com o que foi feito nesta sessão.
Siga todas as regras em .agent/rules.md."
```
