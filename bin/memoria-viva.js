#!/usr/bin/env node

'use strict';

const path = require('path');
const chalk = require('chalk');
const fs = require('fs-extra');

const ProjectAnalyzer = require('../engine/analyzer');
const ContextGenerator = require('../engine/generator');
const MCPBridge = require('../engine/mcp-bridge');

const PROJECT_ROOT = process.cwd();

const COMMANDS = {
    init: 'Analisa o projeto alvo e injeta as regras e memória viva sob medida',
    sync: 'Sincroniza e atualiza o contexto lendo rotas, tabelas ou componentes recentes',
    mcp: 'Assistente interativo para configurar o MCP MySQL (@berthojoris/mcp-mysql-server)',
    check: 'Audita o projeto e verifica se as regras e memórias estão ativas e sincronizadas',
    status: 'Exibe o status detalhado dos arquivos da Memória Viva no projeto',
    configure: 'Configura o MCP de Banco de Dados e integrações com IDEs',
    update: 'Atualiza os modelos e templates com a versão global mais recente'
};

function log(msg) {
    console.log(chalk.cyan(`🔷 ${msg}`));
}

function success(msg) {
    console.log(chalk.green(`  ✅ ${msg}`));
}

function warning(msg) {
    console.log(chalk.yellow(`  ⚠️  ${msg}`));
}

function error(msg) {
    console.error(chalk.red(`  ❌ ${msg}`));
    process.exit(1);
}

function getProjectRoot() {
    let current = PROJECT_ROOT;
    while (current !== path.dirname(current)) {
        if (fs.existsSync(path.join(current, '.git'))) {
            return current;
        }
        current = path.dirname(current);
    }
    return PROJECT_ROOT;
}

function parseFlags(args) {
    return {
        dryRun: args.includes('--dry-run'),
        silent: args.includes('--silent'),
        help: args.includes('--help') || args.includes('-h'),
        version: args.includes('--version') || args.includes('-v')
    };
}

async function cmdInit(flags) {
    const root = getProjectRoot();
    console.log(chalk.magenta(`
╔═══════════════════════════════════════════════════════════╗
║     🧠 MEMÓRIA VIVA v2.0 — Dynamic AI Governance Engine   ║
║     Inicializando cérebro de desenvolvimento adaptativo    ║
╚═══════════════════════════════════════════════════════════╝`));

    log('Analisando o DNA do projeto alvo...');
    const analyzer = new ProjectAnalyzer(root);
    const dna = await analyzer.analyze();

    console.log(chalk.gray(`  ---------------------------------------------------------`));
    console.log(chalk.bold(`  Linguagem:`), chalk.yellow(dna.language));
    console.log(chalk.bold(`  Framework:`), chalk.yellow(dna.framework));
    console.log(chalk.bold(`  Banco de Dados:`), chalk.yellow(dna.database));
    console.log(chalk.bold(`  ORM / Abstração:`), chalk.yellow(dna.orm));
    console.log(chalk.bold(`  UI / Styling:`), chalk.yellow(dna.uiFramework));
    console.log(chalk.gray(`  ---------------------------------------------------------`));

    if (flags.dryRun) {
        warning('[DRY RUN] Nenhuma alteração foi gravada em disco.');
    }

    log('Injetando guardrails e documentação técnica adaptada...');
    const generator = new ContextGenerator(dna, { dryRun: flags.dryRun, silent: flags.silent });
    const genResults = await generator.generate();

    for (const file of genResults.createdFiles) success(`Criado: ${file}`);
    for (const file of genResults.updatedFiles) success(`Atualizado: ${file}`);
    for (const file of genResults.skippedFiles) warning(`Mantido (já existe): ${file}`);

    log('Sincronizando rotas detectadas com o contexto...');
    await generator.syncContext();

    log('Configurando ponte MCP e integração com IDEs...');
    const bridge = new MCPBridge(dna, { dryRun: flags.dryRun });
    const mcpResults = await bridge.configure();

    for (const res of mcpResults) success(`MCP (${res.action}): ${res.file}`);

    console.log(chalk.green(`
╔═══════════════════════════════════════════════════════════╗
║       ✅  MEMÓRIA VIVA INICIALIZADA COM SUCESSO!           ║
╚═══════════════════════════════════════════════════════════╝

  📁 Projeto: ${chalk.bold(root)}
  🧬 DNA: ${chalk.bold(dna.language)} | ${chalk.bold(dna.framework)} | ${chalk.bold(dna.database)}

  📋 PRÓXIMOS PASSOS:
  1. Execute "memoria-viva mcp" para configurar interativamente suas credenciais de banco
  2. Solicite à sua IA: "Leia os arquivos em docs/ai/ e .agent/rules.md antes de codificar"
  3. Execute "memoria-viva sync" a qualquer momento para re-sincronizar rotas e tabelas
`));
}

async function cmdMCP(flags) {
    const root = getProjectRoot();
    const analyzer = new ProjectAnalyzer(root);
    const dna = await analyzer.analyze();

    const bridge = new MCPBridge(dna, { dryRun: flags.dryRun });
    const creds = flags.silent ? null : await bridge.promptInteractive();

    log('Gerando credenciais e arquivos MCP para IDEs...');
    const results = await bridge.configure(creds);

    for (const res of results) success(`MCP (${res.action}): ${res.file}`);

    console.log(chalk.green(`
╔═══════════════════════════════════════════════════════════╗
║       ✅  CONFIGURAÇÃO MCP MYSQL CONCLUÍDA!               ║
╚═══════════════════════════════════════════════════════════╝

  🔌 Pacote MCP: @berthojoris/mcp-mysql-server
  🔑 Credenciais: .env.mcp (Gravado e ignorado pelo Git)
  📘 Documentação: docs/mcp/mysql.md
  💻 IDEs Configuradas: Claude Code (.mcp.json), Cursor (.cursor/mcp.json), VS Code (.vscode/mcp.json), OpenCode (opencode.json)
`));
}

async function cmdSync(flags) {
    const root = getProjectRoot();
    log(`Sincronizando contexto do projeto em: ${root}`);

    const analyzer = new ProjectAnalyzer(root);
    const dna = await analyzer.analyze();

    success(`DNA Detectado: ${dna.language} | ${dna.framework} | ${dna.database}`);

    const generator = new ContextGenerator(dna, { dryRun: flags.dryRun, silent: flags.silent });
    const genResults = await generator.generate();
    await generator.syncContext();

    success(`Sincronização concluída! (${genResults.createdFiles.length} criados, ${genResults.updatedFiles.length} atualizados, ${genResults.skippedFiles.length} mantidos)`);
}

async function cmdCheck() {
    const root = getProjectRoot();
    console.log(chalk.magenta(`
╔═══════════════════════════════════════════════════════════╗
║     📊 MEMÓRIA VIVA — Audit & Status Check                ║
╚═══════════════════════════════════════════════════════════╝`));

    log('Analisando o DNA do projeto...');
    const analyzer = new ProjectAnalyzer(root);
    const dna = await analyzer.analyze();

    console.log(`  Linguagem: ${chalk.cyan(dna.language)}`);
    console.log(`  Framework: ${chalk.cyan(dna.framework)}`);
    console.log(`  Banco: ${chalk.cyan(dna.database)}`);

    const requiredFiles = [
        '.agent/rules.md',
        'docs/ai/CONTEXTO_ATUAL.md',
        'docs/ai/MODULOS_E_REGRAS.md',
        'docs/ai/HANDOFF_ATUAL.md',
        'docs/ai/DESIGN_SYSTEM.md',
        'docs/mcp/mysql.md',
        '.github/workflows/deploy.yml',
    ];

    log('\nVerificando integridade da Memória Viva...');
    let allPresent = true;
    for (const file of requiredFiles) {
        const filePath = path.join(root, file);
        if (await fs.pathExists(filePath)) {
            success(`Presente: ${file}`);
        } else {
            warning(`Ausente: ${file}`);
            allPresent = false;
        }
    }

    console.log();
    if (allPresent) {
        success('Memória Viva está totalmente ativa e sincronizada!');
    } else {
        warning('Alguns arquivos estão ausentes. Execute "memoria-viva init" para restaurar.');
    }
}

async function cmdConfigure(flags) {
    const root = getProjectRoot();
    log('Reconfigurando pontes MCP e IDEs...');

    const analyzer = new ProjectAnalyzer(root);
    const dna = await analyzer.analyze();

    const bridge = new MCPBridge(dna, { dryRun: flags.dryRun });
    const results = await bridge.configure();

    for (const res of results) success(`MCP (${res.action}): ${res.file}`);
    success('Configuração de MCP concluída!');
}

function showHelp() {
    console.log(chalk.magenta(`
╔═══════════════════════════════════════════════════════════╗
║     🧠 MEMÓRIA VIVA v2.0 — AI Context & Governance Engine ║
║     Supercérebro de Desenvolvimento Dinâmico e Adaptativo ║
╚═══════════════════════════════════════════════════════════╝`));

    console.log(chalk.bold('\n📜 COMANDOS DISPONÍVEIS:'));
    console.log(chalk.gray('───────────────────────────────────────────────────────────'));
    for (const [cmd, desc] of Object.entries(COMMANDS)) {
        console.log(`  ${chalk.cyan(cmd.padEnd(12))} ${chalk.white(desc)}`);
    }
    console.log(chalk.gray('───────────────────────────────────────────────────────────'));

    console.log(chalk.bold('\n⚙️  OPÇÕES / FLAGS:'));
    console.log(`  ${chalk.cyan('--dry-run')}     Simula as alterações sem gravar em disco`);
    console.log(`  ${chalk.cyan('--silent')}      Execução silenciosa (modo não interativo)`);
    console.log(`  ${chalk.cyan('--help, -h')}    Exibe esta lista de comandos`);
    console.log(`  ${chalk.cyan('--version, -v')} Exibe a versão instalada (v2.0.0)`);

    console.log(chalk.bold('\n🚀 EXEMPLOS DE USO:'));
    console.log(`  ${chalk.green('memoria-viva init')}         Inicializa o projeto alvo`);
    console.log(`  ${chalk.green('memoria-viva mcp')}          Assistente interativo de MCP MySQL`);
    console.log(`  ${chalk.green('memoria-viva sync')}         Atualiza o contexto dinamicamente`);
    console.log(`  ${chalk.green('memoria-viva check')}        Verifica se a memória está ativa\n`);
}

async function main() {
    const args = process.argv.slice(2);
    const flags = parseFlags(args);
    const command = args.find(a => !a.startsWith('-'));

    if (flags.help || !command || command === '/' || command === 'help' || command === 'list') {
        showHelp();
        return;
    }

    if (flags.version) {
        const pkg = await fs.readJson(path.resolve(__dirname, '..', 'package.json')).catch(() => ({ version: '2.0.0' }));
        console.log(chalk.cyan(`memoria-viva v${pkg.version}`));
        return;
    }

    switch (command) {
        case 'init':
            await cmdInit(flags);
            break;
        case 'mcp':
            await cmdMCP(flags);
            break;
        case 'sync':
            await cmdSync(flags);
            break;
        case 'check':
        case 'status':
            await cmdCheck();
            break;
        case 'configure':
            await cmdConfigure(flags);
            break;
        case 'update':
            await cmdSync(flags);
            break;
        default:
            error(`Comando desconhecido: ${chalk.bold(command)}\nUse ${chalk.cyan('memoria-viva --help')} para ver a lista de comandos.`);
    }
}

main().catch(err => error(err.message));