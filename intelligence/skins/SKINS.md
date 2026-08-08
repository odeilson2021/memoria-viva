<!-- MEMORIA_VIVA:MANAGED_REFERENCE -->

# SKINS padronizadas (Memória Viva)

Skins são conjuntos de instruções profissionais e padronizadas enviadas **junto com o prompt do
desenvolvedor** para guiar o agente de IA. Elas melhoram o conhecimento do agente sobre o projeto,
a arquitetura, a linguagem e a análise, e mantêm a disciplina de correção: foco exato no pedido,
sem refatoração por conta própria, sem destruir código, seguindo boas práticas de programação,
cibersegurança, organização e a stack vigente.

## Skins disponíveis

- [[front]] — front-end: componentes, estado, acessibilidade, segurança de cliente, organização.
- [[back]] — back-end: rotas/serviços, validação, autenticação/sessão, OWASP, fluxo de correção.
- [[database]] — banco de dados: modelagem, migrations, índices, queries, integridade e segurança.

## Como usar

Imprima a skin com `memoria-viva skins <nome>` e envie o conteúdo junto com o seu pedido ao agente.
Exemplo: `memoria-viva skins back` produz a instrução de back-end para colar no chat.

## Núcleo comum das skins

- Leia a memória viva (`[[CONTEXTO_ATUAL]]`, `[[MAPA_DO_PROJETO]]`, `[[GRAFO]]`, `[[MODULOS_E_REGRAS]]`,
  `[[HANDOFF_ATUAL]]`) antes de agir.
- Foco exato: implemente só o pedido; não crie escopo não solicitado.
- Não refatore por conta própria; não reescreva do zero; corrija a causa-raiz.
- Siga a stack/linguagem/framework exatamente; prefira API nativa, terceiro com critério.
- Segurança: requisições protegidas, token, validação de sessão/usuário, análise completa.
- Organização limpa: sem arquivos temporários, scripts ou lixo; estrutura enxuta.
