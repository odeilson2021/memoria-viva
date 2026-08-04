# 📋 DIÁRIO DE BORDO — HANDOFF & MEMORY LOG

> **Memória Viva — Registro incremental de todas as sessões.**
> Todo agente que concluir uma tarefa DEVE registrar aqui o que fez,
> quais arquivos alterou e quais dependências existem para o próximo agente.

---

## 🚦 Status Geral do Projeto

| Item | Status | Responsável | Última Atualização |
|------|--------|-------------|-------------------|
| Memória Viva instalada | ✅ Concluído | Instalador | *(data)* |
| Contexto do projeto preenchido | ⏳ Pendente | Próximo agente | — |
| Regras de negócio mapeadas | ⏳ Pendente | Próximo agente | — |
| Mapeamento de rotas | ⏳ Pendente | Próximo agente | — |
| Mapeamento de tabelas (MCP) | ⏳ Pendente | Próximo agente | — |

---

## 📌 INSTRUÇÃO PARA O PRIMEIRO AGENTE

> Ao iniciar o primeiro chat após a instalação da Memória Viva:

1. Leia todo o código em `app/`, `config/`, `routes/`, `database/`
2. Atualize `docs/ai/CONTEXTO_ATUAL.md` com:
   - Stack e versões reais
   - Todas as tabelas do banco (use MCP: `list_tables`)
   - Todas as rotas registradas por módulo
   - Estrutura de pastas real
3. Atualize `docs/ai/MODULOS_E_REGRAS.md` com as regras de negócio reais
4. Registre aqui neste arquivo o que foi feito
5. Siga todas as regras em `.agent/rules.md`

---

## 📝 Registro de Sessões (Mais Recente Primeiro)

> *(Formato obrigatório para cada registro)*

### 🗓️ YYYY-MM-DD — Título da Sessão
- **Agente:** *(Cursor, Claude, Gemini, OpenCode, etc.)*
- **O que foi feito:**
  - *(listar alterações realizadas)*
- **Arquivos criados/alterados:**
  - *(listar arquivos com caminhos completos)*
- **Tabelas afetadas:**
  - *(listar tabelas se houve migration ou alteração de schema)*
- **⚠️ Alertas para o próximo agente:**
  - *(listar dependências, riscos ou tarefas pendentes)*

---

## ✅ Checklist Pré-Deploy (Executar Antes de Todo `git push`)

- [ ] Sintaxe PHP validada (`php -l`)
- [ ] `composer analyse` (PHPStan) sem erros
- [ ] `vendor/bin/phpunit` — todos os testes passaram
- [ ] `docs/ai/CONTEXTO_ATUAL.md` atualizado (se houve mudança de rota ou banco)
- [ ] `docs/ai/HANDOFF_ATUAL.md` atualizado com registro da sessão
- [ ] Commit com mensagem clara: `"[tipo]: mensagem objetiva"`
- [ ] `git push origin main` executado → CI/CD disparado
