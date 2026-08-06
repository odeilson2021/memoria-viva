'use strict';

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

/**
 * Motor Injetor de Contexto e Governança no Projeto Alvo
 * Adapta os guardrails, cérebro técnico e templates com base no DNA do projeto.
 */
class ContextGenerator {
    constructor(projectDNA, options = {}) {
        this.dna = projectDNA;
        this.options = options; // { dryRun: boolean, silent: boolean }
        this.globalRoot = path.resolve(__dirname, '..');
        this.templatesDir = path.join(this.globalRoot, 'templates');
    }

    async generate() {
        const root = this.dna.root;
        const createdFiles = [];
        const updatedFiles = [];
        const skippedFiles = [];

        // 1. Assegurar diretórios no projeto alvo
        const targetDirs = [
            path.join(root, '.agent'),
            path.join(root, 'docs', 'ai'),
            path.join(root, '.github', 'workflows')
        ];

        for (const dir of targetDirs) {
            if (!this.options.dryRun) {
                await fs.ensureDir(dir);
            }
        }

        // 2. Processar .agent/rules.md (Guardrails Invioláveis Adaptados)
        const rulesResult = await this._generateRulesFile();
        this._trackResult(rulesResult, createdFiles, updatedFiles, skippedFiles);

        // 3. Processar docs/ai/CONTEXTO_ATUAL.md (Cérebro Técnico Vivo)
        const contextResult = await this._generateContextFile();
        this._trackResult(contextResult, createdFiles, updatedFiles, skippedFiles);

        // 4. Processar docs/ai/MODULOS_E_REGRAS.md (Módulos de Negócio)
        const modulesResult = await this._generateModulesFile();
        this._trackResult(modulesResult, createdFiles, updatedFiles, skippedFiles);

        // 5. Processar docs/ai/HANDOFF_ATUAL.md (Handoff e Audit Log)
        const handoffResult = await this._generateHandoffFile();
        this._trackResult(handoffResult, createdFiles, updatedFiles, skippedFiles);

        // 6. Processar docs/ai/DESIGN_SYSTEM.md (DNA Visual)
        const designResult = await this._generateDesignSystemFile();
        this._trackResult(designResult, createdFiles, updatedFiles, skippedFiles);

        // 6.1 Copiar skills de IA para o projeto alvo (.agent/skills/)
        const skillsResult = await this._copySkills();
        this._trackResult(skillsResult, createdFiles, updatedFiles, skippedFiles);

        // 7. Processar .github/workflows/deploy.yml (Workflow CI/CD)
        const deployResult = await this._copyTemplateIfMissing(this._deployTemplate(), '.github/workflows/deploy.yml');
        this._trackResult(deployResult, createdFiles, updatedFiles, skippedFiles);

        return { createdFiles, updatedFiles, skippedFiles };
    }

    _trackResult(result, created, updated, skipped) {
        if (result.status === 'created') created.push(result.file);
        else if (result.status === 'updated') updated.push(result.file);
        else if (result.status === 'skipped') skipped.push(result.file);
    }

    async _generateRulesFile() {
        const dstPath = path.join(this.dna.root, '.agent', 'rules.md');
        const exists = await fs.pathExists(dstPath);

        let content = await fs.readFile(path.join(this.templatesDir, 'rules.md'), 'utf8');

        // Personalização de acordo com o DNA do Projeto
        let stackRules = '';
        if (this.dna.language.includes('PHP')) {
            stackRules = `
- **PHP Standard:** PHP 8.2+ Strict Types (\`declare(strict_types=1);\`).
- **Arquitetura Backend:** ${this.dna.framework.includes('Slim') ? 'Single Action Controllers (Invokable Classes) com PSR-11 PHP-DI.' : 'Controllers desacoplados e Service Layer.'}
- **Strict Repositories:** Toda interação com banco de dados DEVE passar por Repositórios tipados (${this.dna.structure.hasRepositories ? 'Infrastructure/Persistence ou Repositories/' : 'Repositories/'}). Proibido PDO cru ou SQL solto.`;
        } else if (this.dna.language.includes('Node')) {
            stackRules = `
- **Node.js Standard:** TypeScript estrito (\`strict: true\`); Async/Await obrigatório em toda operação de I/O.
- **Arquitetura (espelha o fluxo PHP):** Controllers com responsabilidade única em \`app/Controllers/\` (Single Action ou resource) + Repository Pattern via Lucid/\`app/Repositories/\`.
- **Injeção de Dependência:** Usar o IoC Container nativo do AdonisJS (bindings em \`providers/\`); proibido instanciar dependências manualmente ou usar singletons globais.
- **Frontend Unificado:** Views server-rendered com Edge (\`resources/views/\`) ou Inertia; backend e frontend no mesmo app, como no Laravel.
- **ORM / Repositórios:** Lucid ORM (\`@adonisjs/lucid\`); proibido SQL cru concatenado. Toda query passa por Model/Repository tipado.
- **Sessões Resilientes:** Driver de sessão persistente (MySQL \`auth_sessions\`) via \`@adonisjs/session\`; logins sobrevivem a restart/deploy.
- **Tratamento de Erro:** Nenhuma rota estoura 500 sem tratamento; usar o Exception Handler do AdonisJS.`;
        } else {
            stackRules = `
- **Language Standard:** ${this.dna.language}. Manter tipagem estrita e padrões limpos.
- **Abstração de Banco:** Utilizar Repositórios ou ORM (\`${this.dna.orm}\`). Proibido SQL concatenado.`;
        }

        const projectHeader = `<!-- DNA DO PROJETO DETECTADO: ${this.dna.language} | Framework: ${this.dna.framework} | Banco: ${this.dna.database} | ORM: ${this.dna.orm} | UI: ${this.dna.uiFramework} -->\n\n`;
        content = projectHeader + content;

        if (stackRules) {
            content += `\n---\n\n## 🧩 ARQUITETURA DA STACK DETECTADA (${this.dna.framework})\n${stackRules}\n`;
        }

        if (exists) {
            return { status: 'skipped', file: '.agent/rules.md' };
        }

        if (!this.options.dryRun) {
            await fs.writeFile(dstPath, content, 'utf8');
        }
        return { status: 'created', file: '.agent/rules.md' };
    }

    async _generateContextFile() {
        const dstPath = path.join(this.dna.root, 'docs', 'ai', 'CONTEXTO_ATUAL.md');
        const exists = await fs.pathExists(dstPath);

        if (exists) {
            return { status: 'skipped', file: 'docs/ai/CONTEXTO_ATUAL.md' };
        }

        let content = await fs.readFile(path.join(this.templatesDir, 'CONTEXTO_ATUAL.md'), 'utf8');

        // Preencher a tabela de stack dinamicamente
        const tooling = this._getStackTooling();
        content = content
            .replace('PHP 8.2+ Strict Types', this.dna.language)
            .replace('*(preencher: Slim 4, Laravel 10+, etc.)*', this.dna.framework)
            .replace('MySQL / MariaDB (`utf8mb4_unicode_ci`)', this.dna.database)
            .replace('*(preencher: Doctrine, Eloquent, Phinx)*', this.dna.orm)
            .replace('*(preencher: PHP-DI, Laravel Container)*', tooling.di)
            .replace('Monolog', tooling.logs)
            .replace('PHPUnit', tooling.testes);

        if (!this.options.dryRun) {
            await fs.writeFile(dstPath, content, 'utf8');
        }
        return { status: 'created', file: 'docs/ai/CONTEXTO_ATUAL.md' };
    }

    async _generateModulesFile() {
        const dstPath = path.join(this.dna.root, 'docs', 'ai', 'MODULOS_E_REGRAS.md');
        const exists = await fs.pathExists(dstPath);

        if (exists) {
            return { status: 'skipped', file: 'docs/ai/MODULOS_E_REGRAS.md' };
        }

        let content = await fs.readFile(path.join(this.templatesDir, 'MODULOS_E_REGRAS.md'), 'utf8');

        if (!this.options.dryRun) {
            await fs.writeFile(dstPath, content, 'utf8');
        }
        return { status: 'created', file: 'docs/ai/MODULOS_E_REGRAS.md' };
    }

    async _generateHandoffFile() {
        const dstPath = path.join(this.dna.root, 'docs', 'ai', 'HANDOFF_ATUAL.md');
        const exists = await fs.pathExists(dstPath);

        if (exists) {
            return { status: 'skipped', file: 'docs/ai/HANDOFF_ATUAL.md' };
        }

        let content = await fs.readFile(path.join(this.templatesDir, 'HANDOFF_ATUAL.md'), 'utf8');

        const now = new Date().toISOString().split('T')[0];
        content = content.replace(/\*\(data\)\*/g, now);

        if (!this.options.dryRun) {
            await fs.writeFile(dstPath, content, 'utf8');
        }
        return { status: 'created', file: 'docs/ai/HANDOFF_ATUAL.md' };
    }

    async _generateDesignSystemFile() {
        const dstPath = path.join(this.dna.root, 'docs', 'ai', 'DESIGN_SYSTEM.md');
        const exists = await fs.pathExists(dstPath);

        if (exists) {
            return { status: 'skipped', file: 'docs/ai/DESIGN_SYSTEM.md' };
        }

        let content = '';
        const designTemplatePath = path.join(this.templatesDir, 'DESIGN_SYSTEM.md');
        if (await fs.pathExists(designTemplatePath)) {
            content = await fs.readFile(designTemplatePath, 'utf8');
        } else {
            content = await fs.readFile(path.join(this.globalRoot, 'intelligence', 'design-system', 'DNA_VISUAL_TEMPLATE.md'), 'utf8');
        }

        content = content.replace('*(ex: Bootstrap 5.3, Tailwind CSS 3.4, HTML Puro + CSS Vanilla)*', this.dna.uiFramework);

        if (!this.options.dryRun) {
            await fs.writeFile(dstPath, content, 'utf8');
        }
        return { status: 'created', file: 'docs/ai/DESIGN_SYSTEM.md' };
    }

    _deployTemplate() {
        if (this.dna.language.includes('Node')) return 'deploy-node.yml';
        return 'deploy.yml';
    }

    async _copySkills() {
        const srcDir = path.join(this.globalRoot, 'intelligence', 'skills');
        if (!await fs.pathExists(srcDir)) {
            return { status: 'skipped', file: '.agent/skills/' };
        }
        const dstDir = path.join(this.dna.root, '.agent', 'skills');
        if (!this.options.dryRun) {
            await fs.ensureDir(dstDir);
        }
        const files = await fs.readdir(srcDir);
        let copied = 0;
        for (const f of files) {
            if (!f.endsWith('.md')) continue;
            const dst = path.join(dstDir, f);
            if (await fs.pathExists(dst)) continue;
            if (!this.options.dryRun) {
                await fs.copy(path.join(srcDir, f), dst);
            }
            copied++;
        }
        return { status: copied ? 'created' : 'skipped', file: '.agent/skills/' };
    }

    async _copyTemplateIfMissing(templateName, relDstPath) {
        const dstPath = path.join(this.dna.root, relDstPath);
        const exists = await fs.pathExists(dstPath);

        if (exists) {
            return { status: 'skipped', file: relDstPath };
        }

        const srcPath = path.join(this.templatesDir, templateName);
        if (await fs.pathExists(srcPath)) {
            if (!this.options.dryRun) {
                await fs.copy(srcPath, dstPath);
            }
            return { status: 'created', file: relDstPath };
        }

        return { status: 'skipped', file: relDstPath };
    }

    async syncContext() {
        return this._syncContext();
    }

    async _syncContext() {
        const routes = this.dna.routes || [];
        const rotasPath = path.join(this.dna.root, 'docs', 'ai', 'ROTAS_DETECTADAS.md');
        if (!this.options.dryRun) {
            await fs.ensureDir(path.dirname(rotasPath));
            await fs.writeFile(rotasPath, this._buildRotasMarkdown(routes), 'utf8');
        }

        const ctxPath = path.join(this.dna.root, 'docs', 'ai', 'CONTEXTO_ATUAL.md');
        if (await fs.pathExists(ctxPath)) {
            let ctx = await fs.readFile(ctxPath, 'utf8');
            if (ctx.includes('*(preencher)*')) {
                const table = this._buildRotasTable(routes);
                if (table) {
                    const lines = ctx.split('\n');
                    const idx = lines.findIndex(l => l.includes('*(preencher)*'));
                    if (idx >= 0) {
                        lines.splice(idx, 1, ...table.trimEnd().split('\n'));
                        ctx = lines.join('\n');
                    }
                    if (!this.options.dryRun) {
                        await fs.writeFile(ctxPath, ctx, 'utf8');
                    }
                }
            }
        }
        return { status: 'updated', file: 'docs/ai/CONTEXTO_ATUAL.md' };
    }

    _buildRotasTable(routes) {
        if (!routes.length) return '';
        return routes.map(r => {
            const prefix = '/' + (r.path.split('/')[1] || '');
            return `| ${r.module} | ${prefix} | — | ${r.file} |\n`;
        }).join('');
    }

    _buildRotasMarkdown(routes) {
        const header = `# 🛣️ ROTAS DETECTADAS (auto-sync)

> Gerado por \`memoria-viva sync\`. Confira e complemente em CONTEXTO_ATUAL.md / MODULOS_E_REGRAS.md.

| Método | Caminho | Módulo | Arquivo |
|--------|--------|--------|---------|
`;
        if (!routes.length) {
            return header + '| — | — | — | nenhuma rota detectada automaticamente |\n';
        }
        const rows = routes.map(r => `| ${r.method} | ${r.path} | ${r.module} | ${r.file} |`).join('\n');
        return header + rows + '\n';
    }

    _getStackTooling() {
        const f = this.dna.framework || '';
        if (f.includes('AdonisJS')) return { di: 'AdonisJS IoC Container', logs: 'AdonisJS Logger (pino)', testes: 'Japa' };
        if (f.includes('Laravel')) return { di: 'Laravel Container', logs: 'Monolog', testes: 'PHPUnit' };
        if (f.includes('Slim')) return { di: 'PHP-DI (PSR-11)', logs: 'Monolog', testes: 'PHPUnit' };
        if (f.includes('Symfony')) return { di: 'Symfony DI', logs: 'Monolog', testes: 'PHPUnit' };
        if (f.includes('NestJS')) return { di: 'NestJS DI', logs: 'Winston / Pino', testes: 'Jest' };
        if (f.includes('PHP')) return { di: 'PHP-DI / Laravel Container', logs: 'Monolog', testes: 'PHPUnit' };
        if (f.includes('Node')) return { di: 'AdonisJS IoC Container', logs: 'AdonisJS Logger (pino)', testes: 'Japa' };
        return { di: 'Container nativo', logs: 'Logger padrão', testes: 'Testes da stack' };
    }
}

module.exports = ContextGenerator;
