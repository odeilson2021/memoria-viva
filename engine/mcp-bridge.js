'use strict';

const fs = require('fs-extra');
const path = require('path');
const readline = require('readline');

/**
 * Ponte de Conexão MCP (Model Context Protocol)
 * Configura integrações de banco de dados (MySQL via @berthojoris/mcp-mysql-server)
 * em projetos locais e nas configurações globais do Cursor, Claude Desktop, VS Code e OpenCode.
 */
class MCPBridge {
    constructor(projectDNA, options = {}) {
        this.dna = projectDNA || { database: 'MySQL', root: process.cwd() };
        this.options = options;
        this.root = this.dna.root || process.cwd();
    }

    async configure(credentials = null) {
        const results = [];

        // 1. Criar/Atualizar .env.mcp.example
        const envExamplePath = path.join(this.root, '.env.mcp.example');
        if (!await fs.pathExists(envExamplePath)) {
            const envContent = this._generateEnvExample();
            if (!this.options.dryRun) {
                await fs.writeFile(envExamplePath, envContent, 'utf8');
            }
            results.push({ action: 'created', file: '.env.mcp.example' });
        }

        // 2. Se credenciais foram fornecidas, gravar .env.mcp local
        let activeCreds = credentials || await this._loadEnvMCP();
        if (credentials && !this.options.dryRun) {
            const envContent = this._generateEnvContent(credentials);
            await fs.writeFile(path.join(this.root, '.env.mcp'), envContent, 'utf8');
            results.push({ action: 'created/updated', file: '.env.mcp' });
        }

        // 3. Configurar arquivos locais do projeto
        const connectionUrl = this._buildConnectionUrl(activeCreds);

        const projectConfigs = [
            { path: '.mcp.json', type: 'claude_code' },
            { path: '.cursor/mcp.json', type: 'cursor' },
            { path: '.vscode/mcp.json', type: 'vscode' },
            { path: 'opencode.json', type: 'opencode' },
            { path: 'mcp_config.json', type: 'mcp_config' }
        ];

        for (const cfg of projectConfigs) {
            const fullPath = path.join(this.root, cfg.path);
            const configData = this._generateMCPConfig(connectionUrl, activeCreds, cfg.type);

            if (!this.options.dryRun) {
                await fs.ensureDir(path.dirname(fullPath));
                await fs.writeJson(fullPath, configData, { spaces: 2 });
            }
            results.push({ action: await fs.pathExists(fullPath) ? 'updated' : 'created', file: cfg.path });
        }

        // 4. Injetar nas configurações globais do Cursor e Claude Desktop no SO
        const globalResults = await this._injectGlobalIDEs(activeCreds);
        results.push(...globalResults);

        // 5. Copiar docs/mcp/mysql.md se não existir
        const docDst = path.join(this.root, 'docs', 'mcp', 'mysql.md');
        if (!await fs.pathExists(docDst) && !this.options.dryRun) {
            const globalDoc = path.resolve(__dirname, '..', 'docs', 'mcp', 'mysql.md');
            if (await fs.pathExists(globalDoc)) {
                await fs.ensureDir(path.dirname(docDst));
                await fs.copy(globalDoc, docDst);
                results.push({ action: 'created', file: 'docs/mcp/mysql.md' });
            }
        }

        // 6. Atualizar .gitignore
        await this._updateGitignore();

        return results;
    }

    async promptInteractive() {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const ask = (query, defaultValue) => new Promise((resolve) => {
            const promptText = defaultValue ? `${query} [${defaultValue}]: ` : `${query}: `;
            rl.question(promptText, (answer) => {
                resolve(answer.trim() || defaultValue || '');
            });
        });

        console.log('\n🔌 ASSISTENTE DE CONFIGURAÇÃO DO MCP MYSQL GLOBAL (@berthojoris/mcp-mysql-server)\n');
        
        const host = await ask('Host MySQL (ex: 127.0.0.1 ou IP)', '127.0.0.1');
        const port = await ask('Porta MySQL (Padrão: 3306)', '3306');
        const user = await ask('Usuário do Banco', 'root');
        const password = await ask('Senha do Banco', '');
        const database = await ask('Nome do Banco de Dados', 'seu_banco');
        const charset = await ask('Charset', 'utf8mb4');

        rl.close();

        return { host, port, user, password, database, charset };
    }

    async _injectGlobalIDEs(creds) {
        const results = [];
        if (this.options.dryRun) return results;

        const isWin = process.platform === 'win32';
        const homeDir = process.env.HOME || process.env.USERPROFILE;
        const appData = process.env.APPDATA || '';

        const globalPaths = [];
        if (isWin) {
            if (appData) {
                globalPaths.push({ name: 'Cursor Global', path: path.join(appData, 'Cursor/User/globalStorage/mcp.json') });
                globalPaths.push({ name: 'Claude Desktop Global', path: path.join(appData, 'Claude/claude_desktop_config.json') });
            }
        } else {
            if (homeDir) {
                globalPaths.push({ name: 'Cursor Global', path: path.join(homeDir, '.config/Cursor/mcp.json') });
                globalPaths.push({ name: 'Claude Desktop Global', path: path.join(homeDir, '.config/Claude/claude_desktop_config.json') });
            }
        }

        const serverKey = `memoria_viva_${creds.database || 'db'}`;
        const serverConfig = {
            "command": "npx",
            "args": [
                "-y",
                "@berthojoris/mcp-mysql-server",
                this._buildConnectionUrl(creds)
            ]
        };

        for (const target of globalPaths) {
            try {
                const dir = path.dirname(target.path);
                if (await fs.pathExists(dir)) {
                    let json = { mcpServers: {} };
                    if (await fs.pathExists(target.path)) {
                        json = await fs.readJson(target.path).catch(() => ({ mcpServers: {} }));
                    }
                    json.mcpServers = json.mcpServers || {};
                    json.mcpServers[serverKey] = serverConfig;

                    await fs.writeJson(target.path, json, { spaces: 2 });
                    results.push({ action: 'injected', file: `${target.name} (${target.path})` });
                }
            } catch (e) {
                // Silencioso se diretório não existir
            }
        }

        return results;
    }

    async _loadEnvMCP() {
        const envPath = path.join(this.root, '.env.mcp');
        if (await fs.pathExists(envPath)) {
            try {
                const content = await fs.readFile(envPath, 'utf8');
                const parse = (key, fallback) => {
                    const match = content.match(new RegExp(`^${key}=(.*)$`, 'm'));
                    return match ? match[1].trim() : fallback;
                };
                return {
                    host: parse('MYSQL_HOST', '127.0.0.1'),
                    port: parse('MYSQL_PORT', '3306'),
                    user: parse('MYSQL_USER', 'root'),
                    password: parse('MYSQL_PASSWORD', ''),
                    database: parse('MYSQL_DATABASE', 'seu_banco'),
                    charset: parse('MYSQL_CHARSET', 'utf8mb4')
                };
            } catch (e) {
                // Ignore
            }
        }
        return {
            host: '127.0.0.1',
            port: '3306',
            user: 'root',
            password: '',
            database: 'seu_banco',
            charset: 'utf8mb4'
        };
    }

    _buildConnectionUrl(creds) {
        const u = encodeURIComponent(creds.user || 'root');
        const p = encodeURIComponent(creds.password || '');
        const h = creds.host || '127.0.0.1';
        const port = creds.port || '3306';
        const db = creds.database || 'seu_banco';

        return `mysql://${u}:${p}@${h}:${port}/${db}`;
    }

    _generateEnvExample() {
        return `# Memória Viva — Configurações MCP MySQL (@berthojoris/mcp-mysql-server)
# NUNCA versione credenciais reais no Git!
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_DATABASE=seu_banco
MYSQL_USER=root
MYSQL_PASSWORD=sua_senha
MYSQL_CHARSET=utf8mb4
`;
    }

    _generateEnvContent(creds) {
        return `# Memória Viva — Credenciais locais MCP MySQL
MYSQL_HOST=${creds.host}
MYSQL_PORT=${creds.port}
MYSQL_DATABASE=${creds.database}
MYSQL_USER=${creds.user}
MYSQL_PASSWORD=${creds.password}
MYSQL_CHARSET=${creds.charset || 'utf8mb4'}
`;
    }

    _generateMCPConfig(connectionUrl, creds, type) {
        const serverKey = type === 'mcp_config' ? 'memoria_viva_db' : 'mysql';
        return {
            "mcpServers": {
                [serverKey]: {
                    "command": "npx",
                    "args": [
                        "-y",
                        "@berthojoris/mcp-mysql-server",
                        connectionUrl
                    ]
                }
            }
        };
    }

    async _updateGitignore() {
        const gitignorePath = path.join(this.root, '.gitignore');
        if (await fs.pathExists(gitignorePath)) {
            let content = await fs.readFile(gitignorePath, 'utf8');
            let modified = false;

            if (!content.includes('.env.mcp')) {
                content += '\n# Memória Viva MCP Secrets\n.env.mcp\n';
                modified = true;
            }

            if (modified && !this.options.dryRun) {
                await fs.writeFile(gitignorePath, content, 'utf8');
            }
        }
    }
}

module.exports = MCPBridge;
