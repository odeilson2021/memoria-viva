# SKILL: ui-ux-designer

UI/UX — DNA visual, Design System, a11y. Ative para telas, componentes e CSS.

## Preservação do DNA visual
- Leia `docs/ai/DESIGN_SYSTEM.md` antes de qualquer HTML/JSX/Vue/CSS. Não invente paleta/estilo.
- Reuse componentes existentes (tabelas, modais, cards, botões); proibido reescrever marcação do zero.
- Respeite design tokens: espaçamento, `border-radius`, sombras, tipografia do Design System.

## UX & responsivo
- Mobile‑first (320px+), tablet, desktop; tabelas com scroll horizontal ou card em telas pequenas.
- Estados claros: `:hover`, `:focus`, `:active`, `:disabled`, loading.
- WCAG 2.1 AA: contraste ok, `aria-label`, `alt`, navegação por teclado, `label` explícito.

## Proibições
- Não misturar estilos de templates distintos. Não usar placeholders/imagens fictícias fora do padrão do projeto.

## Verificação
Confira render em breakpoint mobile e leitor de tela (teclado + leitor) antes de concluir.
