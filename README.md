<div align="center">

<img alt="CHT logo" src="https://github.com/celiy/cht-base/blob/main/assets/CHT-Logo-1000.png" width="160">

# CHT

**Workspace principal do template multi-cliente (Celi's Herstal Template).**

[CHT-Dev App](https://cht-dev.netlify.app/).

<p align="center">
    <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-yellow.svg"></a>
    <a href="https://nodejs.org/"><img alt="Node.js 24" src="https://img.shields.io/badge/Node.js-24-339933.svg?logo=nodedotjs&logoColor=white"></a>
    <a href="https://vuejs.org/"><img alt="Vue 3" src="https://img.shields.io/badge/Vue-3.5-4FC08D.svg?logo=vuedotjs&logoColor=white"></a>
    <a href="https://vite.dev/"><img alt="Vite 7" src="https://img.shields.io/badge/Vite-7-646CFF.svg?logo=vite&logoColor=white"></a>
    <a href="https://tailwindcss.com/"><img alt="Tailwind CSS 4" src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4.svg?logo=tailwindcss&logoColor=white"></a>
    <a href="https://www.electronjs.org/"><img alt="Electron 44" src="https://img.shields.io/badge/Electron-44-47848F.svg?logo=electron&logoColor=white"></a>
    <a href="CONTRIBUTING.md"><img alt="PRs welcome" src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg"></a>
</p>

<p align="center">
  <b>Funciona com</b><br>
  <a href="https://code.claude.com/docs/en/skills"><img alt="Claude Code" src="https://img.shields.io/badge/Claude%20Code-D97757?style=for-the-badge&logo=claude&logoColor=white"></a>
  <a href="https://developers.openai.com/codex/skills"><img alt="Codex" src="https://img.shields.io/badge/Codex-000000?style=for-the-badge"></a>
  <a href="https://cursor.com/docs/skills"><img alt="Cursor" src="https://img.shields.io/badge/Cursor-000000?style=for-the-badge&logo=cursor&logoColor=white"></a>
  <a href="https://docs.github.com/en/copilot/concepts/agents/about-agent-skills"><img alt="GitHub Copilot" src="https://img.shields.io/badge/GitHub%20Copilot-000000?style=for-the-badge&logo=githubcopilot&logoColor=white"></a>
  <br><sub>…e qualquer outro agente que consia ler <code>AGENTS.md</code> e rodar commandos no terminal.</sub>
</p>

</div>

---

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

| Comando      | O que faz                                             |
| ------------ | ----------------------------------------------------- |
| `install`    | clona/puxa os repositórios e instala dependências     |
| `dev`        | sobe o runner de desenvolvimento (frontend + backend) |
| `build`      | builda o frontend de um cliente                       |
| `electron`   | abre ou empacota o app desktop                        |
| `bump`       | incrementa a versão de um repositório                 |
| `bump-core`  | bump das repos principais, pins no `cht-main`, push   |
| `merge-core` | merge de uma branch na outra nas repos principais     |
| `sync-deps`  | normaliza versões de dependências compartilhadas      |

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

As regras, comandos, skills e docs para agentes vivem **uma só vez**, em formato neutro, em `workspaces/devApp/ai/` (ver o README dessa pasta). No install são convertidos para o formato de cada ferramenta (`scripts/lib/aiDocs.mjs`): `.cursor/` (regras `.mdc`), `.claude/` (+ `CLAUDE.md`) e `.github/` (Copilot). `--workspace:devApp` gera `.cursor` e `.claude`; no `--new`, o assistente gera os marcados na opção Project-Opinionated.

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

### 3) Build e app desktop

#### Build do frontend

```bash
npx chtmain build <name>
```

O script executa o build do `cht-base` para o cliente informado e exporta o artefato em:

```text
builds/<name>/dist
```

Se `builds/<name>/dist` já existir, ele é removido e recriado.

#### App desktop (Electron)

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

Instaladores e atualização automática via GitHub Releases: veja [`workspaces/devApp/ai/docs/desktop-release.md`](./workspaces/devApp/ai/docs/desktop-release.md).

### 4) Referência de comandos

Todos os comandos seguem `npx chtmain <comando> [args...]` (ou `npm run cht -- <comando> [args...]`). Ajuda rápida: `npx chtmain help`.

| Comando          | Flags / argumentos            | Descrição                                                                                                                                                                                            |
| ---------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `install`        | `--client:<name>`             | Clona (ou faz `fetch` + `pull --ff-only`) os repos compartilhados e os do cliente, e roda `npm install` na raiz e nas pastas irmãs. Alias: `install:repos`.                                          |
| `install`        | `--skip-git`                  | Não clona nem atualiza repos; só instala dependências.                                                                                                                                               |
| `install`        | `--force-git`                 | Faz `fetch` e `git reset --hard origin/<ref>` nos repos. **Descarta alterações locais** não commitadas. Não pode ser usado com `--skip-git`.                                                         |
| `install`        | `--skip-npm-install`          | Clona/atualiza os repos, mas não roda `npm install`.                                                                                                                                                 |
| `install`        | `--new`                       | Abre o assistente interativo de workspace de IDE/IA (exige TTY).                                                                                                                                     |
| `install`        | `--workspace:<name>`          | Aplica o pack de workspace (`devApp` ou nome de cliente), apagando antes o que o pack anterior deixou.                                                                                               |
| `install`        | `--workspace-clean`           | Só remove os ficheiros de tooling da raiz (manifesto `.cht-workspace.json` e nomes do assistente).                                                                                                   |
| `dev`            | `--client:<name>`             | Sobe o runner TUI (frontend + backend) do cliente. Sem cliente, usa o modo `dev` do `cht-base`.                                                                                                      |
| `dev`            | `--no-backend`                | Sobe só o frontend (e a documentação), sem o processo do backend.                                                                                                                                    |
| `build`          | `<name>`                      | Builda o frontend do cliente com o `cht-base` e exporta para `builds/<name>/dist` (apaga a pasta antes). Aceita `dev` como nome.                                                                     |
| `build`          | `--bump [repo]`               | Incrementa a versão antes do build. Sem `repo`, usa o arquivo de versão do cliente; com `repo` (sem o prefixo `cht-`), bumpa outro repo.                                                             |
| `electron`       | `<name>`                      | Abre o cliente no Electron em modo desenvolvimento (backend + frontend).                                                                                                                             |
| `electron build` | `<name>`                      | Empacota o app desktop em `builds/<name>/desktop`. Alvo padrão: o sistema hospedeiro.                                                                                                                |
| `electron build` | `--win` / `--linux` / `--mac` | Escolhe o alvo: `--win` (`nsis`), `--linux` (`AppImage`/`deb`) ou `--mac` (`dmg`/`zip`).                                                                                                             |
| `electron build` | `--publish`                   | Envia os artefatos e o `latest.yml` para o feed de releases do GitHub.                                                                                                                               |
| `electron build` | `--bump [repo]`               | Igual ao `build --bump`: incrementa a versão do app antes de empacotar.                                                                                                                              |
| `create`         | `<nome> <pasta>`              | Cria um cliente novo a partir do template do `cht-base`. `nome` é kebab-case; `pasta` é relativa ao cwd ou absoluta. Se a pasta existir, copia os ficheiros para dentro (o `.git` é mantido).        |
| `bump`           | `<repo> [--dry-run]`          | Incrementa a versão (patch/minor/major, conforme o arquivo de versão) de um repo do workspace. `--dry-run` só mostra a mudança.                                                                      |
| `bump-core`      | `[branch]`                    | Faz bump das três repos principais, commita, copia os números para os pins do `cht-main` e faz push. Sem `branch`, cada repo fica na branch em que já está; com `branch`, muda todas para ela antes. |
| `bump-core`      | `--dry-run`                   | Mostra o que faria, sem alterar nada.                                                                                                                                                                |
| `bump-core`      | `--all`                       | Inclui no commit do bump as demais alterações de cada repo (e do `cht-main`). Sem a flag, a working tree rastreada tem de estar limpa e o commit leva só o ficheiro `version`.                       |
| `bump-core`      | `--manual-commit-message`     | Pede a mensagem de commit para cada repo com alterações além da versão.                                                                                                                              |
| `merge-core`     | `[source] [target]`           | Faz merge de `source` em `target` nas repos principais, na ordem `cht-shared` → `cht-design-system` → `cht-base` → `cht-main`. Padrão: `beta` → `main`.                                              |
| `merge-core`     | `--dry-run`                   | Valida o merge fazendo um merge de prova e abortando em cada repo; não altera commits nem exige working tree limpa.                                                                                  |
| `merge-core`     | `--no-push`                   | Faz só o merge local, sem `push` para `origin`.                                                                                                                                                      |
| `sync-deps`      | —                             | Normaliza as versões de dependências compartilhadas entre os repos, usando o `common-dependencies.json` como fonte da verdade. Alias: `sync:deps`.                                                   |

### 5) Integrar branch nas repos principais (`merge-core`)

Para levar o trabalho de uma branch de integração (por omissão **`beta`**) para a branch estável (**`main`**) em todas as repos do núcleo, na ordem:

1. `cht-shared`
2. `cht-design-system`
3. `cht-base`
4. `cht-main` (raiz do workspace)

```bash
npx chtmain merge-core
npx chtmain merge-core --dry-run
npx chtmain merge-core --no-push
npx chtmain merge-core beta main
```

Por omissão faz `fetch`, checkout da branch de destino, `pull --ff-only` (quando `origin/<destino>` existir), merge de `origin/<origem>` com mensagem `Merge branch '<origem>' into <destino>` e `push` para `origin`. Use `--no-push` para só merge local. Use `--dry-run` para validar o merge sem alterar commits nem exigir working tree limpa (faz merge de prova e aborta em cada repo).

Requisitos (sem `--dry-run`): cada pasta tem de ser um repositório Git com remoto `origin`, a branch de origem tem de existir em `origin`, e a working tree rastreada tem de estar limpa. Se um repo já contém a origem, o comando imprime _already up to date_ e segue. Em conflito, o processo para e indica em qual repo resolver.

Fluxo típico após validar em `beta`: `npx chtmain merge-core --dry-run`, depois `npx chtmain merge-core`. Em seguida costuma-se correr `npx chtmain bump-core` na `main` se ainda precisares de subir versões e pins.

## Observações rápidas

- Se você editar manualmente `common-dependencies.json`, a próxima execução do sync respeita esse arquivo.
- Para detalhes completos da sincronização de dependências, veja [`workspaces/devApp/ai/docs/deps_sync.md`](./workspaces/devApp/ai/docs/deps_sync.md).
- Contexto do monorepo (aliases, runner, cliente novo): [`workspaces/devApp/ai/docs/context.md`](./workspaces/devApp/ai/docs/context.md).
- Contribuir (estilo, qualidade, estabilidade de componentes): [`CONTRIBUTING.md`](./CONTRIBUTING.md).
