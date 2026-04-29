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
| **cht-base** | Runner do front-end: Vite + Vue + `vue-router`, shell da app (`App.vue`), plugin de estado global (`$project`), roteamento file-based para clientes, integração com design system e shared. |
| **cht-design-system** | Componentes Vue reutilizáveis e tokens de UI. Consumido pelo base (e por páginas de cliente) via alias `@design/*`. |
| **cht-shared** | Código partilhado (utilitários, validadores, etc.). Consumido via alias `@shared/*`. |
| **cht-client-&lt;nome&gt;** | Um repositório por cliente: apenas páginas, componentes locais e `js` específicos. Não contém o servidor Vite; é importado pelo `cht-base` em tempo de build. |

Instalação de dependências em todos os pacotes com `package.json` no diretório pai: ver `cht-shared/install.sh` (percorre pastas irmãs e corre `npm i`).

---

## Arquitetura multi-cliente (`cht-base`)

### Ideia

- O **base** é o único ponto de entrada (`main.ts`, `vite.config.ts`, `Router.ts`).
- Cada **cliente** é uma pasta irmã (`../<clientDir>`), tipicamente `cht-client-mecarvit`, com `src/pages`, `src/components`, `src/js`.
- A variável de ambiente **`CLIENT`** escolhe qual config e qual pasta de código carregar (nome lógico do cliente, ex.: `mecarvit`).
- Sem `CLIENT` (`npm run dev`), o base corre em **modo dev interno**: só as rotas de laboratório em `cht-base` (ex.: `/devDesign`, `/devForm`), definidas em `cht-base/src/Router.ts`.

### Configs (cliente e dev)

- Local: `cht-base/configs/`.
- `types.ts` — `ClientConfig` (`name`, `clientDir`, `siteTitle`, **`sidebarNav`**), `DevShellConfig` (modo dev), tipos `SidebarNavItem`, etc.
- `dev.ts` — shell quando não há `CLIENT`: `siteTitle` e **`sidebarNav`** (rotas de laboratório, ex. `/devDesign`, `/devForm`).
- Um ficheiro por cliente, ex.: `mecarvit.ts` — inclui **`sidebarNav`** além de `siteTitle` e `clientDir`.
- `index.ts` — registo de clientes e `loadConfig(name)` usado em `vite.config.ts`; reexporta `devShellConfig`.

Ao adicionar um cliente novo: criar `configs/<nome>.ts` (com `sidebarNav`), importar e registar em `configs/index.ts`, e adicionar script npm em `cht-base/package.json` (`cross-env CLIENT=<nome> vite`).

### Build-time (Vite)

- Ficheiro: `cht-base/vite.config.ts`.
- Lê `process.env.CLIENT`, carrega o config correspondente, resolve o caminho físico do cliente: `path.resolve(__dirname, "..", clientDir, "src")`.
- Alias **`@client`** → `../<clientDir>/src` quando há cliente ativo; se não houver cliente, aponta para um **stub** vazio (`cht-base/src/_clientStub`) para `import.meta.glob` continuar válido.
- **`define`:** `__CLIENT_CONFIG__` — serialização JSON do config ativo ou `null` em modo dev puro.

### TypeScript no base

- `cht-base/tsconfig.app.json` — paths incluem `@design/*`, `@shared/*`, `@client/*` (o path de `@client` aponta para o cliente “default” usado no IDE, ex.: `../cht-client-mecarvit/src`; ao mudar de cliente foco, pode atualizar-se manualmente).
- `cht-base/tsconfig.node.json` — inclui `configs/**/*.ts` para typecheck do Vite/configs.
- `cht-base/src/types/client-config.d.ts` — declara o global `__CLIENT_CONFIG__`.

### Roteamento file-based (páginas do cliente)

- Ficheiro: `cht-base/src/clientRouter.ts`.
- Usa `import.meta.glob("@client/pages/**/*.vue")` e gera rotas `vue-router`.
- Conversão de ficheiro → path HTTP:
  - `pages/index.vue` → `/`
  - `pages/rota.vue` → `/rota`
  - `pages/rota/caminho.vue` → `/rota/caminho`
  - `pages/rota/index.vue` → `/rota`
  - `pages/[id].vue` → `/:id`
  - `pages/[id]/product.vue` → `/:id/product`
- `cht-base/src/Router.ts` — se `__CLIENT_CONFIG__` existir, monta rotas de cliente com layout; caso contrário, rotas de dev do base (ver secção **Layouts e sidebar**).
- `cht-base/src/clientRouter.ts` — `buildClientPageChildren()` gera rotas **filhas** (paths relativos ao pai `/`) a partir de `pages/**/*.vue`.

### Layouts e sidebar (rotas aninhadas)

- **`App.vue`** contém apenas `<RouterView />` (raiz da app).
- **`cht-base/src/layouts/AppShellWithSidebar.vue`** — envolve o conteúdo com `Sidebar` do design system e um `<RouterView />` interior: é o **pai** das rotas que devem mostrar sidebar.
- **`cht-base/src/layouts/AppShellPlain.vue`** — `<main>` + `<RouterView />` **sem** sidebar; usar como `component` de um pai de rotas (ex.: login, ecrã full-width) quando não quiseres sidebar.
- **Modo dev** (`npm run dev`): rota pai `path: '/'` + `AppShellWithSidebar`; filhos `devDesign` → `/devDesign`, `devForm` → `/devForm` (views `DevDesign.vue` / `DevForm.vue` no base). Itens da sidebar vêm de **`cht-base/configs/dev.ts`** (`sidebarNav`); `cht-base/src/nav/sidebar.ts` apenas expõe `getSidebarNav()` que lê essa config ou `__CLIENT_CONFIG__.sidebarNav`.
- **Modo cliente**: rota pai `path: '/'` + `AppShellWithSidebar`; filhos gerados por `buildClientPageChildren()` (paths relativos: `''` → `/`, `'foo'` → `/foo`, `':id/product'` → `/:id/product`, etc.). Navegação lateral: campo **`sidebarNav`** em `cht-base/configs/<cliente>.ts` (ex. `mecarvit.ts`).

Para uma rota **sem** sidebar, adicionar em `Router.ts` (ou equivalente) um ramo top-level com `AppShellPlain` e os seus `children` — o padrão é o mesmo: layout = componente pai, páginas = filhos.

### Estado global `$project`

- Ficheiro principal: `cht-base/src/project.ts`.
- **`$project.url.query`** — snapshot reativo da querystring (parâmetros `?a=b`).
- **`$project.url.params`** — snapshot reativo dos **params da rota** (ex.: rota `/:id` → `params.id`). Não é a querystring.
- Sincronização em `initProjectRouter` + `router.afterEach`; utilitários em `cht-base/src/js/utils/routeUtils.ts` (`syncReactiveQuerySnapshot`, `syncReactiveParamsSnapshot`).

### Aplicar título do site

- Com cliente ativo, `cht-base/src/main.ts` lê `__CLIENT_CONFIG__`, chama `projectActions.setSiteTitle` e define `document.title`.

### Scripts npm (`cht-base/package.json`)

| Script | Comportamento |
|--------|----------------|
| `npm run dev` | Vite sem `CLIENT` — modo dev do base (rotas `/devDesign`, `/devForm`). |
| `npm run mecarvit` | `CLIENT=mecarvit` — rotas geradas a partir de `cht-client-mecarvit/src/pages`. |
| `npm run build` / `build:mecarvit` | Build com ou sem cliente (alinhado ao plano). |

Usa-se **`cross-env`** para `CLIENT=...` em ambientes Windows/Linux.

---

## Estrutura esperada de um cliente (ex.: `cht-client-mecarvit`)

```
cht-client-mecarvit/
  package.json          # devDeps mínimas (TypeScript, Vue, tipos) para IDE e resolução de tsconfig
  tsconfig.json
  tsconfig.app.json     # paths: @design, @shared, @client → ./src/*
  src/
    env.d.ts
    pages/              # única pasta escaneada pelo router file-based do base
    components/
    js/
```

Imports típicos nas páginas: `@design/...`, `@shared/...`, `@client/components/...`, `@client/js/...`.

---

## Aliases resumidos

| Alias | Resolução (conceito) |
|-------|----------------------|
| `@design/*` | `cht-design-system/src/*` |
| `@shared/*` | `cht-shared/src/*` |
| `@client/*` | `cht-client-<nome>/src/*` (definido pelo Vite conforme `CLIENT` + `clientDir` no config) |

---

## Dev runner multi-shell (`run.sh`)

Script na raiz do monorepo que lança em paralelo os processos de dev necessários para um cliente e expõe um TUI único onde se alterna entre as shells com as setas do teclado.

### Uso

```bash
./run.sh --client:mecarvit   # frontend (cht-base CLIENT=mecarvit) + backend (cht-backend-mecarvit)
./run.sh --client:dev        # apenas cht-base em modo dev (rotas de laboratório), sem backend
./run.sh                     # equivalente a --client:dev
```

### Comportamento

- Cada processo (`front-end`, `back-end`, ...) corre num **process group** próprio (`setsid`) com saída line-buffered (`stdbuf -oL -eL`) escrita para um log temporário em `/tmp/cht-run-XXXXXX/<i>.log`.
- O TUI usa **alternate screen** (`tput smcup`) e input raw; renderiza um header tipo `[ X front-end ] / [ back-end ]` e o `tail` do log da shell ativa, redesenhando a cada ~300 ms.
- Teclas: **`←` / `→`** (ou `h` / `l`) alternam a shell focada; **`q`** ou `Ctrl+C` encerra tudo (envia `SIGTERM` ao process group, `SIGKILL` se algum sobreviver).
- Se o cliente escolhido não tem backend (caso de `dev`), só o front-end aparece.

### Adicionar novos clientes

Dentro do `case "$CLIENT"` em `run.sh`, acrescentar um bloco que faça `NAMES+=`, `DIRS+=` e `CMDS+=` para cada processo do cliente. O número de tabs ajusta-se automaticamente.

---

## Ficheiros-chave para navegação rápida

- `cht-base/vite.config.ts` — cliente ativo, alias `@client`, `__CLIENT_CONFIG__`.
- `cht-base/configs/*` — configs por cliente.
- `cht-base/src/Router.ts` — dev vs cliente; árvore de layouts (sidebar / plain).
- `cht-base/src/layouts/AppShellWithSidebar.vue` / `AppShellPlain.vue` — shells com ou sem sidebar.
- `cht-base/src/nav/sidebar.ts` — `getSidebarNav()` (lê `configs/dev` ou `__CLIENT_CONFIG__`).
- `cht-base/src/clientRouter.ts` — `buildClientPageChildren()` a partir de `pages/**/*.vue`.
- `cht-base/src/project.ts` — `$project` e `initProjectRouter`.
- `cht-base/src/main.ts` — plugins, título.
- `run.sh` — dev runner multi-shell (frontend + backend por cliente, alternância com setas).
