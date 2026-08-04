#!/usr/bin/env pwsh
# =============================================================================
#  🧠 Memória Viva — Instalador Windows (PowerShell)
#  irm https://raw.githubusercontent.com/yuslen/memoria-viva/main/install.ps1 | iex
# =============================================================================
param(
    [string]$ProjectName = "",
    [string]$Stack       = "",
    [string]$DbHost      = "",
    [string]$DbPort      = "3306",
    [string]$DbName      = "",
    [string]$DbUser      = "",
    [string]$DbPass      = "",
    [string]$KitRepo     = "https://github.com/yuslen/memoria-viva.git",
    [switch]$Silent      = $false
)
Set-StrictMode -Version Latest; $ErrorActionPreference = "Stop"

function Write-Step  { param($m) Write-Host "`n🔷 $m" -ForegroundColor Cyan }
function Write-OK    { param($m) Write-Host "  ✅ $m" -ForegroundColor Green }
function Write-Warn  { param($m) Write-Host "  ⚠️  $m" -ForegroundColor Yellow }
function Write-Fail  { param($m) Write-Host "  ❌ $m" -ForegroundColor Red; exit 1 }
function Ask { param($p,$d="") if($Silent -and $d){return $d}; $v=Read-Host "$p$(if($d){" [$d]"})"; if(!$v){return $d}; return $v }

Clear-Host
Write-Host @"
╔═══════════════════════════════════════════════════════════╗
║     🧠 MEMÓRIA VIVA — AI Context & Governance Engine      ║
║     Configura agentes de IA no seu projeto em 60s          ║
╚═══════════════════════════════════════════════════════════╝
"@ -ForegroundColor Magenta

Write-Step "Verificando requisitos..."
if (-not (Get-Command git  -EA SilentlyContinue)) { Write-Fail "Git não encontrado." }
if (-not (Get-Command node -EA SilentlyContinue)) { Write-Warn "Node.js não encontrado — MCP não funcionará." }
Write-OK "Requisitos OK"

Write-Step "Detectando raiz do projeto..."
$Root = git rev-parse --show-toplevel 2>$null
if (-not $Root) { $Root = (Get-Location).Path; Write-Warn "Não é repositório Git. Usando: $Root" }
else { Write-OK "Projeto em: $Root" }

Write-Step "Configuração..."
if (-not $ProjectName) { $ProjectName = Ask "Nome do projeto" (Split-Path $Root -Leaf) }
if (-not $Stack)       { $Stack = Ask "Stack (php-slim4, php-laravel, node)" "php-slim4" }

Write-Step "Credenciais MySQL..."
Write-Host "  (Salvas em .env.mcp — NÃO versionado)" -ForegroundColor Gray
if (-not $DbHost) { $DbHost = Ask "Host"    "127.0.0.1" }
if (-not $DbPort) { $DbPort = Ask "Porta"   "3306" }
if (-not $DbName) { $DbName = Ask "Banco"   "" }
if (-not $DbUser) { $DbUser = Ask "Usuário" "root" }
if (-not $DbPass) {
    $sec = Read-Host "Senha" -AsSecureString
    $DbPass = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))
}

Write-Step "Baixando Memória Viva..."
$Tmp = Join-Path $env:TEMP "memoria-viva-$(Get-Random)"
try { git clone --depth 1 --quiet $KitRepo $Tmp; Write-OK "Kit baixado" }
catch { Write-Fail "Falha ao clonar: $KitRepo" }
$T = Join-Path $Tmp "templates"

Write-Step "Criando estrutura..."
@(".agent",".cursor","docs\ai","docs\mcp","skills","tools","config") | ForEach-Object {
    New-Item -ItemType Directory -Force -Path (Join-Path $Root $_) | Out-Null
}
Write-OK "Diretórios criados"

Write-Step "Instalando templates..."
$Date = Get-Date -Format "yyyy-MM-dd"
function CopyT($src,$dst) {
    $s = Join-Path $T $src; $d = Join-Path $Root $dst
    if (-not (Test-Path $s)) { return }
    if (Test-Path $d) { Write-Warn "Mantido: $dst"; return }
    $content = (Get-Content $s -Raw) -replace '\{\{PROJECT_NAME\}\}',$ProjectName `
        -replace '\{\{STACK\}\}',$Stack -replace '\{\{INSTALL_DATE\}\}',$Date
    New-Item -ItemType File -Force -Path $d | Out-Null
    Set-Content $d $content -Encoding UTF8
    Write-OK "Criado: $dst"
}
CopyT ".agent\rules.md"             ".agent\rules.md"
CopyT "AGENTS.md"                   "AGENTS.md"
CopyT ".cursorrules"                ".cursorrules"
CopyT "config\mcp_config.json"      "config\mcp_config.json"
CopyT "docs\ai\CONTEXTO_ATUAL.md"   "docs\ai\CONTEXTO_ATUAL.md"
CopyT "docs\ai\MODULOS_E_REGRAS.md" "docs\ai\MODULOS_E_REGRAS.md"
CopyT "docs\ai\HANDOFF_ATUAL.md"    "docs\ai\HANDOFF_ATUAL.md"
CopyT "skills\database-sync.md"     "skills\database-sync.md"
CopyT "skills\route-sanitizer.md"   "skills\route-sanitizer.md"
CopyT "tools\mcp-mysql.js"          "tools\mcp-mysql.js"
CopyT "env.mcp.example"             ".env.mcp.example"
CopyT "SYNC_INSTRUCTIONS.md"        "SYNC_INSTRUCTIONS.md"

Write-Step "Gerando .env.mcp..."
$EnvFile = Join-Path $Root ".env.mcp"
if (-not (Test-Path $EnvFile)) {
    @"
MYSQL_HOST=$DbHost
MYSQL_PORT=$DbPort
MYSQL_DATABASE=$DbName
MYSQL_USER=$DbUser
MYSQL_PASSWORD=$DbPass
MYSQL_CHARSET=utf8mb4
"@ | Set-Content $EnvFile -Encoding UTF8
    Write-OK ".env.mcp criado"
} else { Write-Warn ".env.mcp mantido" }

Write-Step "Configurando IDEs..."
$Mcp = '{"mcpServers":{"mysql":{"command":"node","args":["tools/mcp-mysql.js"]}}}'
@(".mcp.json",".cursor\mcp.json",".vscode\mcp.json") | ForEach-Object {
    $p = Join-Path $Root $_
    if (-not (Test-Path $p)) {
        New-Item -ItemType File -Force -Path $p | Out-Null
        Set-Content $p $Mcp -Encoding UTF8; Write-OK "Criado: $_"
    }
}
$oc = Join-Path $Root "opencode.json"
if (-not (Test-Path $oc)) {
    '{"$schema":"https://opencode.ai/config.json","mcp":{"mysql":{"type":"local","command":["node","tools/mcp-mysql.js"]}}}' |
        Set-Content $oc -Encoding UTF8; Write-OK "opencode.json"
}

Write-Step "Atualizando .gitignore..."
$gi = Join-Path $Root ".gitignore"
$content = if (Test-Path $gi) { Get-Content $gi -Raw } else { "" }
@(".env.mcp",".vscode/") | ForEach-Object {
    if ($content -notmatch [regex]::Escape($_)) { Add-Content $gi "`n$_"; Write-OK "Adicionado: $_" }
}

Remove-Item $Tmp -Recurse -Force -EA SilentlyContinue

Write-Host @"

╔═══════════════════════════════════════════════════════════╗
║       ✅  MEMÓRIA VIVA INSTALADA COM SUCESSO!              ║
╚═══════════════════════════════════════════════════════════╝

  📁 Projeto: $ProjectName  |  Stack: $Stack

  📋 PRÓXIMOS PASSOS:
  1. Preencha: .env.mcp
  2. Reinicie a IDE
  3. Cole o prompt para o agente ler e preencher o contexto

  🔌 MCP: tools/mcp-mysql.js  |  📚 Docs: docs/ai/
"@ -ForegroundColor Green
