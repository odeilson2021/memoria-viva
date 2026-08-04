#!/usr/bin/env node
/**
 * AI Governance Kit — MCP MySQL Runner
 * Lê credenciais do .env.mcp (ou .env como fallback) e inicia o servidor MCP MySQL.
 * Suporta senhas com caracteres especiais via encodeURIComponent.
 */
'use strict';

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Carregar variáveis de ambiente
function loadEnv(file) {
    if (!fs.existsSync(file)) return;
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq < 0) continue;
        const key = trimmed.slice(0, eq).trim();
        const val = trimmed.slice(eq + 1).trim();
        if (!process.env[key]) process.env[key] = val;
    }
}

// Tentar .env.mcp primeiro, depois .env como fallback
const cwd = process.cwd();
loadEnv(path.join(cwd, '.env.mcp'));
loadEnv(path.join(cwd, '.env'));

const host     = process.env.MYSQL_HOST     || process.env.DB_HOST     || '127.0.0.1';
const port     = process.env.MYSQL_PORT     || process.env.DB_PORT     || '3306';
const database = process.env.MYSQL_DATABASE || process.env.DB_NAME     || process.env.DB_DATABASE || '';
const user     = process.env.MYSQL_USER     || process.env.DB_USER     || process.env.DB_USERNAME || 'root';
const password = process.env.MYSQL_PASSWORD || process.env.DB_PASS     || process.env.DB_PASSWORD || '';
const charset  = process.env.MYSQL_CHARSET  || 'utf8mb4';

if (!database) {
    console.error('[MCP MySQL] Erro: MYSQL_DATABASE não definido em .env.mcp ou .env');
    process.exit(1);
}

// Montar URL com encode de caracteres especiais
const mysqlUrl = `mysql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}?charset=${charset}`;

console.error(`[MCP MySQL] Conectando em ${host}:${port}/${database} (user: ${user})`);

// Iniciar servidor MCP
const server = spawn('npx', ['-y', '@berthojoris/mcp-mysql-server', mysqlUrl], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env }
});

server.on('error', (err) => {
    console.error('[MCP MySQL] Erro ao iniciar servidor:', err.message);
    process.exit(1);
});

server.on('exit', (code) => {
    if (code !== 0) {
        console.error(`[MCP MySQL] Servidor encerrado com código ${code}`);
        process.exit(code ?? 1);
    }
});
