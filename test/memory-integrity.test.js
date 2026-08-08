'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('fs-extra');
const os = require('node:os');

const ProjectAnalyzer = require('../engine/analyzer');
const ContextGenerator = require('../engine/generator');
const MemoryState = require('../engine/memory-state');

async function project(t, name, files = {}) {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), `mv-integrity-${name}-`));
    t.after(() => fs.remove(root));
    for (const [relativePath, content] of Object.entries(files)) {
        const target = path.join(root, relativePath);
        await fs.ensureDir(path.dirname(target));
        if (typeof content === 'object') await fs.writeJson(target, content);
        else await fs.writeFile(target, content, 'utf8');
    }
    return root;
}

async function sync(root) {
    const dna = await new ProjectAnalyzer(root).analyze();
    return new ContextGenerator(dna).synchronize();
}

test('detecta adulteração dentro do bloco sem punir texto humano fora dele', async t => {
    const root = await project(t, 'managed-block', {
        'package.json': { name: 'api', dependencies: { express: '^5' } },
        'src/routes.js': "router.get('/v1', handler)"
    });
    await sync(root);

    const handoffPath = path.join(root, 'docs/ai/HANDOFF_ATUAL.md');
    await fs.appendFile(handoffPath, '\n## Registro humano\n\nCausa confirmada no teste X.\n', 'utf8');
    let dna = await new ProjectAnalyzer(root).analyze();
    assert.equal((await MemoryState.inspect(root, dna)).healthy, true);

    const contextPath = path.join(root, 'docs/ai/CONTEXTO_ATUAL.md');
    const context = await fs.readFile(contextPath, 'utf8');
    await fs.writeFile(contextPath, context.replace('Node.js — Express', 'FRAMEWORK FALSIFICADO'), 'utf8');
    const health = await MemoryState.inspect(root, dna);
    assert.equal(health.healthy, false);
    assert.match(health.issues.join('\n'), /Artefato gerenciado alterado/);
    await assert.rejects(() => sync(root), /mudaram desde o último sync/);
    assert.match(await fs.readFile(handoffPath, 'utf8'), /Causa confirmada no teste X/);
});

test('marcadores duplicados ou invertidos nunca são aceitos', async t => {
    const root = await project(t, 'markers', { 'package.json': { name: 'markers' } });
    await sync(root);
    const contextPath = path.join(root, 'docs/ai/CONTEXTO_ATUAL.md');
    const original = await fs.readFile(contextPath, 'utf8');
    const start = '<!-- MEMORIA_VIVA:SNAPSHOT:START -->';
    await fs.writeFile(contextPath, `${start}\n${original}`, 'utf8');
    let dna = await new ProjectAnalyzer(root).analyze();
    let health = await MemoryState.inspect(root, dna);
    assert.equal(health.healthy, false);
    assert.match(health.issues.join('\n'), /exatamente um marcador START/);

    const end = '<!-- MEMORIA_VIVA:SNAPSHOT:END -->';
    await fs.writeFile(contextPath, original.replace(
        new RegExp(`${start}[\\s\\S]*?${end}`),
        `${end}\nconteúdo\n${start}`
    ), 'utf8');
    dna = await new ProjectAnalyzer(root).analyze();
    health = await MemoryState.inspect(root, dna);
    assert.equal(health.healthy, false);
    assert.match(health.issues.join('\n'), /fora de ordem/);
});

test('estado adulterado ou JSON corrompido falha antes de qualquer atualização', async t => {
    const root = await project(t, 'state', {
        'package.json': { name: 'state', dependencies: { express: '^5' } },
        'src/routes.js': "router.get('/old', handler)"
    });
    await sync(root);
    const contextPath = path.join(root, 'docs/ai/CONTEXTO_ATUAL.md');
    const statePath = path.join(root, '.agent/memory.json');
    const before = await fs.readFile(contextPath, 'utf8');
    const state = await fs.readJson(statePath);
    state.readFirst = ['arquivo-inventado.md'];
    await fs.writeJson(statePath, state, { spaces: 2 });
    await fs.writeFile(path.join(root, 'src/routes.js'), "router.post('/new', handler)", 'utf8');

    await assert.rejects(() => sync(root), /Estado de memória inválido/);
    assert.equal(await fs.readFile(contextPath, 'utf8'), before);

    await fs.writeFile(statePath, '{ inválido', 'utf8');
    await assert.rejects(() => sync(root), /Não foi possível ler .agent\/memory.json/);
    assert.equal(await fs.readFile(contextPath, 'utf8'), before);
});

test('mudança de código entre geração e commit é reanalisada antes do sucesso', async t => {
    const root = await project(t, 'mid-sync-change', {
        'package.json': { name: 'mid-sync', dependencies: { express: '^5' } },
        'src/routes.js': "router.get('/old', handler)"
    });
    const dna = await new ProjectAnalyzer(root).analyze();
    const generator = new ContextGenerator(dna);
    await generator.generate();
    await fs.writeFile(path.join(root, 'src/routes.js'), "router.post('/new', handler)", 'utf8');
    await generator.syncContext();

    const context = await fs.readFile(path.join(root, 'docs/ai/CONTEXTO_ATUAL.md'), 'utf8');
    assert.match(context, /\| POST \| \/new \|/);
    assert.doesNotMatch(context, /\| GET \| \/old \|/);
    const currentDNA = await new ProjectAnalyzer(root).analyze();
    assert.equal((await MemoryState.inspect(root, currentDNA)).healthy, true);
});

test('check exige referências de agente e inventário de rotas', async t => {
    const root = await project(t, 'required', { 'package.json': { name: 'required' } });
    await sync(root);
    await fs.remove(path.join(root, '.agent/PROMPT_ENGINE.md'));
    await fs.remove(path.join(root, 'docs/ai/ROTAS_DETECTADAS.md'));
    const dna = await new ProjectAnalyzer(root).analyze();
    const health = await MemoryState.inspect(root, dna);
    assert.equal(health.healthy, false);
    assert.match(health.issues.join('\n'), /PROMPT_ENGINE\.md/);
    assert.match(health.issues.join('\n'), /ROTAS_DETECTADAS\.md/);
});

test('lock por projeto impede duas sincronizações concorrentes', async t => {
    const root = await project(t, 'lock', { 'package.json': { name: 'lock' } });
    const dna = await new ProjectAnalyzer(root).analyze();
    const first = new ContextGenerator(dna);
    const second = new ContextGenerator(dna);
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    const holding = first._withProjectLock(() => gate);

    while (!await fs.pathExists(path.join(root, '.agent/.sync.lock'))) {
        await new Promise(resolve => setImmediate(resolve));
    }
    await assert.rejects(() => second.synchronize(), /Outra sincronização/);
    release();
    await holding;
    assert.equal(await fs.pathExists(path.join(root, '.agent/.sync.lock')), false);
});

test('migra templates antigos inventados para documentos factuais com backup', async t => {
    const root = await project(t, 'legacy', {
        'package.json': { name: 'legacy' },
        'docs/ai/CONTEXTO_ATUAL.md': '# 🧠 CÉREBRO TÉCNICO\n\nauth_sessions Admin / Master 24 horas\n',
        'docs/ai/MODULOS_E_REGRAS.md': '# módulos\n\nauth_sessions store_id Soft Delete\n',
        'docs/ai/DESIGN_SYSTEM.md': '# design\n\n#2563EB #475569 Inter\n',
        'docs/ai/HANDOFF_ATUAL.md': '# diário\n\nlist_tables git push origin main docs/ai/CONTEXTO_ATUAL.md\n\n## Registro de Sessões\n\n### registro preservado\n\nevidência antiga\n\n## Checklist Pré-Deploy\n',
        '.agent/rules.md': '# rules\n\nauth_sessions Admin Master docs/ai/BRIEFING.md\n'
    });
    await sync(root);

    for (const relativePath of [
        'docs/ai/CONTEXTO_ATUAL.md',
        'docs/ai/MODULOS_E_REGRAS.md',
        'docs/ai/DESIGN_SYSTEM.md',
        'docs/ai/HANDOFF_ATUAL.md',
        '.agent/rules.md'
    ]) {
        const content = await fs.readFile(path.join(root, relativePath), 'utf8');
        assert.doesNotMatch(content, /auth_sessions|store_id|#2563EB|Admin Master/);
    }
    const backups = await fs.readdir(path.join(root, '.agent/backups/legacy-docs'));
    assert.equal(backups.length, 5);
    assert.match(await fs.readFile(path.join(root, 'docs/ai/HANDOFF_ATUAL.md'), 'utf8'), /registro preservado/);
    const dna = await new ProjectAnalyzer(root).analyze();
    assert.equal((await MemoryState.inspect(root, dna)).healthy, true);
});
