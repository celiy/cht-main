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

| Alvo      | Artefatos                                                                         |
| --------- | --------------------------------------------------------------------------------- |
| `--win`   | `mecarvit-setup-<versao>.exe`, `.exe.blockmap`, `latest.yml`                      |
| `--linux` | `mecarvit-<versao>-linux-x86_64.AppImage`, `-linux-amd64.deb`, `latest-linux.yml` |
| `--mac`   | `.dmg`, `.zip`, `latest-mac.yml`                                                  |

Os arquivos `.blockmap` habilitam download diferencial: a atualização baixa só o que mudou.

## Token do GitHub

O `GH_TOKEN` só é necessário em builds com `--publish`. Sem essa flag, o `electron-builder` não publica nada, então dev, build local e testes não precisam de token.

| Comando                                         | Token? |
| ----------------------------------------------- | ------ |
| `.\electron.ps1 mecarvit`                       | Não    |
| `.\electron.ps1 build mecarvit --win`           | Não    |
| `.\electron.ps1 build mecarvit --win --publish` | Sim    |

### Criar o token (uma vez)

Em [github.com/settings/tokens](https://github.com/settings/tokens), crie um token **fine-grained** com:

- **Repository access:** o repositório do cliente (ex.: `celiy/cht-client-mecarvit`) selecionado explicitamente;
- **Permissions → Repository permissions → Contents: Read and write** (Releases são regidas por ela).

Se faltar a permissão, o build chega até o upload e falha com `403 Forbidden: Resource not accessible by personal access token`. O próprio GitHub informa o que falta no cabeçalho `x-accepted-github-permissions: contents=write`.

Token clássico também funciona, mas exige o escopo `repo` inteiro e libera mais do que o necessário.

### Definir a variável

Duas formas, com diferenças importantes:

|                                  | `$env:GH_TOKEN`     | `setx GH_TOKEN`                  |
| -------------------------------- | ------------------- | -------------------------------- |
| Alcance                          | Só o processo atual | Todas as janelas abertas depois  |
| Persiste ao fechar o terminal    | Não                 | Sim                              |
| Sobrevive a reiniciar a máquina  | Não                 | Sim                              |
| Vale na janela em que foi rodado | Sim                 | Não                              |
| Onde fica                        | Memória do processo | Registro do Windows (texto puro) |

Uso permanente (recomendado — configura uma vez e esquece):

```powershell
setx GH_TOKEN "github_pat_xxxxxxxxxxxxxxxx"
```

O `setx` **não** afeta a janela atual: abra um terminal novo antes de buildar. Para confirmar, `echo $env:GH_TOKEN` deve imprimir o valor.

Ou apenas na sessão atual (útil para testar, ou quando não quer gravar o token):

```powershell
$env:GH_TOKEN = "github_pat_xxxxxxxxxxxxxxxx"
.\electron.ps1 build mecarvit --win --publish
```

⚠️ O `setx` grava o token em texto puro no registro, legível por qualquer processo rodando como o seu usuário. Por isso: token fine-grained limitado a um repositório e com data de expiração. Quando vencer, o build falha com `401 Unauthorized` — gere outro e rode o `setx` novamente.

A ordem de leitura pelo `electron-publish` é `GITHUB_RELEASE_TOKEN`, depois `GH_TOKEN`, depois `GITHUB_TOKEN`; qualquer uma delas serve.

## Primeiro release

1. Configure o `GH_TOKEN` conforme acima.

2. Gere e publique:

```powershell
.\electron.ps1 build mecarvit --win --publish
```

3. Confirme que o feed responde (`302`; `404` indica release em rascunho ou `latest.yml` ausente):

```powershell
curl.exe -sI https://github.com/celiy/cht-client-mecarvit/releases/latest/download/latest.yml
```

⚠️ Por padrão o `electron-builder` cria a release como **rascunho** (`releaseType: "draft"`), e `releases/latest` não resolve para drafts — o updater recebe 404. Ou publique a release manualmente no GitHub a cada build, ou defina no `cht.config.json` do cliente:

```json
"publish": {
    "provider": "github",
    "owner": "celiy",
    "repo": "cht-client-mecarvit",
    "releaseType": "release"
}
```

## Publicar uma atualização

1. Edite a versão em `cht-client-<cliente>/version` (primeira linha: `version 1.0.2`).
2. Rode `.\electron.ps1 build mecarvit --win --publish`.
3. No app instalado, o botão de atualização aparece no topo da barra lateral (e no canto superior direito das telas de login e registro) e faz download e instalação.

O `appId` (`dev.cht.<cliente>`) precisa permanecer o mesmo entre versões — trocá-lo quebra a detecção de atualização.

## Diagnóstico

| Sintoma                                                           | Causa provável                                                                             |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `401 Unauthorized` no build                                       | `GH_TOKEN` ausente ou expirado                                                             |
| `403 Forbidden: Resource not accessible by personal access token` | token sem a permissão **Contents: Read and write**, ou repositório fora do escopo do token |
| `Latest.yml ... 404` no log do app                                | release em rascunho, ou build sem `--publish`                                              |
| `GitHub release not created` (aviso)                              | release existente incompatível com o tipo, ou publicada há mais de 2h                      |
| Botão de atualização nunca aparece                                | build sem feed: confira a linha `[electron] Update feed: <owner>/<repo>`                   |
| `App version: 1.0.0` inesperado                                   | `version` do cliente ausente ou fora do formato `version <x.y.z>`                          |
| App não atualiza em desenvolvimento                               | esperado: o updater só age no app instalado (`app.isPackaged`)                             |
| Instalador com ícone padrão do Electron                           | falta `cht-client-<cliente>/build/icon.ico` (o build avisa)                                |

Passado o `setx`, `echo $env:GH_TOKEN` confirma se a variável chegou àquela janela.

### Falhas silenciosas ao publicar

Depois que o token está correto, o publisher ainda pode **recusar publicar sem falhar o build**, com apenas um aviso `GitHub release not created`:

- **Tipo incompatível:** a release do tag já existe e não é rascunho, mas a política é `draft` — nesse caso ela não é reaproveitada.
- **Release antiga:** a release existe e foi publicada há **mais de 2 horas**, então novos arquivos não são aceitos nela (limitação do `electron-builder`). Para publicar de novo, incremente a versão em vez de reaproveitar o mesmo número.

Nos dois casos o build termina "com sucesso", mas nada foi enviado — confirme sempre pelo `curl` do passo 3.

Se o arquivo já existe na release, o publisher o sobrescreve, avisando `overwrite published file`.

O auto-update só se comprova a partir da **segunda** versão publicada: não existe versão anterior à primeira para comparar.

## Detalhes de empacotamento

- **Versão única:** o build lê `cht-client-<cliente>/version`, então instalador, `app.getVersion()` e feed usam o mesmo número.
- **Backend embutido:** `resources/backend` (com `node_modules`), `resources/cht-shared` e um runtime Node próprio em `resources/node`, para os addons nativos (`better-sqlite3`, `bcrypt`) carregarem com a ABI correta.
- **Dados do usuário:** o SQLite fica em `userData`, não na pasta do app.
- **Desinstalação:** `deleteAppDataOnUninstall: false` preserva os dados do usuário.
- **Ícone:** `build/icon.ico` (Windows) e `build/icon.png` (Linux/macOS), resolvidos por plataforma.
