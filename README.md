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

- `cht-base`: boot Vue + Vite + router; o cliente (`cht-client-*`) fornece `App.vue`, `routes.ts` e layouts; sem `CLIENT`, usa `cht-base/src/devApp` para laboratório.
- `cht-design-system`: componentes e padrões visuais reutilizáveis.
- `cht-shared`: código compartilhado (helpers, utilitários, etc.).
- `cht-client-mecarvit`: frontend específico do cliente Mecarvit.
- `cht-backend-mecarvit`: backend específico do cliente Mecarvit.
- `clients.json`: infra compartilhada (`shared.repos`, `shared.vitePorts`) e catálogo `clients` (URLs de frontend/backend para `install --client:<name>` mesmo sem a pasta local).
- `install.sh` / `install.ps1` / `scripts/install.mjs`: clona repositórios shared (+ frontend/backend do cliente se `--client:`) e instala dependências.
- `run.sh` / `scripts/runner/`: runner TUI estilo htop (Node + Ink) com tabs, cores e hyperlinks clicáveis.
- `build.sh` / `scripts/build.mjs`: builda o frontend de um cliente e exporta artefato para `builds/<cliente>/dist`.
- `electron.sh` / `scripts/electron.mjs`: abre o cliente no Electron (backend + frontend) ou empacota o app desktop para Linux.
- `sync-common-deps.mjs`: sincronizador de dependências comuns entre repos.
- `common-dependencies.json`: arquivo-base de versões compartilhadas.

## Clientes

Clientes existentes são pastas `cht-client-<name>` com `cht.config.json` na raiz. O catálogo em [`clients.json`](./clients.json) (`clients.<name>.frontend.repo` / `backend.repo`) permite clonar um cliente na primeira instalação. Atualmente:

- **mecarvit**: frontend (`cht-client-mecarvit`) + backend (`cht-backend-mecarvit`)
- **dev**: modo de desenvolvimento interno do `cht-base` (cliente virtual, sem backend)

Para adicionar um cliente novo, ver `.cursor/docs/context.md` na seção "Adicionar um cliente novo".

## Como funciona (visão geral)

1. Pastas `cht-client-<name>` com `cht.config.json` definem os clientes em disco. `clients.json` guarda shared (`repos` + `vitePorts`) e o catálogo de URLs para bootstrap. Convenções (`cht-client-<name>`, `cht-backend-<name>`) eliminam configuração redundante.
2. O `cht-base` monta a app com o alias `@client` resolvido via `CLIENT=<name>` (ou `src/devApp` sem cliente).
3. O cliente define rotas (`routes.ts`), layout e páginas/componentes específicos.
4. O `run.sh` (wrapper para `scripts/runner/index.jsx`) inicia os processos necessários conforme o cliente escolhido em um TUI Ink.
5. O `sync-common-deps.mjs` normaliza versões de dependências compartilhadas:
  - na primeira execução, gera `common-dependencies.json` com as versões mais recentes encontradas;
  - nas próximas execuções, usa sempre esse arquivo como fonte da verdade.

## Como executar

No diretório raiz `cht-main`.

### Dependências do sistema

Instale isto **antes** dos scripts (o `npm install` da raiz não substitui estas ferramentas):

| Ferramenta | Para quê | Windows | Linux / macOS |
|---|---|---|---|
| **Git** | clone/pull dos repositórios irmãos | [git-scm.com](https://git-scm.com/download/win) | `git` no PATH |
| **Node.js 24** (ver [`.nvmrc`](./.nvmrc)) | npm, scripts, Vite, Electron | Instalador LTS em [nodejs.org](https://nodejs.org/) **ou** [fnm](https://github.com/Schniz/fnm) / [nvm-windows](https://github.com/coreybutler/nvm-windows) | [nvm](https://github.com/nvm-sh/nvm) (`nvm install` + `nvm use` a partir do `.nvmrc`) |
| **Python 3** + Visual Studio Build Tools (Windows) | rebuild de addons nativos (`better-sqlite3`, `bcrypt`) no backend | [Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) com “Desktop development with C++”; o instalador do Node pode oferecer “Tools for Native Modules” | `build-essential` / Xcode CLT |

Confirme no terminal:

```bash
git --version
node -v   # major 24
npm -v
```

### 1) Instalar / preparar ambiente

**Node:** a raiz tem [`.nvmrc`](./.nvmrc) (hoje **24** LTS). Nos wrappers Unix, com nvm, corre `nvm install` + `nvm use` antes do npm. No Windows, use Node 24 no PATH (ou `fnm use` / `nvm use`). Sem gestor de versões, instale a mesma major do `.nvmrc` à mão.

Apenas repositórios compartilhados:

```bash
./install.sh
# Windows:
.\install.ps1
# ou:
npm run install:repos
```

Incluindo repositórios de um cliente específico (ex.: mecarvit):

```bash
./install.sh --client:mecarvit
# Windows:
.\install.ps1 --client:mecarvit
# ou:
npm run install:repos -- --client:mecarvit
```

O `install.sh` / `install.ps1` chama `scripts/entry.mjs` → `scripts/install.mjs`. Faz **git clone** (se faltar) ou **git pull** (se a pasta já existir) nos repositórios `shared.repos`, nos clientes do catálogo `clients.json` / pastas `cht-client-*/cht.config.json` e, com `--client:<name>`, só os extras desse cliente (frontend + backend, mesmo que a pasta ainda não exista). Depois roda `npm install` na raiz e em cada pasta irmã com `package.json`.

### 2) Rodar ambiente de desenvolvimento

Modo dev padrão (apenas `cht-base`, sem backend):

```bash
./run.sh
# Windows: .\run.ps1
# ou: npm run dev
```

Cliente específico:

```bash
./run.sh --client:mecarvit
# Windows: .\run.ps1 --client:mecarvit
# ou: npm run dev -- --client:mecarvit
```

A sintaxe é genérica: para qualquer pasta `cht-client-<name>` com `cht.config.json`, basta `--client:<name>`. Não há scripts hardcoded por cliente no `package.json` raiz.

O runner abre um TUI estilo htop com tabs por processo. Atalhos: `←`/`→` (ou `h`/`l`) para alternar tabs, `↑`/`↓` (ou `k`/`j`) e PgUp/PgDn para scroll do console, `r` reinicia o processo ativo, `c` limpa o buffer, `q` (ou `Ctrl+C`) encerra. URLs detectados nos logs aparecem como hyperlinks clicáveis na status bar.

### 3) Build/export de frontend por cliente

```bash
./build.sh mecarvit
# Windows: .\build.ps1 mecarvit
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
./electron.sh mecarvit
# Windows: .\electron.ps1 mecarvit
# ou: npm run electron -- mecarvit
```

Empacotar para Linux (`AppImage`, `deb` e diretório `dir`):

```bash
./electron.sh build mecarvit
```

Os artefatos saem em `builds/<cliente>/desktop`. O empacotamento está preparado para Windows (`nsis`/`portable`) e macOS (`dmg`/`zip`) quando o build rodar nesses sistemas.

### 5) Sincronizar dependências compartilhadas

```bash
npm run sync:deps
```

Também pode rodar diretamente:

```bash
node sync-common-deps.mjs
```

## Observações rápidas

- Se você editar manualmente `common-dependencies.json`, a próxima execução do sync respeita esse arquivo.
- Para detalhes completos da sincronização de dependências, veja `DEPENDENCY_SYNC.md`.