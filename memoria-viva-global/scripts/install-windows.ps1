#!/usr/bin/env pwsh
# =============================================================================
#  🧠 Memória Viva — Instalador Windows (Global)
#  Executar como Administrador para instalação global.
# =============================================================================
param(
    [switch]$Silent = $false,
    [switch]$DryRun = $false
)
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Step  { param($m) Write-Host "`n🔷 $m" -ForegroundColor Cyan }
function Write-OK    { param($m) Write-Host "  ✅ $m" -ForegroundColor Green }
function Write-Warn  { param($m) Write-Host "  ⚠️  $m" -ForegroundColor Yellow }
function Write-Fail  { param($m) Write-Host "  ❌ $m" -ForegroundColor Red; exit 1 }

Clear-Host
Write-Host @"
╔═══════════════════════════════════════════════════════════╗
║     🧠 MEMÓRIA VIVA — AI Context & Governance Engine      ║
║     Instalação Global para Windows                            ║
╚═══════════════════════════════════════════════════════════╝
"@ -ForegroundColor Magenta

# ── Verificar pré-requisitos ──────────────────────────────────
Write-Step "Verificando pré-requisitos..."
if (-not (Get-Command node -EA SilentlyContinue)) { Write-Fail "Node.js não encontrado. Instale o Node.js 18+ primeiro." }
if (-not (Get-Command npm -EA SilentlyContinue)) { Write-Fail "npm não encontrado. Instale o Node.js 18+ primeiro." }
if (-not (Get-Command git -EA SilentlyContinue)) { Write-Warn "Git não encontrado. Alguns recursos podem não funcionar." }
Write-OK "Pré-requisitos OK"

# ── Detectar diretório do projeto ─────────────────────────────
Write-Step "Detectando diretório do projeto..."
$ProjectRoot = Get-Location
if (Test-Path (Join-Path $ProjectRoot ".git"))) {
    Write-OK "Projeto Git detectado: $ProjectRoot"
} else {
    Write-Warn "Diretório atual não é um repositório Git."
    Write-OK "Usando: $ProjectRoot"
}

# ── Instalação global via npm ─────────────────────────────────
Write-Step "Instalando Memória Viva globalmente..."
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir

if ($DryRun) {
    Write-OK "[DRY RUN] Executaria: npm install -g ."
    Write-OK "[DRY RUN] Não alteraria PATH."
} else {
    try {
        Push-Location $ProjectDir
        npm install -g . 2>&1 | Out-Null
        Pop-Location
        Write-OK "Instalação global concluída"
    } catch {
        Write-Fail "Falha na instalação global: $($_.Exception.Message)"
    }
}

# ── Configurar PATH ───────────────────────────────────────────
Write-Step "Configurando variáveis de ambiente PATH..."
$NpmGlobalBin = Join-Path $env:APPDATA "npm"

if (-not (Test-Path $NpmGlobalBin)) {
    $NpmGlobalBin = Join-Path (npm config get prefix) "bin"
}

$CurrentPath = [Environment]::GetEnvironmentVariable("Path", "User")
$PathEntries = $CurrentPath -split ";"

if ($PathEntries -contains $NpmGlobalBin) {
    Write-OK "PATH já contém: $NpmGlobalBin"
} else {
    if ($DryRun) {
        Write-OK "[DRY RUN] Adicionaria ao PATH: $NpmGlobalBin"
    } else {
        $NewPath = "$CurrentPath;$NpmGlobalBin"
        [Environment]::SetEnvironmentVariable("Path", $NewPath, "User")
        Write-OK "PATH atualizado: $NpmGlobalBin"
    }
}

# ── Verificar instalação ──────────────────────────────────────
Write-Step "Verificando instalação..."
if ($DryRun) {
    Write-OK "[DRY RUN] Verificaria: memoria-viva --version"
} else {
    try {
        $Version = memoria-viva --version 2>&1
        Write-OK "memoria-viva está disponível: $Version"
    } catch {
        Write-Warn "O comando 'memoria-viva' pode não estar disponível ainda."
        Write-Warn "Reinicie o terminal para aplicar as alterações do PATH."
    }
}

# ── Resumo ────────────────────────────────────────────────────
Write-Host @"

╔═══════════════════════════════════════════════════════════╗
║       ✅  MEMÓRIA VIVA INSTALADA COM SUCESSO!              ║
╚═══════════════════════════════════════════════════════════╝

  📁 Projeto: $ProjectRoot
  🌐 Escopo: Global (todos os projetos)

  📋 PRÓXIMOS PASSOS:
  ${chalk.dim('1.')} Reinicie qualquer terminal/IDE aberto
  ${chalk.dim('2.')} Navegue até qualquer projeto
  ${chalk.dim('3.')} Execute: ${chalk.cyan('memoria-viva init')}
  ${chalk.dim('4.')} Ou verifique com: ${chalk.cyan('memoria-viva check')}

  🔌 MCP MySQL: tools/mcp-mysql.js
  📚 Docs: docs/ai/
"@ -ForegroundColor Green