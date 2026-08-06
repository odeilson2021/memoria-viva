'use strict';

const fs = require('fs-extra');
const path = require('path');

/**
 * Motor de Análise de DNA do Projeto Alvo
 * Analisa a estrutura, dependências, linguagens, frameworks, ORMs e banco de dados.
 */
class ProjectAnalyzer {
    constructor(projectRoot) {
        this.root = projectRoot;
    }

    async analyze() {
        const dna = {
            root: this.root,
            projectName: path.basename(this.root),
            language: 'Unknown',
            framework: 'Custom / Pure',
            database: 'Unknown',
            orm: 'None',
            uiFramework: 'Vanilla HTML/CSS',
            cssUtilities: [],
            structure: {
                hasRoutes: false,
                hasControllers: false,
                hasModels: false,
                hasRepositories: false,
                hasMigrations: false,
                hasViews: false,
                hasPublic: false,
            },
            skillsRequired: [
                'software-architect',
                'database-dba',
                'ui-ux-designer',
                'code-reviewer',
                'security-expert'
            ],
            routes: [],
            detectedFiles: []
        };

        // 1. Detectar PHP
        const composerPath = path.join(this.root, 'composer.json');
        if (await fs.pathExists(composerPath)) {
            dna.detectedFiles.push('composer.json');
            await this._analyzeComposer(composerPath, dna);
        }

        // 2. Detectar Node.js
        const packagePath = path.join(this.root, 'package.json');
        if (await fs.pathExists(packagePath)) {
            dna.detectedFiles.push('package.json');
            await this._analyzePackageJson(packagePath, dna);
        }

        // 3. Detectar Python
        if (await fs.pathExists(path.join(this.root, 'requirements.txt')) || 
            await fs.pathExists(path.join(this.root, 'pyproject.toml'))) {
            if (dna.language === 'Unknown') dna.language = 'Python';
            await this._analyzePython(dna);
        }

        // 4. Detectar Go
        if (await fs.pathExists(path.join(this.root, 'go.mod'))) {
            if (dna.language === 'Unknown') dna.language = 'Go';
            dna.framework = 'Go Module';
        }

        // 5. Analisar estrutura de diretórios e arquivos de ambiente
        await this._analyzeDirectories(dna);
        await this._analyzeEnvFiles(dna);
        await this._analyzeUIAndCSS(dna);
        await this._analyzeRoutes(dna);

        return dna;
    }

    async _analyzeComposer(composerPath, dna) {
        try {
            const composer = await fs.readJson(composerPath);
            dna.language = 'PHP 8.2+';
            const reqs = { ...(composer.require || {}), ...(composer['require-dev'] || {}) };

            if (reqs['slim/slim']) {
                dna.framework = 'PHP — Slim 4';
            } else if (reqs['laravel/framework']) {
                dna.framework = 'PHP — Laravel';
            } else if (reqs['symfony/symfony'] || reqs['symfony/framework-bundle']) {
                dna.framework = 'PHP — Symfony';
            } else {
                dna.framework = 'PHP Custom';
            }

            // ORM / DB
            if (reqs['doctrine/orm']) dna.orm = 'Doctrine ORM';
            else if (reqs['illuminate/database']) dna.orm = 'Eloquent ORM';
            else if (reqs['robmorgan/phinx']) dna.orm = 'Phinx Migrations';

            if (reqs['ext-pdo_mysql'] || reqs['illuminate/database']) {
                dna.database = 'MySQL / MariaDB';
            } else if (reqs['ext-pdo_pgsql']) {
                dna.database = 'PostgreSQL';
            }
        } catch (e) {
            // Ignorar erros de parse no JSON
        }
    }

    async _analyzePackageJson(packagePath, dna) {
        try {
            const pkg = await fs.readJson(packagePath);
            const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };

            if (dna.language === 'Unknown') {
                dna.language = deps['typescript'] ? 'Node.js (TypeScript)' : 'Node.js (JavaScript)';
            }

            if (deps['@adonisjs/core']) {
                dna.framework = 'Node.js — AdonisJS';
            } else if (deps['@nestjs/core']) {
                dna.framework = 'Node.js — NestJS';
            } else if (deps['next']) {
                dna.framework = 'Next.js';
            } else if (deps['express']) {
                dna.framework = 'Node.js — Express';
            } else if (deps['fastify']) {
                dna.framework = 'Node.js — Fastify';
            } else if (deps['vite'] || deps['react']) {
                dna.framework = 'React / Vite';
            } else if (deps['vue']) {
                dna.framework = 'Vue.js';
            }

            // Node.js sem framework reconhecido => padrão AdonisJS (stack full-stack recomendada)
            if (dna.language.includes('Node') && dna.framework === 'Custom / Pure') {
                dna.framework = 'Node.js — AdonisJS';
            }

            // ORM
            if (deps['@adonisjs/lucid']) dna.orm = 'Lucid ORM';
            else if (deps['@prisma/client'] || deps['prisma']) dna.orm = 'Prisma ORM';
            else if (deps['typeorm']) dna.orm = 'TypeORM';
            else if (deps['sequelize']) dna.orm = 'Sequelize';
            else if (deps['mongoose']) dna.orm = 'Mongoose (MongoDB)';

            // DB
            if (deps['mysql2'] || deps['mysql']) dna.database = 'MySQL / MariaDB';
            else if (deps['pg']) dna.database = 'PostgreSQL';
            else if (deps['sqlite3'] || deps['better-sqlite3']) dna.database = 'SQLite';
            else if (deps['mongoose']) dna.database = 'MongoDB';

            // UI
            if (deps['tailwindcss']) dna.cssUtilities.push('Tailwind CSS');
            if (deps['bootstrap']) dna.cssUtilities.push('Bootstrap');
        } catch (e) {
            // Ignorar
        }
    }

    async _analyzePython(dna) {
        if (await fs.pathExists(path.join(this.root, 'manage.py'))) {
            dna.framework = 'Python — Django';
            dna.orm = 'Django ORM';
        } else {
            dna.framework = 'Python — FastAPI / Flask';
        }
    }

    async _analyzeDirectories(dna) {
        const check = async (rel) => await fs.pathExists(path.join(this.root, rel));

        dna.structure.hasRoutes = await check('routes') || await check('src/routes') || await check('start/routes.ts');
        dna.structure.hasControllers = await check('app/Actions') || await check('app/Http/Controllers') || await check('app/Controllers') || await check('src/controllers');
        dna.structure.hasModels = await check('app/Domain') || await check('app/Models') || await check('src/models');
        dna.structure.hasRepositories = await check('app/Infrastructure/Persistence') || await check('app/Repositories') || await check('src/repositories');
        dna.structure.hasMigrations = await check('database/migrations') || await check('db/migrations') || await check('prisma/migrations');
        dna.structure.hasViews = await check('resources/views') || await check('views') || await check('src/views') || await check('inertia');
        dna.structure.hasPublic = await check('public') || await check('static');
    }

    async _analyzeEnvFiles(dna) {
        const envPath = path.join(this.root, '.env');
        if (await fs.pathExists(envPath)) {
            try {
                const envContent = await fs.readFile(envPath, 'utf8');
                if (/DB_CONNECTION=pgsql|POSTGRES|DATABASE_URL=.*postgres/i.test(envContent)) {
                    dna.database = 'PostgreSQL';
                } else if (/DB_CONNECTION=mysql|MYSQL/i.test(envContent)) {
                    dna.database = 'MySQL / MariaDB';
                } else if (/DB_CONNECTION=sqlite|SQLITE/i.test(envContent)) {
                    dna.database = 'SQLite';
                }
            } catch (e) {
                // Ignorar
            }
        }
    }

    async _analyzeUIAndCSS(dna) {
        const check = async (file) => await fs.pathExists(path.join(this.root, file));

        if (await check('tailwind.config.js') || await check('tailwind.config.ts') || await check('tailwind.config.cjs')) {
            if (!dna.cssUtilities.includes('Tailwind CSS')) {
                dna.cssUtilities.push('Tailwind CSS');
            }
            dna.uiFramework = 'Tailwind CSS';
        }

        if (dna.cssUtilities.length > 0) {
            dna.uiFramework = dna.cssUtilities.join(', ');
        }
    }

    async _analyzeRoutes(dna) {
        const routes = [];
        const root = this.root;
        const push = (method, p, file) => {
            if (!method || !p) return;
            routes.push({ method: method.toUpperCase(), path: p.trim(), file, module: this._inferModule(`${file} ${p}`) });
        };

        // PHP — routes/web/*.php e routes/api/v1/*.php
        const phpDirs = [
            path.join(root, 'routes', 'web'),
            path.join(root, 'routes', 'api', 'v1')
        ];
        for (const dir of phpDirs) {
            if (!(await fs.pathExists(dir))) continue;
            const files = await fs.readdir(dir);
            for (const f of files) {
                if (!f.endsWith('.php')) continue;
                const content = await fs.readFile(path.join(dir, f), 'utf8');
                const re = /\b(?:Route::|\$app->|router->|group\([^)]*\)->)?(get|post|put|patch|delete|options)\(\s*['"]([^'"]+)['"]/gi;
                let m;
                while ((m = re.exec(content))) {
                    push(m[1], m[2], `routes/${path.basename(dir)}/${f}`);
                }
            }
        }

        // AdonisJS — start/ e routes/
        const adonisFiles = [];
        const scanAdonis = async (dir) => {
            if (!(await fs.pathExists(dir))) return;
            const entries = await fs.readdir(dir, { withFileTypes: true });
            for (const e of entries) {
                const full = path.join(dir, e.name);
                if (e.isDirectory()) await scanAdonis(full);
                else if (e.name.endsWith('.ts') || e.name.endsWith('.js')) adonisFiles.push(full);
            }
        };
        await scanAdonis(path.join(root, 'start'));
        await scanAdonis(path.join(root, 'routes'));
        for (const file of adonisFiles) {
            const content = await fs.readFile(file, 'utf8');
            const re = /\b(?:Route|router)\.(get|post|put|patch|delete|options)\(\s*['"]([^'"]+)['"]/gi;
            let m;
            const rel = path.relative(root, file).replace(/\\/g, '/');
            while ((m = re.exec(content))) push(m[1], m[2], rel);
        }

        dna.routes = routes;
    }

    _inferModule(file) {
        const f = (file || '').toLowerCase();
        if (f.includes('admin')) return 'Admin';
        if (f.includes('store') || f.includes('merchant') || f.includes('lojista')) return 'Lojista';
        if (f.includes('driver') || f.includes('entregador')) return 'Entregador';
        if (f.includes('client') || f.includes('marketplace')) return 'Cliente';
        if (f.includes('auth') || f.includes('login')) return 'Auth';
        if (f.includes('api')) return 'API';
        return 'Geral';
    }
}

module.exports = ProjectAnalyzer;
