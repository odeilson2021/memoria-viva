'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('fs-extra');
const os = require('node:os');

const MCPBridge = require('../engine/mcp-bridge');

async function tmpProject(t, name) {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), `mv-mcp-${name}-`));
    t.after(() => fs.remove(root));
    return root;
}

const credentials = {
    host: '127.0.0.1',
    port: '3306',
    user: 'memory_reader',
    password: 's3cret:@value',
    database: 'app',
    charset: 'utf8mb4'
};

test('mescla MCP, preserva configurações e mantém senha fora dos JSONs', async t => {
    const root = await tmpProject(t, 'merge');
    await fs.writeJson(path.join(root, '.mcp.json'), {
        custom: true,
        mcpServers: { existing: { command: 'keep-me' } }
    });
    const bridge = new MCPBridge({ root, projectName: 'api', database: 'MySQL' });
    const results = await bridge.configure(credentials);

    const config = await fs.readJson(path.join(root, '.mcp.json'));
    assert.equal(config.custom, true);
    assert.equal(config.mcpServers.existing.command, 'keep-me');
    const ownKeys = Object.keys(config.mcpServers).filter(key => key.startsWith('memoria_viva_'));
    assert.equal(ownKeys.length, 1);

    for (const relativePath of ['.mcp.json', '.cursor/mcp.json', '.vscode/mcp.json', 'opencode.json']) {
        const content = await fs.readFile(path.join(root, relativePath), 'utf8');
        assert.doesNotMatch(content, /s3cret|memory_reader/);
    }
    const vscode = await fs.readJson(path.join(root, '.vscode/mcp.json'));
    const vscodeServer = Object.values(vscode.servers)[0];
    assert.equal(vscodeServer.type, 'stdio');
    assert.equal(vscodeServer.command, process.execPath);
    const opencode = await fs.readJson(path.join(root, 'opencode.json'));
    const opencodeServer = Object.values(opencode.mcp.servers)[0];
    assert.equal(opencodeServer.type, 'local');
    assert.deepEqual(opencodeServer.command, [process.execPath, path.join(root, 'tools', 'memoria-viva-mcp.js')]);
    assert.equal(await fs.pathExists(path.join(root, 'mcp_config.json')), false);
    assert.match(await fs.readFile(path.join(root, '.env.mcp'), 'utf8'), /s3cret:@value/);
    const gitignore = await fs.readFile(path.join(root, '.gitignore'), 'utf8');
    assert.match(gitignore, /^\.env\.mcp$/m);
    assert.match(gitignore, /^\.cursor\/mcp\.json$/m);
    assert.equal(await fs.pathExists(path.join(root, 'tools/memoria-viva-mcp.js')), true);
    const runner = await fs.readFile(path.join(root, 'tools/memoria-viva-mcp.js'), 'utf8');
    assert.match(runner, /mcp-mysql-server@1\.43\.2/);
    assert.match(runner, /MCP_PERMISSIONS: 'list,read,utility'/);
    assert.doesNotMatch(runner, /mysql:\/\//);

    const cursorResult = results.find(result => result.file === '.cursor/mcp.json');
    assert.equal(cursorResult.action, 'created');
});

test('JSON MCP inválido é preservado e causa erro explícito', async t => {
    const root = await tmpProject(t, 'invalid');
    const configPath = path.join(root, '.mcp.json');
    await fs.writeFile(configPath, '{ invalido', 'utf8');
    const bridge = new MCPBridge({ root, projectName: 'api', database: 'MySQL' });

    await assert.rejects(() => bridge.configure(credentials), /inválida preservada sem alterações/);
    assert.equal(await fs.readFile(configPath, 'utf8'), '{ invalido');
});

test('sem credenciais não grava nenhum arquivo', async t => {
    const root = await tmpProject(t, 'no-credentials');
    const bridge = new MCPBridge({ root, projectName: 'api', database: 'MySQL' });
    bridge._loadEnvMCP = async () => null;

    const results = await bridge.configure();

    assert.deepEqual(await fs.readdir(root), []);
    assert.deepEqual(results, [{
        action: 'skipped',
        file: 'MCP configs',
        reason: 'credenciais ausentes; use memoria-viva mcp ou crie .env.mcp'
    }]);
});

test('preflight global inválido impede qualquer mutação local', async t => {
    const root = await tmpProject(t, 'global-preflight');
    const globalRoot = await tmpProject(t, 'global-target');
    const globalConfig = path.join(globalRoot, 'mcp.json');
    await fs.writeFile(globalConfig, '{ global invalido', 'utf8');
    const bridge = new MCPBridge(
        { root, projectName: 'api', database: 'MySQL' },
        { global: true }
    );
    bridge._getGlobalConfigTargets = async () => [{
        targetPath: globalConfig,
        displayPath: `Global Test (${globalConfig})`,
        format: 'standard'
    }];

    await assert.rejects(() => bridge.configure(credentials), /inválida preservada sem alterações/);
    assert.deepEqual(await fs.readdir(root), []);
    assert.equal(await fs.readFile(globalConfig, 'utf8'), '{ global invalido');
});

test('carrega env com trim seguro e preserva espaços de valor entre aspas', async t => {
    const root = await tmpProject(t, 'env-trim');
    await fs.writeFile(path.join(root, '.env.mcp'), [
        '  MYSQL_HOST = 127.0.0.1   ',
        'MYSQL_PORT = 3306   ',
        'MYSQL_DATABASE = app   ',
        'MYSQL_USER = reader   ',
        'MYSQL_PASSWORD = "  secret with spaces  "   ',
        'MYSQL_CHARSET = utf8mb4   ',
        ''
    ].join('\n'), 'utf8');
    const bridge = new MCPBridge({ root, projectName: 'api', database: 'MySQL' });

    const loaded = await bridge._loadEnvMCP();

    assert.equal(loaded.host, '127.0.0.1');
    assert.equal(loaded.port, '3306');
    assert.equal(loaded.database, 'app');
    assert.equal(loaded.user, 'reader');
    assert.equal(loaded.password, '  secret with spaces  ');
    assert.equal(loaded.charset, 'utf8mb4');
});

test('chave global é isolada por caminho do projeto', async t => {
    const rootA = await tmpProject(t, 'isolation-a');
    const rootB = await tmpProject(t, 'isolation-b');
    const bridgeA = new MCPBridge({ root: rootA, projectName: 'same', database: 'MySQL' });
    const bridgeB = new MCPBridge({ root: rootB, projectName: 'same', database: 'MySQL' });
    assert.notEqual(bridgeA._serverKey(), bridgeB._serverKey());
});

test('dry-run MCP não grava arquivos e relata ações planejadas', async t => {
    const root = await tmpProject(t, 'dry');
    const bridge = new MCPBridge({ root, projectName: 'api', database: 'MySQL' }, { dryRun: true });
    const results = await bridge.configure(credentials);
    assert.equal(await fs.pathExists(path.join(root, '.env.mcp')), false);
    assert.equal(await fs.pathExists(path.join(root, '.mcp.json')), false);
    assert.ok(results.some(result => result.action === 'would-create'));
});

test('conflito no rename aborta sem remover ou sobrescrever o destino', async t => {
    const root = await tmpProject(t, 'rename-conflict');
    const targetPath = path.join(root, 'config.json');
    await fs.writeFile(targetPath, 'conteudo-original', 'utf8');
    const bridge = new MCPBridge({ root, projectName: 'api', database: 'MySQL' });
    const originalRename = fs.rename;
    fs.rename = async () => {
        const error = new Error('arquivo em uso');
        error.code = 'EPERM';
        throw error;
    };

    try {
        await assert.rejects(
            () => bridge._atomicWrite(targetPath, 'novo-conteudo'),
            /Conflito de escrita/
        );
    } finally {
        fs.rename = originalRename;
    }

    assert.equal(await fs.readFile(targetPath, 'utf8'), 'conteudo-original');
    assert.deepEqual(
        (await fs.readdir(root)).filter(file => file.endsWith('.tmp')),
        []
    );
});

test('mudança concorrente detectada antes do rename é preservada', async t => {
    const root = await tmpProject(t, 'content-conflict');
    const targetPath = path.join(root, 'config.json');
    await fs.writeFile(targetPath, 'versao-lida', 'utf8');
    const bridge = new MCPBridge({ root, projectName: 'api', database: 'MySQL' });
    const originalWriteFile = fs.writeFile;
    fs.writeFile = async (filePath, ...args) => {
        const result = await originalWriteFile(filePath, ...args);
        if (String(filePath).endsWith('.tmp')) {
            await originalWriteFile(targetPath, 'edicao-concorrente', 'utf8');
        }
        return result;
    };

    try {
        await assert.rejects(
            () => bridge._atomicWrite(targetPath, 'novo-conteudo', undefined, 'versao-lida'),
            /o destino mudou durante a configuração/
        );
    } finally {
        fs.writeFile = originalWriteFile;
    }

    assert.equal(await fs.readFile(targetPath, 'utf8'), 'edicao-concorrente');
    assert.deepEqual(
        (await fs.readdir(root)).filter(file => file.endsWith('.tmp')),
        []
    );
});
