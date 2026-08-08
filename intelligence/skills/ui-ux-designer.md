<!-- MEMORIA_VIVA:MANAGED_REFERENCE -->

# SKILL: ui-ux-designer

Ative para telas, componentes, CSS, acessibilidade e interação.

## Evidência visual

- Leia `docs/ai/DESIGN_SYSTEM.md`, mas confirme tokens e componentes no código; placeholders não são padrões.
- Localize e reutilize componentes existentes quando atendem ao contrato. Não reescreva uma tela inteira para corrigir um detalhe.
- Preserve framework, breakpoints, estados e linguagem visual comprovados; não invente paleta ou biblioteca.

## Qualidade da alteração

- Use semântica, labels, foco visível, teclado, contraste e texto alternativo conforme o elemento e requisitos reais.
- Verifique estados relevante: vazio, loading, erro, sucesso, disabled e tamanhos de tela afetados.
- Não altere fluxo, copy ou comportamento fora do pedido sob pretexto de consistência visual.

## Verificação

Execute build/testes existentes e valide visualmente os breakpoints/estados afetados. Registre ferramentas e cenários realmente conferidos; se leitor de tela ou navegador alvo não estiver disponível, marque como não executado.
