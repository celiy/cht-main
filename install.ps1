# install.ps1 - Windows wrapper (same role as install.sh).
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root
node scripts/entry.mjs install @args
exit $LASTEXITCODE
