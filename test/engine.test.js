'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('fs-extra');
const os = require('node:os');

const ProjectAnalyzer = require('../engine/analyzer');
const ContextGenerator = require('../engine/generator');

function tmpProject(name) {
    return path.join(os.tmpdir(), 'mv-test-' + name + '-' + Date.now());
}

async function scaffold(root, pkg, files = {}) {
    await fs.ensureDir(root);
    await fs.writeJson(path.join(root, 'package.json'), pkg);
    for (const [rel, content] of Object.entries(files)) {
        const fp = path.join(root, rel);
        await fs.ensureDir(path.dirname(fp));
        await fs.writeFile(fp, content, 'utf8');
    }
}

test('detecta PHP Slim 4 + rotas', async () => {
    const root = tmpProject('php');
    await scaffold(root, { name: 'p', require: { 'slim/slim': '^4' } }, {
        'composer.json': JSON.stringify({ require: { 'slim/slim': '^4' } }),
        'routes/web/admin.php': "<?php\n$app->get('/admin/login', [AdminController::class, 'login']);",
        'routes/api/v1/stores.php': "<?php\nRoute::get('/stores', [StoreController::class, 'index']);"
    });
    const dna = await new ProjectAnalyzer(root).analyze();
    assert.match(dna.framework, /Slim/);
    assert.ok(dna.routes.length >= 2);
    assert.strictEqual(dna.routes[0].module, 'Admin');
});

test('detecta Node AdonisJS por padrao e rotas', async () => {
    const root = tmpProject('adonis');
    await scaffold(root, { name: 'a', dependencies: { '@adonisjs/core': '^6', 'mysql2': '^3' }, devDependencies: { typescript: '^5' } }, {
        'start/routes.ts': "Route.get('/client/home', 'ClientController.index');\nrouter.post('/client/cart', 'ClientController.add');"
    });
    const dna = await new ProjectAnalyzer(root).analyze();
    assert.match(dna.framework, /AdonisJS/);
    assert.strictEqual(dna.routes.length, 2);
    assert.strictEqual(dna.routes[0].module, 'Cliente');
});

test('generator injeta regras AdonisJS e preenche rotas no contexto', async () => {
    const root = tmpProject('gen');
    await scaffold(root, { name: 'a', dependencies: { '@adonisjs/core': '^6', 'mysql2': '^3' }, devDependencies: { typescript: '^5' } }, {
        'start/routes.ts': "Route.get('/client/home', 'ClientController.index');"
    });
    const dna = await new ProjectAnalyzer(root).analyze();
    const gen = new ContextGenerator(dna, { dryRun: false, silent: true });
    await gen.generate();
    await gen.syncContext();

    const rules = await fs.readFile(path.join(root, '.agent', 'rules.md'), 'utf8');
    assert.match(rules, /Node\.js — AdonisJS/);
    assert.match(rules, /IoC Container nativo do AdonisJS/);

    const ctx = await fs.readFile(path.join(root, 'docs', 'ai', 'CONTEXTO_ATUAL.md'), 'utf8');
    assert.match(ctx, /Cliente \| \/client/);

    const rotas = await fs.readFile(path.join(root, 'docs', 'ai', 'ROTAS_DETECTADAS.md'), 'utf8');
    assert.match(rotas, /GET \| \/client\/home/);

    const skills = await fs.readdir(path.join(root, '.agent', 'skills'));
    assert.ok(skills.includes('software-architect.md'));

    const deploy = await fs.readFile(path.join(root, '.github', 'workflows', 'deploy.yml'), 'utf8');
    assert.match(deploy, /node ace migration/);
});

test('detecta tabelas em migrations e preenche contexto/handoff/modulos', async () => {
    const root = tmpProject('tables');
    await scaffold(root, { name: 'a', dependencies: { '@adonisjs/core': '^6', 'mysql2': '^3' }, devDependencies: { typescript: '^5' } }, {
        'start/routes.ts': "Route.get('/admin/login', 'AdminController.login');\nRoute.get('/client/home', 'ClientController.index');",
        'database/migrations/123_create_users.ts': "export default class { async up() { this.schema.create('users', (t) => {}); this.schema.createIfNotExists('stores', (t) => {}); } }",
        'database/migrations/124_create_orders.ts': "export default class { async up() { this.schema.create('orders', (t) => {}); } }"
    });
    const dna = await new ProjectAnalyzer(root).analyze();
    assert.deepStrictEqual(dna.tables.sort(), ['orders', 'stores', 'users']);

    const gen = new ContextGenerator(dna, { dryRun: false, silent: true });
    await gen.generate();
    await gen.syncContext();

    const ctx = await fs.readFile(path.join(root, 'docs', 'ai', 'CONTEXTO_ATUAL.md'), 'utf8');
    assert.match(ctx, /\| users \| — \| — \|/);
    assert.match(ctx, /\| stores \| — \| — \|/);
    assert.doesNotMatch(ctx, /use list_tables via MCP para preencher/);

    const mod = await fs.readFile(path.join(root, 'docs', 'ai', 'MODULOS_E_REGRAS.md'), 'utf8');
    assert.match(mod, /### Módulo: Admin/);
    assert.match(mod, /### Módulo: Cliente/);

    const handoff = await fs.readFile(path.join(root, 'docs', 'ai', 'HANDOFF_ATUAL.md'), 'utf8');
    assert.match(handoff, /tsc --noEmit/);
    assert.match(handoff, /npm test/);
    assert.doesNotMatch(handoff, /php -l/);
});

test('rules.md enxuto: placeholders preenchidos e arquivos de briefing/skills copiados', async () => {
    const root = tmpProject('rules2');
    await scaffold(root, { name: 'a', dependencies: { '@adonisjs/core': '^6', 'mysql2': '^3' }, devDependencies: { typescript: '^5' } });
    const dna = await new ProjectAnalyzer(root).analyze();
    const gen = new ContextGenerator(dna, { dryRun: false, silent: true });
    await gen.generate();
    await gen.syncContext();

    const rules = await fs.readFile(path.join(root, '.agent', 'rules.md'), 'utf8');
    assert.doesNotMatch(rules, /\{\{LANG\}\}/);          // placeholder preenchido
    assert.match(rules, /Node\.js \(TypeScript\) | Node\.js — AdonisJS/);
    assert.match(rules, /Briefing \(5 itens\)/);          // Diretriz 1 referenciada
    assert.match(rules, /software-architect/);            // gatilho de skill (1 linha)

    assert.ok(await fs.pathExists(path.join(root, '.agent', 'BRIEFING.md')));
    assert.ok(await fs.pathExists(path.join(root, '.agent', 'SKILLS.md')));
    const skillsIdx = await fs.readFile(path.join(root, '.agent', 'SKILLS.md'), 'utf8');
    assert.match(skillsIdx, /carga sob demanda/);
});
