# 🔄 INSTRUÇÕES DE SINCRONIZAÇÃO — MEMÓRIA VIVA

> Este arquivo explica como manter o contexto do projeto vivo entre sessões de IA.

---

## 🎯 O que o `sync` faz

O comando `memoria-viva sync` **reanalisa o DNA do projeto** e atualiza a memória viva:

1. **Cria os arquivos ausentes** (`.agent/rules.md`, `docs/ai/*`) sem sobrescrever os existentes.
2. **Detecta rotas e módulos automaticamente** (PHP `routes/web|api/v1/*.php`, AdonisJS `start/routes.ts` / `routes/**/*.ts`) e:
   - preenche a tabela de **Rotas por Módulo** em `docs/ai/CONTEXTO_ATUAL.md` (quando houver placeholder);
   - gera o bloco **Módulos Detectados** em `docs/ai/MODULOS_E_REGRAS.md` com os módulos, rotas e arquivos encontrados.
3. **Lê tabelas a partir das migrations** (`database/migrations/**`) e pré-preenche a seção **Tabelas do Banco de Dados** em `CONTEXTO_ATUAL.md` (não depende do banco vivo).
4. **Gera `docs/ai/ROTAS_DETECTADAS.md`** com o mapa completo de endpoints (método + caminho + arquivo).
5. **Deixa o checklist de pré-deploy stack-aware** em `HANDOFF_ATUAL.md` (PHP: `php -l`/`composer analyse`/`phpunit`; AdonisJS: `tsc`/`lint`/`npm test`/`migration:run`).

> ⚠️ **Schema completo via MCP:** para colunas e índices reais, o agente ainda deve usar o MCP MySQL (`list_tables` / `read_table_schema`) durante a sessão, pois exige o servidor MCP ativo. O `sync` cobre rotas, módulos e tabelas declaradas em migrations; o agente complementa detalhes e regras de negócio.

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
