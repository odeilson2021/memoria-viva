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
