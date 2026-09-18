# electron.ps1 - Windows wrapper (same role as electron.sh).
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root
node scripts/entry.mjs electron @args
exit $LASTEXITCODE
