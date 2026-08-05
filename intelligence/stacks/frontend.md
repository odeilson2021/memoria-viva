# 🎨 DIRETRIZES DE TECNOLOGIA: FRONTEND & UI

> **Escopo:** Componentização, CSS, Design Tokens, Estado e Performance Visual para Web Applications.

---

## 🎨 1. COMPONENTIZAÇÃO E CLEAN HTML

1. **Semântica HTML5:**
   - Utilizar elementos semânticos apropriados: `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<aside>`, `<footer>`.
   - Elementos interativos DEVEM utilizar `<button>` ou `<a>` com atributo `href` válido.

2. **Componentização Modular:**
   - Evitar arquivos gigantescos de template com milhares de linhas.
   - Extrair partes reutilizáveis em componentes isolados (ex: Header, Sidebar, Modal, DataTable, ActionCard).

---

## 💅 2. ESTILIZAÇÃO E FRAMEWORKS CSS

1. **Uso de Design Tokens:**
   - Definir variáveis CSS nativas (`:root { --primary-color: #...; }`) ou utilizar a configuração customizada do Tailwind CSS (`tailwind.config.js`).
   - Evitar valores *hardcoded* arbitrários espalhados no código (ex: `style="color: #3b82f6"`).

2. **Acessibilidade Visual:**
   - Garantir alto contraste de cores para leitura.
   - Suporte a estados de foco visíveis (`outline` / `ring`) para navegabilidade por teclado.

---

## ⚡ 3. PERFORMANCE E ASSETS
- **Lazy Loading:** Imagens abaixo da dobra DEVEM utilizar `loading="lazy"`.
- **Minificação:** Bundles CSS e JS minificados em builds de produção.
