# MCP MySQL opcional

O Memória Viva pode configurar `@berthojoris/mcp-mysql-server` para consulta de contexto do banco. Essa integração é separada da memória do projeto e só é alterada por comando explícito.

## Configuração local

```bash
memoria-viva mcp
```

Ou crie `.env.mcp` e use `memoria-viva configure`:

```env
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_DATABASE=seu_banco
MYSQL_USER=leitura_mcp
MYSQL_PASSWORD=troque_esta_senha
MYSQL_CHARSET=utf8mb4
```

Use uma conta de menor privilégio adequada às operações necessárias. Não use credencial administrativa por conveniência.

## O que é gravado

- `.env.mcp`: credenciais locais, com permissão restrita quando o sistema suporta.
- `tools/memoria-viva-mcp.js`: runner que lê as credenciais em tempo de execução.
- Arquivos MCP das IDEs: comando e caminho do runner, sem usuário ou senha.
- O runner inicia `@berthojoris/mcp-mysql-server@1.43.2` com permissões `list,read,utility`.
- `.gitignore`: entradas para o env e configurações MCP locais.

Configurações JSON existentes são mescladas. Se um JSON estiver inválido, o comando falha e preserva o arquivo. A configuração global só ocorre com `--global`.

## Limite de segurança

A senha não é persistida nos JSONs nem nos argumentos. O runner a repassa ao processo-filho por ambiente; proteja a conta local e use uma credencial limitada/rotacionável.

As ferramentas disponibilizadas dependem da versão e configuração do servidor MCP. Confirme as capacidades expostas antes de permitir consultas além de leitura.

## Diagnóstico

- `ER_ACCESS_DENIED_ERROR`: revise usuário, senha, host permitido e privilégios.
- `ECONNREFUSED`/`EHOSTUNREACH`: confirme serviço, host, porta e firewall.
- IDE sem ferramentas: reinicie a IDE e inspecione o log do runner; não coloque a senha manualmente no JSON.
