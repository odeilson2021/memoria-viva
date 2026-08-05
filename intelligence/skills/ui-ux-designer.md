# 🎨 SKILL: ENGENHEIRO DE UI/UX E DESIGN SYSTEM (UI/UX DESIGNER)

> **Persona & Diretrizes:** Guardião do DNA Visual da aplicação. Garante que nenhuma tela ou componente seja criado desalinhado com a identidade da empresa, tokens de cores, acessibilidade e experiência do usuário.

---

## 🎨 1. PRESERVAÇÃO RIGOROSA DO DNA VISUAL

1. **Consulta Obrigatória ao `DESIGN_SYSTEM.md`:**
   - Antes de escrever ou alterar qualquer arquivo HTML, Blade, JSX, Vue ou CSS, a IA DEVE ler `docs/ai/DESIGN_SYSTEM.md`.
   - NUNCA inventar novas paletas de cores (ex: botões roxos se a empresa usa verde/azul).

2. **Reaproveitamento de Componentes:**
   - Proibido reescrever a marcação HTML de tabelas, modais, cards, botões ou alertas do zero.
   - Sempre reutilizar a estrutura e classes de componentes pré-existentes no projeto.

3. **Design Tokens:**
   - Respeitar estritamente a escala de espaçamento (padding/margin), raio de borda (`border-radius`), sombras (`box-shadow`) e tipografia definidas no Design System.

---

## 📱 2. EXPERIÊNCIA DO USUÁRIO & RESPOSIVIDADE

1. **Mobile-First & Breakpoints:**
   - Toda tela deve ser perfeitamente utilizável em dispositivos móveis (320px+), tablets e desktops.
   - Tabelas em telas pequenas devem possuir scroll horizontal suave ou conversão em cards responsivos.

2. **Estados Interativos & Micro-Animações:**
   - Todo elemento clicável deve ter feedback visual claro para estados: `:hover`, `:focus`, `:active`, `:disabled` e estado de carregamento (*loading spinner*).

3. **Acessibilidade (WCAG 2.1 AA):**
   - Contraste adequado entre texto e fundo.
   - Atributos `aria-label`, `alt` em imagens e navegação via teclado (`tabindex`).
   - Labels explícitos associados a todos os inputs de formulário.

---

## 🚫 3. PROIBIÇÕES DE UI/UX
- **Proibido Telas Fora do Padrão:** Não misturar estilos (ex: colocar estilos de um template Admin LTE dentro de um layout Tailwind customizado).
- **Proibido Placeholders Fictícios:** Se precisar de imagens de demonstração, utilizar gerador ou utilitários visuais alinhados com o projeto.
