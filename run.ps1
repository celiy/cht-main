# run.ps1 - Windows wrapper (same role as run.sh).
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root
node scripts/entry.mjs dev @args
exit $LASTEXITCODE
