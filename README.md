# Memória Viva

CLI local para manter um snapshot verificável do projeto e entregá-lo aos agentes de IA — incluindo os fluxos de **vibe coding** — sem obrigá-los a reler todo o repositório a cada sessão.

O Memória Viva nasceu para resolver o problema de contexto em desenvolvimento assistido por IA: o agente perde o raciocínio entre sessões, relev o repositório inteiro (caro e lento) e, pior, inventa fatos sobre uma base de código que não conhece a fundo. Ele empresa um "cérebro de projeto" local, versionável e auditável.

## Para programadores de vibe code

Se você desenvolve "no vibe" — pede à IA para criar, ajustar e explicar código em loop rápido — o Memória Viva é o que mantém o barco no rumo:

- **Memória que sobrevive à sessão.** O agente não começa do zero nem precisa reler tudo: recebe um snapshot compacto e íntegro.
- **Foco no pedido.** O protocolo embutido faz o agente limitar-se ao que foi pedido, provar causa-raiz e não declarar sucesso sem executar validações.
- **Contexto verificável.** Em vez de "acho que é assim", o agente tem stack, rotas, módulos e o grafo de relações comprovados por detecção estática.
- **Segurança contra alucinação.** `check` falha se o código mudou e a memória ficou fria; regras de negócio não são inventadas, só registradas com evidência.
- **Grafo visual.** `GRAFO.md` (Mermaid) e `GRAFO.html` (viewer interativo estilo Obsidian) mostram como módulos, rotas, tabelas e stack se conectam — ótimo para entender o projeto antes de pedir a próxima mudança.

O Memória Viva separa três tipos de informação:

- **Fatos automáticos:** stack, inventário, fingerprint, rotas reconhecidas e tabelas mencionadas em migrations.
- **Contexto confirmado:** arquitetura, regras de negócio e decisões registradas pelo time/agente com evidência.
- **Handoff:** objetivo, causa-raiz, alterações e resultados reais da sessão mais recente.

O código, os testes, os manifests e o schema real continuam sendo a fonte de verdade. Detecção estática não é tratada como regra de negócio.

## Requisitos e instalação

- Node.js 18 ou superior
- npm
- Git é recomendado, mas não obrigatório

O pacote ainda não é publicado no registry público. Instale a partir do clone:

```bash
git clone https://github.com/yuslen/memoria-viva.git
cd memoria-viva
npm install
npm test
npm install -g .
```

Também estão disponíveis `npm run install:win` e `npm run install:linux`.

## Uso recomendado

Na raiz do projeto ou pacote que deve possuir memória própria:

```bash
memoria-viva init
memoria-viva check
memoria-viva context
```

Depois de alterar código, rotas, manifests, migrations ou configuração:

```bash
memoria-viva sync
memoria-viva check
```

Em monorepos, execute no diretório do pacote ou informe a raiz explicitamente:

```bash
memoria-viva sync --root ./apps/api
```

## Arquivos criados pelo `init`

```text
projeto/
├── AGENTS.md
├── CLAUDE.md
├── .agent/
│   ├── memory.json
│   ├── rules.md
│   ├── BRIEFING.md
│   ├── PROMPT_ENGINE.md
│   ├── SKILLS.md
│   └── skills/
├── .cursor/rules/memoria-viva.mdc
├── .github/copilot-instructions.md
    └── docs/ai/
    ├── CONTEXTO_ATUAL.md
    ├── ROTAS_DETECTADAS.md
    ├── GRAFO.md
    ├── GRAFO.html
    ├── MODULOS_E_REGRAS.md
    ├── HANDOFF_ATUAL.md
    └── DESIGN_SYSTEM.md
```

`AGENTS.md`, `CLAUDE.md`, a regra do Cursor e as instruções do Copilot são bootstraps: apontam o agente para o snapshot e o protocolo profissional. Se já existirem, somente o bloco delimitado `MEMORIA_VIVA:BOOTSTRAP` é inserido/atualizado; o restante é preservado.

`BRIEFING.md`, `PROMPT_ENGINE.md`, `SKILLS.md` e `.agent/skills/*.md` são referências normativas gerenciadas pelo pacote. Atualizações corrigem essas cópias; numa instalação antiga sem estado verificável, o conteúdo anterior é salvo em `.agent/backups/` antes da migração. Templates legados conhecidos que continham fatos presumidos também são substituídos por versões factuais, com backup recuperável.

O `init` **não** cria workflow de produção, não aplica migration, não faz commit/push e não altera configurações globais de IDE.

## Como a sincronização funciona

1. O analisador percorre arquivos-fonte e manifests, ignorando dependências, caches, secrets e a própria memória gerada.
2. Um SHA-256 representa o conteúdo inventariado e o DNA detectado.
3. `.agent/memory.json` guarda o snapshot canônico, a data, o fingerprint e hashes dos artefatos automáticos.
4. Blocos `MEMORIA_VIVA:*` são regenerados; texto humano fora deles é preservado e não entra no hash automático.
5. A sincronização faz preflight antes da primeira escrita e usa `.agent/.sync.lock` para impedir dois processos do Memória Viva no mesmo projeto.
6. `check` recalcula fingerprint e hashes, valida JSON, schema, arquivos, ordem/duplicidade de marcadores e metadados de recuperação. Estado ausente, corrompido, adulterado ou divergente retorna código de saída `1`.

Uma terceira sincronização sem mudanças é idempotente: snapshot e timestamp permanecem iguais.

## Protocolo dos agentes

Os arquivos gerados orientam o agente a:

- recuperar memória e checar divergência antes de agir;
- limitar-se ao pedido e ao fora de escopo;
- reproduzir bugs, estabelecer baseline e provar a causa-raiz;
- localizar implementação e consumidores antes de criar/substituir;
- preservar contratos e código funcional;
- executar regressões e validações existentes;
- nunca relatar como aprovado algo que não foi executado/conferido;
- atualizar o handoff com evidência, sem fabricar histórico.

## Comandos

| Comando | Comportamento |
|---------|--------------|
| `memoria-viva init` | Cria arquivos ausentes, bootstraps e primeiro snapshot. |
| `memoria-viva sync` | Atualiza blocos gerenciados e fingerprint. |
| `memoria-viva check` | Valida integridade e atualidade; falha com exit `1`. |
| `memoria-viva status` | Alias atual de `check`, com DNA e saúde. |
| `memoria-viva context` | Exibe resumo compacto do snapshot. |
| `memoria-viva context --json` | Retorna o estado canônico em JSON. |
| `memoria-viva graph` | Imprime o grafo de conhecimento (nós, conexões e backlinks) em Mermaid. |
| `memoria-viva update` | Alias de `sync`; atualiza somente blocos gerenciados. |
| `memoria-viva mcp` | Coleta credenciais e configura MCP MySQL local. |
| `memoria-viva configure` | Usa `.env.mcp`/variáveis existentes para configurar MCP. |

Flags globais: `--root <path>`, `--dry-run`, `--silent`, `--help`, `--version`. Para MCP, `--global` é opt-in e mescla também configurações globais existentes.

## MCP MySQL (opcional)

MCP não é requisito para a memória funcionar. Quando configurado explicitamente:

- credenciais ficam em `.env.mcp`;
- os JSONs das IDEs apontam para `tools/memoria-viva-mcp.js` e não contêm senha;
- o runner usa a versão fixada `1.43.2` e permissões `list,read,utility`;
- configurações e servidores preexistentes são preservados;
- JSON inválido interrompe o processo sem ser substituído;
- `.gitignore` é criado/atualizado antes da configuração local;
- a chave do servidor inclui um hash do caminho, isolando projetos com o mesmo nome de banco.

Use uma conta de banco com o menor privilégio necessário. O runner passa credenciais ao processo-filho por variáveis de ambiente, não por argumentos; ainda assim, proteja a conta local e o arquivo `.env.mcp`.

## Grafo de conhecimento

Inspirado no grafo da Obsidian, o `memoria-viva` deriva um grafo de conhecimento do DNA detectado. Cada conceito vira um nó — módulo, rota, tabela, arquivo ou componente da stack — e cada relação comprovada vira uma aresta (por exemplo, `rota → módulo`, `rota → arquivo`, `tabela → banco`, `framework → ORM`).

- `memoria-viva sync` gera `docs/ai/GRAFO.md` (grafo Mermaid, nós com grau de conexão, conexões e **backlinks por nó**) e `docs/ai/GRAFO.html` (viewer interativo autocontido, estilo Obsidian, com física de grafo e painel de backlinks ao clicar num nó).
- `memoria-viva graph` imprime o grafo Mermaid diretamente no terminal.
- O estado canônico em `.agent/memory.json` inclui `knowledgeGraph` (nós e arestas), exposto por `memoria-viva context --json`.

O grafo é conservador: relações dinâmicas de runtime podem não aparecer, e decisões de negócio seguem exigindo confirmação humana/agente.

## Limites honestos

O Memória Viva reduz releitura e detecta divergência; **não** substitui testes nem compreensão do fluxo afetado. Limites conhecidos:

- **Não entende runtime.** Rotas dinâmicas, grupos, middleware e o schema real do banco vivo não são provados — só há evidência estática de migrations.
- **Não infere regras de negócio nem decisões.** Módulos são *inferidos pelo nome do arquivo*. O grafo liga rota/arquivo → tabela **apenas quando o nome da tabela (vindo das migrations) aparece num contexto SQL no código** — detecção conservadora, sujeita a falso positivo/negativo. Análise profunda de ORM continua fora de escopo. Decisões exigem registro humano/agente.
- **Grafo conservador.** Relações dinâmicas podem não aparecer; trate `GRAFO.*` como auxílio visual, não fonte — o `memory.json` é a fonte canônica.
- **Sem noção de importância.** O fingerprint reage a qualquer mudança de conteúdo, não só às relevantes.
- **Tabelas de migrations são históricas**, não prova do banco atual.
- **Handoff depende de registro real.** O `sync` atualiza apenas o checklist gerenciado; o resultado vem do agente/time.

## Desenvolvimento e validação

```bash
npm test
npm run test:smoke
node --check bin/memoria-viva.js
```

Templates de deploy existentes no repositório são apenas referências e nunca são instalados automaticamente. Revise-os para a stack e infraestrutura reais antes de qualquer uso.
