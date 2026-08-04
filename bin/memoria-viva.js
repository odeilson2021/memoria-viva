#!/usr/bin/env node

'use strict';

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

const PROJECT_ROOT = process.cwd();
const TEMPLATES_DIR = path.resolve(__dirname, '..', 'templates');

const COMMANDS = {
    init: 'Initialize Memória Viva in the current project',
    check: 'Check if Memória Viva is active in the current project',
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

async function cmdInit() {
    const root = getProjectRoot();
    console.log(chalk.magenta(`
╔═══════════════════════════════════════════════════════════╗
║     🧠 MEMÓRIA VIVA — AI Context & Governance Engine      ║
║     Initializing project in 60 seconds                      ║
╚═══════════════════════════════════════════════════════════╝`));

    log('Detecting project root...');
    success(`Project root: ${root}`);

    const dirs = [
        path.join(root, '.agent'),
        path.join(root, 'docs', 'ai'),
        path.join(root, '.github', 'workflows'),
    ];

    log('Creating directory structure...');
    for (const dir of dirs) {
        await fs.ensureDir(dir);
        success(`Created: ${path.relative(root, dir)}`);
    }

    const files = [
        { src: 'rules.md', dst: '.agent/rules.md' },
        { src: 'CONTEXTO_ATUAL.md', dst: 'docs/ai/CONTEXTO_ATUAL.md' },
        { src: 'MODULOS_E_REGRAS.md', dst: 'docs/ai/MODULOS_E_REGRAS.md' },
        { src: 'HANDOFF_ATUAL.md', dst: 'docs/ai/HANDOFF_ATUAL.md' },
        { src: 'deploy.yml', dst: '.github/workflows/deploy.yml' },
        { src: 'mcp_config.json', dst: 'templates/mcp_config.json' },
    ];

    log('Installing templates...');
    for (const file of files) {
        const srcPath = path.join(TEMPLATES_DIR, file.src);
        const dstPath = path.join(root, file.dst);

        if (await fs.pathExists(dstPath)) {
            warning(`Already exists (kept): ${file.dst}`);
            continue;
        }

        if (!(await fs.pathExists(srcPath))) {
            warning(`Template not found: ${file.src}`);
            continue;
        }

        await fs.ensureDir(path.dirname(dstPath));
        await fs.copy(srcPath, dstPath);
        success(`Created: ${file.dst}`);
    }

    console.log(chalk.green(`
╔═══════════════════════════════════════════════════════════╗
║       ✅  MEMÓRIA VIVA INITIALIZED!                        ║
╚═══════════════════════════════════════════════════════════╝

  📁 Project: ${chalk.bold(root)}

  📋 NEXT STEPS:
  ${chalk.dim('1.')} Fill in .env.mcp with your MySQL credentials
  ${chalk.dim('2.')} Restart your IDE to load MCP MySQL
  ${chalk.dim('3.')} Run ${chalk.cyan('memoria-viva check')} to verify installation
  ${chalk.dim('4.')} Ask your AI agent to read and fill the context files

  🔌 MCP: tools/mcp-mysql.js
  📚 Docs: docs/ai/
`));
}

async function cmdCheck() {
    const root = getProjectRoot();
    console.log(chalk.magenta(`
╔═══════════════════════════════════════════════════════════╗
║     📊 MEMÓRIA VIVA — Status Check                         ║
╚═══════════════════════════════════════════════════════════╝`));

    log('Checking project root...');
    success(`Project root: ${root}`);

    const requiredFiles = [
        '.agent/rules.md',
        'docs/ai/CONTEXTO_ATUAL.md',
        'docs/ai/MODULOS_E_REGRAS.md',
        'docs/ai/HANDOFF_ATUAL.md',
        '.github/workflows/deploy.yml',
    ];

    log('Checking Memória Viva files...');
    let allPresent = true;
    for (const file of requiredFiles) {
        const filePath = path.join(root, file);
        if (await fs.pathExists(filePath)) {
            success(`Present: ${file}`);
        } else {
            warning(`Missing: ${file}`);
            allPresent = false;
        }
    }

    console.log();
    if (allPresent) {
        success('Memória Viva is fully installed and active!');
    } else {
        warning('Some files are missing. Run "memoria-viva init" to install.');
    }
}

function showHelp() {
    console.log(chalk.magenta(`
╔═══════════════════════════════════════════════════════════╗
║     🧠 MEMÓRIA VIVA — AI Context & Governance Engine      ║
║     Global CLI for AI project governance                   ║
╚═══════════════════════════════════════════════════════════╝`));

    console.log(chalk.bold('\nUsage:'));
    console.log(`  ${chalk.cyan('memoria-viva <command>')} [options]\n`);

    console.log(chalk.bold('Commands:'));
    for (const [cmd, desc] of Object.entries(COMMANDS)) {
        console.log(`  ${chalk.cyan(cmd.padEnd(10))} ${desc}`);
    }

    console.log(chalk.bold('\nOptions:'));
    console.log(`  ${chalk.cyan('--help')}       Show this help message`);
    console.log(`  ${chalk.cyan('--version')}   Show version`);
    console.log(`  ${chalk.cyan('--dry-run')}   Simulate without making changes`);

    console.log(chalk.bold('\nExamples:'));
    console.log(`  memoria-viva init`);
    console.log(`  memoria-viva init --dry-run`);
    console.log(`  memoria-viva check`);
    console.log(`  memoria-viva --help\n`);
}

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    if (!command || command === '--help' || command === '-h' || command === 'help') {
        showHelp();
        return;
    }

    if (command === '--version' || command === '-v') {
        const pkg = await fs.readJson(path.resolve(__dirname, '..', 'package.json')).catch(() => ({}));
        console.log(chalk.cyan(`memoria-viva v${pkg.version || '1.0.0'}`));
        return;
    }

    switch (command) {
        case 'init':
            await cmdInit();
            break;
        case 'check':
            await cmdCheck();
            break;
        default:
            error(`Unknown command: ${chalk.bold(command)}\nUse ${chalk.cyan('memoria-viva --help')} for available commands.`);
    }
}

main().catch(err => error(err.message));