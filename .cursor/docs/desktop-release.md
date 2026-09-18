# App Desktop: Release e Auto-atualização

Guia para gerar o instalador do app Electron e publicar atualizações que o usuário instala com um clique.

## Como funciona

O app empacotado usa `electron-updater` com feed do GitHub Releases. Ele não consulta a API de releases: baixa um manifesto estático publicado junto com os instaladores.

```text
https://github.com/<owner>/<repo>/releases/latest/download/latest.yml
```

- `<owner>`/`<repo>` vêm de `publish` no `cht-client-<cliente>/cht.config.json` e ficam embutidos em `resources/app-update.yml`.
- O `--publish always` envia os instaladores **e** o `latest.yml` para a release. Sem `--publish`, o `latest.yml` sai apenas local e não serve para atualizar.
- `latest.yml` (Windows), `latest-linux.yml` e `latest-mac.yml` são por plataforma. Cada sistema lê o seu.

## Comandos

```bash
./electron.sh build <cliente> [--win|--linux|--mac] [--publish]
# Windows: .\electron.ps1 build <cliente> --win --publish
```

- Sem `--win|--linux|--mac`, empacota para o sistema hospedeiro.
- Artefatos saem em `builds/<cliente>/desktop`.

| Alvo | Artefatos |
|---|---|
| `--win` | `mecarvit-setup-<versao>.exe`, `.exe.blockmap`, `latest.yml` |
| `--linux` | `mecarvit-<versao>-linux-x86_64.AppImage`, `-linux-amd64.deb`, `latest-linux.yml` |
| `--mac` | `.dmg`, `.zip`, `latest-mac.yml` |

Os arquivos `.blockmap` habilitam download diferencial: a atualização baixa só o que mudou.

## Primeiro release

1. Crie um token em [github.com/settings/tokens](https://github.com/settings/tokens) com escopo `repo` e exporte:

```powershell
$env:GH_TOKEN = "ghp_xxxxxxxxxxxxxxxx"
```

2. Gere e publique:

```powershell
.\electron.ps1 build mecarvit --win --publish
```

3. Confirme que o feed responde (`302`; `404` indica release em rascunho ou `latest.yml` ausente):

```powershell
curl.exe -sI https://github.com/celiy/cht-client-mecarvit/releases/latest/download/latest.yml
```

A release precisa estar **publicada**, não em rascunho: `releases/latest` não resolve para drafts.

## Publicar uma atualização

1. Edite a versão em `cht-client-<cliente>/version` (primeira linha: `version 1.0.2`).
2. Rode `.\electron.ps1 build mecarvit --win --publish`.
3. No app instalado, o botão de atualização aparece no topo da barra lateral (e no canto superior direito das telas de login e registro) e faz download e instalação.

O `appId` (`dev.cht.<cliente>`) precisa permanecer o mesmo entre versões — trocá-lo quebra a detecção de atualização.

## Diagnóstico

| Sintoma | Causa provável |
|---|---|
| `Latest.yml ... 404` no log do app | release em rascunho, ou build sem `--publish` |
| `401 Unauthorized` no build | `GH_TOKEN` ausente, expirado ou sem escopo `repo` |
| Botão de atualização nunca aparece | build sem feed: confira a linha `[electron] Update feed: <owner>/<repo>` |
| `App version: 1.0.0` inesperado | `version` do cliente ausente ou fora do formato `version <x.y.z>` |
| App não atualiza em desenvolvimento | esperado: o updater só age no app instalado (`app.isPackaged`) |
| Instalador com ícone padrão do Electron | falta `cht-client-<cliente>/build/icon.ico` (o build avisa) |

O auto-update só se comprova a partir da **segunda** versão publicada: não existe versão anterior à primeira para comparar.

## Detalhes de empacotamento

- **Versão única:** o build lê `cht-client-<cliente>/version`, então instalador, `app.getVersion()` e feed usam o mesmo número.
- **Backend embutido:** `resources/backend` (com `node_modules`), `resources/cht-shared` e um runtime Node próprio em `resources/node`, para os addons nativos (`better-sqlite3`, `bcrypt`) carregarem com a ABI correta.
- **Dados do usuário:** o SQLite fica em `userData`, não na pasta do app.
- **Desinstalação:** `deleteAppDataOnUninstall: false` preserva os dados do usuário.
- **Ícone:** `build/icon.ico` (Windows) e `build/icon.png` (Linux/macOS), resolvidos por plataforma.
