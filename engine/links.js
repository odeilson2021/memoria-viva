'use strict';

/**
 * Registros do "cérebro" de documentos do Memória Viva, no padrão de
 * referência entre notas da Obsidian. Cada documento gerenciado vira uma
 * "nota" endereçável por `[[NOME]]`, e os documentos se cruzam por links
 * (wiki-links) para que o contexto se mantenha vivo entre sessões de chat.
 */

const NOTE_DESCRIPTIONS = {
    CONTEXTO_ATUAL: 'snapshot automático e DNA comprovado do projeto',
    ROTAS_DETECTADAS: 'rotas detectadas estaticamente e seus módulos',
    GRAFO: 'grafo de conhecimento (nós, conexões e backlinks)',
    MODULOS_E_REGRAS: 'módulos inferidos e regras de negócio confirmadas',
    HANDOFF_ATUAL: 'registro da sessão atual e checklist de validação',
    DESIGN_SYSTEM: 'evidências de UI/design detectadas',
    MAPA_DO_PROJETO: 'mapeamento completo de pastas, rotas e caminhos de documentação',
    INDICE: 'índice central (Map of Content) da memória do projeto'
};

const NOTE_NAMES = Object.keys(NOTE_DESCRIPTIONS);

function wikilink(name, alias) {
    return alias ? `[[${name}|${alias}]]` : `[[${name}]]`;
}

function relatedDocsSection(selfName) {
    const lines = ['## Documentos relacionados (padrão Obsidian)', ''];
    for (const name of NOTE_NAMES) {
        if (name === selfName) continue;
        lines.push(`- ${wikilink(name)} — ${NOTE_DESCRIPTIONS[name]}`);
    }
    lines.push('', '_Estes vínculos preservam o contexto do projeto entre sessões de chat e evitam perda de memória do agente._');
    return lines.join('\n');
}

function resolveNotePath(name) {
    return `docs/ai/${name}.md`;
}

module.exports = {
    NOTE_NAMES,
    NOTE_DESCRIPTIONS,
    wikilink,
    relatedDocsSection,
    resolveNotePath
};
