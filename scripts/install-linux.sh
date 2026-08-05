#!/usr/bin/env bash
# =============================================================================
#  🧠 Memória Viva v2.0 — Instalador Linux / Mac / WSL (Global)
#  Executar com: bash install-linux.sh
# =============================================================================
set -euo pipefail

CYAN='\033[36m'; GREEN='\033[32m'; YELLOW='\033[33m'
RED='\033[31m'; MAGENTA='\033[35m'; DIM='\033[2m'; RESET='\033[0m'

step()  { echo -e "\n${CYAN}🔷 $1${RESET}"; }
ok()    { echo -e "  ${GREEN}✅ $1${RESET}"; }
warn()  { echo -e "  ${YELLOW}⚠️  $1${RESET}"; }
fail()  { echo -e "  ${RED}❌ $1${RESET}"; exit 1; }

echo -e "${MAGENTA}"
cat << 'BANNER'
╔═══════════════════════════════════════════════════════════╗
║     🧠 MEMÓRIA VIVA v2.0 — AI Context & Governance Engine ║
║     Instalação Global para Linux / Mac / WSL                ║
╚═══════════════════════════════════════════════════════════╝
BANNER
echo -e "${RESET}"

# ── Verificar pré-requisitos ──────────────────────────────────
step "Verificando pré-requisitos..."
command -v node  >/dev/null || fail "Node.js não encontrado. Instale o Node.js 18+ primeiro."
command -v npm   >/dev/null || fail "npm não encontrado. Instale o Node.js 18+ primeiro."
command -v git   >/dev/null || warn "Git não encontrado. Alguns recursos podem não funcionar."
ok "Pré-requisitos OK"

# ── Detectar diretório do projeto ─────────────────────────────
step "Detectando diretório do projeto..."
PROJECT_ROOT="$(pwd)"
if [ -d ".git" ]; then
    ok "Projeto Git detectado: $PROJECT_ROOT"
else
    warn "Diretório atual não é um repositório Git."
    ok "Usando: $PROJECT_ROOT"
fi

# ── Instalação global via npm ─────────────────────────────────
step "Instalando Memória Viva globalmente..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

if [ "${DRY_RUN:-}" = "true" ]; then
    ok "[DRY RUN] Executaria: npm install -g ."
    ok "[DRY RUN] Não alteraria PATH."
else
    pushd "$PROJECT_DIR" >/dev/null
    npm install -g . 2>&1 | tail -1
    popd >/dev/null
    ok "Instalação global concluída"
fi

# ── Configurar PATH ───────────────────────────────────────────
step "Configurando variáveis de ambiente PATH..."
NPM_PREFIX="$(npm config get prefix)"
NPM_GLOBAL_BIN="${NPM_PREFIX}/bin"

SHELL_PROFILE=""
if [ -f "$HOME/.bashrc" ]; then
    SHELL_PROFILE="$HOME/.bashrc"
elif [ -f "$HOME/.zshrc" ]; then
    SHELL_PROFILE="$HOME/.zshrc"
fi

if [ -z "$SHELL_PROFILE" ]; then
    warn "Nenhum arquivo de perfil de shell encontrado (.bashrc ou .zshrc)."
    warn "Adicione manualmente: export PATH=\"\$PATH:${NPM_GLOBAL_BIN}\""
else
    PATH_LINE="export PATH=\"\$PATH:${NPM_GLOBAL_BIN}\""

    if grep -qF "$PATH_LINE" "$SHELL_PROFILE" 2>/dev/null; then
        ok "PATH já configurado em: $SHELL_PROFILE"
    else
        if [ "${DRY_RUN:-}" = "true" ]; then
            ok "[DRY RUN] Adicionaria ao PATH em: $SHELL_PROFILE"
        else
            echo "" >> "$SHELL_PROFILE"
            echo "# Memória Viva — PATH global" >> "$SHELL_PROFILE"
            echo "$PATH_LINE" >> "$SHELL_PROFILE"
            ok "PATH adicionado a: $SHELL_PROFILE"
        fi
    fi

    if [ "${DRY_RUN:-}" != "true" ]; then
        source "$SHELL_PROFILE" 2>/dev/null || true
        ok "Shell profile recarregado"
    fi
fi

# ── Verificar instalação ──────────────────────────────────────
step "Verificando instalação..."
if [ "${DRY_RUN:-}" = "true" ]; then
    ok "[DRY RUN] Verificaria: memoria-viva --version"
else
    if command -v memoria-viva >/dev/null 2>&1; then
        VERSION="$(memoria-viva --version 2>/dev/null || echo '2.0.0')"
        ok "memoria-viva está disponível: $VERSION"
    else
        warn "O comando 'memoria-viva' pode não estar disponível ainda."
        warn "Reinicie o terminal para aplicar as alterações do PATH."
    fi
fi

# ── Resumo ────────────────────────────────────────────────────
echo -e "\n${GREEN}✅ MEMÓRIA VIVA v2.0 INSTALADA COM SUCESSO!${RESET}"
echo -e "Projeto: ${GREEN}${PROJECT_ROOT}${RESET}"
echo -e "Escopo: ${GREEN}Global (todos os projetos)${RESET}"
echo -e "\n📋 Próximos passos:"
echo -e "  1. Reinicie qualquer terminal/IDE aberto"
echo -e "  2. Navegue até qualquer projeto"
echo -e "  3. Execute: ${CYAN}memoria-viva init${RESET}"
echo -e "  4. Ou verifique com: ${CYAN}memoria-viva check${RESET}"
echo -e "\n🔌 MCP MySQL/Postgres: .mcp.json"
echo -e "📚 Docs: docs/ai/"