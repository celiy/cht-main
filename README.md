# CHT Main

Workspace principal do template multi-cliente de Diogo Carvalho Viegas (Celi's Herstal Template).  
Este repositório orquestra front-end base, clientes, backend(s), design system e código compartilhado.

- <b>Painel do projeto no Netlify</b>: [cht-dev overview](https://cht-dev.netlify.app/).

## O que o projeto faz

O `cht-main` centraliza e facilita o desenvolvimento de aplicações por cliente com uma base comum:

- sobe os serviços de desenvolvimento (frontend e backend) por cliente;
- organiza os repositórios que compõem o ecossistema;
- mantém dependências Node compartilhadas sincronizadas entre as repos.

## Propósito

- **Reuso:** manter uma base única (`cht-base`) para múltiplos clientes.
- **Escalabilidade:** adicionar novos clientes sem duplicar arquitetura inteira.
- **Consistência:** compartilhar componentes (`cht-design-system`) e utilitários (`cht-shared`).
- **Produtividade:** simplificar setup local e execução de ambiente.

## Estrutura do workspace

- `cht-base`: boot Vue + Vite + router; o cliente (pasta irmã com `cht.config.json`) fornece `App.vue`, `routes.ts` e layouts; sem `CLIENT`, usa `cht-base/src/devApp` para laboratório.
- `cht-design-system`: componentes e padrões visuais reutilizáveis.
- `cht-shared`: código compartilhado (helpers, utilitários, etc.).
- `cht-client-mecarvit`: frontend específico do cliente Mecarvit.
- `cht-backend-mecarvit`: backend específico do cliente Mecarvit.
- `clients.json`: infra compartilhada (`shared.repos`, `shared.vitePorts`; cada repo pode ser URL ou `{ "url", "ref" }`) e catálogo `clients` (URLs/`ref` de frontend/backend para `install --client:<name>` mesmo sem a pasta local).
- `scripts/entry.mjs`: **ponto de entrada único** de todas as tarefas (`npx chtmain <comando>` ou `npm run cht -- <comando>`), idêntico em Windows e Linux.
- `scripts/install.mjs`: clona repositórios shared (+ frontend/backend do cliente se `--client:`) e instala dependências.
- `scripts/runner/`: runner TUI estilo htop (Node + Ink) com tabs, cores e hyperlinks clicáveis.
- `scripts/build.mjs`: builda o frontend de um cliente e exporta artefato para `builds/<cliente>/dist`.
- `scripts/electron.mjs`: abre o cliente no Electron (backend + frontend) ou empacota o app desktop instalável (`--win`, `--linux`, `--mac`) com backend embutido, runtime Node próprio e auto-atualização via GitHub Releases.
- `scripts/sync-common-deps.mjs`: sincronizador de dependências comuns entre repos.
- `common-dependencies.json`: arquivo-base de versões compartilhadas.

## Clientes

Clientes existentes são pastas irmãs com `cht.config.json` na raiz (`name` é o id, o nome da pasta é livre). O catálogo em [`clients.json`](./clients.json) (`clients.<name>.frontend.repo` / `backend.repo`) permite clonar um cliente na primeira instalação. Atualmente:

- **mecarvit**: frontend (`cht-client-mecarvit`) + backend (`cht-backend-mecarvit`)
- **dev**: modo de desenvolvimento interno do `cht-base` (cliente virtual, sem backend)

Para adicionar um cliente novo, ver `.cursor/docs/context.md` na seção "Adicionar um cliente novo".

## Como funciona (visão geral)

1. Pastas irmãs com `cht.config.json` definem os clientes. `clients.json` guarda shared (`repos` + `vitePorts`) e o catálogo de URLs para o primeiro clone. O bloco `backend` no `cht.config.json` indica pasta, comando e se o backend entra no Electron (`packageWithElectron`, padrão `true`).
2. O `cht-base` monta a app com o alias `@client` resolvido via `CLIENT=<name>` (ou `src/devApp` sem cliente).
3. O cliente define rotas (`routes.ts`), layout e páginas/componentes específicos.
4. O comando `dev` (runner em `scripts/runner/index.jsx`) inicia os processos necessários conforme o cliente escolhido em um TUI Ink.
5. O `scripts/sync-common-deps.mjs` normaliza versões de dependências compartilhadas:

- na primeira execução, gera `common-dependencies.json` com as versões mais recentes encontradas;
- nas próximas execuções, usa sempre esse arquivo como fonte da verdade.

## Como executar

No diretório raiz `cht-main`.

### Um só ponto de entrada

Todos os comandos passam por `scripts/entry.mjs`, que fala Node puro — logo o mesmo comando serve para Windows e Linux, sem `.sh` nem `.ps1` separados:

```bash
npx chtmain <comando> [args...]
# ou, equivalente:
npm run cht -- <comando> [args...]
```

| Comando         | O que faz                                             |
| --------------- | ----------------------------------------------------- |
| `install`       | clona/puxa os repositórios e instala dependências     |
| `dev`           | sobe o runner de desenvolvimento (frontend + backend) |
| `build`         | builda o frontend de um cliente                       |
| `electron`      | abre ou empacota o app desktop                        |
| `bump`          | incrementa a versão de um repositório                 |
| `sync-deps`     | normaliza versões de dependências compartilhadas      |

Cada comando também tem um atalho em `npm run` (`npm run dev`, `npm run build -- mecarvit`, `npm run sync:deps`, …), mas o `npx chtmain` é o que funciona igual nos dois sistemas.

### Dependências do sistema

Instale isto **antes** dos scripts (o `npm install` da raiz não substitui estas ferramentas):

| Ferramenta                                         | Para quê                                                          | Windows                                                                                                                                                                     | Linux / macOS                                                                         |
| -------------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **Git**                                            | clone/pull dos repositórios irmãos                                | [git-scm.com](https://git-scm.com/download/win)                                                                                                                             | `git` no PATH                                                                         |
| **Node.js 24** (ver [`.nvmrc`](./.nvmrc))          | npm, scripts, Vite, Electron                                      | Instalador LTS em [nodejs.org](https://nodejs.org/) **ou** [fnm](https://github.com/Schniz/fnm) / [nvm-windows](https://github.com/coreybutler/nvm-windows)                 | [nvm](https://github.com/nvm-sh/nvm) (`nvm install` + `nvm use` a partir do `.nvmrc`) |
| **Python 3** + Visual Studio Build Tools (Windows) | rebuild de addons nativos (`better-sqlite3`, `bcrypt`) no backend | [Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) com “Desktop development with C++”; o instalador do Node pode oferecer “Tools for Native Modules” | `build-essential` / Xcode CLT                                                         |

Confirme no terminal:

```bash
git --version
node -v   # major 24
npm -v
```

### 1) Instalar / preparar ambiente

**Node:** a raiz tem [`.nvmrc`](./.nvmrc) (hoje **24** LTS). O `scripts/entry.mjs` alinha a versão automaticamente quando encontra `nvm` (Linux/macOS) ou `fnm` / `nvm-windows` no PATH. Sem gestor de versões, instale a mesma major do `.nvmrc` à mão.

Apenas repositórios compartilhados:

```bash
npx chtmain install
# ou:
npm run install:repos
```

Incluindo repositórios de um cliente específico (ex.: mecarvit):

```bash
npx chtmain install --client:mecarvit
# ou:
npm run install:repos -- --client:mecarvit
```

O comando `install` chama `scripts/install.mjs`. Faz **git clone** (se faltar) ou **git fetch** + **git pull --ff-only** (se a pasta já for um repo) nos `shared.repos` e nas URLs do catálogo / `cht.config.json`. Falha de clone, fetch, checkout ou pull **aborta** o install (não continua com o workspace a meio). Pode-se fixar `ref` (branch, tag ou commit) em `shared.repos` (`{ "url", "ref" }`) ou em `frontend.ref` / `backend.ref`. Sem `ref`, usa-se o branch padrão do remoto. Depois corre `npm install` na raiz e em cada pasta irmã com `package.json`.

### 2) Rodar ambiente de desenvolvimento

Modo dev padrão (apenas `cht-base`, sem backend):

```bash
npx chtmain dev
# ou: npm run dev
```

Cliente específico:

```bash
npx chtmain dev --client:mecarvit
# ou: npm run dev -- --client:mecarvit
```

A sintaxe é genérica: para qualquer pasta irmã com `cht.config.json`, basta `--client:<name>` (o valor de `name` no ficheiro). Não há scripts hardcoded por cliente no `package.json` raiz.

O runner abre um TUI estilo htop com tabs por processo. Atalhos: `←`/`→` (ou `h`/`l`) para alternar tabs, `↑`/`↓` (ou `k`/`j`) e PgUp/PgDn para scroll do console, `r` reinicia o processo ativo, `c` limpa o buffer, `q` (ou `Ctrl+C`) encerra. URLs detectados nos logs aparecem como hyperlinks clicáveis na status bar.

### 3) Build/export de frontend por cliente

```bash
npx chtmain build mecarvit
# ou: npm run build -- mecarvit
```

O script executa o build do `cht-base` para o cliente informado e exporta o artefato em:

```text
builds/mecarvit/dist
```

Se `builds/<cliente>/dist` já existir, ele é removido e recriado (replace total).

### 4) App desktop (Electron)

Modo desenvolvimento (abre a janela imediatamente; o frontend mostra loading até o backend responder em `/health`):

```bash
npx chtmain electron mecarvit
# ou: npm run electron -- mecarvit
```

Empacotar para o sistema hospedeiro (`AppImage`, `deb` e diretório `dir` no Linux):

```bash
npx chtmain electron build mecarvit
npx chtmain electron build mecarvit --win      # Windows (nsis)
npx chtmain electron build mecarvit --publish  # envia para o GitHub Releases
```

Os artefatos saem em `builds/<cliente>/desktop`. Alvos disponíveis: `--win` (`nsis`), `--linux` (`AppImage`/`deb`) e `--mac` (`dmg`/`zip`).

Instaladores e atualização automática via GitHub Releases: veja [`.cursor/docs/desktop-release.md`](./.cursor/docs/desktop-release.md).

### 5) Incrementar a versão de um repositório

```bash
npx chtmain bump client-mecarvit          # o nome vai sem o prefixo `cht-`
npx chtmain bump main                     # o próprio workspace
npx chtmain bump client-mecarvit --dry-run
```

A versão é sempre `x.y.z`; minor e patch viram `0` ao passar de 10:

| Antes     | Depois  |
| --------- | ------- |
| `1.1.1`   | `1.1.2` |
| `1.1.10`  | `1.2.0` |
| `5.10.10` | `6.0.0` |

O comando reescreve o arquivo `version` do repositório e **não** faz commit.

Para incrementar e empacotar em um passo só, use a flag `--bump` no build do Electron:

```bash
npx chtmain electron build mecarvit --win --bump
npx chtmain electron build mecarvit --win --bump client-mecarvit
```

### 6) Sincronizar dependências compartilhadas

```bash
npx chtmain sync-deps
# ou:
npm run sync:deps
```

## Observações rápidas

- Se você editar manualmente `common-dependencies.json`, a próxima execução do sync respeita esse arquivo.
- Para detalhes completos da sincronização de dependências, veja [`.cursor/docs/deps_sync.md`](./.cursor/docs/deps_sync.md).
