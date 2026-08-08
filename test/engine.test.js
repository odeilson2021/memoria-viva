'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('fs-extra');
const os = require('node:os');

const ProjectAnalyzer = require('../engine/analyzer');
const ContextGenerator = require('../engine/generator');
const MemoryState = require('../engine/memory-state');
const KnowledgeGraph = require('../engine/graph');

async function tmpProject(t, name) {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), `mv-${name}-`));
    t.after(() => fs.remove(root));
    return root;
}

async function scaffold(root, files = {}) {
    for (const [relativePath, content] of Object.entries(files)) {
        const filePath = path.join(root, relativePath);
        await fs.ensureDir(path.dirname(filePath));
        if (typeof content === 'object') await fs.writeJson(filePath, content);
        else await fs.writeFile(filePath, content, 'utf8');
    }
}

test('preserva Laravel como backend em projeto com Vite e detecta routes/web.php', async t => {
    const root = await tmpProject(t, 'laravel');
    await scaffold(root, {
        'composer.json': { require: { php: '^8.3', 'laravel/framework': '^12' } },
        'package.json': { dependencies: { vite: '^7', react: '^19' } },
        'routes/web.php': "<?php\nRoute::get('/dashboard', DashboardController::class);"
    });

    const dna = await new ProjectAnalyzer(root).analyze();
    assert.match(dna.language, /^PHP/);
    assert.match(dna.framework, /Laravel/);
    assert.equal(dna.uiFramework, 'React');
    assert.deepEqual(dna.languages, ['PHP', 'Node.js']);
    assert.deepEqual(dna.routes.map(route => route.file), ['routes/web.php']);
    assert.equal(dna.routes[0].path, '/dashboard');
});

test('não inventa AdonisJS e cobre src/routes e db/migrations', async t => {
    const root = await tmpProject(t, 'express');
    await scaffold(root, {
        'package.json': { dependencies: { express: '^5' } },
        'src/routes/billing.js': "router.get('/billing/invoices', handler)",
        'db/migrations/001.sql': 'CREATE TABLE IF NOT EXISTS invoices (id bigint);'
    });

    const dna = await new ProjectAnalyzer(root).analyze();
    assert.equal(dna.framework, 'Node.js — Express');
    assert.equal(dna.routes[0].file, 'src/routes/billing.js');
    assert.equal(dna.routes[0].path, '/billing/invoices');
    assert.deepEqual(dna.tables, ['invoices']);

    await fs.writeJson(path.join(root, 'package.json'), { name: 'utility', dependencies: { chalk: '^4' } });
    const generic = await new ProjectAnalyzer(root).analyze();
    assert.equal(generic.framework, 'Node.js — sem framework detectado');
});

test('detecta framework Python somente com evidência', async t => {
    const root = await tmpProject(t, 'python');
    await scaffold(root, { 'requirements.txt': 'httpx==1.0\n' });
    let dna = await new ProjectAnalyzer(root).analyze();
    assert.equal(dna.framework, 'Python — sem framework detectado');

    await fs.writeFile(path.join(root, 'requirements.txt'), 'fastapi==1.0\n', 'utf8');
    dna = await new ProjectAnalyzer(root).analyze();
    assert.equal(dna.framework, 'Python — FastAPI');
});

test('não mistura framework secundário nem chama Vite+Vue de React', async t => {
    const mixedRoot = await tmpProject(t, 'mixed');
    await scaffold(mixedRoot, {
        'package.json': { dependencies: { express: '^5' } },
        'requirements.txt': 'fastapi==1.0\n'
    });
    const mixed = await new ProjectAnalyzer(mixedRoot).analyze();
    assert.equal(mixed.framework, 'Node.js — Express');
    assert.deepEqual(mixed.languages, ['Node.js', 'Python']);

    const vueRoot = await tmpProject(t, 'vue');
    await scaffold(vueRoot, { 'package.json': { dependencies: { vue: '^3', vite: '^7' } } });
    const vue = await new ProjectAnalyzer(vueRoot).analyze();
    assert.equal(vue.framework, 'Vue.js');
    assert.equal(vue.uiFramework, 'Vue.js');
});

test('gera snapshot canônico e bootstraps reconhecidos sem regras fabricadas', async t => {
    const root = await tmpProject(t, 'generate');
    await scaffold(root, {
        'package.json': { name: 'utility', scripts: { test: 'node --test' }, dependencies: { chalk: '^4' } },
        'src/index.js': 'module.exports = 1;'
    });
    const dna = await new ProjectAnalyzer(root).analyze();
    const generator = new ContextGenerator(dna);
    await generator.generate();
    await generator.syncContext();

    const rules = await fs.readFile(path.join(root, '.agent/rules.md'), 'utf8');
    assert.match(rules, /prove a causa-raiz/);
    assert.match(rules, /Nunca declare sucesso/);
    assert.doesNotMatch(rules, /auth_sessions|Lojista|Lucid ORM|IoC Container nativo/);

    const context = await fs.readFile(path.join(root, 'docs/ai/CONTEXTO_ATUAL.md'), 'utf8');
    assert.match(context, /MEMORIA_VIVA:SNAPSHOT:START/);
    assert.match(context, /Node\.js — sem framework detectado/);
    assert.doesNotMatch(context, /Admin \/ Master|24 horas|store_id/);

    const state = await fs.readJson(path.join(root, '.agent/memory.json'));
    assert.equal(state.snapshot.projectName, path.basename(root));
    assert.equal(state.snapshot.validationCommands[0], 'npm test');
    assert.equal(state.fingerprint, MemoryState.fingerprint(state.snapshot));

    for (const entrypoint of [
        'AGENTS.md',
        'CLAUDE.md',
        '.github/copilot-instructions.md',
        '.cursor/rules/memoria-viva.mdc'
    ]) {
        assert.equal(await fs.pathExists(path.join(root, entrypoint)), true, entrypoint);
        assert.match(await fs.readFile(path.join(root, entrypoint), 'utf8'), /.agent\/memory\.json/);
    }
    assert.equal(await fs.pathExists(path.join(root, '.github/workflows/deploy.yml')), false);
});

test('segunda sync substitui somente o snapshot e terceira sync é idempotente', async t => {
    const root = await tmpProject(t, 'resync');
    await scaffold(root, {
        'package.json': { name: 'api', dependencies: { express: '^5' } },
        'src/routes/api.js': "router.get('/old', handler)",
        'db/migrations/001.sql': 'CREATE TABLE users (id bigint);'
    });

    let dna = await new ProjectAnalyzer(root).analyze();
    let generator = new ContextGenerator(dna);
    await generator.generate();
    await generator.syncContext();

    const contextPath = path.join(root, 'docs/ai/CONTEXTO_ATUAL.md');
    await fs.appendFile(contextPath, '\n## Nota humana preservada\n\nNÃO APAGAR ESTA DECISÃO.\n', 'utf8');
    await fs.writeFile(path.join(root, 'src/routes/api.js'), "router.post('/new', handler)", 'utf8');
    await fs.writeFile(path.join(root, 'db/migrations/001.sql'), 'CREATE TABLE orders (id bigint);', 'utf8');

    dna = await new ProjectAnalyzer(root).analyze();
    generator = new ContextGenerator(dna);
    await generator.generate();
    await generator.syncContext();

    const secondContext = await fs.readFile(contextPath, 'utf8');
    const secondState = await fs.readFile(path.join(root, '.agent/memory.json'), 'utf8');
    assert.match(secondContext, /\| POST \| \/new \|/);
    assert.match(secondContext, /\| orders \| migration \|/);
    assert.doesNotMatch(secondContext, /\| GET \| \/old \|/);
    assert.doesNotMatch(secondContext, /\| users \| migration \|/);
    assert.match(secondContext, /NÃO APAGAR ESTA DECISÃO/);

    dna = await new ProjectAnalyzer(root).analyze();
    generator = new ContextGenerator(dna);
    const generated = await generator.generate();
    const synced = await generator.syncContext();
    assert.equal(await fs.readFile(contextPath, 'utf8'), secondContext);
    assert.equal(await fs.readFile(path.join(root, '.agent/memory.json'), 'utf8'), secondState);
    assert.equal(generated.updatedFiles.length + synced.updatedFiles.length, 0);

    const health = await MemoryState.inspect(root, dna);
    assert.equal(health.healthy, true, health.issues.join('\n'));
});

test('check lógico detecta divergência de código após o sync', async t => {
    const root = await tmpProject(t, 'stale');
    await scaffold(root, {
        'package.json': { name: 'api', dependencies: { express: '^5' } },
        'src/routes/api.js': "router.get('/v1', handler)"
    });
    let dna = await new ProjectAnalyzer(root).analyze();
    const generator = new ContextGenerator(dna);
    await generator.generate();
    await generator.syncContext();
    assert.equal((await MemoryState.inspect(root, dna)).healthy, true);

    await fs.writeFile(path.join(root, 'src/routes/api.js'), "router.get('/v2', handler)", 'utf8');
    dna = await new ProjectAnalyzer(root).analyze();
    const health = await MemoryState.inspect(root, dna);
    assert.equal(health.healthy, false);
    assert.equal(health.stale, true);
});

test('marcador gerenciado incompleto interrompe sync sem sobrescrever', async t => {
    const root = await tmpProject(t, 'marker');
    await scaffold(root, { 'package.json': { name: 'x' } });
    const dna = await new ProjectAnalyzer(root).analyze();
    const generator = new ContextGenerator(dna);
    await generator.generate();
    await generator.syncContext();

    const contextPath = path.join(root, 'docs/ai/CONTEXTO_ATUAL.md');
    const broken = (await fs.readFile(contextPath, 'utf8')).replace('<!-- MEMORIA_VIVA:SNAPSHOT:END -->', '');
    await fs.writeFile(contextPath, broken, 'utf8');
    await assert.rejects(() => generator.syncContext(), /bloco gerenciado SNAPSHOT está incompleto/i);
    assert.equal(await fs.readFile(contextPath, 'utf8'), broken);
});

test('mantém fatos desconhecidos e não inventa versão do Slim nem framework Go', async t => {
    const emptyRoot = await tmpProject(t, 'unknown');
    const unknown = await new ProjectAnalyzer(emptyRoot).analyze();
    assert.equal(unknown.language, 'Unknown');
    assert.equal(unknown.framework, 'Unknown');
    assert.equal(unknown.database, 'Unknown');
    assert.equal(unknown.orm, 'Unknown');
    assert.equal(unknown.uiFramework, 'Unknown');

    const slimRoot = await tmpProject(t, 'slim');
    await scaffold(slimRoot, {
        'composer.json': { require: { php: '^8.1', 'slim/slim': '^3.12' } }
    });
    const slim = await new ProjectAnalyzer(slimRoot).analyze();
    assert.equal(slim.framework, 'PHP — Slim');
    assert.doesNotMatch(slim.framework, /Slim\s+4/);

    const goRoot = await tmpProject(t, 'go');
    await scaffold(goRoot, { 'go.mod': 'module example.com/service\n\ngo 1.23\n' });
    const go = await new ProjectAnalyzer(goRoot).analyze();
    assert.equal(go.framework, 'Go — sem framework detectado');
});

test('detecta src/routes.ts, ignora comentários .env e preserva schema SQL', async t => {
    const root = await tmpProject(t, 'facts');
    await scaffold(root, {
        'package.json': { dependencies: { express: '^5', pg: '^8' } },
        'src/routes.ts': "router.get('/health', handler);",
        '.env': '# MYSQL support disabled\nAPP_NAME=api # MYSQL também é só comentário\nMYSQL_SUPPORT_DISABLED=true\n',
        'db/migrations/001.sql': [
            'CREATE TABLE public.users (id bigint);',
            'CREATE TABLE IF NOT EXISTS "audit"."events" (id bigint);',
            'CREATE TABLE [sales].[orders] (id bigint);'
        ].join('\n')
    });

    const dna = await new ProjectAnalyzer(root).analyze();
    assert.equal(dna.structure.hasRoutes, true);
    assert.deepEqual(dna.routes.map(route => route.file), ['src/routes.ts']);
    assert.equal(dna.routes[0].path, '/health');
    assert.equal(dna.database, 'PostgreSQL');
    assert.deepEqual(dna.tables, ['audit.events', 'public.users', 'sales.orders']);
});

test('fingerprint inclui shell e Dockerfile e normaliza BOM e finais de linha', async t => {
    const root = await tmpProject(t, 'fingerprint');
    await scaffold(root, {
        'package.json': { name: 'fingerprint' },
        'scripts/deploy.sh': '\uFEFF#!/bin/sh\r\necho ok\r\n',
        Dockerfile: '\uFEFFFROM node:20\r\nRUN echo ok\r\n'
    });

    const first = await new ProjectAnalyzer(root).analyze();
    assert.equal(first.inventory.byExtension['.sh'], 1);
    assert.equal(first.inventory.byExtension['[manifest]'], 1);

    await fs.writeFile(path.join(root, 'scripts/deploy.sh'), '#!/bin/sh\necho ok\n', 'utf8');
    await fs.writeFile(path.join(root, 'Dockerfile'), 'FROM node:20\nRUN echo ok\n', 'utf8');
    const normalized = await new ProjectAnalyzer(root).analyze();
    assert.equal(normalized.inventory.sourceFingerprint, first.inventory.sourceFingerprint);

    await fs.writeFile(path.join(root, 'scripts/deploy.sh'), '#!/bin/sh\necho changed\n', 'utf8');
    const changed = await new ProjectAnalyzer(root).analyze();
    assert.notEqual(changed.inventory.sourceFingerprint, first.inventory.sourceFingerprint);
});

test('rejeita estruturas inválidas de package/composer e TOML duvidoso', async t => {
    const manifestRoot = await tmpProject(t, 'malformed-manifests');
    await scaffold(manifestRoot, {
        'package.json': [],
        'composer.json': []
    });
    const manifests = await new ProjectAnalyzer(manifestRoot).analyze();
    assert.deepEqual(manifests.languages, []);
    assert.equal(manifests.language, 'Unknown');
    assert.equal(manifests.warnings.length, 2);
    assert.match(manifests.warnings.join('\n'), /package\.json deve ser um objeto JSON/);
    assert.match(manifests.warnings.join('\n'), /composer\.json deve ser um objeto JSON/);

    const scriptsRoot = await tmpProject(t, 'malformed-scripts');
    await scaffold(scriptsRoot, {
        'package.json': { scripts: { test: 42 } },
        'composer.json': { scripts: { test: [42] } }
    });
    const scripts = await new ProjectAnalyzer(scriptsRoot).analyze();
    assert.deepEqual(scripts.languages, []);
    assert.equal(scripts.warnings.length, 2);

    const pythonRoot = await tmpProject(t, 'toml');
    await scaffold(pythonRoot, {
        'pyproject.toml': '[project\ndependencies = ["fastapi"]\n'
    });
    let python = await new ProjectAnalyzer(pythonRoot).analyze();
    assert.equal(python.framework, 'Python — sem framework detectado');
    assert.match(python.warnings.join('\n'), /pyproject\.toml/);

    await fs.writeFile(path.join(pythonRoot, 'pyproject.toml'), 'isto não é uma declaração TOML\n', 'utf8');
    python = await new ProjectAnalyzer(pythonRoot).analyze();
    assert.equal(python.framework, 'Python — sem framework detectado');
    assert.match(python.warnings.join('\n'), /declaração TOML inválida/);

    await fs.writeFile(path.join(pythonRoot, 'pyproject.toml'), [
        '[project]',
        'name = "docs-only"',
        'description = "FastAPI integration notes"',
        'dependencies = ["httpx>=1"]'
    ].join('\n'), 'utf8');
    python = await new ProjectAnalyzer(pythonRoot).analyze();
    assert.equal(python.framework, 'Python — sem framework detectado');
    assert.deepEqual(python.warnings, []);

    await fs.writeFile(path.join(pythonRoot, 'pyproject.toml'), [
        '[project]',
        'name = "real-api"',
        'dependencies = ["fastapi[standard]>=0.115"]'
    ].join('\n'), 'utf8');
    python = await new ProjectAnalyzer(pythonRoot).analyze();
    assert.equal(python.framework, 'Python — FastAPI');
});

test('gera grafo de conhecimento com nós, conexões e backlinks', async t => {
    const root = await tmpProject(t, 'graph');
    await scaffold(root, {
        'package.json': { name: 'api', dependencies: { express: '^5', pg: '^8' } },
        'src/routes/api.js': "router.get('/v1/items', handler);",
        'db/migrations/001.sql': 'CREATE TABLE items (id bigint);'
    });

    const dna = await new ProjectAnalyzer(root).analyze();
    const generator = new ContextGenerator(dna);
    await generator.generate();
    await generator.syncContext();

    const graphPath = path.join(root, 'docs/ai/GRAFO.md');
    assert.equal(await fs.pathExists(graphPath), true);
    const graphMarkdown = await fs.readFile(graphPath, 'utf8');
    assert.match(graphMarkdown, /```mermaid/);
    assert.match(graphMarkdown, /graph TD/);
    assert.match(graphMarkdown, /pertence a/);
    assert.match(graphMarkdown, /armazenada em/);
    assert.match(graphMarkdown, /## Backlinks por nó/);
    assert.match(graphMarkdown, /de `.*` via _pertence a_/);

    const state = await fs.readJson(path.join(root, '.agent/memory.json'));
    assert.ok(state.snapshot.knowledgeGraph.nodes.length >= 4, 'esperados nós de stack, módulo, rota, arquivo e tabela');
    assert.ok(state.snapshot.knowledgeGraph.edges.length >= 3, 'esperadas arestas de relações comprovadas');

    const htmlPath = path.join(root, 'docs/ai/GRAFO.html');
    assert.equal(await fs.pathExists(htmlPath), true);
    const html = await fs.readFile(htmlPath, 'utf8');
    assert.match(html, /<!doctype html>/i);
    assert.match(html, /const DATA = /);
    assert.match(html, /force|tick|requestAnimationFrame/);
    assert.doesNotMatch(html, /<\/script>\s*<script[^>]*src=/i);

    const health = await MemoryState.inspect(root, dna);
    assert.equal(health.healthy, true, health.issues.join('\n'));
});

test('grafo é idempotente e preserva nós/arestas estáveis', async t => {
    const root = await tmpProject(t, 'graph-idem');
    await scaffold(root, {
        'package.json': { name: 'api', dependencies: { express: '^5' } },
        'src/routes/api.js': "router.get('/v1/items', handler);"
    });
    const dna = await new ProjectAnalyzer(root).analyze();
    const generator = new ContextGenerator(dna);
    await generator.generate();
    await generator.syncContext();

    const firstGraph = await fs.readFile(path.join(root, 'docs/ai/GRAFO.md'), 'utf8');
    const firstState = await fs.readFile(path.join(root, '.agent/memory.json'), 'utf8');

    const refreshed = await new ProjectAnalyzer(root).analyze();
    const regen = new ContextGenerator(refreshed);
    await regen.generate();
    await regen.syncContext();
    assert.equal(await fs.readFile(path.join(root, 'docs/ai/GRAFO.md'), 'utf8'), firstGraph);
    assert.equal(await fs.readFile(path.join(root, '.agent/memory.json'), 'utf8'), firstState);
});

test('grafo liga rota/arquivo à tabela quando o nome aparece no código', async t => {
    const root = await tmpProject(t, 'graph-usage');
    await scaffold(root, {
        'package.json': { name: 'api', dependencies: { express: '^5', pg: '^8' } },
        'src/routes/orders.js': "router.get('/orders', h); const q = 'SELECT * FROM orders WHERE id = $1';",
        'db/migrations/001.sql': 'CREATE TABLE orders (id bigint);'
    });

    const dna = await new ProjectAnalyzer(root).analyze();
    assert.deepEqual(dna.tableUsage.orders, ['src/routes/orders.js']);

    const graph = new KnowledgeGraph(dna).build();
    const edges = graph.edges.filter(edge => edge.label === 'acessa tabela');
    assert.ok(edges.length >= 2, 'esperadas arestas arquivo→tabela e rota→tabela');
    const labels = edges.map(edge => (graph._nodeIndex.get(edge.target) || {}).label);
    assert.ok(labels.includes('orders'), 'a tabela orders deve ser o destino');

    const generator = new ContextGenerator(dna);
    await generator.generate();
    await generator.syncContext();
    const graphMarkdown = await fs.readFile(path.join(root, 'docs/ai/GRAFO.md'), 'utf8');
    assert.match(graphMarkdown, /acessa tabela/);
});

test('gera INDICE e MAPA_DO_PROJETO com wiki-links estilo Obsidian', async t => {
    const root = await tmpProject(t, 'map');
    await scaffold(root, {
        'package.json': { name: 'api', dependencies: { express: '^5', pg: '^8' } },
        'src/routes/orders.js': "router.get('/orders', h); const q='SELECT * FROM orders';",
        'db/migrations/001.sql': 'CREATE TABLE orders (id bigint);',
        'src/services/orders.js': 'module.exports = 1;'
    });
    const dna = await new ProjectAnalyzer(root).analyze();
    const generator = new ContextGenerator(dna);
    await generator.generate();
    await generator.syncContext();

    const index = await fs.readFile(path.join(root, 'docs/ai/INDICE.md'), 'utf8');
    const map = await fs.readFile(path.join(root, 'docs/ai/MAPA_DO_PROJETO.md'), 'utf8');
    const context = await fs.readFile(path.join(root, 'docs/ai/CONTEXTO_ATUAL.md'), 'utf8');

    for (const doc of [index, map, context]) {
        assert.match(doc, /\[\[GRAFO\]\]/, 'deve cruzar com [[GRAFO]]');
        assert.match(doc, /Documentos relacionados \(padrão Obsidian\)/, 'deve ter bloco de relacionados');
    }
    assert.match(map, /Estrutura de diretórios/, 'mapa tem árvore de diretórios');
    assert.match(map, /Sistema de roteamento/, 'mapa tem roteamento');
    assert.match(map, /src\/services\/orders\.js|services/, 'mapa mapeia pastas do projeto');
    assert.match(map, /docs\/ai\/MAPA_DO_PROJETO\.md/, 'mapa lista caminho canônico da doc');

    const health = await MemoryState.inspect(root, dna);
    assert.equal(health.healthy, true, health.issues.join('\n'));
});

test('mapa e indice sao idempotentes', async t => {
    const root = await tmpProject(t, 'map-idem');
    await scaffold(root, {
        'package.json': { name: 'api', dependencies: { express: '^5' } },
        'src/routes/orders.js': "router.get('/orders', h);"
    });
    const dna = await new ProjectAnalyzer(root).analyze();
    const generator = new ContextGenerator(dna);
    await generator.generate();
    await generator.syncContext();

    const firstMap = await fs.readFile(path.join(root, 'docs/ai/MAPA_DO_PROJETO.md'), 'utf8');
    const firstIndex = await fs.readFile(path.join(root, 'docs/ai/INDICE.md'), 'utf8');

    const refreshed = await new ProjectAnalyzer(root).analyze();
    const regen = new ContextGenerator(refreshed);
    await regen.generate();
    await regen.syncContext();
    assert.equal(await fs.readFile(path.join(root, 'docs/ai/MAPA_DO_PROJETO.md'), 'utf8'), firstMap);
    assert.equal(await fs.readFile(path.join(root, 'docs/ai/INDICE.md'), 'utf8'), firstIndex);
});

