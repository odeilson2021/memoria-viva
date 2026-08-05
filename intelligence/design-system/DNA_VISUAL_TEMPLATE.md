# 🎨 DNA VISUAL & DESIGN SYSTEM DO PROJETO

> **Memória Viva — Guia de Identidade Visual e Componentes.**
> Qualquer agente de IA DEVE consultar este documento antes de criar ou alterar interfaces.
> Proibido criar componentes com cores, fontes ou estilos desalinhados deste padrão.

---

## 🎨 1. PALETA DE CORES (DESIGN TOKENS)

| Papel | Tom / Hex | Classe Utililitária / Variável | Uso |
|-------|-----------|--------------------------------|-----|
| **Primária (Brand)** | `#2563EB` | `bg-blue-600` / `var(--primary)` | Botões principais, links ativos, destaques |
| **Secundária** | `#475569` | `bg-slate-600` / `var(--secondary)` | Botões secundários, bordas, badges |
| **Sucesso** | `#16A34A` | `bg-green-600` / `var(--success)` | Status ativo, mensagens de confirmação |
| **Alerta / Perigo** | `#DC2626` | `bg-red-600` / `var(--danger)` | Botões de exclusão, erros, alertas |
| **Aviso** | `#D97706` | `bg-amber-600` / `var(--warning)` | Avisos pendentes, rascunhos |
| **Background Principal** | `#F8FAFC` | `bg-slate-50` / `var(--bg-main)` | Fundo geral da aplicação |
| **Superfície / Card** | `#FFFFFF` | `bg-white` / `var(--bg-surface)` | Cards, modais, painéis |
| **Texto Principal** | `#0F172A` | `text-slate-900` / `var(--text-main)` | Títulos e corpo principal |
| **Texto Muted** | `#64748B` | `text-slate-500` / `var(--text-muted)` | Subtítulos, timestamps, placeholders |

---

## 🔤 2. TIPOGRAFIA & ESPAÇAMENTO

- **Fonte Principal:** `Inter`, `Roboto`, `system-ui`, `-apple-system`, sans-serif
- **Escala de Títulos:**
  - `H1`: 24px (1.5rem) - Bold (700)
  - `H2`: 20px (1.25rem) - SemiBold (600)
  - `H3`: 16px (1rem) - Medium (500)
- **Border Radius Padrão:** `8px` (`rounded-lg`)
- **Sombras:** `0 1px 3px 0 rgb(0 0 0 / 0.1)` (`shadow-sm` para cards, `shadow-xl` para modais)

---

## 🧱 3. PADRÃO DE COMPONENTES REUTILIZÁVEIS

### A. Botões (`.btn`)
- **Primário:** Fundo Primário, Texto Branco, Padding `0.5rem 1rem`, `rounded-lg`, Hover suave.
- **Secundário:** Fundo Transparente com Borda Slate, Texto Slate-700.
- **Loading State:** Deve desabilitar o clique (`disabled`) e exibir um ícone de spinner animado.

### B. Tabelas de Dados (`.data-table`)
- Cabecalho com fundo `bg-slate-100`, texto em caixa alta `text-xs font-semibold text-slate-500`.
- Linhas com efeito hover `hover:bg-slate-50`.
- Paginação fixada ao rodapé.

### C. Modais & Dialogs (`.modal`)
- Overlay escuro com opacidade (`bg-black/50` / `backdrop-blur-sm`).
- Caixa de modal centralizada, fundo branco, `rounded-xl`, cabeçalho com botão fechar (X).

---

## 🛠️ 4. FRAMEWORK DE ESTILIZAÇÃO EM USO

- **Framework Principal:** *(ex: Bootstrap 5.3, Tailwind CSS 3.4, HTML Puro + CSS Vanilla)*
- **Biblioteca de Ícones:** *(ex: Lucide Icons, FontAwesome, Heroicons)*
