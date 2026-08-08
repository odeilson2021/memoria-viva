'use strict';

const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

const SOURCE_EXTENSIONS = new Set([
    '.bash', '.c', '.cc', '.cpp', '.cs', '.css', '.ex', '.exs', '.gql', '.go',
    '.gradle', '.graphql', '.h', '.hcl', '.hpp', '.html', '.java', '.js', '.jsx',
    '.json', '.kt', '.kts', '.lua', '.md', '.mjs', '.cjs', '.php', '.proto', '.ps1',
    '.py', '.rb', '.rs', '.scala', '.scss', '.sh', '.sql', '.svelte', '.swift', '.tf',
    '.toml', '.ts', '.tsx', '.vue', '.xml', '.yaml', '.yml', '.zsh'
]);

const INVENTORY_FILES = new Set([
    'composer.json', 'package.json', 'pyproject.toml', 'requirements.txt', 'go.mod',
    'Cargo.toml', 'Gemfile', 'pom.xml', 'build.gradle', 'build.gradle.kts',
    'tsconfig.json', 'vite.config.js', 'vite.config.ts', 'next.config.js',
    'next.config.mjs', 'adonisrc.ts', 'artisan', 'Dockerfile'
]);

const IGNORED_DIRECTORIES = new Set([
    '.git', '.agent', '.next', '.nuxt', '.output', '.pytest_cache', '.turbo',
    '.venv', 'build', 'cache', 'coverage', 'dist', 'logs', 'node_modules',
    'storage', 'target', 'tmp', 'vendor'
]);

const GENERATED_FILES = new Set([
    'AGENTS.md',
    'CLAUDE.md',
    '.github/copilot-instructions.md',
    '.cursor/rules/memoria-viva.mdc',
    'docs/mcp/mysql.md',
    'tools/memoria-viva-mcp.js',
    '.mcp.json',
    '.cursor/mcp.json',
    '.vscode/mcp.json',
    'opencode.json',
    'mcp_config.json'
]);

/**
 * Motor de Análise de DNA do Projeto Alvo
 * Analisa a estrutura, dependências, linguagens, frameworks, ORMs e banco de dados.
 */
class ProjectAnalyzer {
    constructor(projectRoot) {
        this.root = path.resolve(projectRoot);
    }

    async analyze() {
        const dna = {
            root: this.root,
            projectName: path.basename(this.root),
            languages: [],
            language: 'Unknown',
            framework: 'Unknown',
            database: 'Unknown',
            orm: 'Unknown',
            uiFramework: 'Unknown',
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
            tables: [],
            tableEvidence: 'migration_mentions',
            validationCommands: [],
            detectedFiles: [],
            warnings: [],
            inventory: {
                sourceFiles: 0,
                byExtension: {},
                topLevelEntries: [],
                sourceFingerprint: null
            }
        };

        // 1. Detectar PHP
        const composerPath = path.join(this.root, 'composer.json');
        if (await fs.pathExists(composerPath)) {
            dna.detectedFiles.push('composer.json');
            if (await this._analyzeComposer(composerPath, dna)) dna.languages.push('PHP');
        }

        // 2. Detectar Node.js
        const packagePath = path.join(this.root, 'package.json');
        if (await fs.pathExists(packagePath)) {
            dna.detectedFiles.push('package.json');
            if (await this._analyzePackageJson(packagePath, dna)) dna.languages.push('Node.js');
        }

        // 3. Detectar Python
        if (await fs.pathExists(path.join(this.root, 'requirements.txt')) || 
            await fs.pathExists(path.join(this.root, 'pyproject.toml'))) {
            const isPrimaryPythonProject = dna.language === 'Unknown';
            if (isPrimaryPythonProject) dna.language = 'Python';
            await this._analyzePython(dna, isPrimaryPythonProject);
            dna.languages.push('Python');
        }

        // 4. Detectar Go
        if (await fs.pathExists(path.join(this.root, 'go.mod'))) {
            if (dna.language === 'Unknown') dna.language = 'Go';
            if (dna.language === 'Go') dna.framework = 'Go — sem framework detectado';
            dna.detectedFiles.push('go.mod');
            dna.languages.push('Go');
        }

        // 5. Analisar estrutura de diretórios e arquivos de ambiente
        await this._analyzeDirectories(dna);
        await this._analyzeEnvFiles(dna);
        await this._analyzeUIAndCSS(dna);
        await this._analyzeRoutes(dna);
        await this._analyzeTables(dna);
        await this._analyzeInventory(dna);

        dna.languages = [...new Set(dna.languages)];
        dna.detectedFiles = [...new Set(dna.detectedFiles)].sort();
        dna.validationCommands = [...new Set(dna.validationCommands)];

        return dna;
    }

    _isObject(value) {
        return Boolean(value) && !Array.isArray(value) && typeof value === 'object';
    }

    _assertObject(value, label) {
        if (!this._isObject(value)) throw new Error(`${label} deve ser um objeto JSON`);
    }

    _assertStringMap(value, label) {
        if (value === undefined) return;
        this._assertObject(value, label);
        for (const [key, item] of Object.entries(value)) {
            if (typeof item !== 'string') throw new Error(`${label}.${key} deve ser uma string`);
        }
    }

    _assertComposerScripts(value) {
        if (value === undefined) return;
        this._assertObject(value, 'composer.json.scripts');
        for (const [key, item] of Object.entries(value)) {
            const valid = typeof item === 'string'
                || (Array.isArray(item) && item.every(command => typeof command === 'string'));
            if (!valid) {
                throw new Error(`composer.json.scripts.${key} deve ser uma string ou uma lista de strings`);
            }
        }
    }

    _stripHashComment(line) {
        let quote = null;
        let escaped = false;
        for (let index = 0; index < line.length; index++) {
            const character = line[index];
            if (quote) {
                if (quote === '"' && character === '\\' && !escaped) {
                    escaped = true;
                    continue;
                }
                if (character === quote && !escaped) quote = null;
                escaped = false;
                continue;
            }
            if (character === '"' || character === "'") quote = character;
            else if (character === '#') return line.slice(0, index);
        }
        return line;
    }

    _validateTomlConservatively(content) {
        const normalized = content.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
        let quote = null;
        let triple = false;
        let escaped = false;
        let comment = false;
        let squareDepth = 0;
        let braceDepth = 0;

        for (let index = 0; index < normalized.length; index++) {
            const character = normalized[index];
            const nextThree = normalized.slice(index, index + 3);

            if (comment) {
                if (character === '\n') comment = false;
                continue;
            }
            if (quote) {
                if (triple && nextThree === quote.repeat(3)) {
                    quote = null;
                    triple = false;
                    index += 2;
                    continue;
                }
                if (!triple && quote === '"' && character === '\\' && !escaped) {
                    escaped = true;
                    continue;
                }
                if (!triple && character === quote && !escaped) quote = null;
                if (!triple && character === '\n') throw new Error('string não terminada');
                escaped = false;
                continue;
            }
            if (character === '#') {
                comment = true;
                continue;
            }
            if (nextThree === '"""' || nextThree === "'''") {
                quote = character;
                triple = true;
                index += 2;
                continue;
            }
            if (character === '"' || character === "'") {
                quote = character;
                continue;
            }
            if (character === '[') squareDepth++;
            else if (character === ']') squareDepth--;
            else if (character === '{') braceDepth++;
            else if (character === '}') braceDepth--;
            if (squareDepth < 0 || braceDepth < 0) throw new Error('delimitadores fora de ordem');
        }

        if (quote) throw new Error('string não terminada');
        if (squareDepth !== 0 || braceDepth !== 0) throw new Error('delimitadores não balanceados');

        const keyPart = '(?:"(?:[^"\\\\]|\\\\.)*"|\'[^\']*\'|[A-Za-z0-9_-]+)';
        const assignment = new RegExp(`^${keyPart}(?:\\s*\\.\\s*${keyPart})*\\s*=\\s*\\S`);
        const state = { squareDepth: 0, braceDepth: 0, multilineQuote: null };
        for (const line of normalized.split('\n')) {
            const startsInContinuation = Boolean(state.multilineQuote || state.squareDepth || state.braceDepth);
            const trimmed = this._stripHashComment(line).trim();
            if (!startsInContinuation && trimmed) {
                if (trimmed.startsWith('[')) {
                    const isArrayTable = trimmed.startsWith('[[');
                    if (isArrayTable ? !trimmed.endsWith(']]') : !trimmed.endsWith(']')) {
                        throw new Error(`cabeçalho de seção inválido: ${trimmed}`);
                    }
                    const sectionName = isArrayTable ? trimmed.slice(2, -2).trim() : trimmed.slice(1, -1).trim();
                    if (!sectionName) throw new Error('cabeçalho de seção vazio');
                } else if (!assignment.test(trimmed)) {
                    throw new Error(`declaração TOML inválida: ${trimmed}`);
                }
            }

            let quote = null;
            let escapedInLine = false;
            for (let index = 0; index < line.length; index++) {
                const character = line[index];
                const nextThree = line.slice(index, index + 3);
                if (state.multilineQuote) {
                    if (nextThree === state.multilineQuote.repeat(3)) {
                        state.multilineQuote = null;
                        index += 2;
                    }
                    continue;
                }
                if (quote) {
                    if (quote === '"' && character === '\\' && !escapedInLine) {
                        escapedInLine = true;
                        continue;
                    }
                    if (character === quote && !escapedInLine) quote = null;
                    escapedInLine = false;
                    continue;
                }
                if (character === '#') break;
                if (nextThree === '"""' || nextThree === "'''") {
                    state.multilineQuote = character;
                    index += 2;
                    continue;
                }
                if (character === '"' || character === "'") {
                    quote = character;
                    continue;
                }
                if (character === '[') state.squareDepth++;
                else if (character === ']') state.squareDepth--;
                else if (character === '{') state.braceDepth++;
                else if (character === '}') state.braceDepth--;
            }
        }
    }

    _hasPythonDependency(evidence, packageName) {
        const escaped = packageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const expression = new RegExp(
            `(?:^|[\\s"'\\[,])${escaped}(?:\\[[^\\]]+\\])?\\s*(?=$|[<>=!~;@,"'\\]\\s])`,
            'im'
        );
        return expression.test(evidence);
    }

    async _analyzeComposer(composerPath, dna) {
        try {
            const composer = await fs.readJson(composerPath);
            this._assertObject(composer, 'composer.json');
            this._assertStringMap(composer.require, 'composer.json.require');
            this._assertStringMap(composer['require-dev'], 'composer.json.require-dev');
            this._assertComposerScripts(composer.scripts);
            const reqs = { ...(composer.require || {}), ...(composer['require-dev'] || {}) };
            dna.language = reqs.php ? `PHP (${reqs.php})` : 'PHP';
            const composerScripts = composer.scripts || {};
            for (const scriptName of ['analyse', 'analyze', 'test', 'lint']) {
                if (composerScripts[scriptName]) dna.validationCommands.push(`composer ${scriptName}`);
            }
            if (!dna.validationCommands.some(command => command.includes('test')) && reqs['phpunit/phpunit']) {
                dna.validationCommands.push('vendor/bin/phpunit');
            }

            if (reqs['slim/slim']) {
                dna.framework = 'PHP — Slim';
            } else if (reqs['laravel/framework']) {
                dna.framework = 'PHP — Laravel';
            } else if (reqs['symfony/symfony'] || reqs['symfony/framework-bundle']) {
                dna.framework = 'PHP — Symfony';
            } else {
                dna.framework = 'PHP — sem framework detectado';
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
            return true;
        } catch (error) {
            dna.warnings.push(`Não foi possível analisar composer.json: ${error.message}`);
            return false;
        }
    }

    async _analyzePackageJson(packagePath, dna) {
        try {
            const pkg = await fs.readJson(packagePath);
            this._assertObject(pkg, 'package.json');
            this._assertStringMap(pkg.dependencies, 'package.json.dependencies');
            this._assertStringMap(pkg.devDependencies, 'package.json.devDependencies');
            this._assertStringMap(pkg.scripts, 'package.json.scripts');
            if (pkg.name !== undefined && typeof pkg.name !== 'string') {
                throw new Error('package.json.name deve ser uma string');
            }
            const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
            const isPrimaryNodeProject = dna.language === 'Unknown';
            const hasTypeScript = Boolean(deps.typescript) || await fs.pathExists(path.join(this.root, 'tsconfig.json'));
            if (isPrimaryNodeProject) {
                for (const scriptName of ['lint', 'typecheck', 'test', 'build']) {
                    if (pkg.scripts && pkg.scripts[scriptName]) {
                        dna.validationCommands.push(scriptName === 'test' ? 'npm test' : `npm run ${scriptName}`);
                    }
                }
            }

            if (isPrimaryNodeProject) {
                dna.language = hasTypeScript ? 'Node.js (TypeScript)' : 'Node.js (JavaScript)';
            }

            if (isPrimaryNodeProject && deps['@adonisjs/core']) {
                dna.framework = 'Node.js — AdonisJS';
            } else if (isPrimaryNodeProject && deps['@nestjs/core']) {
                dna.framework = 'Node.js — NestJS';
            } else if (isPrimaryNodeProject && deps.next) {
                dna.framework = 'Next.js';
            } else if (isPrimaryNodeProject && deps.express) {
                dna.framework = 'Node.js — Express';
            } else if (isPrimaryNodeProject && deps.fastify) {
                dna.framework = 'Node.js — Fastify';
            } else if (isPrimaryNodeProject && deps.vue) {
                dna.framework = 'Vue.js';
            } else if (isPrimaryNodeProject && deps.svelte) {
                dna.framework = 'Svelte';
            } else if (isPrimaryNodeProject && deps.react && deps.vite) {
                dna.framework = 'React / Vite';
            } else if (isPrimaryNodeProject && deps.react) {
                dna.framework = 'React';
            } else if (isPrimaryNodeProject && deps.vite) {
                dna.framework = 'Vite';
            } else if (isPrimaryNodeProject) {
                dna.framework = 'Node.js — sem framework detectado';
            }

            // ORM / banco do runtime primário. Dependências de frontend não
            // substituem o DNA backend de um projeto PHP multi-stack.
            if (isPrimaryNodeProject) {
                if (deps['@adonisjs/lucid']) dna.orm = 'Lucid ORM';
                else if (deps['@prisma/client'] || deps.prisma) dna.orm = 'Prisma ORM';
                else if (deps.typeorm) dna.orm = 'TypeORM';
                else if (deps.sequelize) dna.orm = 'Sequelize';
                else if (deps.mongoose) dna.orm = 'Mongoose (MongoDB)';

                if (deps.mysql2 || deps.mysql) dna.database = 'MySQL / MariaDB';
                else if (deps.pg) dna.database = 'PostgreSQL';
                else if (deps.sqlite3 || deps['better-sqlite3']) dna.database = 'SQLite';
                else if (deps.mongoose) dna.database = 'MongoDB';
            }

            // UI
            if (deps['tailwindcss']) dna.cssUtilities.push('Tailwind CSS');
            if (deps['bootstrap']) dna.cssUtilities.push('Bootstrap');
            if (deps.react) dna.uiFramework = 'React';
            else if (deps.vue) dna.uiFramework = 'Vue.js';
            else if (deps.svelte) dna.uiFramework = 'Svelte';
            return true;
        } catch (error) {
            dna.warnings.push(`Não foi possível analisar package.json: ${error.message}`);
            return false;
        }
    }

    async _analyzePython(dna, isPrimaryPythonProject = true) {
        let dependencyEvidence = '';
        const requirementsPath = path.join(this.root, 'requirements.txt');
        if (await fs.pathExists(requirementsPath)) {
            const requirements = await fs.readFile(requirementsPath, 'utf8');
            dependencyEvidence += requirements
                .replace(/^\uFEFF/, '')
                .replace(/\r\n?/g, '\n')
                .split('\n')
                .map(line => this._stripHashComment(line).trim())
                .filter(Boolean)
                .join('\n');
            dna.detectedFiles.push('requirements.txt');
        }

        const pyprojectPath = path.join(this.root, 'pyproject.toml');
        if (await fs.pathExists(pyprojectPath)) {
            dna.detectedFiles.push('pyproject.toml');
            const pyproject = await fs.readFile(pyprojectPath, 'utf8');
            try {
                this._validateTomlConservatively(pyproject);
                const uncommented = pyproject
                    .replace(/^\uFEFF/, '')
                    .replace(/\r\n?/g, '\n')
                    .split('\n')
                    .map(line => this._stripHashComment(line))
                    .join('\n');
                const dependencyBlocks = [];
                const assignmentExpression = /(?:^|\n)\s*[A-Za-z0-9_.-]*dependencies\s*=/gi;
                let match;
                while ((match = assignmentExpression.exec(uncommented))) {
                    let index = assignmentExpression.lastIndex;
                    while (/\s/.test(uncommented[index] || '')) index++;
                    if (uncommented[index] !== '[') continue;

                    const start = index + 1;
                    let depth = 0;
                    let quote = null;
                    let escaped = false;
                    for (; index < uncommented.length; index++) {
                        const character = uncommented[index];
                        if (quote) {
                            if (quote === '"' && character === '\\' && !escaped) {
                                escaped = true;
                                continue;
                            }
                            if (character === quote && !escaped) quote = null;
                            escaped = false;
                            continue;
                        }
                        if (character === '"' || character === "'") {
                            quote = character;
                            continue;
                        }
                        if (character === '[') depth++;
                        else if (character === ']') {
                            depth--;
                            if (depth === 0) {
                                dependencyBlocks.push(uncommented.slice(start, index));
                                assignmentExpression.lastIndex = index + 1;
                                break;
                            }
                        }
                    }
                }

                let currentSection = '';
                for (const line of uncommented.split('\n')) {
                    const section = line.trim().match(/^\[\[?\s*([^\]]+?)\s*\]\]?$/);
                    if (section) {
                        currentSection = section[1].toLowerCase();
                        continue;
                    }
                    if (/dependenc/.test(currentSection)) dependencyBlocks.push(line);
                }
                dependencyEvidence += `\n${dependencyBlocks.join('\n')}`;
            } catch (error) {
                dna.warnings.push(`Não foi possível analisar pyproject.toml: ${error.message}`);
            }
        }

        if (!isPrimaryPythonProject) return;
        dna.framework = 'Python — sem framework detectado';
        if (await fs.pathExists(path.join(this.root, 'manage.py'))) {
            dna.framework = 'Python — Django';
            dna.orm = 'Django ORM';
        } else if (this._hasPythonDependency(dependencyEvidence, 'fastapi')) {
            dna.framework = 'Python — FastAPI';
        } else if (this._hasPythonDependency(dependencyEvidence, 'flask')) {
            dna.framework = 'Python — Flask';
        } else if (this._hasPythonDependency(dependencyEvidence, 'django')) {
            dna.framework = 'Python — Django';
            dna.orm = 'Django ORM';
        }
    }

    async _analyzeDirectories(dna) {
        const check = async (rel) => await fs.pathExists(path.join(this.root, rel));

        dna.structure.hasRoutes = await check('routes')
            || await check('src/routes')
            || await check('src/routes.ts')
            || await check('src/routes.js')
            || await check('src/routes.mjs')
            || await check('src/routes.cjs')
            || await check('start/routes.ts');
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
                const variables = new Map();
                for (const rawLine of envContent.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n')) {
                    const line = this._stripHashComment(rawLine).trim();
                    if (!line) continue;
                    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
                    if (!match) continue;
                    let value = match[2].trim();
                    if ((value.startsWith('"') && value.endsWith('"'))
                        || (value.startsWith("'") && value.endsWith("'"))) {
                        value = value.slice(1, -1);
                    }
                    variables.set(match[1].toUpperCase(), value);
                }

                const connection = (variables.get('DB_CONNECTION') || '').trim().toLowerCase();
                const databaseUrl = (variables.get('DATABASE_URL') || '').trim().toLowerCase();
                const keys = new Set(variables.keys());
                let detectedDatabase = null;

                if (/^(?:pgsql|postgres|postgresql)$/.test(connection)) detectedDatabase = 'PostgreSQL';
                else if (/^(?:mysql|mariadb)$/.test(connection)) detectedDatabase = 'MySQL / MariaDB';
                else if (connection === 'sqlite') detectedDatabase = 'SQLite';

                if (!detectedDatabase && /^postgres(?:ql)?:\/\//.test(databaseUrl)) detectedDatabase = 'PostgreSQL';
                else if (!detectedDatabase && /^(?:mysql|mariadb):\/\//.test(databaseUrl)) detectedDatabase = 'MySQL / MariaDB';
                else if (!detectedDatabase && /^sqlite(?::|$)/.test(databaseUrl)) detectedDatabase = 'SQLite';

                if (!detectedDatabase && [...keys].some(key => /^(?:POSTGRES_(?:HOST|PORT|DB|DATABASE|USER|PASSWORD|URL)|PG(?:HOST|PORT|DATABASE|USER|PASSWORD))$/.test(key))) {
                    detectedDatabase = 'PostgreSQL';
                } else if (!detectedDatabase && [...keys].some(key => /^(?:(?:MYSQL|MARIADB)_(?:HOST|PORT|DB|DATABASE|USER|PASSWORD|URL))$/.test(key))) {
                    detectedDatabase = 'MySQL / MariaDB';
                } else if (!detectedDatabase && [...keys].some(key => /^SQLITE_(?:DATABASE|PATH|FILE|URL)$/.test(key))) {
                    detectedDatabase = 'SQLite';
                }

                if (detectedDatabase) dna.database = detectedDatabase;
            } catch (error) {
                dna.warnings.push(`Não foi possível analisar .env: ${error.message}`);
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
        const seen = new Set();
        const push = (method, routePath, file) => {
            if (!method || !routePath) return;
            const normalizedFile = file.replace(/\\/g, '/');
            const normalizedPath = routePath.trim();
            const key = `${method.toUpperCase()}\0${normalizedPath}\0${normalizedFile}`;
            if (seen.has(key)) return;
            seen.add(key);
            routes.push({
                method: method.toUpperCase(),
                path: normalizedPath,
                file: normalizedFile,
                module: this._inferModule(`${normalizedFile} ${normalizedPath}`)
            });
        };

        const routeFiles = [];
        for (const relPath of [
            'routes',
            'src/routes',
            'src/routes.ts',
            'src/routes.js',
            'src/routes.mjs',
            'src/routes.cjs',
            'start'
        ]) {
            const fullPath = path.join(this.root, relPath);
            routeFiles.push(...await this._collectFiles(fullPath, new Set(['.php', '.js', '.cjs', '.mjs', '.ts'])));
        }

        for (const file of [...new Set(routeFiles)].sort()) {
            const content = await fs.readFile(file, 'utf8');
            const rel = path.relative(this.root, file).replace(/\\/g, '/');
            const extension = path.extname(file).toLowerCase();
            const expression = extension === '.php'
                ? /(?:\bRoute::|\$(?:app|router)->)(get|post|put|patch|delete|options)\(\s*['"]([^'"]+)['"]/gi
                : /\b(?:Route|router|app)\.(get|post|put|patch|delete|options)\(\s*['"`]([^'"`]+)['"`]/gi;
            let match;
            while ((match = expression.exec(content))) push(match[1], match[2], rel);
        }

        dna.routes = routes.sort((a, b) => `${a.file}\0${a.path}\0${a.method}`.localeCompare(`${b.file}\0${b.path}\0${b.method}`));
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

    async _collectFiles(directory, extensions) {
        if (!await fs.pathExists(directory)) return [];
        const stat = await fs.lstat(directory);
        if (stat.isSymbolicLink()) return [];
        if (stat.isFile()) {
            return extensions.has(path.extname(directory).toLowerCase()) ? [directory] : [];
        }
        if (!stat.isDirectory()) return [];
        const files = [];
        const entries = await fs.readdir(directory, { withFileTypes: true });

        for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
            if (entry.isSymbolicLink()) continue;
            const fullPath = path.join(directory, entry.name);
            if (entry.isDirectory()) {
                files.push(...await this._collectFiles(fullPath, extensions));
            } else if (extensions.has(path.extname(entry.name).toLowerCase())) {
                files.push(fullPath);
            }
        }

        return files;
    }

    async _analyzeTables(dna) {
        const tables = new Set();
        const migrationFiles = [];
        for (const relPath of ['database/migrations', 'db/migrations', 'prisma/migrations']) {
            migrationFiles.push(...await this._collectFiles(
                path.join(this.root, relPath),
                new Set(['.php', '.js', '.ts', '.sql'])
            ));
        }

        for (const file of [...new Set(migrationFiles)].sort()) {
            const content = await fs.readFile(file, 'utf8');
            const sqlIdentifier = '(?:"(?:[^"]|"")+"|`(?:[^`]|``)+`|\\[[^\\]]+\\]|[A-Za-z_][A-Za-z0-9_$]*)';
            const expressions = [
                {
                    expression: /\b(?:Schema::create|(?:this\.)?schema\.(?:create|createTable|createIfNotExists)|createTable|createIfNotExists)\(\s*['"]([a-zA-Z_][a-zA-Z0-9_$]*(?:\.[a-zA-Z_][a-zA-Z0-9_$]*)?)['"]/g,
                    normalize: value => value
                },
                {
                    expression: new RegExp(`\\bCREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?(?:ONLY\\s+)?(${sqlIdentifier}(?:\\s*\\.\\s*${sqlIdentifier})?)`, 'gi'),
                    normalize: value => value
                        .split(/\s*\.\s*/)
                        .map(part => {
                            if (part.startsWith('"') && part.endsWith('"')) return part.slice(1, -1).replace(/""/g, '"');
                            if (part.startsWith('`') && part.endsWith('`')) return part.slice(1, -1).replace(/``/g, '`');
                            if (part.startsWith('[') && part.endsWith(']')) return part.slice(1, -1).replace(/\]\]/g, ']');
                            return part;
                        })
                        .join('.')
                }
            ];
            for (const { expression, normalize } of expressions) {
                let match;
                while ((match = expression.exec(content))) tables.add(normalize(match[1]));
            }
        }

        dna.tables = [...tables].sort();
    }

    async _analyzeInventory(dna) {
        const hash = crypto.createHash('sha256');
        const byExtension = {};
        const sourceFiles = [];
        const scan = async (directory, relativeDirectory = '') => {
            const entries = await fs.readdir(directory, { withFileTypes: true });
            for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
                const relativePath = path.join(relativeDirectory, entry.name).replace(/\\/g, '/');
                const fullPath = path.join(directory, entry.name);

                if (GENERATED_FILES.has(relativePath)) continue;

                if (entry.isSymbolicLink()) {
                    sourceFiles.push({
                        fullPath,
                        relativePath,
                        extension: '[symlink]',
                        linkTarget: await fs.readlink(fullPath)
                    });
                    continue;
                }

                if (entry.isDirectory()) {
                    if (IGNORED_DIRECTORIES.has(entry.name) || relativePath === 'docs/ai') continue;
                    await scan(fullPath, relativePath);
                    continue;
                }

                const extension = path.extname(entry.name).toLowerCase();
                if (!SOURCE_EXTENSIONS.has(extension) && !INVENTORY_FILES.has(entry.name)) continue;
                if (entry.name.startsWith('.env') || /\.(?:pem|key|p12|pfx)$/i.test(entry.name)) continue;
                sourceFiles.push({
                    fullPath,
                    relativePath,
                    extension: extension || '[manifest]'
                });
            }
        };

        await scan(this.root);
        for (const file of sourceFiles.sort((a, b) => a.relativePath.localeCompare(b.relativePath))) {
            const content = file.linkTarget === undefined
                ? (await fs.readFile(file.fullPath, 'utf8')).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')
                : `symlink:${file.linkTarget}`;
            hash.update(file.relativePath);
            hash.update('\0');
            hash.update(content, 'utf8');
            hash.update('\0');
            byExtension[file.extension] = (byExtension[file.extension] || 0) + 1;
        }

        dna.inventory = {
            sourceFiles: sourceFiles.length,
            byExtension: Object.fromEntries(Object.entries(byExtension).sort(([a], [b]) => a.localeCompare(b))),
            topLevelEntries: [...new Set(sourceFiles.map(file => {
                const [topLevel] = file.relativePath.split('/');
                return file.relativePath.includes('/') ? `${topLevel}/` : topLevel;
            }))].sort(),
            sourceFingerprint: hash.digest('hex')
        };
    }
}

module.exports = ProjectAnalyzer;
