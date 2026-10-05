# CHT Main

Workspace principal do template multi-cliente (Celi's Herstal Template).  
Este repositório monta front-end base com clientes, backend(s), design system e código compartilhado.

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
- `clients.json`: infra compartilhada (`shared.repos`, `shared.vitePorts`; cada repo pode ser URL ou `{ "url", "ref" }`) e catálogo `clients` (URLs/`ref` de frontend/backend para `install --client:<name>` mesmo sem a pasta local).
- `scripts/entry.mjs`: **ponto de entrada único** de todas as tarefas (`npx chtmain <comando>` ou `npm run cht -- <comando>`), com suporte à Windows e Linux.
- `scripts/install.mjs`: clona repositórios shared (+ frontend/backend do cliente se `--client:[nome do cliente]`), instala dependências e, com `--new` / `--workspace:` / `--workspace-clean`, aplica ou limpa a workspace de IDE/IA na raiz.
- `workspaces/devApp/`: pack **Project-Opinionated** deste repo. Clientes guardam o pack em `<cliente>/workspace/` (ex.: `cht-client-mecarvit/workspace`). Cópias na raiz do `cht-main` estão no `.gitignore` (e no manifesto `.cht-workspace.json`).
- `scripts/runner/`: runner TUI estilo htop (Node + Ink) com tabs, cores e hyperlinks clicáveis.
- `scripts/build.mjs`: builda o frontend de um cliente e exporta artefato para `builds/<cliente>/dist`.
- `scripts/electron.mjs`: abre o cliente no Electron (backend + frontend) ou empacota o app desktop instalável (`--win`, `--linux`, `--mac`) com backend embutido, runtime Node próprio e auto-atualização via GitHub Releases.
- `scripts/sync-common-deps.mjs`: sincronizador de dependências comuns entre repos.
- `common-dependencies.json`: arquivo-base de versões compartilhadas.

## Clientes

Clientes existentes são pastas irmãs com `cht.config.json` na raiz (`name` é o id, o nome da pasta é livre). O catálogo em [`clients.json`](./clients.json) (`clients.<name>.frontend.repo` / `backend.repo`) permite clonar um cliente na primeira instalação. Atualmente:

- **mecarvit**: frontend (`cht-client-mecarvit`) + backend (`cht-backend-mecarvit`)
- **dev**: modo de desenvolvimento interno do `cht-base` (cliente virtual, sem backend)

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

Todos os comandos passam por `scripts/entry.mjs`, que usam Node puro, logo o mesmo comando serve para Windows e Linux.

```bash
npx chtmain <comando> [args...]
# ou, equivalente:
npm run cht -- <comando> [args...]
```

| Comando     | O que faz                                             |
| ----------- | ----------------------------------------------------- |
| `install`   | clona/puxa os repositórios e instala dependências     |
| `dev`       | sobe o runner de desenvolvimento (frontend + backend) |
| `build`     | builda o frontend de um cliente                       |
| `electron`  | abre ou empacota o app desktop                        |
| `bump`      | incrementa a versão de um repositório                 |
| `bump-core` | bump das repos principais, pins no `cht-main`, push   |
| `sync-deps` | normaliza versões de dependências compartilhadas      |

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

Flags extra: `--skip-git`, `--force-git`, `--skip-npm-install`.

#### Workspace de editor / IA (`--new`, `--workspace` e `--workspace-clean`)

Ficheiros de tooling na **raiz** do `cht-main` não vão no Git. A fonte é um pack: **qualquer ficheiro** no topo do pack é copiado (não só VS Code / Prettier / ESLint / Netlify / docs de IA). O assistente `--new` continua limitado às opções pré-configuradas.

| Onde                            | O quê                                        |
| ------------------------------- | -------------------------------------------- |
| `workspaces/devApp/`            | pack **Project-Opinionated** deste repo      |
| `<pasta-do-cliente>/workspace/` | pack do cliente (`cht.config.json` → `name`) |

`--workspace:<name>` apaga o que o pack anterior deixou (manifesto `.cht-workspace.json`) e copia **todos** os entries do pack novo. `--workspace-clean` só apaga (manifesto + nomes do wizard). `--new` só escreve as opções do assistente.

```bash
# Pack deste repo (Cursor, regras, Prettier, netlify.toml)
npx chtmain install --workspace:devApp

# Pack do cliente (cht-client-mecarvit/workspace)
npx chtmain install --workspace:mecarvit

# Assistente no terminal: IDE, Prettier, ESLint, VPS, docs de IA
npx chtmain install --new

# Só remover os ficheiros de tooling da raiz
npx chtmain install --workspace-clean
```

`--new` precisa de TTY. Em CI usa `--workspace:<name>`.

### 2) Rodar ambiente de desenvolvimento

Modo dev padrão (Documentação atual):

```bash
npx chtmain dev
```

Cliente específico:

```bash
npx chtmain dev --client:<name>
# <name> campo "name" do cht.config.json
```

A sintaxe é genérica: para qualquer pasta irmã com `cht.config.json`, basta `--client:<name>` (o valor de `name` no ficheiro).

O runner abre um TUI estilo htop com tabs por processo.

### 3) Build/export de frontend por cliente

```bash
npx chtmain build <name>
```

O script executa o build do `cht-base` para o cliente informado e exporta o artefato em:

```text
builds/<name>/dist
```

Se `builds/<name>/dist` já existir, ele é removido e recriado.

### 4) App desktop (Electron)

Modo desenvolvimento:

```bash
npx chtmain electron <name>
```

Empacotar para o sistema hospedeiro (`AppImage`, `deb` e diretório `dir` no Linux):

```bash
npx chtmain electron build <name>
npx chtmain electron build <name> --win      # Windows (nsis)
npx chtmain electron build <name> --publish  # envia para o GitHub Releases
```

Os artefatos saem em `builds/<name>/desktop`. Alvos disponíveis: `--win` (`nsis`), `--linux` (`AppImage`/`deb`) e `--mac` (`dmg`/`zip`).

Instaladores e atualização automática via GitHub Releases: veja [`workspaces/devApp/.cursor/docs/desktop-release.md`](./workspaces/devApp/.cursor/docs/desktop-release.md).

### 5) Incrementar a versão

Para incrementar as três repos principais, commitar o bump, copiar esses números para os pins do `cht-main` e fazer push (branch `main` se omitires):

```bash
npx chtmain bump-core
npx chtmain bump-core --all
npx chtmain bump-core --manual-commit-message
npx chtmain bump-core --dry-run
```

Sem `--all`, a working tree rastreada tem de estar limpa e o commit leva só o ficheiro `version`. Com `--all`, também entra o resto das alterações de cada repo (e do `cht-main`) no mesmo commit do bump. Com `--manual-commit-message`, cada repo que tiver alterações além da versão pede a mensagem de commit (e inclui essas alterações). Cada repo principal recebe `bump: x.y.z → a.b.c` quando só muda a versão. O `cht-main` só atualiza as linhas `cht-*` (a linha `version` dele não muda).

## Observações rápidas

- Se você editar manualmente `common-dependencies.json`, a próxima execução do sync respeita esse arquivo.
- Para detalhes completos da sincronização de dependências, veja [`workspaces/devApp/.cursor/docs/deps_sync.md`](./workspaces/devApp/.cursor/docs/deps_sync.md).
- Contexto do monorepo (aliases, runner, cliente novo): [`workspaces/devApp/.cursor/docs/context.md`](./workspaces/devApp/.cursor/docs/context.md).
- Contribuir (estilo, qualidade, estabilidade de componentes): [`CONTRIBUTING.md`](./CONTRIBUTING.md).
