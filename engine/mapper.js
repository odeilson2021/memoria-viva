'use strict';

const fs = require('fs-extra');
const path = require('path');
const { relatedDocsSection, resolveNotePath } = require('./links');

const IGNORED_DIRECTORIES = new Set([
    '.git', '.agent', '.next', '.nuxt', '.output', '.pytest_cache', '.turbo',
    '.venv', 'build', 'cache', 'coverage', 'dist', 'logs', 'node_modules',
    'storage', 'target', 'tmp', 'vendor', 'docs/ai'
]);

const DOCUMENTATION_MAP = [
    ['Stack e fatos automáticos', 'CONTEXTO_ATUAL'],
    ['Regras de negócio e módulos', 'MODULOS_E_REGRAS'],
    ['Sistema de roteamento', 'ROTAS_DETECTADAS'],
    ['Relações entre módulos, rotas e tabelas', 'GRAFO'],
    ['UI e design system', 'DESIGN_SYSTEM'],
    ['Registro de sessão e validações', 'HANDOFF_ATUAL'],
    ['Mapeamento completo de pastas/arquivos', 'MAPA_DO_PROJETO'],
    ['Índice central da memória', 'INDICE']
];

/**
 * Mapeia o projeto completo: estrutura de diretórios, sistema de roteamento,
 * inventário de arquivos e os caminhos canônicos de documentação. O objetivo
 * é dar ao agente o caminho atualizado de cada área para que ele não crie
 * arquivos duplicados em diretórios errados nem esqueça as orientações.
 */
class ProjectMapper {
    constructor(dna, options = {}) {
        this.dna = dna;
        this.root = path.resolve(dna.root);
        this.options = { maxDepth: 4, ...options };
        this.data = null;
    }

    async build() {
        this.data = {
            tree: await this._directoryTree(),
            routes: this._routeMap(),
            byExtension: (this.dna.inventory || {}).byExtension || {},
            sourceFiles: (this.dna.inventory || {}).sourceFiles || 0
        };
        return this;
    }

    async _directoryTree() {
        const lines = [];
        const walk = async (directory, prefix, depth) => {
            if (depth > this.options.maxDepth) return;
            let entries;
            try {
                entries = await fs.readdir(directory, { withFileTypes: true });
            } catch {
                return;
            }
            const directories = entries
                .filter(entry => entry.isDirectory())
                .filter(entry => !IGNORED_DIRECTORIES.has(entry.name))
                .filter(entry => !IGNORED_DIRECTORIES.has(
                    path.relative(this.root, path.join(directory, entry.name)).replace(/\\/g, '/')
                ))
                .sort((a, b) => a.name.localeCompare(b.name));
            for (let index = 0; index < directories.length; index++) {
                const last = index === directories.length - 1;
                lines.push(`${prefix}${last ? '└── ' : '├── '}${directories[index].name}/`);
                await walk(
                    path.join(directory, directories[index].name),
                    prefix + (last ? '    ' : '│   '),
                    depth + 1
                );
            }
        };
        await walk(this.root, '', 0);
        return lines.join('\n');
    }

    _routeMap() {
        const routes = this.dna.routes || [];
        const groups = {};
        for (const route of routes) {
            const moduleName = route.module || 'Geral';
            (groups[moduleName] = groups[moduleName] || []).push(route);
        }
        return groups;
    }

    _routeSection() {
        const groups = this.data.routes;
        if (!Object.keys(groups).length) {
            return '_Nenhuma rota detectada estaticamente._';
        }
        return Object.keys(groups).sort().map(moduleName => {
            const rows = groups[moduleName]
                .map(route => `| ${this._md(route.method)} | ${this._md(route.path)} | ${this._md(route.file)} |`)
                .join('\n');
            return `### ${this._md(moduleName)}\n\n| Método | Caminho | Arquivo |\n|--------|---------|---------|\n${rows}`;
        }).join('\n\n');
    }

    _documentationSection() {
        const rows = DOCUMENTATION_MAP.map(([area, note]) =>
            `| ${this._md(area)} | [[${note}]] | ${this._md(resolveNotePath(note))} |`
        ).join('\n');
        return `| Área | Nota (Obsidian) | Caminho canônico |\n|------|----------------|--------------------|\n${rows}`;
    }

    _extensionSection() {
        const byExtension = this.data.byExtension;
        const entries = Object.entries(byExtension).sort((a, b) => b[1] - a[1]);
        if (!entries.length) return '_Nenhum arquivo-fonte inventariado._';
        const rows = entries.map(([ext, count]) => `| ${this._md(ext)} | ${count} |`).join('\n');
        return `| Extensão | Arquivos |\n|-----------|----------|\n${rows}`;
    }

    _md(value) {
        return String(value ?? '—').replace(/\|/g, '\\|').replace(/[\r\n]+/g, ' ');
    }

    toMarkdown() {
        const tree = this.data.tree || '(sem diretórios mapeados)';
        return `# Mapa do projeto (padrão Obsidian)

> Gerado por \`memoria-viva sync\`. Mapeamento completo de pastas, sistema de roteamento e
> caminhos de documentação. Use os caminhos canônicos para não criar arquivos duplicados nem
> esquecer as orientações de cada área.

## Estrutura de diretórios

\`\`\`text
${tree}
\`\`\`

## Sistema de roteamento

${this._routeSection()}

## Arquivos por extensão

> ${this.data.sourceFiles} arquivo(s)-fonte inventariado(s).

${this._extensionSection()}

## Caminhos de documentação (referências)

${this._documentationSection()}

## Orientações para agentes

- **Não crie arquivos duplicados:** use as pastas mapeadas acima; não invente novos diretórios sem necessidade comprovada.
- **Antes de criar uma rota**, confira [[ROTAS_DETECTADAS]] e o módulo correspondente em [[MODULOS_E_REGRAS]].
- **Respeite as regras** em [[CONTEXTO_ATUAL]] e o handoff em [[HANDOFF_ATUAL]]; não apague histórico.
- **Consulte [[GRAFO]]** para ver relações entre módulos, rotas e tabelas antes de alterar código.
- **Mantenha os vínculos** entre notas: eles preservam o contexto entre sessões de chat.

${relatedDocsSection('MAPA_DO_PROJETO')}
`;
    }
}

module.exports = ProjectMapper;
