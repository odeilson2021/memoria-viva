'use strict';

const { relatedDocsSection, NOTE_DESCRIPTIONS, NOTE_NAMES } = require('./links');

/**
 * Constrói o grafo de conhecimento do projeto a partir do DNA detectado.
 *
 * Inspirado no grafo de conhecimento da Obsidian: cada conceito relevante vira
 * um nó (módulo, rota, tabela, arquivo ou componente da stack) e cada relação
 * comprovada vira uma aresta. O grafo também expõe backlinks por nó, ou seja,
 * quem aponta para cada nó — o equivalente aos "links inversos" da Obsidian.
 */
class KnowledgeGraph {
    constructor(dna) {
        this.dna = dna || {};
        this.nodes = [];
        this.edges = [];
        this._nodeIndex = new Map();
    }

    static extract(dna) {
        const graph = new KnowledgeGraph(dna).build();
        return {
            nodes: graph.nodes.map(node => ({ id: node.id, label: node.label, type: node.type })),
            edges: graph.edges.map(edge => ({ source: edge.source, target: edge.target, label: edge.label }))
        };
    }

    _addNode(type, label, idHint) {
        const id = idHint || `${type.charAt(0)}_${this._slug(label)}`;
        const existing = this._nodeIndex.get(id);
        if (existing) return existing;
        const node = { id, label, type };
        this._nodeIndex.set(id, node);
        this.nodes.push(node);
        return node;
    }

    _link(sourceId, targetId, label) {
        if (!this._nodeIndex.has(sourceId) || !this._nodeIndex.has(targetId)) return;
        const key = `${sourceId}\0${targetId}\0${label}`;
        if (this._edgeIndex && this._edgeIndex.has(key)) return;
        (this._edgeIndex || (this._edgeIndex = new Set())).add(key);
        this.edges.push({ source: sourceId, target: targetId, label });
    }

    _fileId(file) {
        return `f_${this._slug(file)}`;
    }

    _routeId(route) {
        return `r_${this._slug(`${route.method}_${route.path}`)}`;
    }

    _moduleId(name) {
        return `m_${this._slug(name)}`;
    }

    _slug(value, maxLength = 56) {
        const slug = String(value)
            .replace(/[^A-Za-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .slice(0, maxLength);
        return slug || 'n';
    }

    _label(value) {
        return String(value === undefined || value === null || value === '' ? '—' : value)
            .replace(/\|/g, '\\|')
            .replace(/[\r\n]+/g, ' ');
    }

    build() {
        this.nodes = [];
        this.edges = [];
        this._nodeIndex = new Map();
        this._edgeIndex = new Set();

        this._buildStack();
        this._buildModules();
        this._buildTables();

        return this;
    }

    _buildStack() {
        const dna = this.dna;
        const order = ['language', 'framework', 'orm', 'database', 'uiFramework'];
        const sequence = order
            .map(field => ({ field, value: dna[field] }))
            .filter(entry => entry.value && entry.value !== 'Unknown');

        const ids = [];
        for (const entry of sequence) {
            const node = this._addNode('stack', this._label(entry.value), `s_${entry.field}`);
            ids.push(node.id);
        }
        for (let index = 0; index < ids.length - 1; index++) {
            this._link(ids[index], ids[index + 1], 'compõe a stack');
        }
    }

    _buildModules() {
        const routes = this.dna.routes || [];
        const groups = {};
        for (const route of routes) {
            const moduleName = route.module || 'Geral';
            (groups[moduleName] = groups[moduleName] || new Set()).add(route.file);
        }

        for (const moduleName of Object.keys(groups).sort()) {
            const moduleId = this._addNode('module', this._label(moduleName), this._moduleId(moduleName)).id;
            for (const file of [...groups[moduleName]].sort()) {
                const fileId = this._addNode('file', this._label(file), this._fileId(file)).id;
                this._link(moduleId, fileId, 'implementada em');
            }
        }

        for (const route of routes) {
            const routeId = this._addNode(
                'route',
                `${this._label(route.method)} ${this._label(route.path)}`,
                this._routeId(route)
            ).id;
            const moduleId = this._addNode('module', this._label(route.module || 'Geral'), this._moduleId(route.module || 'Geral')).id;
            this._link(routeId, moduleId, 'pertence a');
            const fileId = this._addNode('file', this._label(route.file), this._fileId(route.file)).id;
            this._link(routeId, fileId, 'definida em');
        }
    }

    _buildTables() {
        const tables = this.dna.tables || [];
        if (!tables.length) return;
        const databaseId = this.dna.database && this.dna.database !== 'Unknown'
            ? this._addNode('stack', this._label(this.dna.database), 's_database').id
            : null;
        const usage = this.dna.tableUsage || {};
        const routesByFile = {};
        for (const route of this.dna.routes || []) {
            (routesByFile[route.file] = routesByFile[route.file] || []).push(route);
        }

        for (const table of tables.sort()) {
            const tableId = this._addNode('table', this._label(table), `t_${this._slug(table)}`).id;
            if (databaseId) this._link(tableId, databaseId, 'armazenada em');

            for (const file of [...new Set(usage[table] || [])].sort()) {
                const fileId = this._addNode('file', this._label(file), this._fileId(file)).id;
                this._link(fileId, tableId, 'acessa tabela');
                for (const route of routesByFile[file] || []) {
                    const routeId = this._addNode(
                        'route',
                        `${this._label(route.method)} ${this._label(route.path)}`,
                        this._routeId(route)
                    ).id;
                    this._link(routeId, tableId, 'acessa tabela');
                }
            }
        }
    }

    backlinks() {
        const incoming = {};
        for (const edge of this.edges) {
            (incoming[edge.target] = incoming[edge.target] || []).push(edge);
        }
        return incoming;
    }

    _mermaid() {
        if (!this.nodes.length) {
            return 'graph TD\n  empty["Nenhum nó detectado estaticamente"]';
        }

        const lines = ['graph TD'];
        const byType = {
            stack: 'stackNode',
            module: 'moduleNode',
            route: 'routeNode',
            file: 'fileNode',
            table: 'tableNode'
        };
        const colorDefinition = {
            stackNode: 'fill:#1f2937,stroke:#60a5fa,color:#e5e7eb',
            moduleNode: 'fill:#0f766e,stroke:#5eead4,color:#ecfeff',
            routeNode: 'fill:#7c2d12,stroke:#fb923c,color:#fff7ed',
            fileNode: 'fill:#374151,stroke:#9ca3af,color:#f3f4f6',
            tableNode: 'fill:#4c1d95,stroke:#c4b5fd,color:#f5f3ff'
        };
        for (const [className, style] of Object.entries(colorDefinition)) {
            lines.push(`  classDef ${className} ${style};`);
        }

        for (const node of this.nodes) {
            const safeLabel = node.label.replace(/"/g, "'");
            lines.push(`  ${node.id}["${safeLabel}"]`);
            lines.push(`  class ${node.id} ${byType[node.type]};`);
        }
        for (const edge of this.edges) {
            const safeLabel = edge.label.replace(/"/g, "'");
            lines.push(`  ${edge.source} -->|${safeLabel}| ${edge.target}`);
        }
        return lines.join('\n');
    }

    _nodesTable() {
        const incoming = this.backlinks();
        const rows = this.nodes
            .slice()
            .sort((a, b) => a.type.localeCompare(b.type) || a.label.localeCompare(b.label))
            .map(node => {
                const degree = (incoming[node.id] || []).length
                    + this.edges.filter(edge => edge.source === node.id).length;
                return `| ${this._label(node.type)} | ${node.label} | ${degree} |`;
            });
        return rows.length ? rows.join('\n') : '| — | nenhum nó | 0 |';
    }

    _edgesTable() {
        if (!this.edges.length) return '| — | — | nenhum vínculo detectado |';
        const labelOf = id => (this._nodeIndex.get(id) || {}).label || id;
        return this.edges
            .slice()
            .sort((a, b) => `${labelOf(a.source)}\0${a.label}`.localeCompare(`${labelOf(b.source)}\0${b.label}`))
            .map(edge => `| ${labelOf(edge.source)} | ${this._label(edge.label)} | ${labelOf(edge.target)} |`)
            .join('\n');
    }

    _backlinksSection() {
        const incoming = this.backlinks();
        const labelOf = id => (this._nodeIndex.get(id) || {}).label || id;
        const sections = [];
        for (const node of this.nodes.slice().sort((a, b) => a.label.localeCompare(b.label))) {
            const links = (incoming[node.id] || []).slice().sort((a, b) => labelOf(a.source).localeCompare(labelOf(b.source)));
            if (!links.length) continue;
            const bullets = links
                .map(edge => `- de \`${labelOf(edge.source)}\` via _${edge.label}_`)
                .join('\n');
            sections.push(`### ${node.label}\n\n${bullets}`);
        }
        return sections.length ? sections.join('\n\n') : '_Nenhum backlink estático detectado._';
    }

    toMarkdown() {
        return `# Grafo de conhecimento do projeto

> Gerado por \`memoria-viva sync\`. Inspirado no grafo de conhecimento da Obsidian: mostra os nós
> (módulos, rotas, tabelas, arquivos e componentes da stack) e suas conexões comprovadas, com
> backlinks por nó. Detecção estática conservadora; relações dinâmicas podem não aparecer.

## Visão do grafo

\`\`\`mermaid
${this._mermaid()}
\`\`\`

## Nós

| Tipo | Rótulo | Conexões (grau) |
|------|--------|-----------------|
${this._nodesTable()}

## Conexões

| Origem | Relação | Destino |
|--------|---------|---------|
${this._edgesTable()}

## Backlinks por nó

${this._backlinksSection()}

${relatedDocsSection('GRAFO')}
`;
    }

    toHtml() {
        const data = {
            project: this._label(this.dna.projectName || 'projeto'),
            nodes: this.nodes,
            edges: this.edges,
            backlinks: this.backlinks()
        };
        const payload = JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
        const colors = {
            stack: '#60a5fa',
            module: '#5eead4',
            route: '#fb923c',
            file: '#9ca3af',
            table: '#c4b5fd'
        };
        return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Grafo de conhecimento — ${data.project}</title>
<style>
  :root { color-scheme: dark; }
  body { margin: 0; background: #0b0f17; color: #e5e7eb; font: 14px/1.4 system-ui, sans-serif; }
  header { padding: 12px 16px; border-bottom: 1px solid #1f2937; }
  header h1 { margin: 0; font-size: 16px; }
  header p { margin: 4px 0 0; color: #94a3b8; font-size: 12px; }
  #graph { width: 100%; height: calc(100vh - 120px); display: block; }
  .legend span { display: inline-block; margin-right: 12px; }
  .dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 4px; vertical-align: middle; }
  .node text { fill: #e5e7eb; font-size: 11px; pointer-events: none; }
  .link { stroke: #334155; stroke-width: 1; }
  .node circle { stroke: #0b0f17; stroke-width: 1.5; cursor: pointer; }
  #panel { position: fixed; right: 16px; top: 64px; width: 280px; max-height: 70vh; overflow: auto;
           background: #111827; border: 1px solid #1f2937; border-radius: 8px; padding: 12px; display: none; }
  #panel h2 { margin: 0 0 6px; font-size: 13px; }
  #panel ul { margin: 6px 0 0; padding-left: 16px; }
  #empty { color: #94a3b8; padding: 24px; }
</style>
</head>
<body>
<header>
  <h1>Grafo de conhecimento — ${data.project}</h1>
  <p>Gerado por <code>memoria-viva sync</code>. Inspirado no grafo da Obsidian. Detecção estática conservadora.</p>
  <div class="legend">
    <span><i class="dot" style="background:${colors.stack}"></i>stack</span>
    <span><i class="dot" style="background:${colors.module}"></i>módulo</span>
    <span><i class="dot" style="background:${colors.route}"></i>rota</span>
    <span><i class="dot" style="background:${colors.file}"></i>arquivo</span>
    <span><i class="dot" style="background:${colors.table}"></i>tabela</span>
  </div>
</header>
<svg id="graph"></svg>
<div id="panel"><h2 id="panel-title"></h2><div id="panel-body"></div></div>
<script>
const DATA = ${payload};
const COLORS = ${JSON.stringify(colors)};
const W = () => document.getElementById('graph').clientWidth;
const H = () => document.getElementById('graph').clientHeight;
const svg = document.getElementById('graph');
const SVGNS = 'http://www.w3.org/2000/svg';
const backlinks = DATA.backlinks || {};

function byId(id) { return DATA.nodes.find(n => n.id === id); }

const nodes = DATA.nodes.map((n, i) => ({
  ...n,
  x: W() / 2 + Math.cos(i) * 120 + (Math.random() - 0.5) * 40,
  y: H() / 2 + Math.sin(i) * 120 + (Math.random() - 0.5) * 40,
  vx: 0, vy: 0
}));
const edges = DATA.edges.map(e => ({ ...e }));

function tick() {
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j];
      let dx = a.x - b.x, dy = a.y - b.y;
      let d2 = dx * dx + dy * dy || 1;
      const f = 1600 / d2;
      const d = Math.sqrt(d2);
      const fx = (dx / d) * f, fy = (dy / d) * f;
      a.vx += fx; a.vy += fy; b.vx -= fx; b.vy -= fy;
    }
  }
  for (const e of edges) {
    const a = nodes.find(n => n.id === e.source), b = nodes.find(n => n.id === e.target);
    if (!a || !b) continue;
    let dx = b.x - a.x, dy = b.y - a.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    const f = (d - 110) * 0.02;
    const fx = (dx / d) * f, fy = (dy / d) * f;
    a.vx += fx; a.vy += fy; b.vx -= fx; b.vy -= fy;
  }
  for (const n of nodes) {
    n.vx += (W() / 2 - n.x) * 0.002;
    n.vy += (H() / 2 - n.y) * 0.002;
    n.vx *= 0.85; n.vy *= 0.85;
    n.x = Math.max(20, Math.min(W() - 20, n.x + n.vx));
    n.y = Math.max(20, Math.min(H() - 20, n.y + n.vy));
  }
}

function render() {
  svg.setAttribute('viewBox', '0 0 ' + W() + ' ' + H());
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  for (const e of edges) {
    const a = nodes.find(n => n.id === e.source), b = nodes.find(n => n.id === e.target);
    if (!a || !b) continue;
    const line = document.createElementNS(SVGNS, 'line');
    line.setAttribute('x1', a.x); line.setAttribute('y1', a.y);
    line.setAttribute('x2', b.x); line.setAttribute('y2', b.y);
    line.setAttribute('class', 'link');
    line.setAttribute('data-source', e.source); line.setAttribute('data-target', e.target);
    svg.appendChild(line);
  }
  for (const n of nodes) {
    const g = document.createElementNS(SVGNS, 'g');
    g.setAttribute('class', 'node');
    g.setAttribute('transform', 'translate(' + n.x + ',' + n.y + ')');
    const c = document.createElementNS(SVGNS, 'circle');
    const r = n.type === 'route' || n.type === 'table' ? 8 : 10;
    c.setAttribute('r', r);
    c.setAttribute('fill', COLORS[n.type] || '#9ca3af');
    g.appendChild(c);
    const t = document.createElementNS(SVGNS, 'text');
    t.setAttribute('x', r + 4); t.setAttribute('y', 4);
    t.textContent = n.label;
    g.appendChild(t);
    g.addEventListener('click', () => showPanel(n));
    svg.appendChild(g);
  }
}

function showPanel(n) {
  const panel = document.getElementById('panel');
  document.getElementById('panel-title').textContent = n.label + ' (' + n.type + ')';
  const links = (backlinks[n.id] || []).slice().sort((a, b) => byId(a.source).label.localeCompare(byId(b.source).label));
  const out = [];
  out.push('<p>Conexões de saída:</p><ul>');
  for (const e of edges.filter(e => e.source === n.id)) {
    out.push('<li>' + e.label + ' → <b>' + (byId(e.target) || {}).label + '</b></li>');
  }
  out.push('</ul><p>Backlinks (' + links.length + '):</p><ul>');
  for (const e of links) {
    out.push('<li>de <b>' + (byId(e.source) || {}).label + '</b> via ' + e.label + '</li>');
  }
  out.push('</ul>');
  document.getElementById('panel-body').innerHTML = out.join('');
  panel.style.display = 'block';
}

document.getElementById('graph').addEventListener('click', e => {
  if (e.target.tagName === 'svg') document.getElementById('panel').style.display = 'none';
});

let frame = 0;
function loop() {
  tick();
  render();
  if (frame++ < 400) requestAnimationFrame(loop);
  else render();
}
if (!nodes.length) {
  const p = document.createElement('div');
  p.id = 'empty';
  p.textContent = 'Nenhum nó detectado estaticamente.';
  document.body.appendChild(p);
} else {
  loop();
  window.addEventListener('resize', render);
}
</script>
<footer style="padding:12px 16px;color:#94a3b8;font-size:12px;border-top:1px solid #1f2937;">
  <strong>Documentos relacionados (padrão Obsidian):</strong>
  ${NOTE_NAMES.filter(n => n !== 'GRAFO').map(n => `<a style="color:#60a5fa" href="${n}.md">${n}</a> — ${NOTE_DESCRIPTIONS[n]}`).join(' · ')}
</footer>
</body>
</html>
`;
    }
}

module.exports = KnowledgeGraph;
