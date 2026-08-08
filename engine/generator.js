'use strict';

const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

const MemoryState = require('./memory-state');
const ProjectAnalyzer = require('./analyzer');
const KnowledgeGraph = require('./graph');
const ProjectMapper = require('./mapper');
const { relatedDocsSection } = require('./links');

const MANAGED_MARKERS = {
    coreRules: 'CORE_RULES',
    stackRules: 'STACK_RULES',
    snapshot: 'SNAPSHOT',
    modules: 'MODULOS_DETECTADOS',
    checklist: 'STACK_CHECKLIST',
    design: 'DESIGN_EVIDENCE',
    bootstrap: 'BOOTSTRAP'
};

/**
 * Gera a memória do projeto sem substituir conteúdo mantido pelo time.
 * Somente blocos delimitados por MEMORIA_VIVA:* são atualizados no sync.
 */
class ContextGenerator {
    constructor(projectDNA, options = {}) {
        this.dna = projectDNA;
        this.options = { dryRun: false, silent: false, ...options };
        this.globalRoot = path.resolve(__dirname, '..');
        this.templatesDir = path.join(this.globalRoot, 'templates');
        this._preflightComplete = false;
        this._previousState = null;
        this._migrationResults = [];
    }

    async generate() {
        await this._ensurePreflight();
        const results = [];

        results.push(await this._generateRulesFile());
        results.push(await this._generateContextFile());
        results.push(await this._generateModulesFile());
        results.push(await this._generateHandoffFile());
        results.push(await this._generateDesignSystemFile());
        results.push(...await this._syncSkills());
        results.push(...await this._syncManagedReference(
            path.join(this.templatesDir, 'BRIEFING.md'),
            '.agent/BRIEFING.md'
        ));
        results.push(...await this._syncManagedReference(
            path.join(this.globalRoot, 'intelligence', 'skills', 'SKILLS.md'),
            '.agent/SKILLS.md'
        ));
        results.push(...await this._syncManagedReference(
            path.join(this.globalRoot, 'intelligence', 'PROMPT_ENGINE.md'),
            '.agent/PROMPT_ENGINE.md'
        ));
        results.push(await this._ensureAgentGitignore());
        results.push(...await this._generateAgentEntrypoints());
        results.push(...await this._generateGraphArtifacts());
        results.push(...await this._generateMapArtifacts());
        if (this._migrationResults.length) {
            results.unshift(...this._migrationResults);
            this._migrationResults = [];
        }

        this._generated = true;
        return this._summarize(results.filter(Boolean));
    }

    _summarize(results) {
        const summary = {
            createdFiles: [],
            updatedFiles: [],
            skippedFiles: [],
            plannedFiles: [],
            results
        };

        for (const result of results) {
            if (result.planned) summary.plannedFiles.push(result.file);
            else if (result.status === 'created') summary.createdFiles.push(result.file);
            else if (result.status === 'updated') summary.updatedFiles.push(result.file);
            else summary.skippedFiles.push(result.file);
        }

        return summary;
    }

    _relative(targetPath) {
        return path.relative(this.dna.root, targetPath).replace(/\\/g, '/');
    }

    async _writeFileIfChanged(targetPath, content, expectedPrevious = undefined) {
        const exists = await fs.pathExists(targetPath);
        const previous = exists ? await fs.readFile(targetPath, 'utf8') : null;
        const file = this._relative(targetPath);

        if (expectedPrevious !== undefined && previous !== expectedPrevious) {
            throw new Error(`Conflito de escrita em ${file}: o arquivo mudou durante a sincronização; nenhuma sobrescrita foi feita.`);
        }

        if (previous === content) return { status: 'skipped', file };
        if (this.options.dryRun) {
            return { status: exists ? 'updated' : 'created', file, planned: true };
        }

        await fs.ensureDir(path.dirname(targetPath));
        const suffix = crypto.randomBytes(6).toString('hex');
        const temporaryPath = `${targetPath}.${process.pid}.${suffix}.tmp`;
        try {
            await fs.writeFile(temporaryPath, content, 'utf8');
            const latestExists = await fs.pathExists(targetPath);
            const latest = latestExists ? await fs.readFile(targetPath, 'utf8') : null;
            if (latest !== previous) {
                throw new Error(`Conflito de escrita em ${file}: o arquivo mudou durante a sincronização; nenhuma sobrescrita foi feita.`);
            }
            try {
                await fs.rename(temporaryPath, targetPath);
            } catch (error) {
                if (!['EEXIST', 'EPERM'].includes(error.code)) throw error;
                await this._replaceWithBackup(temporaryPath, targetPath);
            }
        } finally {
            await fs.remove(temporaryPath).catch(() => {});
        }

        return { status: exists ? 'updated' : 'created', file };
    }

    async _replaceWithBackup(temporaryPath, targetPath) {
        const backupPath = `${targetPath}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.mv-backup`;
        let movedOriginal = false;
        try {
            if (await fs.pathExists(targetPath)) {
                await fs.rename(targetPath, backupPath);
                movedOriginal = true;
            }
            await fs.rename(temporaryPath, targetPath);
            if (movedOriginal) await fs.remove(backupPath);
        } catch (error) {
            if (movedOriginal && !await fs.pathExists(targetPath) && await fs.pathExists(backupPath)) {
                await fs.rename(backupPath, targetPath).catch(() => {});
            }
            throw error;
        }
    }

    _marker(id, edge) {
        return `<!-- MEMORIA_VIVA:${id}:${edge} -->`;
    }

    _managedBlock(id, body) {
        return `${this._marker(id, 'START')}\n${body.trim()}\n${this._marker(id, 'END')}`;
    }

    _applyManagedBlock(content, id, body, legacyHeading) {
        const start = this._marker(id, 'START');
        const end = this._marker(id, 'END');
        const block = this._managedBlock(id, body);
        const startCount = content.split(start).length - 1;
        const endCount = content.split(end).length - 1;
        if (startCount === 0 && endCount === 0) {
            const heading = legacyHeading ? `\n\n---\n\n## ${legacyHeading}\n\n` : '\n\n';
            return `${content.trimEnd()}${heading}${block}\n`;
        }
        if (startCount !== 1 || endCount !== 1) {
            throw new Error(`Bloco gerenciado ${id} inválido: esperado exatamente um marcador START e um END.`);
        }
        const startIndex = content.indexOf(start);
        const endIndex = content.indexOf(end);
        if (startIndex >= endIndex) {
            throw new Error(`Bloco gerenciado ${id} inválido: marcadores fora de ordem.`);
        }
        return `${content.slice(0, startIndex)}${block}${content.slice(endIndex + end.length)}`;
    }

    _adoptLegacyMarkers(content, legacyStart, legacyEnd, id) {
        const startCount = content.split(legacyStart).length - 1;
        const endCount = content.split(legacyEnd).length - 1;
        if (startCount === 0 && endCount === 0) return content;
        if (startCount !== 1 || endCount !== 1 || content.indexOf(legacyStart) >= content.indexOf(legacyEnd)) {
            throw new Error(`Bloco legado ${id} inválido; nenhuma migração foi feita.`);
        }
        const startIndex = content.indexOf(legacyStart);
        const endIndex = content.indexOf(legacyEnd) + legacyEnd.length;
        return `${content.slice(0, startIndex)}${this._managedBlock(id, 'Atualização pendente.')}${content.slice(endIndex)}`;
    }

    _escapeRegExp(value) {
        return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    _md(value) {
        return String(value ?? '—').replace(/\|/g, '\\|').replace(/[\r\n]+/g, ' ');
    }

    _relatedDocs(selfName) {
        return relatedDocsSection(selfName);
    }

    async _generateRulesFile() {
        const targetPath = path.join(this.dna.root, '.agent', 'rules.md');
        const exists = await fs.pathExists(targetPath);
        const previous = exists ? await fs.readFile(targetPath, 'utf8') : null;
        let content = exists
            ? await this._migrateKnownLegacyDocument(
                previous,
                targetPath,
                'rules.md',
                MANAGED_MARKERS.coreRules,
                ['auth_sessions', 'Admin Master', 'docs/ai/BRIEFING.md']
            )
            : await fs.readFile(path.join(this.templatesDir, 'rules.md'), 'utf8');

        content = content
            .replace(/\{\{LANG\}\}/g, this.dna.language)
            .replace(/\{\{FRAMEWORK\}\}/g, this.dna.framework)
            .replace(/\{\{DB\}\}/g, this.dna.database)
            .replace(/\{\{ORM\}\}/g, this.dna.orm)
            .replace(/\{\{UI\}\}/g, this.dna.uiFramework);

        content = this._applyManagedBlock(
            content,
            MANAGED_MARKERS.coreRules,
            this._buildCoreRules(),
            'PROTOCOLO OPERACIONAL ATUAL (gerenciado pelo Memória Viva)'
        );
        content = this._applyManagedBlock(
            content,
            MANAGED_MARKERS.stackRules,
            this._buildStackRules(),
            'FATOS DA STACK DETECTADA (gerenciado pelo Memória Viva)'
        );

        return this._writeFileIfChanged(targetPath, content, previous);
    }

    _buildCoreRules() {
        return `### 1. Recuperação de contexto

1. Comece por \`.agent/memory.json\`; ele é o snapshot automático compacto.
2. Leia \`docs/ai/HANDOFF_ATUAL.md\` e \`docs/ai/MODULOS_E_REGRAS.md\`; consulte \`docs/ai/DESIGN_SYSTEM.md\` somente para tarefas de interface.
3. Execute \`memoria-viva check\`. Se indicar divergência, execute \`memoria-viva sync\` antes de confiar no snapshot.
4. Código, testes, manifests e schema real têm precedência sobre a documentação. Divergência é um defeito de memória a registrar, nunca licença para inventar fatos.

### 2. Execução profissional e escopo

- Resolva somente o objetivo solicitado. Não crie funcionalidades, refatorações ou tarefas paralelas sem necessidade comprovada.
- Para bugs: reproduza o sintoma, estabeleça o baseline, trace a execução/dados, prove a causa-raiz, aplique a menor correção segura e adicione regressão.
- Antes de criar ou substituir algo, busque a implementação e os consumidores existentes. Preserve contratos, comportamento válido e histórico do usuário.
- Não apague nem reescreva código funcional para contornar uma investigação. Refatoração ampla exige justificativa ligada ao problema e cobertura proporcional.
- Faça suposições reversíveis quando forem seguras; pergunte apenas se uma escolha material mudar resultado, risco ou escopo.

### 3. Integridade da conclusão

- Execute as validações relevantes disponíveis no projeto. Migração, deploy, push, escrita em produção e outras ações externas exigem autorização explícita.
- Nunca declare sucesso para teste não executado, saída não conferida ou falha mascarada. Relate cada comando como \`passou\`, \`falhou\` ou \`não executado\`, com o motivo.
- Só marque concluído quando a causa comprovada estiver corrigida e o critério de pronto estiver atendido. Pendência real permanece explícita.
- Ao encerrar uma mudança, atualize o handoff sem apagar registros: objetivo, causa-raiz/evidência, arquivos, testes/resultados, riscos e pendências diretamente relacionadas.

${this._relatedDocs('CONTEXTO_ATUAL')}`;
    }

    _buildStackRules() {
        const evidence = (this.dna.detectedFiles || []).length
            ? this.dna.detectedFiles.map(file => `\`${file}\``).join(', ')
            : 'nenhum manifest reconhecido';
        const commands = (this.dna.validationCommands || []).length
            ? this.dna.validationCommands.map(command => `\`${command}\``).join(', ')
            : 'nenhum comando inferido; descubra os comandos existentes antes de validar';

        return `- **Linguagem primária:** ${this._md(this.dna.language)}
- **Linguagens detectadas:** ${this._md((this.dna.languages || []).join(', ') || this.dna.language)}
- **Framework:** ${this._md(this.dna.framework)}
- **Banco indicado por dependências/configuração:** ${this._md(this.dna.database)}
- **ORM/abstração detectada:** ${this._md(this.dna.orm)}
- **UI detectada:** ${this._md(this.dna.uiFramework)}
- **Evidências:** ${evidence}
- **Validações declaradas:** ${commands}

Estes são fatos detectados, não uma arquitetura a impor. Não introduza framework, padrão arquitetural, mecanismo de sessão, módulo, papel ou regra de negócio que não esteja comprovado no projeto.`;
    }

    async _generateContextFile() {
        const targetPath = path.join(this.dna.root, 'docs', 'ai', 'CONTEXTO_ATUAL.md');
        const exists = await fs.pathExists(targetPath);
        const previous = exists ? await fs.readFile(targetPath, 'utf8') : null;
        let content = exists
            ? await this._migrateKnownLegacyDocument(
                previous,
                targetPath,
                'CONTEXTO_ATUAL.md',
                MANAGED_MARKERS.snapshot,
                ['auth_sessions', 'Admin / Master', '24 horas']
            )
            : await fs.readFile(path.join(this.templatesDir, 'CONTEXTO_ATUAL.md'), 'utf8');
        if (!exists || content !== previous) {
            content = content.replace(/\*\(data\)\*/g, new Date().toISOString().slice(0, 10));
        }

        content = this._applyManagedBlock(
            content,
            MANAGED_MARKERS.snapshot,
            this._buildSnapshotMarkdown(),
            'SNAPSHOT AUTOMÁTICO ATUAL'
        );

        return this._writeFileIfChanged(targetPath, content, previous);
    }

    _buildSnapshotMarkdown() {
        const snapshot = MemoryState.normalizeDNA(this.dna);
        const currentFingerprint = MemoryState.fingerprint(snapshot);
        const structureRows = Object.entries(this.dna.structure || {})
            .map(([name, present]) => `| ${this._md(name)} | ${present ? 'sim' : 'não'} |`)
            .join('\n') || '| — | nenhuma estrutura reconhecida |';
        const routes = this._buildRoutesTable(this.dna.routes || []);
        const tables = this._buildTablesTable(this.dna.tables || []);
        const inventory = this.dna.inventory || {};

        return `> Gerado por \`memoria-viva sync\`. Somente este bloco é substituído.
> Fingerprint: \`${currentFingerprint}\`. Exemplos ou textos manuais sem evidência não prevalecem sobre este snapshot.

### DNA comprovado

| Campo | Valor |
|-------|-------|
| Projeto | ${this._md(this.dna.projectName)} |
| Linguagem primária | ${this._md(this.dna.language)} |
| Linguagens detectadas | ${this._md((this.dna.languages || []).join(', ') || this.dna.language)} |
| Framework | ${this._md(this.dna.framework)} |
| Banco indicado | ${this._md(this.dna.database)} |
| ORM/abstração | ${this._md(this.dna.orm)} |
| UI | ${this._md(this.dna.uiFramework)} |
| Arquivos-fonte inventariados | ${inventory.sourceFiles || 0} |

**Evidências de stack:** ${(this.dna.detectedFiles || []).map(file => `\`${file}\``).join(', ') || 'nenhuma'}

**Entradas na raiz:** ${(inventory.topLevelEntries || []).map(entry => `\`${entry}\``).join(', ') || 'nenhuma'}

### Estrutura reconhecida

| Sinal | Detectado |
|-------|-----------|
${structureRows}

### Rotas detectadas estaticamente

| Método | Caminho | Módulo inferido | Arquivo |
|--------|---------|-----------------|---------|
${routes}

### Tabelas mencionadas em migrations

> Isto não prova o schema atual. Quando houver acesso ao banco, confirme tabelas, colunas e índices na fonte real.

| Tabela mencionada | Fonte |
|-------------------|-------|
${tables}

${this._relatedDocs('CONTEXTO_ATUAL')}`;
    }

    _buildRoutesTable(routes) {
        if (!routes.length) return '| — | — | — | nenhuma rota reconhecida estaticamente |';
        return routes.map(route =>
            `| ${this._md(route.method)} | ${this._md(route.path)} | ${this._md(route.module)} | ${this._md(route.file)} |`
        ).join('\n');
    }

    _buildTablesTable(tables) {
        if (!tables.length) return '| — | nenhuma tabela reconhecida nas migrations |';
        return tables.map(table => `| ${this._md(table)} | migration |`).join('\n');
    }

    async _generateModulesFile() {
        const targetPath = path.join(this.dna.root, 'docs', 'ai', 'MODULOS_E_REGRAS.md');
        const exists = await fs.pathExists(targetPath);
        const previous = exists ? await fs.readFile(targetPath, 'utf8') : null;
        let content = exists
            ? await this._migrateKnownLegacyDocument(
                previous,
                targetPath,
                'MODULOS_E_REGRAS.md',
                MANAGED_MARKERS.modules,
                ['auth_sessions', 'store_id', 'Soft Delete']
            )
            : await fs.readFile(path.join(this.templatesDir, 'MODULOS_E_REGRAS.md'), 'utf8');

        content = this._adoptLegacyMarkers(
            content,
            '<!-- MODULOS_DETECTADOS -->',
            '<!-- /MODULOS_DETECTADOS -->',
            MANAGED_MARKERS.modules
        );

        content = this._applyManagedBlock(
            content,
            MANAGED_MARKERS.modules,
            this._buildDetectedModules(this.dna.routes || []),
            'MÓDULOS INFERIDOS AUTOMATICAMENTE'
        );
        return this._writeFileIfChanged(targetPath, content, previous);
    }

    _buildDetectedModules(routes) {
        if (!routes.length) {
            return '_Nenhum módulo foi inferido. Isso não prova que o projeto não possua módulos._';
        }

        const groups = {};
        for (const route of routes) {
            (groups[route.module] = groups[route.module] || []).push(route);
        }

        return Object.keys(groups).sort().map(moduleName => {
            const moduleRoutes = groups[moduleName];
            const routeList = moduleRoutes.map(route => `${route.method} ${route.path}`).join(', ');
            const files = [...new Set(moduleRoutes.map(route => route.file))].join(', ');
            return `### ${this._md(moduleName)} (inferido)\n\n- **Rotas:** ${this._md(routeList)}\n- **Arquivos:** ${this._md(files)}\n- **Regras de negócio:** não inferidas; registre abaixo somente após confirmação no código/testes.`;
        }).join('\n\n') + `\n\n${this._relatedDocs('MODULOS_E_REGRAS')}`;
    }

    async _generateHandoffFile() {
        const targetPath = path.join(this.dna.root, 'docs', 'ai', 'HANDOFF_ATUAL.md');
        const exists = await fs.pathExists(targetPath);
        const previous = exists ? await fs.readFile(targetPath, 'utf8') : null;
        let content;
        if (exists) {
            content = await this._migrateKnownLegacyDocument(
                previous,
                targetPath,
                'HANDOFF_ATUAL.md',
                MANAGED_MARKERS.checklist,
                ['list_tables', 'git push origin main', 'docs/ai/CONTEXTO_ATUAL.md']
            );
            if (content !== previous) {
                const legacyRecords = previous.match(/##[^\n]*Registro de Sessões[\s\S]*?(?=##[^\n]*Checklist Pré-Deploy)/i);
                if (legacyRecords) {
                    content = `${content.trimEnd()}\n\n<details>\n<summary>Registro legado preservado — não revalidado automaticamente</summary>\n\n${legacyRecords[0].trim()}\n\n</details>\n`;
                }
            }
        } else {
            content = await fs.readFile(path.join(this.templatesDir, 'HANDOFF_ATUAL.md'), 'utf8');
        }
        if (!exists || content !== previous) {
            content = content.replace(/\*\(data\)\*/g, new Date().toISOString().slice(0, 10));
        }
        content = this._adoptLegacyMarkers(
            content,
            '<!-- STACK_CHECKLIST -->',
            '<!-- /STACK_CHECKLIST -->',
            MANAGED_MARKERS.checklist
        );
        content = this._applyChecklist(content);
        return this._writeFileIfChanged(targetPath, content, previous);
    }

    _applyChecklist(content) {
        const commands = this.dna.validationCommands || [];
        const checklist = commands.length
            ? commands.map(command => `- [ ] \`${command}\` executado e resultado registrado`).join('\n')
            : '- [ ] Comandos reais de validação identificados no projeto e resultados registrados';
        const body = `${checklist}\n\n${this._relatedDocs('HANDOFF_ATUAL')}`;
        return this._applyManagedBlock(content, MANAGED_MARKERS.checklist, body, 'VALIDAÇÕES DETECTADAS');
    }

    async _generateDesignSystemFile() {
        const targetPath = path.join(this.dna.root, 'docs', 'ai', 'DESIGN_SYSTEM.md');
        const exists = await fs.pathExists(targetPath);
        const previous = exists ? await fs.readFile(targetPath, 'utf8') : null;
        let content = exists
            ? await this._migrateKnownLegacyDocument(
                previous,
                targetPath,
                'DESIGN_SYSTEM.md',
                MANAGED_MARKERS.design,
                ['#2563EB', '#475569', 'Inter']
            )
            : await fs.readFile(path.join(this.templatesDir, 'DESIGN_SYSTEM.md'), 'utf8');
        content = content.replace(/\{\{UI_FRAMEWORK\}\}/g, this.dna.uiFramework);
        content = this._applyManagedBlock(
            content,
            MANAGED_MARKERS.design,
            `- **Framework/utilitário detectado:** ${this._md(this.dna.uiFramework)}\n- **Regra:** preserve tokens e componentes comprovados no código; não transforme placeholders em padrão.\n\n${this._relatedDocs('DESIGN_SYSTEM')}`,
            'EVIDÊNCIA AUTOMÁTICA DE UI'
        );
        return this._writeFileIfChanged(targetPath, content, previous);
    }

    async _syncSkills() {
        const sourceDirectory = path.join(this.globalRoot, 'intelligence', 'skills');
        if (!await fs.pathExists(sourceDirectory)) {
            throw new Error(`Diretório de skills ausente no pacote: ${sourceDirectory}`);
        }

        const files = (await fs.readdir(sourceDirectory))
            .filter(file => file.endsWith('.md') && file !== 'SKILLS.md')
            .sort();
        const results = [];
        for (const file of files) {
            results.push(...await this._syncManagedReference(
                path.join(sourceDirectory, file),
                `.agent/skills/${file}`
            ));
        }
        return results;
    }

    async _syncManagedReference(sourcePath, relativeTargetPath) {
        if (!await fs.pathExists(sourcePath)) {
            throw new Error(`Referência gerenciada ausente no pacote: ${sourcePath}`);
        }
        const referenceMarker = '<!-- MEMORIA_VIVA:MANAGED_REFERENCE -->';
        const content = await fs.readFile(sourcePath, 'utf8');
        const sourceMarkerCount = content.split(referenceMarker).length - 1;
        if (sourceMarkerCount !== 1 || !content.trimStart().startsWith(referenceMarker)) {
            throw new Error(`Referência gerenciada inválida no pacote: ${sourcePath}`);
        }

        const targetPath = path.join(this.dna.root, relativeTargetPath);
        const exists = await fs.pathExists(targetPath);
        const previous = exists ? await fs.readFile(targetPath, 'utf8') : null;
        if (previous === content) return [{ status: 'skipped', file: relativeTargetPath }];

        const results = [];
        if (exists && !this._previousState) {
            const relativeBackup = relativeTargetPath
                .replace(/^\.agent\//, '')
                .replace(/\.md$/i, '');
            const suffix = crypto.createHash('sha256').update(previous).digest('hex').slice(0, 12);
            const backupPath = path.join(this.dna.root, '.agent', 'backups', `${relativeBackup}.${suffix}.legacy.md`);
            results.push(await this._writeFileIfChanged(backupPath, previous));
        }

        results.push(await this._writeFileIfChanged(targetPath, content, previous));
        return results;
    }

    async _ensureAgentGitignore() {
        const targetPath = path.join(this.dna.root, '.agent', '.gitignore');
        const exists = await fs.pathExists(targetPath);
        const previous = exists ? await fs.readFile(targetPath, 'utf8') : '';
        const entries = ['.sync.lock', '*.tmp', '*.mv-backup', 'backups/'];
        const existingLines = previous.split(/\r?\n/).map(line => line.trim());
        const missing = entries.filter(entry => !existingLines.includes(entry));
        if (!missing.length) return { status: 'skipped', file: '.agent/.gitignore' };
        const content = `${previous.trimEnd()}${previous.trim() ? '\n\n' : ''}# Arquivos locais/transacionais do Memória Viva\n${missing.join('\n')}\n`;
        return this._writeFileIfChanged(targetPath, content, exists ? previous : null);
    }

    async _migrateKnownLegacyDocument(previous, targetPath, templateName, markerId, signatures) {
        if (!previous || previous.includes(this._marker(markerId, 'START'))
            || !signatures.every(signature => previous.includes(signature))) {
            return previous;
        }

        const relativeTarget = this._relative(targetPath);
        const suffix = crypto.createHash('sha256').update(previous).digest('hex').slice(0, 12);
        const backupName = `${path.basename(relativeTarget, path.extname(relativeTarget))}.${suffix}.legacy.md`;
        const backupPath = path.join(this.dna.root, '.agent', 'backups', 'legacy-docs', backupName);
        this._migrationResults.push(await this._writeFileIfChanged(backupPath, previous));
        return fs.readFile(path.join(this.templatesDir, templateName), 'utf8');
    }

    async _generateAgentEntrypoints() {
        const bootstrap = this._buildAgentBootstrap();
        const targets = [
            { path: 'AGENTS.md', preamble: '# Instruções para agentes\n\n' },
            { path: 'CLAUDE.md', preamble: '# Instruções para Claude Code\n\n' },
            { path: '.github/copilot-instructions.md', preamble: '# Instruções para GitHub Copilot\n\n' },
            {
                path: '.cursor/rules/memoria-viva.mdc',
                preamble: '---\ndescription: Carrega a memória e o protocolo profissional do projeto\nalwaysApply: true\n---\n\n'
            }
        ];
        const results = [];

        for (const target of targets) {
            const targetPath = path.join(this.dna.root, target.path);
            const exists = await fs.pathExists(targetPath);
            const previous = exists ? await fs.readFile(targetPath, 'utf8') : null;
            let content = exists ? previous : target.preamble;
            content = this._applyManagedBlock(content, MANAGED_MARKERS.bootstrap, bootstrap, 'Memória Viva');
            results.push(await this._writeFileIfChanged(targetPath, content, previous));
        }

        return results;
    }

    _buildAgentBootstrap() {
        return `Antes de alterar o projeto:

1. Leia \`.agent/memory.json\` e \`.agent/rules.md\`.
2. Leia o registro mais recente de \`docs/ai/HANDOFF_ATUAL.md\` e as regras confirmadas em \`docs/ai/MODULOS_E_REGRAS.md\`.
3. Execute \`memoria-viva check\`; se a memória estiver desatualizada, execute \`memoria-viva sync\` e releia o snapshot.
4. Para UI, leia também \`docs/ai/DESIGN_SYSTEM.md\`.

Trate o código e os testes como fonte de verdade. Investigue a causa-raiz, preserve contratos existentes, limite-se ao pedido e não declare sucesso sem registrar as validações realmente executadas.`;
    }

    async _ensurePreflight() {
        if (this._preflightComplete) return;

        let previousState = null;
        try {
            previousState = await MemoryState.load(this.dna.root);
        } catch (error) {
            throw new Error(`Não foi possível ler .agent/memory.json sem risco de perda: ${error.message}`);
        }

        if (previousState) {
            const stateIssues = MemoryState.validateState(previousState);
            if (stateIssues.length) {
                throw new Error(`Estado de memória inválido; nenhuma escrita foi feita:\n- ${stateIssues.join('\n- ')}`);
            }
        }

        const managed = previousState
            ? await MemoryState.inspectManagedFiles(this.dna.root)
            : { hashes: {}, issues: await MemoryState.inspectManagedStructure(this.dna.root, false) };
        if (managed.issues.length) {
            throw new Error(`Estrutura gerenciada inválida; nenhuma escrita foi feita:\n- ${managed.issues.join('\n- ')}`);
        }
        if (previousState) {
            const conflicts = MemoryState.MANAGED_FILES.filter(relativePath =>
                managed.hashes[relativePath]
                && previousState.managedFiles[relativePath]
                && managed.hashes[relativePath] !== previousState.managedFiles[relativePath]
            );
            if (conflicts.length) {
                throw new Error(`Artefatos gerenciados mudaram desde o último sync; nenhuma sobrescrita foi feita:\n- ${conflicts.join('\n- ')}`);
            }
        }

        this._previousState = previousState;
        this._preflightComplete = true;
    }

    async _withProjectLock(callback) {
        if (this.options.dryRun) return callback();
        const lockPath = path.join(this.dna.root, '.agent', '.sync.lock');
        await fs.ensureDir(path.dirname(lockPath));
        let handle;
        try {
            handle = await fs.promises.open(lockPath, 'wx');
            await handle.writeFile(`${JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() })}\n`, 'utf8');
        } catch (error) {
            if (error.code === 'EEXIST') {
                throw new Error('Outra sincronização do Memória Viva está em andamento (.agent/.sync.lock).');
            }
            throw error;
        }

        try {
            return await callback();
        } finally {
            if (handle) await handle.close().catch(() => {});
            await fs.remove(lockPath).catch(() => {});
        }
    }

    async synchronize() {
        return this._withProjectLock(async () => {
            this._preflightComplete = false;
            this._generated = false;
            await this._ensurePreflight();

            const refreshedDNA = await new ProjectAnalyzer(this.dna.root).analyze();
            if (refreshedDNA.warnings && refreshedDNA.warnings.length) {
                throw new Error(`Análise interrompida antes da escrita: ${refreshedDNA.warnings.join('; ')}`);
            }
            Object.assign(this.dna, refreshedDNA);

            const generated = await this.generate();
            const synced = await this.syncContext();
            let health = null;
            if (!this.options.dryRun) {
                health = await MemoryState.inspect(this.dna.root, this.dna);
                if (!health.healthy) {
                    throw new Error(`A sincronização não produziu um estado íntegro:\n- ${health.issues.join('\n- ')}`);
                }
            }
            return { generated, synced, health };
        });
    }

    async syncContext() {
        await this._ensurePreflight();
        const results = [];
        let stable = false;
        for (let attempt = 0; attempt < 3; attempt++) {
            const beforeFingerprint = MemoryState.fingerprint(MemoryState.normalizeDNA(this.dna));
            const refreshedDNA = await new ProjectAnalyzer(this.dna.root).analyze();
            if (refreshedDNA.warnings && refreshedDNA.warnings.length) {
                throw new Error(`Análise interrompida durante o sync: ${refreshedDNA.warnings.join('; ')}`);
            }
            const refreshedFingerprint = MemoryState.fingerprint(MemoryState.normalizeDNA(refreshedDNA));
            Object.assign(this.dna, refreshedDNA);

            if (!this._generated || refreshedFingerprint !== beforeFingerprint) {
                this._generated = false;
                const generated = await this.generate();
                results.push(...generated.results);
            }

            const verificationDNA = await new ProjectAnalyzer(this.dna.root).analyze();
            if (verificationDNA.warnings && verificationDNA.warnings.length) {
                throw new Error(`Análise interrompida durante a verificação final: ${verificationDNA.warnings.join('; ')}`);
            }
            const verificationFingerprint = MemoryState.fingerprint(MemoryState.normalizeDNA(verificationDNA));
            if (verificationFingerprint === MemoryState.fingerprint(MemoryState.normalizeDNA(this.dna))) {
                Object.assign(this.dna, verificationDNA);
                stable = true;
                break;
            }

            Object.assign(this.dna, verificationDNA);
            this._generated = false;
        }
        if (!stable) {
            throw new Error('O projeto continuou mudando durante a sincronização; nenhuma conclusão de sucesso foi registrada. Execute sync novamente quando as edições terminarem.');
        }

        const routesPath = path.join(this.dna.root, 'docs', 'ai', 'ROTAS_DETECTADAS.md');
        results.push(await this._writeFileIfChanged(routesPath, this._buildRoutesMarkdown(this.dna.routes || [])));

        const graph = new KnowledgeGraph(this.dna).build();
        this.dna.knowledgeGraph = KnowledgeGraph.extract(this.dna);
        const graphPath = path.join(this.dna.root, 'docs', 'ai', 'GRAFO.md');
        results.push(await this._writeFileIfChanged(graphPath, graph.toMarkdown()));
        const graphHtmlPath = path.join(this.dna.root, 'docs', 'ai', 'GRAFO.html');
        results.push(await this._writeFileIfChanged(graphHtmlPath, graph.toHtml()));

        results.push(...await this._generateMapArtifacts());

        const managedFiles = this.options.dryRun
            ? (this._previousState ? this._previousState.managedFiles : {})
            : await MemoryState.captureManagedFiles(this.dna.root);
        const state = MemoryState.build(this.dna, this._previousState, managedFiles);
        const statePath = path.join(this.dna.root, '.agent', 'memory.json');
        results.push(await this._writeFileIfChanged(statePath, `${JSON.stringify(state, null, 2)}\n`));

        this._preflightComplete = false;
        this._previousState = state;
        this._generated = false;

        return {
            ...this._summarize(results),
            fingerprint: state.fingerprint,
            syncedAt: state.syncedAt
        };
    }

    _buildRoutesMarkdown(routes) {
        return `# Rotas detectadas automaticamente

> Gerado por \`memoria-viva sync\`. Detecção estática conservadora; confirme rotas dinâmicas no runtime.

| Método | Caminho | Módulo inferido | Arquivo |
|--------|---------|-----------------|---------|
${this._buildRoutesTable(routes)}

${this._relatedDocs('ROTAS_DETECTADAS')}
`;
    }

    _generateGraphArtifacts() {
        const graph = new KnowledgeGraph(this.dna).build();
        this.dna.knowledgeGraph = KnowledgeGraph.extract(this.dna);
        const markdownPath = path.join(this.dna.root, 'docs', 'ai', 'GRAFO.md');
        const htmlPath = path.join(this.dna.root, 'docs', 'ai', 'GRAFO.html');
        return [
            this._writeFileIfChanged(markdownPath, graph.toMarkdown()),
            this._writeFileIfChanged(htmlPath, graph.toHtml())
        ];
    }

    async _generateMapArtifacts() {
        const mapper = await new ProjectMapper(this.dna).build();
        const mapPath = path.join(this.dna.root, 'docs', 'ai', 'MAPA_DO_PROJETO.md');
        const indexContent = this._buildIndexMarkdown();
        const indexPath = path.join(this.dna.root, 'docs', 'ai', 'INDICE.md');
        return [
            this._writeFileIfChanged(mapPath, mapper.toMarkdown()),
            this._writeFileIfChanged(indexPath, indexContent)
        ];
    }

    _buildIndexMarkdown() {
        const rows = (require('./links').NOTE_NAMES)
            .map(name => `- [[${name}]] — ${(require('./links').NOTE_DESCRIPTIONS)[name]}`)
            .join('\n');
        return `# Índice da memória (Map of Content)

> Gerado por \`memoria-viva sync\`. Este é o ponto de entrada da memória do projeto, no padrão
> de índice (MOC) da Obsidian. Todo documento da memória se cruza por wiki-links \`[[...]]\`,
> preservando o contexto entre sessões de chat.

## Notas da memória

${rows}

## Como navegar

1. Comece por [[CONTEXTO_ATUAL]] para o snapshot e o DNA comprovado.
2. Veja o mapeamento completo em [[MAPA_DO_PROJETO]] antes de criar pastas ou arquivos.
3. Consulte [[MODULOS_E_REGRAS]] para regras de negócio e [[ROTAS_DETECTADAS]] para o roteamento.
4. Explore relações em [[GRAFO]] e evidências de UI em [[DESIGN_SYSTEM]].
5. Registre o resultado da sessão em [[HANDOFF_ATUAL]].

    ${this._relatedDocs('INDICE')}
`;
    }
}

module.exports = ContextGenerator;
