# 📜 GUIA DE COMANDOS DO MEMÓRIA VIVA CLI

> Este guia detalha o processo de instalação global e a lista completa de comandos disponíveis no **Memória Viva CLI v2.0**.

---

## ⚡ 1. Instalação Global (Passo a Passo Inicial)

Para instalar o Memória Viva de forma global no seu computador, execute os seguintes comandos no terminal:

```bash
# 1. Entre no diretório do Memória Viva
cd c:\Users\dev\Documents\memoria-viva

# 2. Instale as dependências do Node.js
npm install

# 3. Realize a instalação global no sistema operacional:
# No Windows (PowerShell):
npm run install:win

# No Linux / Mac (Bash):
npm run install:linux

# OU diretamente via npm:
npm install -g .
```

Após esse procedimento, o comando `memoria-viva` estará disponível em qualquer terminal do seu computador!

---

## 🧰 2. Lista de Comandos e Funcionalidades

 Ao digitar `memoria-viva` no terminal sem parâmetros, a ajuda interativa completa será exibida.

| Comando | Descrição Completa | Exemplo de Uso |
|---------|--------------------|----------------|
| `memoria-viva init` | **Inicializa o Memória Viva no projeto alvo.** Analisa o DNA da aplicação (Linguagem, Framework, Banco, UI) e injeta as regras e arquivos de memória (`.agent/rules.md` e `docs/ai/`). | `memoria-viva init` |
| `memoria-viva sync` | **Sincroniza e atualiza o contexto.** Lê novas rotas, tabelas e componentes criados recentemente e atualiza a documentação viva. | `memoria-viva sync` |
| `memoria-viva check` | **Audita a saúde da Memória Viva no projeto.** Valida se todos os guardrails, diretrizes e memórias estão ativos e em dia. | `memoria-viva check` |
| `memoria-viva status` | **Exibe o status e DNA do projeto.** Mostra a linguagem, framework, ORM e banco de dados detectados. | `memoria-viva status` |
| `memoria-viva configure` | **Configura as pontes MCP e IDEs.** Gera/atualiza as configurações para Claude Code, Cursor, VS Code e OpenCode. | `memoria-viva configure` |
| `memoria-viva update` | **Atualiza modelos e templates.** Sincroniza os templates locais com a versão global mais recente. | `memoria-viva update` |
| `memoria-viva --help` | **Exibe o menu de ajuda interativo.** Mostra todos os comandos, flags e exemplos. | `memoria-viva --help` |
| `memoria-viva --version` | **Exibe a versão do CLI.** Retorna `memoria-viva v2.0.0`. | `memoria-viva --version` |

---

## ⚙️ 3. Flags Globais Suportadas

- `--dry-run`: Simula todas as ações sem alterar nenhum arquivo em disco.
- `--silent`: Executa em modo silencioso sem imprimir saídas longas (ideal para automações CI/CD).
