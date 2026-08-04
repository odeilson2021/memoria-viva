#!/usr/bin/env bash
# =============================================================================
#  🧠 Memória Viva — Instalador Linux / Mac / WSL
#  curl -fsSL https://raw.githubusercontent.com/yuslen/memoria-viva/main/install.sh | bash
# =============================================================================
set -euo pipefail

CYAN='\033[36m'; GREEN='\033[32m'; YELLOW='\033[33m'
RED='\033[31m'; MAGENTA='\033[35m'; DIM='\033[2m'; RESET='\033[0m'

step()  { echo -e "\n${CYAN}🔷 $1${RESET}"; }
ok()    { echo -e "  ${GREEN}✅ $1${RESET}"; }
warn()  { echo -e "  ${YELLOW}⚠️  $1${RESET}"; }
fail()  { echo -e "  ${RED}❌ $1${RESET}"; exit 1; }
ask()   { local p="$1" d="${2:-}"; [[ "${SILENT:-}" == "true" && -n "$d" ]] && { echo "$d"; return; }; read -rp "$p${d:+ [$d]}: " v; echo "${v:-$d}"; }

SILENT=false; [[ "${1:-}" == "--silent" ]] && SILENT=true
KIT_REPO="${KIT_REPO:-https://github.com/yuslen/memoria-viva.git}"

echo -e "${MAGENTA}"
cat << 'BANNER'
╔═══════════════════════════════════════════════════════════╗
║     🧠 MEMÓRIA VIVA — AI Context & Governance Engine      ║
║     Configura agentes de IA no seu projeto em 60s          ║
╚═══════════════════════════════════════════════════════════╝
BANNER
echo -e "${RESET}"

step "Verificando requisitos..."
command -v git  >/dev/null || fail "Git não encontrado."
command -v node >/dev/null || warn "Node.js não encontrado — MCP MySQL não funcionará."
ok "Requisitos OK"

step "Detectando raiz do projeto..."
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
ok "Projeto em: $ROOT"

step "Configuração..."
NAME="${PROJECT_NAME:-$(ask 'Nome do projeto' "$(basename "$ROOT")")}"
STACK="${STACK:-$(ask 'Stack (php-slim4, php-laravel, node)' 'php-slim4')}"

step "Credenciais MySQL..."
echo -e "  ${DIM}(Salvas em .env.mcp — NÃO versionado)${RESET}"
H="${DB_HOST:-$(ask 'Host' '127.0.0.1')}"
P="${DB_PORT:-$(ask 'Porta' '3306')}"
D="${DB_NAME:-$(ask 'Banco' '')}"
U="${DB_USER:-$(ask 'Usuário' 'root')}"
if [[ -z "${DB_PASS:-}" ]]; then read -rsp "Senha: " PW; echo; else PW="$DB_PASS"; fi

step "Baixando Memória Viva..."
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
git clone --depth 1 -q "$KIT_REPO" "$TMP" || fail "Falha ao clonar: $KIT_REPO"
T="$TMP/templates"
ok "Kit baixado"

step "Criando estrutura..."
for d in .agent .cursor docs/ai docs/mcp skills tools config; do mkdir -p "$ROOT/$d"; done
ok "Diretórios criados"

step "Instalando templates..."
DATE="$(date +%Y-%m-%d)"
copy_t() {
    local s="$T/$1" dst="$ROOT/$2"
    [[ ! -f "$s" ]] && return
    [[ -f "$dst" ]] && { warn "Mantido: $2"; return; }
    mkdir -p "$(dirname "$dst")"
    sed -e "s/{{PROJECT_NAME}}/$NAME/g" -e "s/{{STACK}}/$STACK/g" -e "s/{{INSTALL_DATE}}/$DATE/g" "$s" > "$dst"
    ok "Criado: $2"
}
copy_t ".agent/rules.md"             ".agent/rules.md"
copy_t "AGENTS.md"                   "AGENTS.md"
copy_t ".cursorrules"                ".cursorrules"
copy_t "config/mcp_config.json"      "config/mcp_config.json"
copy_t "docs/ai/CONTEXTO_ATUAL.md"   "docs/ai/CONTEXTO_ATUAL.md"
copy_t "docs/ai/MODULOS_E_REGRAS.md" "docs/ai/MODULOS_E_REGRAS.md"
copy_t "docs/ai/HANDOFF_ATUAL.md"    "docs/ai/HANDOFF_ATUAL.md"
copy_t "skills/database-sync.md"     "skills/database-sync.md"
copy_t "skills/route-sanitizer.md"   "skills/route-sanitizer.md"
copy_t "tools/mcp-mysql.js"          "tools/mcp-mysql.js"
copy_t "env.mcp.example"             ".env.mcp.example"
copy_t "SYNC_INSTRUCTIONS.md"        "SYNC_INSTRUCTIONS.md"

step "Gerando .env.mcp..."
ENV="$ROOT/.env.mcp"
if [[ ! -f "$ENV" ]]; then
    cat > "$ENV" << EOF
MYSQL_HOST=$H
MYSQL_PORT=$P
MYSQL_DATABASE=$D
MYSQL_USER=$U
MYSQL_PASSWORD=$PW
MYSQL_CHARSET=utf8mb4
EOF
    ok ".env.mcp criado"
else warn ".env.mcp mantido"; fi

step "Configurando IDEs..."
MCP='{"mcpServers":{"mysql":{"command":"node","args":["tools/mcp-mysql.js"]}}}'
for f in .mcp.json .cursor/mcp.json .vscode/mcp.json; do
    [[ ! -f "$ROOT/$f" ]] && { mkdir -p "$(dirname "$ROOT/$f")"; echo "$MCP" > "$ROOT/$f"; ok "Criado: $f"; }
done
[[ ! -f "$ROOT/opencode.json" ]] && echo '{"$schema":"https://opencode.ai/config.json","mcp":{"mysql":{"type":"local","command":["node","tools/mcp-mysql.js"]}}}' > "$ROOT/opencode.json" && ok "opencode.json"

step "Atualizando .gitignore..."
GI="$ROOT/.gitignore"
for e in ".env.mcp" ".vscode/"; do grep -qF "$e" "$GI" 2>/dev/null || { echo "$e" >> "$GI"; ok "$e"; }; done

echo -e "\n${GREEN}✅ MEMÓRIA VIVA INSTALADA COM SUCESSO!${RESET}"
echo -e "Projeto: ${GREEN}$NAME${RESET} | Stack: ${GREEN}$STACK${RESET}\n"
echo "Próximos passos: preencha .env.mcp, reinicie a IDE e peça ao agente para ler o projeto."
