'use strict';

const crypto = require('crypto');
const fs = require('fs-extra');
const path = require('path');
const readline = require('readline');

const LOCAL_CONFIGS = [
    { path: '.mcp.json', format: 'standard' },
    { path: '.cursor/mcp.json', format: 'standard' },
    { path: '.vscode/mcp.json', format: 'vscode' },
    { path: 'opencode.json', format: 'opencode' }
];

/**
 * Configura o MCP MySQL de forma explícita. Configurações existentes são
 * mescladas e as credenciais ficam apenas em .env.mcp, lidas pelo runner local.
 */
class MCPBridge {
    constructor(projectDNA, options = {}) {
        this.dna = projectDNA || { database: 'MySQL', root: process.cwd(), projectName: path.basename(process.cwd()) };
        this.options = { dryRun: false, global: false, ...options };
        this.root = path.resolve(this.dna.root || process.cwd());
    }

    async configure(credentials = null) {
        const activeCredentials = credentials
            ? this._validateCredentials(credentials)
            : await this._loadEnvMCP();

        if (!activeCredentials) {
            return [{
                action: 'skipped',
                file: 'MCP configs',
                reason: 'credenciais ausentes; use memoria-viva mcp ou crie .env.mcp'
            }];
        }

        this._validateCredentials(activeCredentials);
        const runnerPath = path.join(this.root, 'tools', 'memoria-viva-mcp.js');
        const serverConfig = this._generateServerConfig(runnerPath);
        const targets = LOCAL_CONFIGS.map(config => ({
            targetPath: path.join(this.root, config.path),
            displayPath: config.path,
            format: config.format
        }));
        if (this.options.global) targets.push(...await this._getGlobalConfigTargets());

        // Todos os JSONs são lidos, validados e preparados antes da primeira
        // mutação. Assim um JSON global inválido não deixa o projeto local
        // parcialmente configurado.
        const configPlans = [];
        for (const target of targets) {
            configPlans.push(await this._prepareMCPConfig(
                target.targetPath,
                serverConfig,
                target.displayPath,
                target.format
            ));
        }

        const results = [];
        results.push(await this._updateGitignore());
        results.push(await this._writeTextIfMissing('.env.mcp.example', this._generateEnvExample()));
        results.push(await this._copyRuntimeDoc());
        results.push(await this._copyRunner());
        if (credentials) {
            results.push(await this._writeText(
                '.env.mcp',
                this._generateEnvContent(activeCredentials),
                { mode: 0o600 }
            ));
        }

        for (const plan of configPlans) {
            results.push(await this._writeJson(
                plan.targetPath,
                plan.json,
                plan.displayPath,
                plan.originalContent
            ));
        }

        return results.filter(Boolean);
    }

    async promptInteractive() {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        const ask = (query, defaultValue = '') => new Promise(resolve => {
            const promptText = defaultValue ? `${query} [${defaultValue}]: ` : `${query}: `;
            rl.question(promptText, answer => resolve(answer.trim() || defaultValue));
        });

        try {
            console.log('\nConfiguração local do MCP MySQL (credenciais não serão gravadas nos JSONs das IDEs)\n');
            const host = await ask('Host MySQL', '127.0.0.1');
            const port = await ask('Porta MySQL', '3306');
            const user = await ask('Usuário MySQL de menor privilégio');
            const password = await ask('Senha');
            const database = await ask('Banco de dados');
            const charset = await ask('Charset', 'utf8mb4');
            return this._validateCredentials({ host, port, user, password, database, charset });
        } finally {
            rl.close();
        }
    }

    _validateCredentials(credentials) {
        const normalized = {
            host: String(credentials.host || '').trim(),
            port: String(credentials.port || '3306').trim(),
            user: String(credentials.user || '').trim(),
            password: String(credentials.password || ''),
            database: String(credentials.database || '').trim(),
            charset: String(credentials.charset || 'utf8mb4').trim()
        };

        for (const [key, value] of Object.entries(normalized)) {
            if (/\r|\n|\0/.test(value)) throw new Error(`Credencial MCP inválida em ${key}: quebras de linha não são permitidas.`);
        }
        for (const key of ['host', 'user', 'database']) {
            if (!normalized[key]) throw new Error(`Credencial MCP obrigatória ausente: ${key}.`);
        }
        const port = Number(normalized.port);
        if (!Number.isInteger(port) || port < 1 || port > 65535) {
            throw new Error('Porta MCP inválida; use um inteiro entre 1 e 65535.');
        }
        if (/[/@\s]/.test(normalized.host)) throw new Error('Host MCP inválido.');
        return normalized;
    }

    _serverKey() {
        const projectName = String(this.dna.projectName || path.basename(this.root))
            .toLowerCase()
            .replace(/[^a-z0-9_-]+/g, '_')
            .replace(/^_+|_+$/g, '') || 'project';
        const projectHash = crypto.createHash('sha256').update(this.root.toLowerCase()).digest('hex').slice(0, 8);
        return `memoria_viva_${projectName}_${projectHash}`;
    }

    _generateServerConfig(runnerPath) {
        return {
            command: process.execPath,
            args: [runnerPath]
        };
    }

    _validateConfigShape(json, format) {
        const requireObject = (value, field) => {
            if (value !== undefined && (!value || Array.isArray(value) || typeof value !== 'object')) {
                throw new Error(`${field} deve ser um objeto`);
            }
        };
        if (format === 'vscode') requireObject(json.servers, 'servers');
        else if (format === 'opencode') {
            requireObject(json.mcp, 'mcp');
            if (json.mcp) requireObject(json.mcp.servers, 'mcp.servers');
        } else requireObject(json.mcpServers, 'mcpServers');
    }

    async _prepareMCPConfig(targetPath, serverConfig, displayPath, format = 'standard') {
        const exists = await fs.pathExists(targetPath);
        let json = {};
        let originalContent = null;
        if (exists) {
            try {
                originalContent = await fs.readFile(targetPath, 'utf8');
                json = JSON.parse(originalContent);
            } catch (error) {
                throw new Error(`Configuração MCP inválida preservada sem alterações (${displayPath}): ${error.message}`);
            }
            if (!json || Array.isArray(json) || typeof json !== 'object') {
                throw new Error(`Configuração MCP inválida preservada sem alterações (${displayPath}): raiz deve ser um objeto JSON.`);
            }
        }

        try {
            this._validateConfigShape(json, format);
        } catch (error) {
            throw new Error(`Configuração MCP inválida preservada sem alterações (${displayPath}): ${error.message}.`);
        }
        const serverKey = this._serverKey();
        if (format === 'vscode') {
            json.servers = json.servers || {};
            json.servers[serverKey] = { type: 'stdio', ...serverConfig };
        } else if (format === 'opencode') {
            json.$schema = json.$schema || 'https://opencode.ai/config.json';
            json.mcp = json.mcp || {};
            json.mcp.servers = json.mcp.servers || {};
            json.mcp.servers[serverKey] = {
                type: 'local',
                command: [serverConfig.command, ...(serverConfig.args || [])]
            };
        } else {
            json.mcpServers = json.mcpServers || {};
            json.mcpServers[serverKey] = serverConfig;
        }

        return { targetPath, displayPath, format, json, originalContent };
    }

    async _mergeMCPConfig(targetPath, serverConfig, displayPath, format = 'standard') {
        const plan = await this._prepareMCPConfig(targetPath, serverConfig, displayPath, format);
        return this._writeJson(plan.targetPath, plan.json, plan.displayPath, plan.originalContent);
    }

    async _getGlobalConfigTargets() {
        const isWindows = process.platform === 'win32';
        const homeDirectory = process.env.HOME || process.env.USERPROFILE;
        const appData = process.env.APPDATA;
        const targets = [];

        if (homeDirectory) {
            targets.push({ name: 'Cursor Global', path: path.join(homeDirectory, '.cursor', 'mcp.json'), createDirectory: true });
        }
        if (isWindows && appData) {
            targets.push({ name: 'Claude Desktop Global', path: path.join(appData, 'Claude', 'claude_desktop_config.json') });
        } else if (process.platform === 'darwin' && homeDirectory) {
            targets.push({
                name: 'Claude Desktop Global',
                path: path.join(homeDirectory, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json')
            });
        }

        const eligibleTargets = [];
        for (const target of targets) {
            if (!target.createDirectory && !await fs.pathExists(path.dirname(target.path))) continue;
            eligibleTargets.push({
                targetPath: target.path,
                displayPath: `${target.name} (${target.path})`,
                format: 'standard'
            });
        }
        return eligibleTargets;
    }

    async _loadEnvMCP() {
        const fromProcess = {
            host: process.env.MYSQL_HOST,
            port: process.env.MYSQL_PORT,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE,
            charset: process.env.MYSQL_CHARSET
        };
        if (fromProcess.host && fromProcess.user && fromProcess.database) {
            return this._validateCredentials(fromProcess);
        }

        const envPath = path.join(this.root, '.env.mcp');
        if (!await fs.pathExists(envPath)) return null;
        const content = await fs.readFile(envPath, 'utf8');
        const values = {};
        for (const line of content.split(/\r?\n/)) {
            const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
            if (!match) continue;
            let value = match[2].trim();
            if (value.startsWith('"')) {
                if (!value.endsWith('"')) {
                    throw new Error(`Valor inválido em .env.mcp (${match[1]}): aspas não foram fechadas`);
                }
                try { value = JSON.parse(value); } catch (error) {
                    throw new Error(`Valor inválido em .env.mcp (${match[1]}): ${error.message}`);
                }
            }
            values[match[1]] = value;
        }

        return this._validateCredentials({
            host: values.MYSQL_HOST,
            port: values.MYSQL_PORT,
            user: values.MYSQL_USER,
            password: values.MYSQL_PASSWORD,
            database: values.MYSQL_DATABASE,
            charset: values.MYSQL_CHARSET
        });
    }

    _generateEnvExample() {
        return `# Memória Viva — MCP MySQL local\n# Use um usuário de menor privilégio. Nunca versione .env.mcp.\nMYSQL_HOST=127.0.0.1\nMYSQL_PORT=3306\nMYSQL_DATABASE=seu_banco\nMYSQL_USER=leitura_mcp\nMYSQL_PASSWORD=troque_esta_senha\nMYSQL_CHARSET=utf8mb4\n`;
    }

    _generateEnvContent(credentials) {
        const quote = value => JSON.stringify(String(value ?? ''));
        return `# Memória Viva — credenciais locais do MCP MySQL\nMYSQL_HOST=${quote(credentials.host)}\nMYSQL_PORT=${quote(credentials.port)}\nMYSQL_DATABASE=${quote(credentials.database)}\nMYSQL_USER=${quote(credentials.user)}\nMYSQL_PASSWORD=${quote(credentials.password)}\nMYSQL_CHARSET=${quote(credentials.charset || 'utf8mb4')}\n`;
    }

    async _copyRunner() {
        const sourcePath = path.join(__dirname, '..', 'templates', 'mcp-runner.js');
        if (!await fs.pathExists(sourcePath)) throw new Error(`Runner MCP ausente no pacote: ${sourcePath}`);
        return this._writeTextIfMissing('tools/memoria-viva-mcp.js', await fs.readFile(sourcePath, 'utf8'));
    }

    async _copyRuntimeDoc() {
        const candidates = [
            path.join(__dirname, '..', 'templates', 'docs', 'mcp', 'mysql.md'),
            path.join(__dirname, '..', 'docs', 'mcp', 'mysql.md')
        ];
        const sourcePath = candidates.find(candidate => fs.existsSync(candidate));
        if (!sourcePath) return { action: 'skipped', file: 'docs/mcp/mysql.md', reason: 'template ausente' };
        return this._writeTextIfMissing('docs/mcp/mysql.md', await fs.readFile(sourcePath, 'utf8'));
    }

    async _updateGitignore() {
        const targetPath = path.join(this.root, '.gitignore');
        const exists = await fs.pathExists(targetPath);
        let content = exists ? await fs.readFile(targetPath, 'utf8') : '';
        const entries = ['.env.mcp', '.mcp.json', '.cursor/mcp.json', '.vscode/mcp.json', 'opencode.json', 'mcp_config.json'];
        const missing = entries.filter(entry => !content.split(/\r?\n/).includes(entry));
        if (!missing.length) return { action: 'unchanged', file: '.gitignore' };

        content = `${content.trimEnd()}${content.trim() ? '\n\n' : ''}# Memória Viva — credenciais/configuração MCP local\n${missing.join('\n')}\n`;
        return this._writeText('.gitignore', content);
    }

    async _writeTextIfMissing(relativePath, content) {
        const targetPath = path.join(this.root, relativePath);
        if (await fs.pathExists(targetPath)) return { action: 'unchanged', file: relativePath };
        return this._writeText(relativePath, content);
    }

    async _writeText(relativePath, content, options = {}) {
        const targetPath = path.join(this.root, relativePath);
        const exists = await fs.pathExists(targetPath);
        const previousContent = exists ? await fs.readFile(targetPath, 'utf8') : null;
        if (previousContent === content) {
            return { action: 'unchanged', file: relativePath };
        }
        if (this.options.dryRun) return { action: exists ? 'would-update' : 'would-create', file: relativePath };

        await fs.ensureDir(path.dirname(targetPath));
        await this._atomicWrite(targetPath, content, options.mode, previousContent);
        if (options.mode && process.platform !== 'win32') await fs.chmod(targetPath, options.mode);
        return { action: exists ? 'updated' : 'created', file: relativePath };
    }

    async _writeJson(targetPath, json, displayPath, originalContent) {
        const content = `${JSON.stringify(json, null, 2)}\n`;
        const currentExists = await fs.pathExists(targetPath);
        const currentContent = currentExists ? await fs.readFile(targetPath, 'utf8') : null;
        if (currentContent !== originalContent) {
            throw new Error(`Conflito de escrita em ${displayPath}: o arquivo mudou durante a configuração; nenhuma sobrescrita foi feita.`);
        }
        if (currentContent === content) {
            return { action: 'unchanged', file: displayPath };
        }
        if (this.options.dryRun) {
            return { action: currentExists ? 'would-update' : 'would-create', file: displayPath };
        }
        await fs.ensureDir(path.dirname(targetPath));
        await this._atomicWrite(targetPath, content, undefined, originalContent);
        return { action: currentExists ? 'updated' : 'created', file: displayPath };
    }

    async _atomicWrite(targetPath, content, mode, expectedPrevious = undefined) {
        const suffix = crypto.randomBytes(6).toString('hex');
        const temporaryPath = `${targetPath}.${process.pid}.${suffix}.tmp`;
        try {
            await fs.writeFile(temporaryPath, content, { encoding: 'utf8', mode });
            if (expectedPrevious !== undefined) {
                const currentExists = await fs.pathExists(targetPath);
                const currentContent = currentExists ? await fs.readFile(targetPath, 'utf8') : null;
                if (currentContent !== expectedPrevious) {
                    throw new Error(`Conflito de escrita em ${targetPath}: o destino mudou durante a configuração; nenhuma sobrescrita foi feita.`);
                }
            }
            try {
                await fs.rename(temporaryPath, targetPath);
            } catch (error) {
                if (['EEXIST', 'EPERM', 'EBUSY', 'ENOTEMPTY'].includes(error.code)) {
                    throw new Error(`Conflito de escrita em ${targetPath}: destino ocupado ou alterado; nenhuma sobrescrita foi feita.`);
                }
                throw error;
            }
        } finally {
            await fs.remove(temporaryPath).catch(() => {});
        }
    }
}

module.exports = MCPBridge;
