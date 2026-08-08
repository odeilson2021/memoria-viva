#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function fail(message) {
    process.stderr.write(`Memória Viva MCP: ${message}\n`);
    process.exit(1);
}

function loadCredentials() {
    const envPath = path.resolve(__dirname, '..', '.env.mcp');
    if (!fs.existsSync(envPath)) fail(`arquivo ausente: ${envPath}`);
    const values = {};
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
        const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (!match) continue;
        let value = match[2].trim();
        if (value.startsWith('"') && value.endsWith('"')) {
            try {
                value = JSON.parse(value);
            } catch (error) {
                fail(`valor inválido em .env.mcp (${match[1]}): ${error.message}`);
            }
        }
        values[match[1]] = value;
    }
    return { ...values, ...Object.fromEntries(Object.entries(process.env).filter(([key]) => key.startsWith('MYSQL_'))) };
}

const credentials = loadCredentials();
for (const key of ['MYSQL_HOST', 'MYSQL_PORT', 'MYSQL_DATABASE', 'MYSQL_USER']) {
    if (!credentials[key]) fail(`credencial obrigatória ausente: ${key}`);
}
const port = Number(credentials.MYSQL_PORT);
if (!Number.isInteger(port) || port < 1 || port > 65535) fail('MYSQL_PORT deve estar entre 1 e 65535');

const executable = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const childEnv = {
    ...process.env,
    DB_HOST: credentials.MYSQL_HOST,
    DB_PORT: credentials.MYSQL_PORT,
    DB_USER: credentials.MYSQL_USER,
    DB_PASSWORD: credentials.MYSQL_PASSWORD || '',
    DB_NAME: credentials.MYSQL_DATABASE,
    DB_CHARSET: credentials.MYSQL_CHARSET || 'utf8mb4',
    MCP_PERMISSIONS: 'list,read,utility'
};
const child = spawn(
    executable,
    ['-y', '@berthojoris/mcp-mysql-server@1.43.2'],
    { stdio: 'inherit', env: childEnv }
);

child.on('error', error => fail(error.message));
child.on('exit', (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    else process.exit(code ?? 1);
});
