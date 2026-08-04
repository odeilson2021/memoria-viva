#!/usr/bin/env node
/**
 * 🧠 Memória Viva — AI Context & Governance Engine
 * CLI Principal — Inicializa, sincroniza, verifica e configura o Memória Viva em qualquer projeto.
 *
 * Uso:
 *   npx memoria-viva                             ← wizard interativo (init)
 *   npx memoria-viva init                        ← mesmo que acima
 *   npx memoria-viva init --silent               ← modo não interativo (usa env vars)
 *   npx memoria-viva init --dry-run              ← simula sem alterar arquivos
 *   npx memoria-viva sync                        ← sincroniza contexto com o projeto
 *   npx memoria-viva sync --wizard               ← sync interativo
 *   npx memoria-viva sync --silent               ← sync não interativo
 *   npx memoria-viva sync --dry-run              ← simula sync
 *   npx memoria-viva status                      ← verifica estado da instalação
 *   npx memoria-viva configure                   ← configura MCP e IDEs
 *   npx memoria-viva update                      ← atualiza arquivos do Memória Viva
 *   npx memoria-viva help                        ← mostra esta mensagem
 */
'use strict';

const path     = require('path');
const fs       = require('fs');
const { execSync } = require('child_process');
const readline = require('readline');

// ── Cores ─────────────────────────────────────────────────────────────
const c = {
    cyan:    s => `\x1b[36m${s}\x1b[0m`,
    green:   s => `\x1b[32m${s}\x1b[0m`,
    yellow:  s => `\x1b[33m${s}\x1b[0m`,
    red:     s => `\x1b[31m${s}\x1b[0m`,
    magenta: s => `\x1b[35m${s}\x1b[0m`,
    bold:    s => `\x1b[1m${s}\x1b[0m`,
    dim:     s => `\x1b[2m${s}\x1b[0m`,
};

const step = msg => console.log(`\n${c.cyan('🔷 ' + msg)}`);
const ok   = msg => console.log(`  ${c.green('✅ ' + msg)}`);
const warn = msg => console.log(`  ${c.yellow('⚠️  ' + msg)}`);
const fail = msg => { console.error(`  ${c.red('❌ ' + msg)}`); process.exit(1); };
const info = msg => console.log(`  ${c.dim('ℹ️  ' + msg)}`);

// ── Args ──────────────────────────────────────────────────────────────
const rawArgs  = process.argv.slice(2);
const command  = rawArgs[0] || 'init';
const flags    = rawArgs.slice(1);
const isDry    = flags.includes('--dry-run');
const isSilent = flags.includes('--silent');
const isWizard = flags.includes('--wizard');

// ── Prompt interativo ──────────────────────────────────────────────────
function prompt(question, defaultVal = '') {
    return new Promise(resolve => {
        if (isSilent) return resolve(defaultVal);
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        rl.question(`${question}${defaultVal ? ` [${defaultVal}]` : ''}: `, answer => {
            rl.close();
            resolve(answer.trim() || defaultVal);
        });
    });
}

function promptPassword(question) {
    return new Promise(resolve => {
        if (isSilent) return resolve(process.env.DB_PASS || process.env.MYSQL_PASSWORD || '');
        process.stdout.write(`${question}: `);
        const rl = readline.createInterface({ input: process.stdin, output: null, terminal: false });
        rl.question('', answer => { rl.close(); process.stdout.write('\n'); resolve(answer); });
    });
}

// ── Copiar template com personalização ────────────────────────────────
function copyTemplate(src, dst, vars) {
    if (!fs.existsSync(src)) { warn(`Template não encontrado: ${path.basename(src)}`); return; }
    if (fs.existsSync(dst))  { warn(`Já existe (mantido): ${path.relative(projectRoot, dst)}`); return; }
    if (isDry) { ok(`[DRY] Criaria: ${path.relative(projectRoot, dst)}`); return; }

    fs.mkdirSync(path.dirname(dst), { recursive: true });
    let content = fs.readFileSync(src, 'utf8');
    for (const [key, val] of Object.entries(vars)) {
        content = content.replace(new RegExp(escapeRegex(key), 'g'), val);
    }
    fs.writeFileSync(dst, content, 'utf8');
    ok(`Criado: ${path.relative(projectRoot, dst)}`);
}

function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function writeIfMissing(filePath, content) {
    if (fs.existsSync(filePath)) { warn(`Já existe (mantido): ${path.relative(projectRoot, filePath)}`); return; }
    if (isDry) { ok(`[DRY] Criaria: ${path.relative(projectRoot, filePath)}`); return; }
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf8');
    ok(`Criado: ${path.relative(projectRoot, filePath)}`);
}

function fileExists(filePath) {
    return fs.existsSync(filePath);
}

function readFile(filePath) {
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath, 'utf8');
}

// ── Variáveis globais ──────────────────────────────────────────────────
let projectRoot = '';
let projectName = '';
let stack       = '';
const installDate = new Date().toISOString().slice(0, 10);
const kitRoot     = path.resolve(__dirname);
const templates   = path.join(kitRoot, 'templates');

// ── Comandos ───────────────────────────────────────────────────────────

function showHelp() {
    console.log(`
${c.magenta(`
╔═══════════════════════════════════════════════════════════╗
║     🧠 MEMÓRIA VIVA — AI Context & Governance Engine      ║
║     Comandos disponíveis para auxiliar agentes             ║
╚═══════════════════════════════════════════════════════════╝`)}

${c.bold('Comandos:')}

  ${c.cyan('init')}              Inicializa o Memória Viva no projeto
  ${c.cyan('sync')}              Sincroniza o contexto do projeto com o Memória Viva
  ${c.cyan('status')}            Verifica o estado atual da instalação
  ${c.cyan('configure')}         Configura MCP e integração com IDEs
  ${c.cyan('update')}            Atualiza os arquivos do Memória Viva
  ${c.cyan('help')}              Mostra esta mensagem

${c.bold('Opções globais:')}
  --silent     Modo não interativo (usa variáveis de ambiente)
  --dry-run    Simula sem alterar arquivos
  --wizard     Modo interativo com perguntas guiadas

${c.bold('Exemplos:')}
  npx memoria-viva init
  npx memoria-viva init --silent
  npx memoria-viva sync --wizard
  npx memoria-viva status
  npx memoria-viva configure
  npx memoria-viva update --dry-run
`);
}

async function cmdInit() {
    console.log(c.magenta(`
╔═══════════════════════════════════════════════════════════╗
║     🧠 MEMÓRIA VIVA — AI Context & Governance Engine      ║
║     Configura agentes de IA no seu projeto em 60s          ║
╚═══════════════════════════════════════════════════════════╝`));

    if (isDry) console.log(c.yellow('\n  [DRY RUN] Nenhum arquivo será criado.\n'));

    step('Detectando raiz do projeto...');
    try {
        projectRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
    } catch {
        projectRoot = process.cwd();
        warn('Não é um repositório Git. Usando diretório atual.');
    }
    ok(`Projeto em: ${projectRoot}`);

    step('Configuração do projeto...');
    projectName = process.env.PROJECT_NAME || await prompt('Nome do projeto', path.basename(projectRoot));
    stack       = process.env.STACK        || await prompt('Stack (php-slim4, php-laravel, node)', 'php-slim4');

    step('Credenciais do banco de dados MySQL...');
    console.log(c.dim('  (Salvas em .env.mcp — NÃO versionado pelo Git)'));
    const dbHost = process.env.DB_HOST || process.env.MYSQL_HOST || await prompt('Host do MySQL', '127.0.0.1');
    const dbPort = process.env.DB_PORT || process.env.MYSQL_PORT || await prompt('Porta', '3306');
    const dbName = process.env.DB_NAME || process.env.MYSQL_DATABASE || await prompt('Nome do banco', '');
    const dbUser = process.env.DB_USER || process.env.MYSQL_USER || await prompt('Usuário', 'root');
    const dbPass = await promptPassword('Senha do banco');

    const vars = {
        '{{PROJECT_NAME}}': projectName,
        '{{STACK}}':        stack,
        '{{INSTALL_DATE}}': installDate,
    };

    step('Criando estrutura de diretórios...');
    const dirs = ['.agent', '.cursor', 'docs/ai', 'docs/mcp', 'skills', 'tools', 'config'];
    if (!isDry) dirs.forEach(d => fs.mkdirSync(path.join(projectRoot, d), { recursive: true }));
    ok('Diretórios criados');

    step('Instalando Memória Viva...');
    const copies = [
        ['.agent/rules.md',              '.agent/rules.md'],
        ['AGENTS.md',                    'AGENTS.md'],
        ['.cursorrules',                 '.cursorrules'],
        ['config/mcp_config.json',       'config/mcp_config.json'],
        ['docs/ai/CONTEXTO_ATUAL.md',    'docs/ai/CONTEXTO_ATUAL.md'],
        ['docs/ai/MODULOS_E_REGRAS.md',  'docs/ai/MODULOS_E_REGRAS.md'],
        ['docs/ai/HANDOFF_ATUAL.md',     'docs/ai/HANDOFF_ATUAL.md'],
        ['skills/database-sync.md',      'skills/database-sync.md'],
        ['skills/route-sanitizer.md',    'skills/route-sanitizer.md'],
        ['tools/mcp-mysql.js',           'tools/mcp-mysql.js'],
        ['env.mcp.example',              '.env.mcp.example'],
        ['SYNC_INSTRUCTIONS.md',         'SYNC_INSTRUCTIONS.md'],
    ];
    copies.forEach(([src, dst]) =>
        copyTemplate(path.join(templates, src), path.join(projectRoot, dst), vars)
    );

    step('Gerando .env.mcp...');
    const envMcpPath = path.join(projectRoot, '.env.mcp');
    const envContent = [
        '# Memória Viva — Credenciais MCP MySQL (NÃO versionar)',
        `MYSQL_HOST=${dbHost}`,
        `MYSQL_PORT=${dbPort}`,
        `MYSQL_DATABASE=${dbName}`,
        `MYSQL_USER=${dbUser}`,
        `MYSQL_PASSWORD=${dbPass}`,
        'MYSQL_CHARSET=utf8mb4',
        '',
    ].join('\n');
    writeIfMissing(envMcpPath, envContent);

    step('Configurando IDEs...');
    const mcpJson = JSON.stringify({
        mcpServers: { mysql: { command: 'node', args: ['tools/mcp-mysql.js'] } }
    }, null, 2);

    ['.mcp.json', '.cursor/mcp.json', '.vscode/mcp.json'].forEach(p =>
        writeIfMissing(path.join(projectRoot, p), mcpJson)
    );

    writeIfMissing(path.join(projectRoot, 'opencode.json'), JSON.stringify({
        '$schema': 'https://opencode.ai/config.json',
        mcp: { mysql: { type: 'local', command: ['node', 'tools/mcp-mysql.js'] } }
    }, null, 2));

    step('Atualizando .gitignore...');
    if (!isDry) {
        const gi = path.join(projectRoot, '.gitignore');
        let content = fs.existsSync(gi) ? fs.readFileSync(gi, 'utf8') : '';
        ['.env.mcp', '.vscode/'].forEach(entry => {
            if (!content.includes(entry)) { content += `\n${entry}`; ok(`Adicionado: ${entry}`); }
        });
        fs.writeFileSync(gi, content, 'utf8');
    }

    step('Verificando .github/workflows...');
    const workflowsDir = path.join(projectRoot, '.github', 'workflows');
    const deployYml = path.join(workflowsDir, 'deploy.yml');
    if (!isDry) {
        if (!fs.existsSync(workflowsDir)) {
            fs.mkdirSync(workflowsDir, { recursive: true });
            ok('Criado: .github/workflows/');
        }
        if (!fs.existsSync(deployYml)) {
            const templateDeploy = path.join(templates, '.github', 'workflows', 'deploy.yml');
            if (fs.existsSync(templateDeploy)) {
                copyTemplate(templateDeploy, deployYml, vars);
            } else {
                info('Template de deploy não encontrado no kit. Crie .github/workflows/deploy.yml manualmente.');
            }
        } else {
            info('deploy.yml já existe (mantido).');
        }
    } else {
        ok('[DRY] Verificaria .github/workflows/deploy.yml');
    }

    console.log(c.green(`
╔═══════════════════════════════════════════════════════════╗
║       ✅  MEMÓRIA VIVA INSTALADA COM SUCESSO!              ║
╚═══════════════════════════════════════════════════════════╝

  📁 Projeto: ${c.bold(projectName)}  |  Stack: ${c.bold(stack)}

  📋 PRÓXIMOS PASSOS:
  ${c.dim('1.')} Verifique as credenciais em: ${c.bold('.env.mcp')}
  ${c.dim('2.')} Reinicie sua IDE para carregar o MCP MySQL.
  ${c.dim('3.')} Sincronize o projeto com o Memória Viva:

  ┌─────────────────────────────────────────────────────────┐
  │  npx memoria-viva sync                                 │
  └─────────────────────────────────────────────────────────┘

  ${c.dim('4.')} Ou leia as instruções em: ${c.bold('SYNC_INSTRUCTIONS.md')}

  🔌 MCP MySQL: tools/mcp-mysql.js
  📚 Docs: docs/ai/  |  Skills: skills/
`));
}

async function cmdSync() {
    console.log(c.magenta(`
╔═══════════════════════════════════════════════════════════╗
║     🔄 MEMÓRIA VIVA — Sincronização de Contexto           ║
╚═══════════════════════════════════════════════════════════╝`));

    step('Detectando raiz do projeto...');
    try {
        projectRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
    } catch {
        projectRoot = process.cwd();
        warn('Não é um repositório Git. Usando diretório atual.');
    }
    ok(`Projeto em: ${projectRoot}`);

    projectName = process.env.PROJECT_NAME || path.basename(projectRoot);
    stack       = process.env.STACK        || await detectStack();

    step('Verificando estrutura do Memória Viva...');
    const mvFiles = [
        '.agent/rules.md',
        'AGENTS.md',
        '.cursorrules',
        'config/mcp_config.json',
        'docs/ai/CONTEXTO_ATUAL.md',
        'docs/ai/MODULOS_E_REGRAS.md',
        'docs/ai/HANDOFF_ATUAL.md',
        'skills/database-sync.md',
        'skills/route-sanitizer.md',
        'tools/mcp-mysql.js',
        '.env.mcp.example',
        'SYNC_INSTRUCTIONS.md',
    ];

    let missingCount = 0;
    mvFiles.forEach(f => {
        const fullPath = path.join(projectRoot, f);
        if (fs.existsSync(fullPath)) {
            ok(`Presente: ${f}`);
        } else {
            warn(`Ausente: ${f}`);
            missingCount++;
        }
    });

    if (missingCount > 0) {
        info(`${missingCount} arquivo(s) ausente(s). Execute 'npx memoria-viva init' para instalar.`);
    }

    step('Analisando estrutura do projeto...');
    const projectStructure = analyzeProjectStructure();
    ok(`Stack detectada: ${c.bold(stack)}`);
    ok(`Arquivos PHP encontrados: ${c.bold(projectStructure.phpFiles)}`);
    ok(`Diretórios principais: ${c.bold(projectStructure.dirs.join(', '))}`);

    step('Atualizando CONTEXTO_ATUAL.md...');
    updateContextoAtual(projectStructure);

    step('Atualizando HANDOFF_ATUAL.md...');
    updateHandoffAtual();

    step('Atualizando MODULOS_E_REGRAS.md...');
    updateModulosERegras(projectStructure);

    step('Verificando configuração MCP...');
    const mcpFiles = ['.mcp.json', '.cursor/mcp.json', '.vscode/mcp.json', 'opencode.json'];
    mcpFiles.forEach(f => {
        const fullPath = path.join(projectRoot, f);
        if (fs.existsSync(fullPath)) {
            ok(`MCP configurado: ${f}`);
        } else {
            warn(`MCP ausente: ${f}`);
        }
    });

    step('Verificando .gitignore...');
    const gi = path.join(projectRoot, '.gitignore');
    if (fs.existsSync(gi)) {
        const giContent = fs.readFileSync(gi, 'utf8');
        ['.env.mcp', '.vscode/'].forEach(entry => {
            if (giContent.includes(entry)) {
                ok(`Entrada no .gitignore: ${entry}`);
            } else {
                warn(`Entrada faltando no .gitignore: ${entry}`);
            }
        });
    }

    console.log(c.green(`
╔═══════════════════════════════════════════════════════════╗
║       ✅  SINCRONIZAÇÃO CONCLUÍDA!                         ║
╚═══════════════════════════════════════════════════════════╝

  📋 PRÓXIMOS PASSOS:
  ${c.dim('1.')} Revise os arquivos de contexto atualizados em ${c.bold('docs/ai/')}
  ${c.dim('2.')} Preencha as regras de negócio em ${c.bold('docs/ai/MODULOS_E_REGRAS.md')}
  ${c.dim('3.')} Atualize as tabelas do banco usando MCP MySQL
  ${c.dim('4.')} Registre a sessão em ${c.bold('docs/ai/HANDOFF_ATUAL.md')}
  ${c.dim('5.')} Siga as regras em ${c.bold('.agent/rules.md')}
`));
}

function detectStack() {
    const composerJson = path.join(projectRoot, 'composer.json');
    const packageJson  = path.join(projectRoot, 'package.json');
    const goMod        = path.join(projectRoot, 'go.mod');

    if (fs.existsSync(composerJson)) {
        try {
            const content = fs.readFileSync(composerJson, 'utf8');
            if (content.includes('"laravel"')) return 'php-laravel';
            if (content.includes('"slim"') || content.includes('"slim/slim"')) return 'php-slim4';
            return 'php-generic';
        } catch { return 'php-generic'; }
    }
    if (fs.existsSync(packageJson)) return 'node';
    if (fs.existsSync(goMod)) return 'go';
    return 'unknown';
}

function analyzeProjectStructure() {
    const result = { phpFiles: 0, dirs: [], routes: [], controllers: [], models: [], migrations: [] };

    function walk(dir, base) {
        if (!fs.existsSync(dir)) return;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            const relPath = path.relative(base, fullPath);
            if (entry.isDirectory()) {
                result.dirs.push(relPath);
                if (relPath.includes('routes') || relPath.includes('Routes')) result.routes.push(relPath);
                if (relPath.includes('Controller') || relPath.includes('controller')) result.controllers.push(relPath);
                if (relPath.includes('Model') || relPath.includes('model')) result.models.push(relPath);
                if (relPath.includes('migration') || relPath.includes('Migration')) result.migrations.push(relPath);
                walk(fullPath, base);
            } else if (entry.isFile()) {
                if (entry.name.endsWith('.php')) result.phpFiles++;
            }
        }
    }

    walk(projectRoot, projectRoot);
    return result;
}

function updateContextoAtual(structure) {
    const filePath = path.join(projectRoot, 'docs/ai/CONTEXTO_ATUAL.md');
    if (!fs.existsSync(filePath)) {
        warn('CONTEXTO_ATUAL.md não encontrado. Execute init primeiro.');
        return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    const now = new Date().toISOString().slice(0, 10);

    content = content.replace(
        /\| \*\*Framework\*\* \|.*\|/,
        `| **Framework** | ${stack === 'php-slim4' ? 'Slim 4' : stack === 'php-laravel' ? 'Laravel' : stack} |`
    );

    const existingHeader = `## 📁 Estrutura de Pastas`;
    if (content.includes(existingHeader)) {
        const newStructure = `## 📁 Estrutura de Pastas

\`\`\`
${structure.dirs.slice(0, 30).map(d => `├── ${d}/`).join('\n')}
${structure.dirs.length > 30 ? `└── ... (${structure.dirs.length - 30} mais diretórios)` : ''}
\`\`\`

> ⚠️ **Agente: Atualize com a estrutura de pastas real do projeto.**`;

        const oldStructureMatch = content.match(/## 📁 Estrutura de Pastas[\s\S]*?(?=\n---)/);
        if (oldStructureMatch) {
            content = content.replace(oldStructureMatch[0], newStructure);
        }
    }

    const existingHeader2 = `## 📅 Histórico de Atualizações`;
    if (content.includes(existingHeader2)) {
        const newEntry = `| ${now} | CLI Sync | Sincronização automática via Memória Viva |`;
        content = content.replace(
            /(\| \*(data)\* \| Instalador \| Inicialização da Memória Viva \|)/,
            `$1\n| ${now} | CLI Sync | Sincronização automática via Memória Viva |`
        );
    }

    if (!isDry) {
        fs.writeFileSync(filePath, content, 'utf8');
        ok('CONTEXTO_ATUAL.md atualizado');
    } else {
        ok('[DRY] CONTEXTO_ATUAL.md seria atualizado');
    }
}

function updateHandoffAtual() {
    const filePath = path.join(projectRoot, 'docs/ai/HANDOFF_ATUAL.md');
    if (!fs.existsSync(filePath)) {
        warn('HANDOFF_ATUAL.md não encontrado. Execute init primeiro.');
        return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    const now = new Date().toISOString().slice(0, 10);

    content = content.replace(
        /\| Memória Viva instalada \| ✅ Concluído \| Instalador \| \*\(data\)\* \|/,
        `| Memória Viva instalada | ✅ Concluído | Instalador | ${now} |`
    );

    content = content.replace(
        /\| Contexto do projeto preenchido \| ⏳ Pendente \| Próximo agente \| — \|/,
        `| Contexto do projeto preenchido | ✅ Concluído | CLI Sync | ${now} |`
    );

    const sessionEntry = `
### 🗓️ ${now} — Sincronização via Memória Viva CLI
- **Agente:** CLI (memoria-viva sync)
- **O que foi feito:**
  - Sincronização automática do contexto do projeto
  - Detecção da stack: ${stack}
  - Análise da estrutura de diretórios
  - Atualização dos arquivos de contexto
- **Arquivos criados/alterados:**
  - docs/ai/CONTEXTO_ATUAL.md
  - docs/ai/HANDOFF_ATUAL.md
- **⚠️ Alertas para o próximo agente:**
  - Revise e preencha as regras de negócio em MODULOS_E_REGRAS.md
  - Atualize o mapeamento de tabelas usando MCP MySQL
`;

    const headerPattern = /(## 📝 Registro de Sessões \(Mais Recente Primeiro\)\n\n> \*Formato obrigatório para cada registro\*\n\n)/;
    if (content.match(headerPattern)) {
        content = content.replace(headerPattern, `$1${sessionEntry}\n`);
    }

    if (!isDry) {
        fs.writeFileSync(filePath, content, 'utf8');
        ok('HANDOFF_ATUAL.md atualizado');
    } else {
        ok('[DRY] HANDOFF_ATUAL.md seria atualizado');
    }
}

function updateModulosERegras(structure) {
    const filePath = path.join(projectRoot, 'docs/ai/MODULOS_E_REGRAS.md');
    if (!fs.existsSync(filePath)) {
        warn('MODULOS_E_REGRAS.md não encontrado. Execute init primeiro.');
        return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    const now = new Date().toISOString().slice(0, 10);

    const existingHeader = `## 📋 Módulos do Projeto`;
    if (content.includes(existingHeader)) {
        const newModules = `## 📋 Módulos do Projeto

> **Atualizado em: ${now}** via Memória Viva CLI

| Módulo | Prefixo | Descrição |
|--------|---------|-----------|
| *(preencher com os módulos reais do projeto)* | | |

> ⚠️ **Agente: Preencha com os módulos reais identificados no projeto.**`;

        const oldModulesMatch = content.match(/## 📋 Módulos do Projeto[\s\S]*?(?=\n---)/);
        if (oldModulesMatch) {
            content = content.replace(oldModulesMatch[0], newModules);
        }
    }

    if (!isDry) {
        fs.writeFileSync(filePath, content, 'utf8');
        ok('MODULOS_E_REGRAS.md atualizado');
    } else {
        ok('[DRY] MODULOS_E_REGRAS.md seria atualizado');
    }
}

async function cmdStatus() {
    console.log(c.magenta(`
╔═══════════════════════════════════════════════════════════╗
║     📊 MEMÓRIA VIVA — Status da Instalação                ║
╚═══════════════════════════════════════════════════════════╝`));

    step('Detectando raiz do projeto...');
    try {
        projectRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
    } catch {
        projectRoot = process.cwd();
        warn('Não é um repositório Git. Usando diretório atual.');
    }
    ok(`Projeto em: ${projectRoot}`);

    step('Verificando arquivos do Memória Viva...');
    const mvFiles = [
        '.agent/rules.md',
        'AGENTS.md',
        '.cursorrules',
        'config/mcp_config.json',
        'docs/ai/CONTEXTO_ATUAL.md',
        'docs/ai/MODULOS_E_REGRAS.md',
        'docs/ai/HANDOFF_ATUAL.md',
        'skills/database-sync.md',
        'skills/route-sanitizer.md',
        'tools/mcp-mysql.js',
        '.env.mcp.example',
        'SYNC_INSTRUCTIONS.md',
        '.env.mcp',
        '.mcp.json',
        '.cursor/mcp.json',
        '.vscode/mcp.json',
        'opencode.json',
        '.github/workflows/deploy.yml',
    ];

    let present = 0;
    let missing = 0;
    mvFiles.forEach(f => {
        const fullPath = path.join(projectRoot, f);
        if (fs.existsSync(fullPath)) {
            ok(`Presente: ${f}`);
            present++;
        } else {
            warn(`Ausente: ${f}`);
            missing++;
        }
    });

    console.log(c.green(`

╔═══════════════════════════════════════════════════════════╗
║  Resumo: ${present}/${mvFiles.length} arquivos presentes (${missing} ausentes)  ║
╚═══════════════════════════════════════════════════════════╝
`));

    if (missing > 0) {
        info('Execute "npx memoria-viva init" para instalar os arquivos ausentes.');
        info('Execute "npx memoria-viva sync" para sincronizar o contexto.');
    } else {
        ok('Memória Viva está completamente instalada!');
    }
}

async function cmdConfigure() {
    console.log(c.magenta(`
╔═══════════════════════════════════════════════════════════╗
║     ⚙️  MEMÓRIA VIVA — Configuração                        ║
╚═══════════════════════════════════════════════════════════╝`));

    step('Detectando raiz do projeto...');
    try {
        projectRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
    } catch {
        projectRoot = process.cwd();
        warn('Não é um repositório Git. Usando diretório atual.');
    }
    ok(`Projeto em: ${projectRoot}`);

    step('Configurando MCP...');
    const mcpJson = JSON.stringify({
        mcpServers: { mysql: { command: 'node', args: ['tools/mcp-mysql.js'] } }
    }, null, 2);

    ['.mcp.json', '.cursor/mcp.json', '.vscode/mcp.json'].forEach(p => {
        const fullPath = path.join(projectRoot, p);
        if (fs.existsSync(fullPath)) {
            info(`Já existe: ${p} (mantido)`);
        } else {
            writeIfMissing(fullPath, mcpJson);
        }
    });

    const opencodePath = path.join(projectRoot, 'opencode.json');
    if (fs.existsSync(opencodePath)) {
        info('Já existe: opencode.json (mantido)');
    } else {
        writeIfMissing(opencodePath, JSON.stringify({
            '$schema': 'https://opencode.ai/config.json',
            mcp: { mysql: { type: 'local', command: ['node', 'tools/mcp-mysql.js'] } }
        }, null, 2));
    }

    step('Configurando .gitignore...');
    const gi = path.join(projectRoot, '.gitignore');
    if (fs.existsSync(gi)) {
        let content = fs.readFileSync(gi, 'utf8');
        let changed = false;
        ['.env.mcp', '.vscode/'].forEach(entry => {
            if (!content.includes(entry)) { content += `\n${entry}`; changed = true; ok(`Adicionado: ${entry}`); }
        });
        if (!changed) { info('Nenhuma alteração necessária no .gitignore.'); }
        if (!isDry && changed) { fs.writeFileSync(gi, content, 'utf8'); }
    } else {
        if (!isDry) {
            fs.writeFileSync(gi, '.env.mcp\n.vscode/\n', 'utf8');
            ok('.gitignore criado com entradas do Memória Viva');
        }
    }

    step('Verificando .github/workflows...');
    const workflowsDir = path.join(projectRoot, '.github', 'workflows');
    const deployYml = path.join(workflowsDir, 'deploy.yml');
    if (!fs.existsSync(workflowsDir)) {
        if (!isDry) {
            fs.mkdirSync(workflowsDir, { recursive: true });
            ok('Criado: .github/workflows/');
        } else {
            ok('[DRY] Criaria: .github/workflows/');
        }
    }
    if (!fs.existsSync(deployYml)) {
        const templateDeploy = path.join(templates, '.github', 'workflows', 'deploy.yml');
        if (fs.existsSync(templateDeploy)) {
            if (!isDry) {
                copyTemplate(templateDeploy, deployYml, {});
            } else {
                ok('[DRY] Criaria: .github/workflows/deploy.yml');
            }
        } else {
            info('Template de deploy não encontrado no kit.');
        }
    } else {
        info('deploy.yml já existe (mantido).');
    }

    console.log(c.green(`
╔═══════════════════════════════════════════════════════════╗
║       ✅  CONFIGURAÇÃO CONCLUÍDA!                          ║
╚═══════════════════════════════════════════════════════════╝
`));
}

async function cmdUpdate() {
    console.log(c.magenta(`
╔═══════════════════════════════════════════════════════════╗
║     🔄 MEMÓRIA VIVA — Atualização                         ║
╚═══════════════════════════════════════════════════════════╝`));

    step('Detectando raiz do projeto...');
    try {
        projectRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
    } catch {
        projectRoot = process.cwd();
        warn('Não é um repositório Git. Usando diretório atual.');
    }
    ok(`Projeto em: ${projectRoot}`);

    step('Verificando atualizações disponíveis...');
    const kitVersion = readFile(path.join(kitRoot, 'package.json'));
    let kitVersionStr = 'unknown';
    if (kitVersion) {
        try {
            kitVersionStr = JSON.parse(kitVersion).version || 'unknown';
        } catch { /* ignore */ }
    }
    info(`Versão do kit: ${kitVersionStr}`);

    step('Atualizando arquivos do Memória Viva...');
    const updates = [
        ['.agent/rules.md',              '.agent/rules.md'],
        ['AGENTS.md',                    'AGENTS.md'],
        ['.cursorrules',                 '.cursorrules'],
        ['config/mcp_config.json',       'config/mcp_config.json'],
        ['docs/ai/CONTEXTO_ATUAL.md',    'docs/ai/CONTEXTO_ATUAL.md'],
        ['docs/ai/MODULOS_E_REGRAS.md',  'docs/ai/MODULOS_E_REGRAS.md'],
        ['docs/ai/HANDOFF_ATUAL.md',     'docs/ai/HANDOFF_ATUAL.md'],
        ['skills/database-sync.md',      'skills/database-sync.md'],
        ['skills/route-sanitizer.md',    'skills/route-sanitizer.md'],
        ['tools/mcp-mysql.js',           'tools/mcp-mysql.js'],
        ['env.mcp.example',              '.env.mcp.example'],
        ['SYNC_INSTRUCTIONS.md',         'SYNC_INSTRUCTIONS.md'],
    ];

    let updated = 0;
    let skipped = 0;
    updates.forEach(([src, dst]) => {
        const srcPath = path.join(templates, src);
        const dstPath = path.join(projectRoot, dst);
        if (!fs.existsSync(srcPath)) {
            warn(`Template não encontrado: ${src}`);
            return;
        }
        if (!fs.existsSync(dstPath)) {
            if (!isDry) {
                copyTemplate(srcPath, dstPath, {});
                updated++;
            } else {
                ok(`[DRY] Criaria: ${dst}`);
                updated++;
            }
            return;
        }
        const srcContent = fs.readFileSync(srcPath, 'utf8');
        const dstContent = fs.readFileSync(dstPath, 'utf8');
        if (srcContent === dstContent) {
            info(`Igual: ${dst}`);
            skipped++;
        } else {
            const backupPath = dstPath + '.bak';
            if (!isDry) {
                fs.writeFileSync(backupPath, dstContent, 'utf8');
                fs.writeFileSync(dstPath, srcContent, 'utf8');
                ok(`Atualizado: ${dst} (backup em ${path.basename(backupPath)})`);
                updated++;
            } else {
                ok(`[DRY] Atualizaria: ${dst} (backup seria criado)`);
                updated++;
            }
        }
    });

    console.log(c.green(`
╔═══════════════════════════════════════════════════════════╗
║       ✅  ATUALIZAÇÃO CONCLUÍDA!                           ║
╚═══════════════════════════════════════════════════════════╝

  📊 Resumo: ${c.bold(updated)} atualizado(s), ${c.bold(skipped)} inalterado(s)
`));
}

// ── Router ─────────────────────────────────────────────────────────────
const commands = {
    init:    cmdInit,
    sync:    cmdSync,
    status:  cmdStatus,
    configure: cmdConfigure,
    update:  cmdUpdate,
    help:    showHelp,
};

async function main() {
    if (command === 'help' || command === '--help' || command === '-h') {
        showHelp();
        return;
    }

    const cmd = commands[command];
    if (!cmd) {
        fail(`Comando desconhecido: ${c.bold(command)}\nUse ${c.cyan('npx memoria-viva help')} para ver os comandos disponíveis.`);
    }

    await cmd();
}

main().catch(err => fail(err.message));