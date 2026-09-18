# build.ps1 - Windows wrapper (same role as build.sh).
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root
node scripts/entry.mjs build @args
exit $LASTEXITCODE
