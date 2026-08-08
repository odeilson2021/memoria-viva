'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('fs-extra');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const cliPath = path.resolve(__dirname, '..', 'bin', 'memoria-viva.js');
const { getProjectRoot } = require('../bin/memoria-viva');

async function tmpProject(t, name) {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), `mv-cli-${name}-`));
    t.after(() => fs.remove(root));
    await fs.writeJson(path.join(root, 'package.json'), { name, dependencies: { express: '^5' } });
    await fs.outputFile(path.join(root, 'src/routes.js'), 'module.exports = true;', 'utf8');
    return root;
}

function run(args, cwd) {
    return spawnSync(process.execPath, [cliPath, ...args], { cwd, encoding: 'utf8' });
}

test('--version retorna versão sem exibir ajuda', () => {
    const result = run(['--version'], path.dirname(cliPath));
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /^memoria-viva v\d+\.\d+\.\d+\s*$/);
    assert.doesNotMatch(result.stdout, /Opções:/);
});

test('init dry-run não grava nem declara inicialização real', async t => {
    const root = await tmpProject(t, 'dry');
    const result = run(['init', '--dry-run', '--root', root], root);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(await fs.pathExists(path.join(root, '.agent')), false);
    assert.match(result.stdout, /Simulação concluída/);
    assert.doesNotMatch(result.stdout, /Memória inicializada e verificada/);
    const predicted = result.stdout.match(/Fingerprint previsto: ([a-f0-9]{12})/)[1];
    const realInit = run(['init', '--silent', '--root', root], root);
    assert.equal(realInit.status, 0, realInit.stderr);
    const state = await fs.readJson(path.join(root, '.agent/memory.json'));
    assert.equal(state.fingerprint.slice(0, 12), predicted);
});

test('check retorna não zero para memória ausente e divergente', async t => {
    const root = await tmpProject(t, 'check');
    let result = run(['check', '--root', root], root);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Arquivo obrigatório ausente/);

    result = run(['init', '--silent', '--root', root], root);
    assert.equal(result.status, 0, result.stderr);
    result = run(['check', '--silent', '--root', root], root);
    assert.equal(result.status, 0, result.stderr);

    await fs.writeFile(path.join(root, 'src/routes.js'), 'module.exports = false;', 'utf8');
    result = run(['check', '--silent', '--root', root], root);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Memória desatualizada/);
});

test('context --json recupera o snapshot íntegro', async t => {
    const root = await tmpProject(t, 'context');
    assert.equal(run(['init', '--silent', '--root', root], root).status, 0);
    const result = run(['context', '--json', '--root', root], root);
    assert.equal(result.status, 0, result.stderr);
    const state = JSON.parse(result.stdout);
    assert.equal(state.snapshot.projectName, path.basename(root));
    assert.ok(state.fingerprint);
});

test('descoberta de raiz para na primeira fronteira .git', async t => {
    const outerRoot = await tmpProject(t, 'outer');
    const repositoryRoot = path.join(outerRoot, 'nested-repository');
    const child = path.join(repositoryRoot, 'src', 'deep');
    await fs.ensureDir(path.join(repositoryRoot, '.git'));
    await fs.ensureDir(child);

    assert.equal(await getProjectRoot(null, child), repositoryRoot);
});

test('skins lista e imprime a skin solicitada', async t => {
    const root = await tmpProject(t, 'skins-cli');
    assert.equal(run(['init', '--silent', '--root', root], root).status, 0);

    const list = run(['skins'], path.dirname(cliPath));
    assert.equal(list.status, 0, list.stderr);
    assert.match(list.stdout, /\bfront\b/);
    assert.match(list.stdout, /\bback\b/);
    assert.match(list.stdout, /\bdatabase\b/);

    const printed = run(['skins', 'back'], path.dirname(cliPath));
    assert.equal(printed.status, 0, printed.stderr);
    assert.match(printed.stdout, /SKIN: back-end/);
    assert.doesNotMatch(printed.stdout, /MEMORIA_VIVA:MANAGED_REFERENCE/);

    const missing = run(['skins', 'inexistente'], path.dirname(cliPath));
    assert.equal(missing.status, 1);
    assert.match(missing.stderr, /Skin inexistente/);
});

test('skins <nome> --inject inclui o resumo do snapshot do projeto', async t => {
    const root = await tmpProject(t, 'skins-inject');
    assert.equal(run(['init', '--silent', '--root', root], root).status, 0);

    const injected = run(['skins', 'back', '--inject', '--root', root], root);
    assert.equal(injected.status, 0, injected.stderr);
    assert.match(injected.stdout, /SKIN: back-end/);
    assert.match(injected.stdout, /Contexto do projeto \(snapshot Memória Viva\)/);
    assert.match(injected.stdout, /Cole este bloco no início do chat do agente/);
    assert.match(injected.stdout, /docs\/ai\/CONTEXTO_ATUAL\.md/);

    const badFlag = run(['context', '--inject'], path.dirname(cliPath));
    assert.equal(badFlag.status, 1);
    assert.match(badFlag.stderr, /--inject só é válido com skins/);
});
