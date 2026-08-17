# Celi Herstal's Template project context

> **AI NOTICE:** Whenever `context.md` is invoked, cited, or used as reference, the AI must read this file and **every file linked in this index**, treating them as mandatory imports before answering, suggesting commands, or acting on the workspace.
>
> **Documentation index:**
> - [context.md](./context.md) — Visão geral do workspace, mapa mental e arquitetura multi-cliente (`cht-base` + clientes).
> - [code-guidelines.md](../rules/code-guidelines.md) — Regras de estilo e consistência de código.
> - [document-guide.md](../rules/document-guide.md) — Guia de documentação.
> - [deps_sync.md](./deps_sync.mdd) — Documentação sobre a sincronização de depenencias.

---

## Mapa do repositório (monorepo)

Pastas irmãs sob o mesmo diretório pai (ex.: `cht-project/`):

| Pasta | Função |
|-------|--------|
| **cht-base** | Boot técnico do front-end: Vite + Vue + `vue-router` (criado em `main.ts`), plugins (`$project`, toast, etc.), integração com design system e shared. **Não** define rotas nem layout da app — isso vive no cliente (`@client/App.vue`, `@client/routes.ts`) ou no stub de dev (`src/devApp/`). |
| **cht-design-system** | Componentes Vue reutilizáveis e tokens de UI. Consumido pelo base (e por páginas de cliente) via alias `@design/*`. |
| **cht-shared** | Código partilhado (utilitários, validadores, etc.). Consumido via alias `@shared/*`. |
| **cht-client-&lt;nome&gt;** | App do cliente: `App.vue`, `routes.ts`, layouts, `pages/`, componentes e `js`. Não contém o servidor Vite; o `cht-base` importa `@client/*` em tempo de build. |

Instalação de dependências em todos os pacotes com `package.json` no diretório pai: ver `cht-shared/install.sh` (percorre pastas irmãs e corre `npm i`).

---

## Arquitetura multi-cliente (`cht-base`)

### Ideia

- O **base** é o ponto de entrada técnico (`main.ts`, `vite.config.ts`): monta a app Vue, regista plugins e cria o `vue-router` com as rotas importadas de **`@client/routes.ts`**.
- Cada **cliente** é uma pasta irmã (`../<clientDir>/src`), tipicamente `cht-client-mecarvit`, com **`App.vue`** (raiz com `<RouterView />`), **`routes.ts`** (árvore de rotas explícita), layouts opcionais, `pages/`, `components/`, `js/`.
- A variável de ambiente **`CLIENT`** escolhe qual `ClientConfig` carregar e para onde o alias **`@client`** aponta (pasta `src` do cliente).
- Sem `CLIENT` (`npm run dev`), o alias **`@client`** aponta para **`cht-base/src/devApp/`** — um “cliente fictício” interno com as mesmas entradas obrigatórias (`App.vue`, `routes.ts`) e rotas de laboratório (`/`, `/devDesign`, `/devForm`) com sidebar definida em código (`devNav.ts`), não em config.

### Configs (cliente — metadados de build)

- Cada pasta `cht-client-<name>` leva `cht.config.json` na raiz (`name`, `siteTitle`, `frontend.repo`, `backend?`).
- O runner, o install, o build e o `cht-base` **descobrem** clientes varrendo pastas `cht-client-*` que contenham esse ficheiro. Não há lista central de clientes existentes.
- `cht-base/configs/types.ts` — `ClientConfig`.
- `cht-base/configs/index.ts` — `loadConfig(name)` lê `../cht-client-<name>/cht.config.json` (usado em `vite.config.ts` para o alias `@client` e `VITE_SITE_TITLE`).

Ao adicionar um cliente novo: clonar/criar `cht-client-<nome>` com `cht.config.json`, `src/App.vue` e `src/routes.ts`. Não é preciso editar `cht-base/package.json` nem um registry.

### Build-time (Vite)

- Ficheiro: `cht-base/vite.config.ts`.
- Lê `process.env.CLIENT`, `loadConfig(clientName)`; resolve `clientDir` (convenção `cht-client-<name>` se omitido).
- Alias **`@client`** → `../<clientDir>/src` quando há cliente; **sem** `CLIENT`, aponta para **`./src/devApp`** (mesma forma de import: `@client/App.vue`, `@client/routes.ts`).
- **`define`:** `import.meta.env.VITE_SITE_TITLE` — string JSON do título (`siteTitle` do config do cliente ou `"cht-base dev"` no modo dev).

### TypeScript no base

- `cht-base/tsconfig.app.json` — paths incluem `@design/*`, `@shared/*`, `@client/*`. O array de `@client/*` é **gerado automaticamente** a partir das pastas `cht-client-*` descobertas por `scripts/sync-tsconfig.mjs` (rodado no início do runner e no `install`). Como o TS resolve `paths` para o primeiro ficheiro que existe no disco, listar todos os clientes conhecidos ajuda o IDE. O alias de runtime continua a ser resolvido por `vite.config.ts` conforme `CLIENT`.
- `cht-base/tsconfig.node.json` — inclui `configs/**/*.ts` para typecheck do Vite/configs.
- `cht-base/src/env.d.ts` — tipa `import.meta.env.VITE_SITE_TITLE` (entre outros `vite/client`).

### Rotas e UI (responsabilidade do cliente)

- O **cliente** exporta **`routes.ts`** (`RouteRecordRaw[]` por defeito) e define layouts livremente (ex.: `layouts/MainLayout.vue` com `<Sidebar>` do design system + `<RouterView />`).
- O **design system** fornece `Sidebar` (`@design/components/custom/Sidebar.vue`); o cliente passa `nav-items` como dados ou composição Vue — **não** há `sidebarNav` em `configs/`.
- Rotas **sem** sidebar: definir no `routes.ts` um ramo sem componente layout (ex.: `/login` ao nível raiz).
- **Modo dev** (`npm run dev`): rotas em `cht-base/src/devApp/routes.ts` + layout `DevLayout.vue` que reutiliza o mesmo `Sidebar` e views em `cht-base/src/views/` (`index.vue`, `DevDesign.vue`, `DevForm.vue`).

### Estado global `$project`

- Ficheiro principal: `cht-base/src/project.ts`.
- **`$project.url.query`** — snapshot reativo da querystring (parâmetros `?a=b`).
- **`$project.url.params`** — snapshot reativo dos **params da rota** (ex.: rota `/:id` → `params.id`). Não é a querystring.
- Sincronização em `initProjectRouter` + `router.afterEach`; utilitários em `cht-base/src/js/utils/routeUtils.ts` (`syncReactiveQuerySnapshot`, `syncReactiveParamsSnapshot`).

### Aplicar título do site

- `cht-base/src/main.ts` usa `import.meta.env.VITE_SITE_TITLE` (injeado no `vite.config.ts` a partir de `loadConfig`), chama `projectActions.setSiteTitle` e define `document.title`.

### Scripts npm (`cht-base/package.json`)

| Script | Comportamento |
|--------|----------------|
| `npm run dev` | Vite sem `CLIENT` — `@client` → `src/devApp` (rotas `/`, `/devDesign`, `/devForm`). |
| `npm run dev:client` | Vite com `CLIENT` no ambiente — `@client` → `cht-client-<name>/src`. O runner passa `CLIENT=<name>`. |
| `npm run build` / `build:client` | Build sem cliente (devApp) ou com `CLIENT=<name>`. |

Usa-se **`cross-env`** para `CLIENT=...` em ambientes Windows/Linux.

---

## Estrutura esperada de um cliente (ex.: `cht-client-mecarvit`)

```
cht-client-mecarvit/
  cht.config.json       # name, siteTitle, frontend.repo, backend?
  package.json          # devDeps mínimas (TypeScript, Vue, tipos) para IDE e resolução de tsconfig
  tsconfig.json
  tsconfig.app.json     # paths: @design, @shared, @base, @/* → ./src/* (aliases locais do cliente)
  src/
    env.d.ts
    App.vue             # raiz: normalmente só <RouterView />
    routes.ts           # export default RouteRecordRaw[] — rotas explícitas
    layouts/            # opcional: shells com Sidebar, múltiplos layouts por área, etc.
    nav/                # opcional: itens passados ao Sidebar (dados ou lógica Vue)
    pages/              # views importadas em routes.ts (não há scan automático pelo base)
    components/
    js/
```

Imports típicos: `@design/...`, `@shared/...`, `@client/components/...`, `@client/js/...`.

---

## Aliases resumidos

| Alias | Resolução (conceito) |
|-------|----------------------|
| `@design/*` | `cht-design-system/src/*` |
| `@shared/*` | `cht-shared/src/*` |
| `@client/*` | `cht-client-<nome>/src/*` com `CLIENT`; sem `CLIENT`, `cht-base/src/devApp/*` |

---

## Dev runner multi-shell (TUI estilo htop)

Runner moderno baseado em **Node + Ink (React no terminal)**: blocos com bordas, cores por status, hyperlinks clicáveis (OSC 8) e troca de tabs por teclado. O `run.sh` na raiz é apenas um wrapper fino que delega para `scripts/runner/index.jsx`.

### Uso

```bash
./run.sh --client:mecarvit   # frontend (cht-base CLIENT=mecarvit) + backend (cht-backend-mecarvit)
./run.sh --client:dev        # apenas cht-base em modo dev (rotas de laboratório), sem backend
./run.sh                     # equivalente a --client:dev
```

Equivalente via npm: `npm run dev -- --client:mecarvit`.

### Discovery: `cht-client-*/cht.config.json` + `clients.json` (shared)

Clientes existentes são descobertos no disco: pastas `cht-client-<name>` com `cht.config.json` na raiz. O [clients.json](../../clients.json) na raiz guarda só infra compartilhada (`shared.repos`, `shared.vitePorts`). Convenções:

- `cht.config.json` ⇒ `name`, `siteTitle`, `frontend.repo`, `backend.repo` / `backend.script` (opcional).
- `frontend.dir` ⇒ `cht-base` (a app shell).
- `frontend.cmd` ⇒ `dev:client` com `CLIENT=<name>`.
- `frontend.clientDir` ⇒ `cht-client-<name>`.
- `backend.dir` ⇒ default `cht-backend-<name>`. Cliente sem backend: omitir o bloco `backend`.
- `backend.script` ⇒ default `dev`.
- `shared.repos` ⇒ URLs sempre clonados pelo `install`.
- `shared.vitePorts` ⇒ portas liberadas antes do dev (default `[5173, 5174]`).

### Estrutura do código

```
scripts/
  lib/
    clients.mjs         # resolveClient, parseClientFlag, getSharedRepos, ...
    procManager.mjs     # ProcessManager: spawn setsid + ring buffer + kill tree
    ansiUtils.mjs       # stripAnsi, findUrls, osc8Link
  runner/
    index.jsx           # entrypoint: parse args, spawn, render Ink App
    App.jsx             # layout (header + log pane + status bar)
    components/
      Header.jsx, ProcessTab.jsx, LogPane.jsx, StatusBar.jsx
    hooks/
      useProcesses.js, useKeyboard.js
  install.mjs           # clona shared.repos + backend.repo do config do cliente, npm i recursivo
  build.mjs             # build/export do front para builds/<cliente>/dist
```

### Comportamento

- Cada processo corre num **process group** próprio (`setsid`) com saída line-buffered (`stdbuf -oL -eL` quando disponível). Logs ficam em buffers em memória (~5000 linhas por processo) — sem arquivos temporários.
- Cores ANSI dos processos (Vite, tsx, etc.) são preservadas com `FORCE_COLOR=1`.
- URLs nos logs (`http(s)://...`) são detectados, deduplicados e renderizados como hyperlinks OSC 8 clicáveis na status bar (em terminais que suportam).
- Teclas:
  - **`←` / `→`** ou **`h` / `l`** — alterna a tab focada.
  - **`↑` / `↓`** ou **`k` / `j`** — scroll do log da tab ativa. **PgUp** / **PgDn** pagina. A roda do mouse envia as mesmas setas (modo alternate-scroll).
  - **`r`** — restart do processo da tab ativa.
  - **`c`** — limpa o buffer da tab ativa.
  - **`q`** ou **`Ctrl+C`** — encerra tudo (SIGTERM no PGID, SIGKILL nos sobreviventes após 200 ms).

### Adicionar um cliente novo

1. Clonar ou criar a pasta `cht-client-<name>` com `cht.config.json` (`name`, `siteTitle`, `frontend.repo`, e `backend` se houver), mais `src/App.vue` e `src/routes.ts`.
2. `./install.sh --client:<name>` clona o backend a partir de `backend.repo` (a pasta do frontend já tem de existir para ler o config).
3. Pronto: `./run.sh --client:<name>` já funciona. O `@client/*` em `cht-base/tsconfig.app.json` é regerado automaticamente pelo runner/install (ou via `npm run sync:tsconfig`).

### Export de build (artefato web)

- `./build.sh <cliente>` (ou `npm run build -- <cliente>`) executa o build do `cht-base` para o cliente informado.
- O artefato final é copiado para `builds/<cliente>/dist`.
- Se o destino já existir, ele é removido e recriado (replace total).
- O script usa validação de cliente via `scripts/lib/clients.mjs`.

---

## Ficheiros-chave para navegação rápida

- `cht-base/vite.config.ts` — `CLIENT`, alias `@client`, `VITE_SITE_TITLE`.
- `cht-client-<nome>/cht.config.json` — metadados do cliente (`name`, `siteTitle`, repos).
- `cht-base/configs/*` — loader (`loadConfig`) e tipo `ClientConfig`.
- `cht-base/src/devApp/*` — “cliente” interno para modo dev (`App.vue`, `routes.ts`, `DevLayout.vue`, `devNav.ts`).
- `cht-client-<nome>/src/App.vue` e `routes.ts` — app e rotas do cliente.
- `cht-base/src/project.ts` — `$project` e `initProjectRouter`.
- `cht-base/src/main.ts` — cria router a partir de `@client/routes`, monta `@client/App.vue`, plugins, título.
- `run.sh` — dev runner multi-shell (frontend + backend por cliente, alternância com setas).
- `build.sh` / `scripts/build.mjs` — build/export do front para `builds/<cliente>/dist`.
