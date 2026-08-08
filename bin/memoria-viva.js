#!/usr/bin/env node

'use strict';

const path = require('path');
const chalk = require('chalk');
const fs = require('fs-extra');

const ProjectAnalyzer = require('../engine/analyzer');
const ContextGenerator = require('../engine/generator');
const MCPBridge = require('../engine/mcp-bridge');
const MemoryState = require('../engine/memory-state');
const KnowledgeGraph = require('../engine/graph');

const COMMANDS = {
    init: 'Inicializa o snapshot e os pontos de entrada dos agentes',
    sync: 'Atualiza fatos detectados sem sobrescrever contexto humano',
    check: 'Valida integridade e divergência entre memória e projeto',
    status: 'Exibe o estado verificável da memória',
    context: 'Recupera o snapshot compacto para agentes e automações',
    graph: 'Imprime o grafo de conhecimento (nós, conexões e backlinks) em Mermaid',
    skins: 'Lista ou imprime skins padronizadas (front/back/banco)',
    mcp: 'Configura credenciais e MCP MySQL de forma interativa',
    configure: 'Mescla a configuração MCP usando .env.mcp existente',
    update: 'Atualiza os blocos gerenciados e o snapshot (alias de sync)'
};

class CliError extends Error {}

function parseArguments(args) {
    const knownFlags = new Set(['--dry-run', '--silent', '--help', '-h', '--version', '-v', '--global', '--json', '--root', '--inject']);
    const flags = {
        dryRun: args.includes('--dry-run'),
        silent: args.includes('--silent'),
        help: args.includes('--help') || args.includes('-h'),
        version: args.includes('--version') || args.includes('-v'),
        global: args.includes('--global'),
        json: args.includes('--json'),
        inject: args.includes('--inject'),
        root: null
    };
    const rootIndex = args.indexOf('--root');
    if (rootIndex >= 0) {
        if (!args[rootIndex + 1] || args[rootIndex + 1].startsWith('-')) {
            throw new CliError('--root exige um caminho.');
        }
        flags.root = args[rootIndex + 1];
    }

    const values = new Set(rootIndex >= 0 ? [rootIndex + 1] : []);
    for (const [index, arg] of args.entries()) {
        if (values.has(index)) continue;
        if (arg.startsWith('-') && !knownFlags.has(arg)) throw new CliError(`Flag desconhecida: ${arg}.`);
    }
    const positionals = args.filter((arg, index) => !arg.startsWith('-') && !values.has(index));
    if (positionals.length > 2) throw new CliError(`Argumentos inesperados: ${positionals.slice(1).join(' ')}.`);
    const [command] = positionals;
    flags.positionals = positionals;
    return { flags, command };
}

function createReporter(flags) {
    return {
        info(message) {
            if (!flags.silent) console.log(chalk.cyan(`🔷 ${message}`));
        },
        success(message) {
            if (!flags.silent) console.log(chalk.green(`  ✅ ${message}`));
        },
        warning(message) {
            if (!flags.silent) console.log(chalk.yellow(`  ⚠️  ${message}`));
        },
        issue(message) {
            console.error(chalk.red(`  ❌ ${message}`));
        },
        raw(message) {
            if (!flags.silent || flags.json) console.log(message);
        }
    };
}

async function getProjectRoot(explicitRoot = null, startDirectory = process.cwd()) {
    if (explicitRoot) {
        const resolved = path.resolve(startDirectory, explicitRoot);
        if (!await fs.pathExists(resolved) || !(await fs.stat(resolved)).isDirectory()) {
            throw new CliError(`Raiz de projeto inválida: ${resolved}`);
        }
        return resolved;
    }

    const projectMarkers = ['package.json', 'composer.json', 'pyproject.toml', 'requirements.txt', 'go.mod'];
    let current = path.resolve(startDirectory);
    while (true) {
        if (projectMarkers.some(marker => fs.existsSync(path.join(current, marker)))) return current;
        if (fs.existsSync(path.join(current, '.git'))) return current;
        const parent = path.dirname(current);
        if (parent === current) break;
        current = parent;
    }
    return path.resolve(startDirectory);
}

function assertAnalysis(dna) {
    if (dna.warnings && dna.warnings.length) {
        throw new CliError(`Análise interrompida para não gravar contexto duvidoso:\n- ${dna.warnings.join('\n- ')}`);
    }
}

function reportChanges(reporter, ...summaries) {
    for (const summary of summaries) {
        if (!summary) continue;
        for (const result of summary.results || []) {
            if (result.planned) reporter.warning(`[DRY RUN] Planejado: ${result.status} ${result.file}`);
            else if (result.status === 'created') reporter.success(`Criado: ${result.file}`);
            else if (result.status === 'updated') reporter.success(`Atualizado: ${result.file}`);
        }
    }
}

async function analyze(root) {
    const dna = await new ProjectAnalyzer(root).analyze();
    assertAnalysis(dna);
    return dna;
}

async function cmdInit(flags, reporter) {
    const root = await getProjectRoot(flags.root);
    reporter.info(`Analisando o projeto: ${root}`);
    const dna = await analyze(root);
    reporter.info(`DNA: ${dna.language} | ${dna.framework} | ${dna.database}`);

    const generator = new ContextGenerator(dna, flags);
    const { generated, synced } = await generator.synchronize();
    reportChanges(reporter, generated, synced);

    if (flags.dryRun) {
        reporter.warning(`Simulação concluída; nenhuma alteração foi gravada. Fingerprint previsto: ${synced.fingerprint.slice(0, 12)}`);
    } else {
        reporter.success(`Memória inicializada e verificada. Fingerprint: ${synced.fingerprint.slice(0, 12)}`);
        reporter.info('MCP e deploy não foram configurados automaticamente. Use comandos explícitos se forem necessários.');
    }
}

async function cmdSync(flags, reporter) {
    const root = await getProjectRoot(flags.root);
    reporter.info(`Sincronizando contexto do projeto: ${root}`);
    const dna = await analyze(root);
    const generator = new ContextGenerator(dna, flags);
    const { generated, synced } = await generator.synchronize();
    reportChanges(reporter, generated, synced);

    const changed = [...generated.createdFiles, ...generated.updatedFiles, ...synced.createdFiles, ...synced.updatedFiles];
    if (flags.dryRun) {
        reporter.warning(`Simulação concluída; ${generated.plannedFiles.length + synced.plannedFiles.length} alteração(ões) planejada(s), nenhuma gravada.`);
    } else {
        reporter.success(`Sincronização concluída com ${changed.length} alteração(ões) real(is). Fingerprint: ${synced.fingerprint.slice(0, 12)}`);
    }
}

async function cmdCheck(flags, reporter) {
    const root = await getProjectRoot(flags.root);
    const dna = await analyze(root);
    const health = await MemoryState.inspect(root, dna);

    if (!flags.silent) {
        reporter.raw(`Projeto: ${root}`);
        reporter.raw(`DNA atual: ${dna.language} | ${dna.framework} | ${dna.database} | ${dna.orm}`);
    }

    if (!health.healthy) {
        for (const issue of health.issues) reporter.issue(issue);
        process.exitCode = 1;
        return health;
    }

    reporter.success(`Snapshot íntegro e sincronizado em ${health.state.syncedAt}.`);
    reporter.info('O check valida fatos automáticos; regras de negócio e handoff continuam exigindo evidência humana/agente.');
    return health;
}

async function cmdContext(flags, reporter) {
    const root = await getProjectRoot(flags.root);
    const dna = await analyze(root);
    const health = await MemoryState.inspect(root, dna);
    if (!health.healthy) {
        for (const issue of health.issues) reporter.issue(issue);
        process.exitCode = 1;
        return;
    }

    if (flags.json) {
        console.log(JSON.stringify(health.state, null, 2));
        return;
    }

    const snapshot = health.state.snapshot;
    reporter.raw(`# ${snapshot.projectName}`);
    reporter.raw(`Fingerprint: ${health.state.fingerprint}`);
    reporter.raw(`Stack: ${snapshot.language} | ${snapshot.framework} | ${snapshot.database} | ${snapshot.orm}`);
    reporter.raw(`Inventário: ${snapshot.inventory.sourceFiles} arquivos-fonte; ${snapshot.routes.length} rotas; ${snapshot.tables.length} tabelas mencionadas em migrations.`);
    reporter.raw(`Leia em seguida: ${health.state.readFirst.join(', ')}`);
}

async function cmdGraph(flags, reporter) {
    const root = await getProjectRoot(flags.root);
    const dna = await analyze(root);
    const graph = new KnowledgeGraph(dna).build();
    if (!flags.silent) {
        reporter.raw(`# Grafo de conhecimento: ${dna.projectName}`);
        reporter.raw(`Nós: ${graph.nodes.length} | Conexões: ${graph.edges.length}`);
        reporter.raw('');
        reporter.raw('```mermaid');
        reporter.raw(graph._mermaid());
        reporter.raw('```');
        reporter.raw('');
        reporter.raw(`Arquivo completo: docs/ai/GRAFO.md (Mermaid) e docs/ai/GRAFO.html (viewer interativo).`);
    }
}

async function cmdSkins(flags, reporter) {
    const skinsDir = path.join(__dirname, '..', 'intelligence', 'skins');
    const name = (flags.positionals && flags.positionals[1]) || null;
    if (!await fs.pathExists(skinsDir)) {
        throw new CliError('Diretório de skins ausente no pacote.');
    }
    const files = (await fs.readdir(skinsDir)).filter(file => file.endsWith('.md')).sort();
    if (!name) {
        reporter.info('Skins padronizadas disponíveis:');
        for (const file of files.filter(file => file !== 'SKINS.md')) {
            reporter.raw(`- ${file.replace(/\.md$/, '')}`);
        }
        reporter.info('Use: memoria-viva skins <nome> para imprimir a skin e enviá-la junto com o prompt.');
        return;
    }
    const skinPath = path.join(skinsDir, `${name}.md`);
    if (!await fs.pathExists(skinPath)) {
        throw new CliError(`Skin inexistente: ${name}. Use 'memoria-viva skins' para listar.`);
    }
    const skinBody = (await fs.readFile(skinPath, 'utf8')).replace(/^\s*<!--[\s\S]*?-->\s*/, '');

    if (!flags.inject) {
        reporter.raw(skinBody);
        return;
    }

    const root = await getProjectRoot(flags.root);
    let contextBlock = '_Memória não inicializada neste projeto. Rode `memoria-viva init` para gerar o snapshot._';
    const state = await MemoryState.load(root);
    if (state && MemoryState.validateState(state).length === 0) {
        const snapshot = state.snapshot;
        const inventory = snapshot.inventory || {};
        contextBlock =
`# Contexto do projeto (snapshot Memória Viva)

- **Projeto:** ${snapshot.projectName}
- **Fingerprint:** ${state.fingerprint}
- **Stack:** ${snapshot.language} | ${snapshot.framework} | ${snapshot.database} | ${snapshot.orm}
- **Inventário:** ${inventory.sourceFiles || 0} arquivos-fonte; ${snapshot.routes.length} rotas; ${snapshot.tables.length} tabelas mencionadas em migrations.
- **Leia em seguida:** ${state.readFirst.join(', ')}

> Leia essas notas antes de agir e siga a skin acima. Preserve contratos e não invente fatos.`;
    }

    reporter.raw(`# Instruções para o agente (Memória Viva)

${skinBody}

---

${contextBlock}

> Cole este bloco no início do chat do agente, antes do seu pedido.`);
}

async function cmdMCP(flags, reporter, interactive) {
    const root = await getProjectRoot(flags.root);
    const dna = await analyze(root);
    if (dna.database !== 'Unknown' && !/MySQL|MariaDB/i.test(dna.database)) {
        throw new CliError(`MCP MySQL não configurado: banco detectado como ${dna.database}.`);
    }

    const bridge = new MCPBridge(dna, { dryRun: flags.dryRun, global: flags.global });
    const credentials = interactive && !flags.silent ? await bridge.promptInteractive() : null;
    const results = await bridge.configure(credentials);
    for (const result of results) {
        const detail = result.reason ? ` — ${result.reason}` : '';
        if (result.action === 'skipped') reporter.warning(`${result.file}: ignorado${detail}`);
        else if (result.action === 'unchanged') reporter.warning(`${result.file}: mantido`);
        else reporter.success(`${result.action}: ${result.file}`);
    }

    const skippedForCredentials = results.some(result => result.file === 'MCP configs' && result.action === 'skipped');
    if (skippedForCredentials) {
        process.exitCode = 1;
        reporter.issue('Configuração MCP incompleta por falta de credenciais.');
    } else if (flags.dryRun) {
        reporter.warning('Simulação MCP concluída; nenhuma alteração foi gravada.');
    } else {
        reporter.success(`Configuração MCP ${flags.global ? 'local e global' : 'local'} concluída sem gravar senha nos JSONs.`);
    }
}

function showHelp() {
    console.log(chalk.magenta('\nMEMÓRIA VIVA — memória verificável para agentes\n'));
    for (const [command, description] of Object.entries(COMMANDS)) {
        console.log(`  ${chalk.cyan(command.padEnd(12))} ${description}`);
    }
    console.log('\nOpções:');
    console.log('  --root <path>  Seleciona explicitamente o projeto/pacote');
    console.log('  --dry-run      Calcula mudanças sem gravá-las');
    console.log('  --silent       Suprime saída informativa');
    console.log('  --json         Saída JSON no comando context');
    console.log('  --global       Também mescla MCP nas configurações globais (opt-in)');
    console.log('  --version, -v  Exibe a versão');
}

async function main(args = process.argv.slice(2)) {
    const { flags, command } = parseArguments(args);
    if (flags.version) {
        const pkg = await fs.readJson(path.resolve(__dirname, '..', 'package.json'));
        console.log(`memoria-viva v${pkg.version}`);
        return;
    }
    if (flags.help || !command || ['/', 'help', 'list'].includes(command)) {
        showHelp();
        return;
    }
    if (flags.global && !['mcp', 'configure'].includes(command)) {
        throw new CliError('--global só é válido com mcp ou configure.');
    }
    if (flags.json && command !== 'context') {
        throw new CliError('--json só é válido com context.');
    }
    if (flags.inject && command !== 'skins') {
        throw new CliError('--inject só é válido com skins.');
    }

    const reporter = createReporter(flags);
    switch (command) {
        case 'init': return cmdInit(flags, reporter);
        case 'sync': return cmdSync(flags, reporter);
        case 'check':
        case 'status': return cmdCheck(flags, reporter);
        case 'context': return cmdContext(flags, reporter);
        case 'graph': return cmdGraph(flags, reporter);
        case 'skins': return cmdSkins(flags, reporter);
        case 'mcp': return cmdMCP(flags, reporter, true);
        case 'configure': return cmdMCP(flags, reporter, false);
        case 'update': return cmdSync(flags, reporter);
        default: throw new CliError(`Comando desconhecido: ${command}. Use memoria-viva --help.`);
    }
}

if (require.main === module) {
    main().catch(error => {
        console.error(chalk.red(`  ❌ ${error.message}`));
        process.exitCode = 1;
    });
}

module.exports = {
    CliError,
    getProjectRoot,
    main,
    parseArguments
};
