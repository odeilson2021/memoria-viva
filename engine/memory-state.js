'use strict';

const crypto = require('crypto');
const fs = require('fs-extra');
const path = require('path');
const KnowledgeGraph = require('./graph');

const SCHEMA_VERSION = 2;
const READ_FIRST = [
    '.agent/rules.md',
    '.agent/memory.json',
    'docs/ai/HANDOFF_ATUAL.md',
    'docs/ai/MODULOS_E_REGRAS.md'
];
const NOTE = 'Fatos detectados automaticamente. Regras de negocio e decisoes manuais permanecem nos documentos de handoff/modulos.';
const REQUIRED_FILES = [
    'AGENTS.md',
    'CLAUDE.md',
    '.agent/rules.md',
    '.agent/memory.json',
    '.agent/BRIEFING.md',
    '.agent/PROMPT_ENGINE.md',
    '.agent/SKILLS.md',
    '.agent/skills/code-reviewer.md',
    '.agent/skills/database-dba.md',
    '.agent/skills/security-expert.md',
    '.agent/skills/software-architect.md',
    '.agent/skills/ui-ux-designer.md',
    '.github/copilot-instructions.md',
    '.cursor/rules/memoria-viva.mdc',
    'docs/ai/CONTEXTO_ATUAL.md',
    'docs/ai/DESIGN_SYSTEM.md',
    'docs/ai/MODULOS_E_REGRAS.md',
    'docs/ai/HANDOFF_ATUAL.md',
    'docs/ai/ROTAS_DETECTADAS.md',
    'docs/ai/GRAFO.md',
    'docs/ai/GRAFO.html',
    'docs/ai/MAPA_DO_PROJETO.md',
    'docs/ai/INDICE.md'
];

// Human text outside these marker blocks is intentionally excluded from the
// integrity hash. Reference files and the route inventory are wholly managed.
const MANAGED_ARTIFACTS = {
    'AGENTS.md': { markers: ['BOOTSTRAP'] },
    'CLAUDE.md': { markers: ['BOOTSTRAP'] },
    '.agent/rules.md': { markers: ['CORE_RULES', 'STACK_RULES'] },
    '.agent/BRIEFING.md': { full: true },
    '.agent/PROMPT_ENGINE.md': { full: true },
    '.agent/SKILLS.md': { full: true },
    '.agent/skills/code-reviewer.md': { full: true },
    '.agent/skills/database-dba.md': { full: true },
    '.agent/skills/security-expert.md': { full: true },
    '.agent/skills/software-architect.md': { full: true },
    '.agent/skills/ui-ux-designer.md': { full: true },
    '.github/copilot-instructions.md': { markers: ['BOOTSTRAP'] },
    '.cursor/rules/memoria-viva.mdc': { markers: ['BOOTSTRAP'] },
    'docs/ai/CONTEXTO_ATUAL.md': { markers: ['SNAPSHOT'] },
    'docs/ai/DESIGN_SYSTEM.md': { markers: ['DESIGN_EVIDENCE'] },
    'docs/ai/MODULOS_E_REGRAS.md': { markers: ['MODULOS_DETECTADOS'] },
    'docs/ai/HANDOFF_ATUAL.md': { markers: ['STACK_CHECKLIST'] },
    'docs/ai/ROTAS_DETECTADAS.md': { full: true },
    'docs/ai/GRAFO.md': { full: true },
    'docs/ai/GRAFO.html': { full: true },
    'docs/ai/MAPA_DO_PROJETO.md': { full: true },
    'docs/ai/INDICE.md': { full: true }
};
const MANAGED_FILES = Object.keys(MANAGED_ARTIFACTS);

function sortObject(value) {
    if (Array.isArray(value)) return value.map(sortObject);
    if (!value || typeof value !== 'object') return value;
    return Object.keys(value).sort().reduce((result, key) => {
        result[key] = sortObject(value[key]);
        return result;
    }, {});
}

function normalizeText(value) {
    return String(value).replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function normalizeRoutes(routes = []) {
    return routes
        .map(route => ({ method: route.method, path: route.path, module: route.module, file: route.file }))
        .sort((a, b) => `${a.file}\0${a.path}\0${a.method}`.localeCompare(`${b.file}\0${b.path}\0${b.method}`, 'en'));
}

function normalizeDNA(dna) {
    const inventory = dna.inventory || {};
    return sortObject({
        projectName: dna.projectName,
        languages: dna.languages || [dna.language].filter(Boolean),
        language: dna.language,
        framework: dna.framework,
        database: dna.database,
        orm: dna.orm,
        uiFramework: dna.uiFramework,
        structure: dna.structure || {},
        detectedFiles: [...(dna.detectedFiles || [])].sort(),
        validationCommands: [...(dna.validationCommands || [])],
        routes: normalizeRoutes(dna.routes),
        tables: [...(dna.tables || [])].sort(),
        tableEvidence: dna.tableEvidence || 'migration_mentions',
        knowledgeGraph: KnowledgeGraph.extract(dna),
        inventory: {
            sourceFiles: inventory.sourceFiles || 0,
            byExtension: inventory.byExtension || {},
            topLevelEntries: inventory.topLevelEntries || [],
            sourceFingerprint: inventory.sourceFingerprint || null
        }
    });
}

function fingerprint(value) {
    return crypto.createHash('sha256').update(JSON.stringify(sortObject(value))).digest('hex');
}

function statePayload(state) {
    const { integrity, ...payload } = state || {};
    return payload;
}

function marker(id, edge) {
    return `<!-- MEMORIA_VIVA:${id}:${edge} -->`;
}

function extractManagedBlock(content, id, file = 'arquivo') {
    const normalized = normalizeText(content);
    const start = marker(id, 'START');
    const end = marker(id, 'END');
    const startCount = normalized.split(start).length - 1;
    const endCount = normalized.split(end).length - 1;
    if ((startCount === 1 && endCount === 0) || (startCount === 0 && endCount === 1)) {
        throw new Error(`Bloco gerenciado ${id} está incompleto em ${file}; restaure os marcadores START e END.`);
    }
    if (startCount !== 1 || endCount !== 1) {
        throw new Error(`Bloco gerenciado ${id} inválido em ${file}: esperado exatamente um marcador START e um END.`);
    }
    const startIndex = normalized.indexOf(start);
    const endIndex = normalized.indexOf(end);
    if (startIndex >= endIndex) {
        throw new Error(`Bloco gerenciado ${id} inválido em ${file}: marcadores fora de ordem.`);
    }
    return normalized.slice(startIndex, endIndex + end.length);
}

function managedArtifact(content, relativePath) {
    const specification = MANAGED_ARTIFACTS[relativePath];
    if (!specification) throw new Error(`Artefato gerenciado desconhecido: ${relativePath}`);
    if (specification.full) return normalizeText(content);
    return specification.markers
        .map(id => `${id}\0${extractManagedBlock(content, id, relativePath)}`)
        .join('\n');
}

function hashManagedArtifact(content, relativePath) {
    return crypto.createHash('sha256').update(managedArtifact(content, relativePath)).digest('hex');
}

function validateState(state) {
    const issues = [];
    if (!state || Array.isArray(state) || typeof state !== 'object') {
        return ['Estado de memoria invalido: a raiz deve ser um objeto JSON.'];
    }
    if (state.schemaVersion !== SCHEMA_VERSION) {
        issues.push(`Schema de memoria incompativel: ${state.schemaVersion ?? 'ausente'} (esperado ${SCHEMA_VERSION}).`);
    }
    if (!state.integrity || state.integrity !== fingerprint(statePayload(state))) {
        issues.push('Estado de memoria adulterado ou corrompido: integridade interna invalida.');
    }
    if (!state.snapshot || state.fingerprint !== fingerprint(state.snapshot)) {
        issues.push('Estado de memoria corrompido: o fingerprint gravado nao corresponde ao snapshot.');
    }
    if (!state.syncedAt || Number.isNaN(Date.parse(state.syncedAt))) {
        issues.push('Estado de memoria invalido: syncedAt ausente ou ilegivel.');
    }
    if (JSON.stringify(state.readFirst) !== JSON.stringify(READ_FIRST) || state.note !== NOTE) {
        issues.push('Estado de memoria adulterado: metadados de recuperacao divergentes.');
    }
    if (!state.managedFiles || Array.isArray(state.managedFiles) || typeof state.managedFiles !== 'object') {
        issues.push('Estado de memoria invalido: hashes dos artefatos gerenciados ausentes.');
    }
    return issues;
}

async function load(root) {
    const statePath = path.join(root, '.agent', 'memory.json');
    if (!await fs.pathExists(statePath)) return null;
    return fs.readJson(statePath);
}

async function captureManagedFiles(root) {
    const hashes = {};
    for (const relativePath of MANAGED_FILES) {
        const fullPath = path.join(root, relativePath);
        if (!await fs.pathExists(fullPath)) continue;
        const content = await fs.readFile(fullPath, 'utf8');
        hashes[relativePath] = hashManagedArtifact(content, relativePath);
    }
    return sortObject(hashes);
}

async function inspectManagedFiles(root) {
    const hashes = {};
    const issues = [];
    for (const relativePath of MANAGED_FILES) {
        const fullPath = path.join(root, relativePath);
        if (!await fs.pathExists(fullPath)) continue;
        try {
            hashes[relativePath] = hashManagedArtifact(await fs.readFile(fullPath, 'utf8'), relativePath);
        } catch (error) {
            issues.push(error.message);
        }
    }
    return { hashes: sortObject(hashes), issues };
}

async function inspectManagedStructure(root, requireAll = false) {
    const issues = [];
    for (const [relativePath, specification] of Object.entries(MANAGED_ARTIFACTS)) {
        if (!specification.markers) continue;
        const fullPath = path.join(root, relativePath);
        if (!await fs.pathExists(fullPath)) continue;
        const content = await fs.readFile(fullPath, 'utf8');
        for (const id of specification.markers) {
            const start = marker(id, 'START');
            const end = marker(id, 'END');
            const absent = !content.includes(start) && !content.includes(end);
            if (absent && !requireAll) continue;
            try {
                extractManagedBlock(content, id, relativePath);
            } catch (error) {
                issues.push(error.message);
            }
        }
    }
    return [...new Set(issues)];
}

function build(dna, previous = null, managedFiles = {}) {
    const snapshot = normalizeDNA(dna);
    const currentFingerprint = fingerprint(snapshot);
    const previousValid = previous && validateState(previous).length === 0;
    const unchanged = previousValid
        && previous.fingerprint === currentFingerprint
        && fingerprint(previous.managedFiles) === fingerprint(managedFiles);

    const state = {
        schemaVersion: SCHEMA_VERSION,
        syncedAt: unchanged ? previous.syncedAt : new Date().toISOString(),
        fingerprint: currentFingerprint,
        snapshot,
        managedFiles: sortObject(managedFiles),
        readFirst: READ_FIRST,
        note: NOTE
    };
    state.integrity = fingerprint(statePayload(state));
    return state;
}

async function inspect(root, dna) {
    const missingFiles = [];
    for (const relativePath of REQUIRED_FILES) {
        if (!await fs.pathExists(path.join(root, relativePath))) missingFiles.push(relativePath);
    }
    const issues = missingFiles.map(file => `Arquivo obrigatório ausente: ${file}`);
    let state = null;

    if (!missingFiles.includes('.agent/memory.json')) {
        try {
            state = await load(root);
        } catch (error) {
            issues.push(`Estado de memoria invalido: ${error.message}`);
        }
    }

    const managed = await inspectManagedFiles(root);
    issues.push(...managed.issues);
    const currentSnapshot = normalizeDNA(dna);
    const currentFingerprint = fingerprint(currentSnapshot);
    if (state) {
        issues.push(...validateState(state));
        if (state.snapshot && state.fingerprint === fingerprint(state.snapshot) && state.fingerprint !== currentFingerprint) {
            issues.push('Memória desatualizada: o código ou o DNA detectado mudou desde o último sync.');
        }

        if (state.managedFiles && typeof state.managedFiles === 'object' && !Array.isArray(state.managedFiles)) {
            for (const relativePath of MANAGED_FILES) {
                if (!state.managedFiles[relativePath]) {
                    issues.push(`Hash gerenciado ausente no estado: ${relativePath}`);
                } else if (managed.hashes[relativePath] !== state.managedFiles[relativePath]) {
                    issues.push(`Artefato gerenciado alterado apos o sync: ${relativePath}`);
                }
            }
        }
    }

    return {
        healthy: issues.length === 0,
        stale: issues.some(issue => issue.startsWith('Memória desatualizada')),
        issues: [...new Set(issues)],
        missingFiles,
        state,
        currentFingerprint
    };
}

module.exports = {
    MANAGED_ARTIFACTS,
    MANAGED_FILES,
    NOTE,
    READ_FIRST,
    REQUIRED_FILES,
    SCHEMA_VERSION,
    build,
    captureManagedFiles,
    extractManagedBlock,
    fingerprint,
    hashManagedArtifact,
    inspect,
    inspectManagedFiles,
    inspectManagedStructure,
    load,
    managedArtifact,
    normalizeDNA,
    validateState
};
