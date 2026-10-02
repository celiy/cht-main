# Celi Herstal's Template project context

Índice de arquitetura. Ler este ficheiro ao trabalhar em clientes, runner, aliases ou `cht-base`. Estilo de código: `.cursor/rules/`. Toast: `.cursor/docs/toast.md`.

**Documentação:**

- [context.md](./context.md) — este ficheiro
- [toast.md](./toast.md) — `$toast` e `<Toast>`
- [deps_sync.md](./deps_sync.md) — sincronização de dependências
- [code-guidelines.mdc](../rules/code-guidelines.mdc)
- [document-guide.mdc](../rules/document-guide.mdc)

---

## Mapa do repositório (monorepo)

Pastas irmãs sob o mesmo diretório pai (ex.: `cht-project/`):

| Pasta                       | Função                                                                                                                                                                                                                |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **cht-base**                | Boot técnico: Vite + Vue + `vue-router` em `main.ts`, plugins (`$project`, `$toast`), design system e shared. Rotas e layout da app vêm do cliente (`@client/App.vue`, `@client/routes.ts`) ou do stub `src/devApp/`. |
| **cht-design-system**       | Componentes Vue reutilizáveis e tokens de UI. Consumido pelo base (e por páginas de cliente) via alias `@design/*`.                                                                                                   |
| **cht-shared**              | Código partilhado (utilitários, validadores, etc.). Consumido via alias `@shared/*`.                                                                                                                                  |
| **cht-client-&lt;nome&gt;** | App do cliente: `App.vue`, `routes.ts`, layouts, `pages/`, componentes e `js`. Não contém o servidor Vite; o `cht-base` importa `@client/*` em tempo de build.                                                        |

Instalação de dependências em todos os pacotes com `package.json` no diretório pai: `npx chtmain install` (`scripts/install.mjs`) percorre as pastas irmãs e corre `npm install`.

---

## Arquitetura multi-cliente (`cht-base`)

### Ideia

- O **base** é o ponto de entrada técnico (`main.ts`, `vite.config.ts`): monta a app Vue, regista plugins e cria o `vue-router` com as rotas importadas de **`@client/routes.ts`**.
- Cada **cliente** é uma pasta irmã (`../<clientDir>/src`), tipicamente `cht-client-mecarvit`, com **`App.vue`** (raiz com `<RouterView />`), **`routes.ts`** (árvore de rotas explícita), layouts opcionais, `pages/`, `components/`, `js/`.
- A variável de ambiente **`CLIENT`** escolhe qual `ClientConfig` carregar e para onde o alias **`@client`** aponta (pasta `src` do cliente).
- Sem `CLIENT` (`npm run dev`), o alias **`@client`** aponta para **`cht-base/src/devApp/`** — cliente interno com `App.vue`, `routes.ts` e docs em `/docs` (layout `DevAppLayout.vue`, nav em `ts/componentsNav.ts`).

### Configs (cliente — metadados de build)

- Cada pasta de frontend leva **`cht.config.json`** na raiz (`name`, `siteTitle`, `frontend.repo`, `backend?`). O nome da pasta é livre.
- O runner, o install, o build e o `cht-base` **descobrem** clientes varrendo pastas irmãs que contenham esse ficheiro. Não há lista central de clientes existentes nem convenção `cht-client-*`.
- `cht-base/configs/types.ts` — `ClientConfig`.
- `cht-base/configs/index.ts` — `loadConfig(name)` encontra o `cht.config.json` cujo `name` coincide (usado em `vite.config.ts` para o alias `@client` e `VITE_SITE_TITLE`).

Ao adicionar um cliente novo: clonar/criar a pasta irmã com `cht.config.json`, `src/App.vue` e `src/routes.ts`. Não é preciso editar `cht-base/package.json` nem um registry.

### Build-time (Vite)

- Ficheiro: `cht-base/vite.config.ts`.
- Lê `process.env.CLIENT`, `loadConfig(clientName)`; resolve `clientDir` a partir da pasta onde o `cht.config.json` foi encontrado.
- Alias **`@client`** → `../<clientDir>/src` quando há cliente; **sem** `CLIENT`, aponta para **`./src/devApp`** (mesma forma de import: `@client/App.vue`, `@client/routes.ts`).
- **`define`:** `import.meta.env.VITE_SITE_TITLE` — string JSON do título (`siteTitle` do config do cliente ou `"cht-base dev"` no modo dev).

### TypeScript no base

- `cht-base/tsconfig.app.json` — paths incluem `@design/*`, `@shared/*`. O `@client/*` **não** fica no ficheiro por omissão: `scripts/mount-client-tsconfig.mjs` monta o path do cliente só durante `chtmain build` / `electron build` e remove-o no fim. O alias de runtime continua no Vite via `CLIENT`.
- `cht-base/tsconfig.node.json` — inclui `configs/**/*.ts` para typecheck do Vite/configs.
- `cht-base/src/env.d.ts` — tipa `import.meta.env.VITE_SITE_TITLE` (entre outros `vite/client`).

### Tailwind: fontes do cliente

- `cht-base/src/css/style.css` importa o Tailwind e registra as fontes com `@source`. O cliente entra por `@source "virtual:client-source"`, que **não** é um caminho real: `cht-base/vite-plugins/clientSource.ts` substitui a diretiva pela pasta `src` do cliente ativo (`CLIENT`). Sem `CLIENT`, a diretiva é removida — nos docs, `@source "../../"` já cobre `src/devApp`.
- **Override CSS:** `src/override.css` no cliente ativo é opcional. `cht-base/vite-plugins/clientOverride.ts` serve o ficheiro como stylesheet extra (depois do CSS compilado), para as regras sem `@layer` ganharem das utilities. Serve para redefinir classes globais (`hover-ring`, `btn-group`, containers) sem alterar o design system. Sem `CLIENT` ou sem o ficheiro, nada é injetado. O template de `npx chtmain create` inclui um `override.css` vazio.
- **Não** troque o `@source` por um glob como `@source "../../../cht-client-*/src"`. O `*` dentro de um segmento de diretório não expande: o Tailwind ignora a diretiva em silêncio e as classes usadas **só** pelo cliente desaparecem do bundle (um `w-20` ou `right-4` que existe no `.vue` e não sai no CSS). O mesmo vale para `cht-client-*` sem o `/src`; `**` funciona, mas só depois de um trecho literal, e varreria os outros clientes.
- Sintoma típico: `top-4` funciona e `right-4` não, na mesma linha de `class` — a primeira aparece no `cht-base` ou no design system, a segunda só no cliente.
- Ao mexer em `@source`, valide olhando o CSS gerado, não o navegador:

```bash
cd cht-base && CLIENT=mecarvit npm run build:client
grep -oF '.w-20' dist/assets/*.css   # deve achar; vazio = fonte não registrada
```

- `?direct` (`/src/css/style.css?direct`) responde 500 no dev server por não resolver `virtual:client-theme`. É anterior e independente disto; para conferir o CSS em dev, use a URL sem query.

### Rotas e UI (responsabilidade do cliente)

- O **cliente** exporta **`routes.ts`** (`RouteRecordRaw[]` por defeito) e define layouts livremente (ex.: `layouts/MainLayout.vue` com `<Sidebar>` do design system + `<RouterView />`).
- O **design system** fornece `Sidebar` (`@design/components/custom/Sidebar.vue`); o cliente passa `nav-items` como dados ou composição Vue — **não** há `sidebarNav` em `configs/`.
- Rotas **sem** sidebar: definir no `routes.ts` um ramo sem componente layout (ex.: `/login` ao nível raiz).
- **Modo dev** (`npm run dev`): `cht-base/src/devApp/routes.ts` + `DevAppLayout.vue` (Navigator, Sidebar nas rotas `/docs`, host `<Toast />`).

### Componentes globais do design system

- Plugin: `cht-design-system/src/plugin.ts`, instalado em `cht-base/src/main.ts` (`app.use(designSystemPlugin)`). **Não** anotar como `Plugin`.
- Regista automaticamente os `.vue` em `components/`, `components/custom/` e `components/custom/charts/` (nome = `defineComponent.name` ou o ficheiro). `components/internal/` não entra.
- Tipos Volar/vue-tsc: `cht-base/src/global-components.d.ts` (augmenta `vue` e `@vue/runtime-core` com os SFCs via `@design/...`). `vueCompilerOptions.strictTemplates` no `tsconfig.app.json`.

### Toast (`$toast`)

- Plugin próprio em `cht-design-system/src/toast/` (substitui `vue-toastification`).
- `cht-base/src/main.ts` faz `app.use(toastPlugin, { timeout: 4000 })`.
- O layout monta `<Toast position width />`. Contrato: `.cursor/docs/toast.md`.

### Estado global `$project`

- Ficheiro principal: `cht-base/src/project.ts`.
- **`$project.url.query`** — snapshot reativo da querystring (parâmetros `?a=b`).
- **`$project.url.params`** — snapshot reativo dos **params da rota** (ex.: rota `/:id` → `params.id`). Não é a querystring.
- **`$project.device.viewportWidth` / `viewportHeight`** — tamanho da janela; atualizado no `resize`. Usar para posicionar overlays no centro do ecrã (`<ViewportCenter>`).
- **`$project.route.isLoading`** — `true` enquanto uma navegação espera o chunk lazy da rota. O layout de docs mostra barra + overlay.
- **`$project.electron`** — `isElectron`, `hasBackend`, `backendReady` e status do backend local quando a app corre no Electron.
- Sincronização em `initProjectRouter` + `router.afterEach`; utilitários em `cht-base/src/js/utils/routeUtils.ts` (`syncReactiveQuerySnapshot`, `syncReactiveParamsSnapshot`).

### Aplicar título do site

- `cht-base/src/main.ts` usa `import.meta.env.VITE_SITE_TITLE` (injeado no `vite.config.ts` a partir de `loadConfig`), chama `projectActions.setSiteTitle` e define `document.title`.

### Scripts npm (`cht-base/package.json`)

| Script                           | Comportamento                                                                                        |
| -------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `npm run dev`                    | Vite sem `CLIENT` — `@client` → `src/devApp` (rotas `/`, `/devDesign`, `/devForm`).                  |
| `npm run dev:client`             | Vite com `CLIENT` no ambiente — `@client` → `../<clientDir>/src` (pasta do `cht.config.json`). O runner passa `CLIENT=<name>`. |
| `npm run build` / `build:client` | Build sem cliente (devApp) ou com `CLIENT=<name>`.                                                   |
| `npm run electron:compile`       | Compila `electron/main.ts` e `preload.ts` para `electron-dist/`.                                     |

O launcher do monorepo é `npx chtmain electron <client>` (dev) e `npx chtmain electron build <client>` (pacote).

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

| Alias       | Resolução (conceito)                                                          |
| ----------- | ----------------------------------------------------------------------------- |
| `@design/*` | `cht-design-system/src/*`                                                     |
| `@shared/*` | `cht-shared/src/*`                                                            |
| `@client/*` | `<clientDir>/src/*` com `CLIENT` (`clientDir` vem do `cht.config.json`); sem `CLIENT`, `cht-base/src/devApp/*` |

---

## Dev runner multi-shell (TUI estilo htop)

Runner moderno baseado em **Node + Ink (React no terminal)**: blocos com bordas, cores por status, hyperlinks clicáveis (OSC 8) e troca de tabs por teclado. É o que o comando `dev` do `scripts/entry.mjs` inicia (`scripts/runner/index.jsx`).

### Uso

```bash
npx chtmain dev --client:mecarvit   # frontend (cht-base CLIENT=mecarvit) + backend (pasta em backend.dir do config)
npx chtmain dev --client:dev        # apenas cht-base em modo dev (rotas de laboratório), sem backend
npx chtmain dev                     # equivalente a --client:dev
```

Equivalente via npm: `npm run dev -- --client:mecarvit`.

### Discovery: `cht.config.json` + `clients.json` (shared)

Clientes existentes são descobertos no disco: qualquer pasta irmã com `cht.config.json` na raiz. O [clients.json](../../clients.json) na raiz guarda só infra compartilhada (`shared.repos`, `shared.vitePorts`) e o catálogo de clone. Campos relevantes:

- `cht.config.json` ⇒ `name`, `siteTitle`, `frontend.repo`, bloco `backend` opcional.
- `frontend.dir` ⇒ `cht-base` (a app shell).
- `frontend.cmd` ⇒ `dev:client` com `CLIENT=<name>`.
- `frontend.clientDir` ⇒ pasta onde o `cht.config.json` foi encontrado.
- `backend.dir` ⇒ pasta do backend (obrigatória se houver `backend`).
- `backend.cmd` ⇒ comando a correr nessa pasta (Node, Maven, …). Sem `cmd`, usa `npm run` + `backend.script` (padrão `dev`).
- `backend.packageWithElectron` ⇒ default `true`; `false` omite o backend do instalador Electron.
- `shared.repos` ⇒ URLs sempre clonados pelo `install`.
- `shared.vitePorts` ⇒ portas liberadas antes do dev (default `[5173, 5174]`).
- Detalhe de campos e exemplos (Java, Electron): página **Sistema → cht.config** no devApp (`/docs/cht-config`).

### devApp (documentação de componentes)

- Páginas em `cht-base/src/devApp/pages/docs/components/*.vue`; nav em `ts/componentsNav.ts`.
- **Estado de prontidão:** `devApp/data/componentReadiness.json` (slug da rota → `success` | `info` | `warning` | `destructive`). `DocsOutline` mostra `DocsComponentStatus` (`Item` tipo alert) acima do conteúdo; textos em `ts/componentReadiness.ts`.

### Design system: Select com “cadastrar” no painel

- `FormRenderer` expõe slot `#select-inside-empty-panel` (repasse em `ItemViewEdit`).
- `OptionsList` usa o slot `insideEmptyPanel`: rodapé do painel quando há opções; mensagem vazia + slot quando não há resultados.
- CRUD Mecarvit: ver `clientes.vue` (endereços/veículos) e `funcionarios.vue` (cargo) — `selectAction` no campo + botão no slot; `closeSelect(fieldId)` antes de abrir sub-diálogo.

### Modal e URL (`?modal=[id,...]`)

- Vários modais abertos no mesmo tick: `cht-shared/src/frontend/modalQuery.ts` (`trackModalUrlOpenState`, `scheduleModalUrlQuerySync`) evita corrida no `router.push`.
- Testes: `cht-backend-mecarvit/tests/modalQuery.test.ts`.

### Estrutura do código

```
scripts/
  lib/
    clients.mjs         # resolveClient, parseClientFlag, getSharedRepos, ...
    version.mjs         # leitura/escrita da versão e regra de bump (x.y.z)
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
  bump.mjs              # incrementa o arquivo `version` de um repo (sem commit)
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

1. Clonar ou criar uma pasta irmã com `cht.config.json` (`name`, `siteTitle`, `frontend.repo`, e `backend` com `dir` + `cmd` se houver), mais `src/App.vue` e `src/routes.ts`.
2. `npx chtmain install --client:<name>` clona o backend a partir de `backend.repo` (a pasta do frontend já tem de existir para ler o config, ou o nome tem de estar no catálogo `clients.json`).
3. Pronto: `npx chtmain dev --client:<name>` já funciona (runtime via Vite/`CLIENT`). Em `chtmain build` / `electron build`, o `@client/*` é montado temporariamente no tsconfig para o `vue-tsc`.

### Export de build (artefato web)

- `npx chtmain build <cliente>` (ou `npm run build -- <cliente>`) executa o build do `cht-base` para o cliente informado.
- O artefato final é copiado para `builds/<cliente>/dist`.
- Se o destino já existir, ele é removido e recriado (replace total).
- O script usa validação de cliente via `scripts/lib/clients.mjs`.

---

## Ficheiros-chave para navegação rápida

- `cht-base/vite.config.ts` — `CLIENT`, alias `@client`, `VITE_SITE_TITLE`.
- `<clientDir>/cht.config.json` — metadados do cliente (`name`, `siteTitle`, repos, `backend`).
- `cht-base/configs/*` — loader (`loadConfig`) e tipo `ClientConfig`.
- `cht-base/src/devApp/*` — cliente interno (`App.vue`, `routes.ts`, `DevAppLayout.vue`, `ts/componentsNav.ts`).
- `cht-client-<nome>/src/App.vue` e `routes.ts` — app e rotas do cliente.
- `cht-base/src/project.ts` — `$project` e `initProjectRouter`.
- `cht-base/src/main.ts` — cria router a partir de `@client/routes`, monta `@client/App.vue`, plugins, título.
- `scripts/entry.mjs` — ponto de entrada único: despacha `install`/`dev`/`build`/`electron`/`bump`/`sync-deps`.
- `scripts/runner/index.jsx` — dev runner multi-shell (frontend + backend por cliente, alternância com setas).
- `scripts/build.mjs` — build/export do front para `builds/<cliente>/dist`.
- `scripts/bump.mjs` — incrementa a versão (`x.y.z`) de um repo; a lógica fica em `scripts/lib/version.mjs`.
