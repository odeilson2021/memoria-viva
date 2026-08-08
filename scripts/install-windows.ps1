#!/usr/bin/env pwsh
# =============================================================================
# Memoria Viva v2.0 - Windows installer
# Compatible with Windows PowerShell 5.1 and PowerShell 7+.
# This file intentionally contains ASCII characters only.
# =============================================================================
param(
    [switch]$Silent = $false,
    [switch]$DryRun = $false
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    if (-not $Silent) {
        Write-Host ""
        Write-Host "==> $Message" -ForegroundColor Cyan
    }
}

function Write-OK {
    param([string]$Message)
    if (-not $Silent) {
        Write-Host "  OK: $Message" -ForegroundColor Green
    }
}

function Write-Warn {
    param([string]$Message)
    if (-not $Silent) {
        Write-Host "  WARNING: $Message" -ForegroundColor Yellow
    }
}

function Write-Fail {
    param([string]$Message)
    [Console]::Error.WriteLine("ERROR: $Message")
    exit 1
}

function Normalize-PathEntry {
    param([string]$PathEntry)

    if ([string]::IsNullOrWhiteSpace($PathEntry)) {
        return ""
    }

    $Expanded = [Environment]::ExpandEnvironmentVariables($PathEntry.Trim().Trim([char]34))
    return $Expanded.TrimEnd([char[]]"\/")
}

function Test-PathEntry {
    param(
        [string]$PathValue,
        [string]$ExpectedEntry
    )

    $NormalizedExpected = Normalize-PathEntry $ExpectedEntry
    foreach ($Entry in ($PathValue -split ";")) {
        $NormalizedEntry = Normalize-PathEntry $Entry
        if ([string]::Equals($NormalizedEntry, $NormalizedExpected, [StringComparison]::OrdinalIgnoreCase)) {
            return $true
        }
    }
    return $false
}

if (-not $Silent) {
    Write-Host "===============================================" -ForegroundColor Magenta
    Write-Host " Memoria Viva v2.0 - Windows global installer" -ForegroundColor Magenta
    Write-Host "===============================================" -ForegroundColor Magenta
}

Write-Step "Checking prerequisites"

$NodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
if (-not $NodeCommand) {
    $NodeCommand = Get-Command node -ErrorAction SilentlyContinue
}
if (-not $NodeCommand) {
    Write-Fail "Node.js was not found. Install Node.js 18 or newer first."
}

$NpmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $NpmCommand) {
    $NpmCommand = Get-Command npm -ErrorAction SilentlyContinue
}
if (-not $NpmCommand) {
    Write-Fail "npm was not found. Install Node.js 18 or newer first."
}

$NodeVersionOutput = @(& $NodeCommand.Source --version 2>&1)
$NodeVersionExitCode = $LASTEXITCODE
$NodeVersion = ($NodeVersionOutput -join "").Trim()
if ($NodeVersionExitCode -ne 0 -or $NodeVersion -notmatch "^v?([0-9]+)\.") {
    Write-Fail "Could not determine the installed Node.js version."
}
$NodeMajor = [int]$Matches[1]
if ($NodeMajor -lt 18) {
    Write-Fail "Node.js 18 or newer is required; found $NodeVersion."
}

if (-not (Get-Command git.exe -ErrorAction SilentlyContinue) -and
    -not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Warn "Git was not found. Git-specific context detection will be unavailable."
}
Write-OK "Prerequisites passed (Node.js $NodeVersion)"

Write-Step "Checking the installer package"

$ScriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$PackageRoot = Split-Path -Parent $ScriptDirectory
$PackageJsonPath = Join-Path $PackageRoot "package.json"
$CliPath = Join-Path $PackageRoot "bin\memoria-viva.js"

if (-not (Test-Path -LiteralPath $PackageJsonPath -PathType Leaf)) {
    Write-Fail "package.json was not found at $PackageJsonPath."
}
if (-not (Test-Path -LiteralPath $CliPath -PathType Leaf)) {
    Write-Fail "The CLI entry point was not found at $CliPath."
}

try {
    $PackageMetadata = Get-Content -LiteralPath $PackageJsonPath -Raw | ConvertFrom-Json
} catch {
    Write-Fail "package.json is not valid JSON: $($_.Exception.Message)"
}

if ($PackageMetadata.name -ne "memoria-viva" -or [string]::IsNullOrWhiteSpace($PackageMetadata.version)) {
    Write-Fail "package.json does not identify a valid memoria-viva package and version."
}
$ExpectedVersion = [string]$PackageMetadata.version
Write-OK "Package memoria-viva v$ExpectedVersion found at $PackageRoot"

Write-Step "Resolving the npm global directory"

$PrefixOutput = @(& $NpmCommand.Source config get prefix 2>&1)
$PrefixExitCode = $LASTEXITCODE
if ($PrefixExitCode -ne 0 -or $PrefixOutput.Count -eq 0) {
    Write-Fail "npm could not resolve its global prefix."
}
$NpmGlobalBin = ([string]$PrefixOutput[$PrefixOutput.Count - 1]).Trim()
if ([string]::IsNullOrWhiteSpace($NpmGlobalBin) -or
    -not [System.IO.Path]::IsPathRooted($NpmGlobalBin)) {
    Write-Fail "npm returned an invalid global prefix: $NpmGlobalBin"
}
Write-OK "npm global directory: $NpmGlobalBin"

Write-Step "Installing Memoria Viva globally"

if ($DryRun) {
    Write-OK "[DRY RUN] Would run npm install --global . from $PackageRoot"
} else {
    $InstallError = $null
    $InstallExitCode = $null
    Push-Location $PackageRoot
    try {
        if ($Silent) {
            & $NpmCommand.Source install --global . *> $null
        } else {
            & $NpmCommand.Source install --global .
        }
        $InstallExitCode = $LASTEXITCODE
    } catch {
        $InstallError = $_
    } finally {
        Pop-Location
    }

    if ($InstallError) {
        Write-Fail "npm install failed: $($InstallError.Exception.Message)"
    }
    if ($InstallExitCode -ne 0) {
        Write-Fail "npm install failed with exit code $InstallExitCode."
    }
    Write-OK "Global npm install completed"
}

Write-Step "Checking the user PATH"

$CurrentUserPath = [Environment]::GetEnvironmentVariable("Path", "User")
$UserPathContainsNpm = Test-PathEntry $CurrentUserPath $NpmGlobalBin

if ($UserPathContainsNpm) {
    Write-OK "User PATH already contains $NpmGlobalBin"
} elseif ($DryRun) {
    Write-OK "[DRY RUN] Would add $NpmGlobalBin to the user PATH"
} else {
    if ([string]::IsNullOrWhiteSpace($CurrentUserPath)) {
        $NewUserPath = $NpmGlobalBin
    } else {
        $NewUserPath = "$CurrentUserPath;$NpmGlobalBin"
    }

    try {
        [Environment]::SetEnvironmentVariable("Path", $NewUserPath, "User")
    } catch {
        Write-Fail "The global install completed, but the user PATH update failed: $($_.Exception.Message)"
    }
    Write-OK "Added $NpmGlobalBin to the user PATH"
}

if (-not $DryRun -and -not (Test-PathEntry $env:Path $NpmGlobalBin)) {
    $env:Path = "$env:Path;$NpmGlobalBin"
}

Write-Step "Verifying the installed command"

if ($DryRun) {
    Write-OK "[DRY RUN] Would execute the installed shim with --version"
} else {
    $CommandCandidates = @(
        (Join-Path $NpmGlobalBin "memoria-viva.cmd"),
        (Join-Path $NpmGlobalBin "memoria-viva.ps1"),
        (Join-Path $NpmGlobalBin "memoria-viva")
    )
    $InstalledCommand = $null
    foreach ($Candidate in $CommandCandidates) {
        if (Test-Path -LiteralPath $Candidate -PathType Leaf) {
            $InstalledCommand = $Candidate
            break
        }
    }

    if (-not $InstalledCommand) {
        Write-Fail "npm reported success, but no memoria-viva command was found in $NpmGlobalBin."
    }

    $VersionOutput = @(& $InstalledCommand --version 2>&1)
    $VersionExitCode = $LASTEXITCODE
    $VersionText = ($VersionOutput -join [Environment]::NewLine).Trim()
    $ExpectedVersionToken = [Regex]::Escape("v$ExpectedVersion")

    if ($VersionExitCode -ne 0) {
        Write-Fail "The installed command failed verification with exit code $VersionExitCode."
    }
    if ($VersionText -notmatch $ExpectedVersionToken) {
        Write-Fail "The installed command returned an unexpected version: $VersionText"
    }
    Write-OK "Installed command verified: $VersionText"
}

if (-not $Silent) {
    Write-Host ""
    if ($DryRun) {
        Write-Host "DRY RUN COMPLETE - no changes were made." -ForegroundColor Green
    } else {
        Write-Host "INSTALL COMPLETE - memoria-viva v$ExpectedVersion was verified." -ForegroundColor Green
        Write-Host "Run 'memoria-viva init' inside a project to initialize its memory."
    }
}

exit 0
