# 🔌 GUIA COMPLETO: CONFIGURAÇÃO DO MCP MYSQL (`@berthojoris/mcp-mysql-server`)

> **Model Context Protocol (MCP) — MySQL Server Integration**
> Permite que assistentes de IA (OpenCode, Cursor, VS Code, Claude Code, Claude Desktop) consultem schemas, tabelas e façam análises diretamente no banco de dados com total segurança.

---

## 📋 1. Pré-Requisitos

- **Node.js**: v18.0.0 ou superior
- **NPM / NPX**: Disponíveis no terminal (`node -v` e `npx -v`)
- **Pacote MCP**: `@berthojoris/mcp-mysql-server`
- **Banco de Dados**: MySQL / MariaDB acessível via rede ou localhost

---

## 🔑 2. Variáveis de Ambiente (`.env.mcp`)

Crie ou edite o arquivo `.env.mcp` na raiz do projeto (**nunca versione este arquivo no Git!**):

```env
# Configurações de Conexão MCP MySQL
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_DATABASE=seu_banco
MYSQL_USER=root
MYSQL_PASSWORD=sua_senha_segura
MYSQL_CHARSET=utf8mb4
```

> ⚠️ **Segurança:** O arquivo `.env.mcp` já está incluído no `.gitignore`. Nunca insira senhas diretamente em arquivos commitados.

---

## 🛠️ 3. Configuração Automática via CLI (`memoria-viva mcp`)

Para configurar interativamente todas as IDEs de uma só vez, execute no terminal:

```bash
memoria-viva mcp
```

O assistente solicitará Host, Porta, Usuário, Senha e Database e gerará automaticamente:
- `.env.mcp` (Credenciais locais)
- `.mcp.json` (Claude Code CLI)
- `.cursor/mcp.json` (Cursor IDE)
- `.vscode/mcp.json` (VS Code Copilot / MCP Extensions)
- `opencode.json` (OpenCode Agent)
- `mcp_config.json` (Template de referência)

---

## 💻 4. Configuração Manual por IDE

Caso prefira configurar manualmente, utilize a estrutura abaixo substituindo as credenciais:

### URL de Conexão MySQL:
`mysql://<USUARIO>:<SENHA_ENCODADA>@<HOST>:<PORTA>/<DATABASE>`

> ⚠️ Se a sua senha possuir caracteres especiais (`@`, `#`, `$`, `/`, `:`), ela deve ser codificada com `encodeURIComponent()`. Exemplo: `P@ssword` vira `P%40ssword`.

#### A. Claude Code / CLI (`.mcp.json`)
```json
{
  "mcpServers": {
    "mysql": {
      "command": "npx",
      "args": [
        "-y",
        "@berthojoris/mcp-mysql-server",
        "mysql://root:sua_senha@127.0.0.1:3306/seu_banco"
      ]
    }
  }
}
```

#### B. Cursor IDE (`.cursor/mcp.json`)
```json
{
  "mcpServers": {
    "mysql": {
      "command": "npx",
      "args": [
        "-y",
        "@berthojoris/mcp-mysql-server",
        "mysql://root:sua_senha@127.0.0.1:3306/seu_banco"
      ]
    }
  }
}
```

#### C. OpenCode (`opencode.json`)
```json
{
  "mcpServers": {
    "mysql": {
      "command": "npx",
      "args": [
        "-y",
        "@berthojoris/mcp-mysql-server",
        "mysql://root:sua_senha@127.0.0.1:3306/seu_banco"
      ]
    }
  }
}
```

---

## 🧪 5. Ferramentas Disponíveis para a IA (MCP Tools)

Após a conexão, a IA terá acesso às seguintes ferramentas nativas:

| Ferramenta | Descrição |
|------------|-----------|
| `list_tables` | Lista todas as tabelas presentes no banco de dados |
| `read_table_schema` | Lê os tipos, colunas, chaves e índices de uma tabela |
| `run_select_query` | Executa consultas `SELECT` de leitura auditadas |
| `get_database_summary` | Retorna o resumo geral das tabelas e volumes |
| `search_schema` | Busca colunas e tabelas por palavra-chave |
| `analyze_query` | Analisa a performance de uma query (`EXPLAIN`) |

---

## 🚨 6. Solução de Problemas Comuns

### 1. `ER_ACCESS_DENIED_ERROR` / Senha Inválida:
- Verifique se a senha no `.env.mcp` está correta.
- Se a senha tiver caracteres especiais, certifique-se de que foram escapados via URL Encode na connection string.

### 2. `ECONNREFUSED` / `EHOSTUNREACH`:
- Verifique se o serviço MySQL está rodando (`systemctl status mysql` ou serviços do Windows).
- Certifique-se de que a porta `3306` está liberada no firewall local.

### 3. IDE não reconhece as ferramentas MCP:
- Reinicie a IDE após criar/alterar os arquivos `.mcp.json` / `.cursor/mcp.json`.
- Execute `npx -y @berthojoris/mcp-mysql-server --help` no terminal para verificar se o pacote instala corretamente via NPX.
