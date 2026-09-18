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
npx chtmain electron build <cliente> [--win|--linux|--mac] [--publish]
# equivalente: npm run electron -- build <cliente> --win --publish
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

O `GH_TOKEN` só é necessário em builds com `--publish`. Sem essa flag, o `electron-builder` não publica nada — dev, build local e testes não precisam de token. Se preferir evitar o token por completo, use a publicação manual.

| Comando                                               | Token? |
| ----------------------------------------------------- | ------ |
| `npx chtmain electron mecarvit`                       | Não    |
| `npx chtmain electron build mecarvit --win`           | Não    |
| `npx chtmain electron build mecarvit --win --publish` | Sim    |

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
npx chtmain electron build mecarvit --win --publish
```

⚠️ O `setx` grava o token em texto puro no registro, legível por qualquer processo rodando como o seu usuário. Por isso: token fine-grained limitado a um repositório e com data de expiração. Quando vencer, o build falha com `401 Unauthorized` — gere outro e rode o `setx` novamente.

A ordem de leitura pelo `electron-publish` é `GITHUB_RELEASE_TOKEN`, depois `GH_TOKEN`, depois `GITHUB_TOKEN`; qualquer uma delas serve.

## Publicar manualmente (sem token)

O `--publish` é opcional. Sem ele, o build gera os arquivos localmente e não toca na rede — nenhum token é necessário. É a rota mais direta quando o token não coopera: dispensa credenciais e a release já nasce publicada, o que elimina o problema do rascunho.

### Passo a passo

**1. Gere os artefatos**, sem a flag:

```powershell
npx chtmain electron build mecarvit --win
```

Os arquivos ficam em `builds\mecarvit\desktop`. O build já roda o typecheck e o empacotamento; se ele terminar sem erro, os instaladores estão prontos.

**2. Abra a página de nova release:**

```text
https://github.com/celiy/cht-client-mecarvit/releases/new
```

**3. Informe a tag:** `v` seguido da versão que o build usou (aparece no log como `App version`). Para a 1.0.1, a tag é `v1.0.1`. Deixe _Create new tag on publish_ selecionado.

Se a tag já existir, o GitHub recusa. Nesse caso apague a release anterior — ou, melhor, incremente a versão em `cht-client-<cliente>/version` e gere o build novamente.

**4. Anexe os arquivos** da tabela abaixo, arrastando-os para a área de anexos.

**5. Clique em _Publish release_.** Não use _Save draft_: rascunho não é servido pela URL que o app consulta.

Alternativa por linha de comando, com o [GitHub CLI](https://cli.github.com/) autenticado (`gh auth login`):

```powershell
gh release create v1.0.1 --repo celiy/cht-client-mecarvit --title "1.0.1" --notes "Primeira versão instalável." `
  builds\mecarvit\desktop\mecarvit-setup-1.0.1.exe `
  builds\mecarvit\desktop\mecarvit-setup-1.0.1.exe.blockmap `
  builds\mecarvit\desktop\latest.yml
```

### Arquivos a anexar

| Plataforma | Arquivos                                                              |
| ---------- | --------------------------------------------------------------------- |
| Windows    | `mecarvit-setup-<versao>.exe`, `.exe.blockmap`, `latest.yml`          |
| Linux      | `mecarvit-<versao>-linux-x86_64.AppImage`, `.deb`, `latest-linux.yml` |
| macOS      | `.dmg`, `.zip`, `latest-mac.yml`                                      |

O `latest.yml` é obrigatório: sem ele o app não descobre a atualização. O `.blockmap` é opcional, mas sem ele a atualização baixa o instalador inteiro em vez de só o que mudou.

Os nomes dos arquivos precisam ser preservados: é por eles que o `latest.yml` os referencia. Ao gerar várias plataformas, anexe tudo na **mesma** release.

Não anexe:

- pastas `win-unpacked\`, `linux-unpacked\` e `mac\` (versão descompactada, só para testes locais);
- `builder-debug.yml`, `builder-effective-config.yaml`, `.icon-ico\` (arquivos de diagnóstico do build);
- `*.__uninstaller.exe` (já vai embutido no instalador).

### Conferir

```powershell
curl.exe -sI https://github.com/celiy/cht-client-mecarvit/releases/latest/download/latest.yml
```

Esperado: `302`. Um `404` indica release ausente ou salva como rascunho.

A URL `releases/latest` aponta para a release **publicada mais recente**. Publique sempre em ordem de versão: se a 1.0.2 sair antes da 1.0.1, um app 1.0.0 que consultar o feed será direcionado à release errada, mesmo que o updater ignore versões mais antigas.

### Publicar a próxima versão

1. Edite `cht-client-<cliente>/version` (ex.: `version 1.0.2`).
2. Rode o build sem `--publish`.
3. Crie uma nova release com a tag correspondente (`v1.0.2`), anexando os novos arquivos.

## Primeiro release

Pela rota automatizada (requer `GH_TOKEN` configurado):

1. Gere e publique:

```powershell
npx chtmain electron build mecarvit --win --publish
```

2. Confirme que o feed responde (`302`; `404` indica release em rascunho ou `latest.yml` ausente):

```powershell
curl.exe -sI https://github.com/celiy/cht-client-mecarvit/releases/latest/download/latest.yml
```

⚠️ Por padrão o `electron-builder` cria a release como **rascunho** (`releaseType: "draft"`), e `releases/latest` não resolve para drafts — o updater recebe 404. Ou publique a release manualmente no GitHub a cada build (a rota manual já nasce publicada), ou defina no `cht.config.json` do cliente:

```json
"publish": {
    "provider": "github",
    "owner": "celiy",
    "repo": "cht-client-mecarvit",
    "releaseType": "release"
}
```

## Publicar uma atualização

Pelo `--publish`:

1. Edite a versão em `cht-client-<cliente>/version` (primeira linha: `version 1.0.2`).
2. Rode `npx chtmain electron build mecarvit --win --publish`.
3. No app instalado, o botão de atualização aparece no topo da barra lateral (e no canto superior direito das telas de login e registro) e faz download e instalação.

Pela publicação manual, os mesmos passos, trocando o passo 2 por um build sem `--publish` e o envio dos artefatos em uma nova release.

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

### Verificar o token na API

Dois testes que não criam nada e isolam a causa do `403`:

```powershell
# O token pertence à conta esperada? O login deve ser o dono do repositório.
curl.exe -s -H "Authorization: Bearer $env:GH_TOKEN" https://api.github.com/user

# O token tem escrita no repositório? Procure "push": true.
curl.exe -s -H "Authorization: Bearer $env:GH_TOKEN" https://api.github.com/repos/celiy/cht-client-mecarvit
```

Se o login não for `celiy`, o token pertence a outra conta e o repositório precisa estar no escopo dele. Se `push` for `false`, falta a permissão de Contents.

⚠️ O `setx` não altera a janela atual: se você já tinha exportado o token antigo com `$env:GH_TOKEN`, essa janela continua usando o valor velho mesmo depois de editar as permissões no GitHub. Abra um terminal novo, ou reatribua `$env:GH_TOKEN` com o valor atual.

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
