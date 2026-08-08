'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const INSTALLER = path.join(ROOT, 'scripts', 'install-windows.ps1');

test('Windows installer remains ASCII-only', () => {
    const bytes = fs.readFileSync(INSTALLER);
    const nonAsciiOffset = bytes.findIndex(byte => byte > 0x7f);
    assert.equal(nonAsciiOffset, -1, `non-ASCII byte found at offset ${nonAsciiOffset}`);
});

test('Windows PowerShell parses and runs silent dry-run without writes', {
    skip: process.platform !== 'win32'
}, () => {
    const result = spawnSync('powershell.exe', [
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-File', INSTALLER,
        '-DryRun',
        '-Silent'
    ], {
        cwd: ROOT,
        encoding: 'utf8'
    });

    assert.equal(result.error, undefined);
    assert.equal(result.status, 0, `stderr: ${result.stderr}\nstdout: ${result.stdout}`);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, '');
});

test('Windows installer reports dry-run honestly', {
    skip: process.platform !== 'win32'
}, () => {
    const result = spawnSync('powershell.exe', [
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-File', INSTALLER,
        '-DryRun'
    ], {
        cwd: ROOT,
        encoding: 'utf8'
    });

    assert.equal(result.error, undefined);
    assert.equal(result.status, 0, `stderr: ${result.stderr}\nstdout: ${result.stdout}`);
    assert.match(result.stdout, /DRY RUN COMPLETE - no changes were made\./);
    assert.doesNotMatch(result.stdout, /INSTALL COMPLETE/);
});
