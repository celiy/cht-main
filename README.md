# CHT Main

Workspace principal do template multi-cliente de Diogo Carvalho Viegas (Celi's Herstal Template).  
Este repositório orquestra front-end base, clientes, backend(s), design system e código compartilhado.

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

- `cht-base`: app base Vue + Vite, roteamento e seleção de cliente.
- `cht-design-system`: componentes e padrões visuais reutilizáveis.
- `cht-shared`: código compartilhado (helpers, utilitários, etc.).
- `cht-client-mecarvit`: frontend específico do cliente Mecarvit.
- `cht-backend-mecarvit`: backend específico do cliente Mecarvit.
- `clients.json`: fonte única de verdade do monorepo (lista de clientes + repositórios compartilhados).
- `install.sh` / `scripts/install.mjs`: clona repositórios (shared + cliente) e instala dependências.
- `run.sh` / `scripts/runner/`: runner TUI estilo htop (Node + Ink) com tabs, cores e hyperlinks clicáveis.
- `sync-common-deps.mjs`: sincronizador de dependências comuns entre repos.
- `common-dependencies.json`: arquivo-base de versões compartilhadas.

## Clientes

A lista de clientes vive em [`clients.json`](./clients.json). Atualmente:

- **mecarvit**: frontend (`cht-client-mecarvit`) + backend (`cht-backend-mecarvit`)
- **dev**: modo de desenvolvimento interno do `cht-base` (cliente virtual, sem backend)

Para adicionar um cliente novo, ver `.cursor/docs/context.md` na seção "Adicionar um cliente novo".

## Como funciona (visão geral)

1. `clients.json` define os clientes do monorepo (nome + repos opcionais). Convenções (`cht-client-<name>`, `cht-backend-<name>`) eliminam configuração redundante.
2. O `cht-base` funciona como shell principal e carrega o cliente ativo via `CLIENT=<name>`.
3. O cliente define páginas/componentes específicos.
4. O `run.sh` (wrapper para `scripts/runner/index.jsx`) inicia os processos necessários conforme o cliente escolhido em um TUI Ink.
5. O `sync-common-deps.mjs` normaliza versões de dependências compartilhadas:
  - na primeira execução, gera `common-dependencies.json` com as versões mais recentes encontradas;
  - nas próximas execuções, usa sempre esse arquivo como fonte da verdade.

## Como executar

No diretório raiz `cht-main`:

### 1) Instalar / preparar ambiente

Apenas repositórios compartilhados:

```bash
./install.sh
```

Incluindo repositórios de um cliente específico (ex.: mecarvit):

```bash
./install.sh --client:mecarvit
```

O `install.sh` é um wrapper para `scripts/install.mjs`. Ele lê `clients.json`, clona o que faltar (`|| skip` para repos já existentes) e roda `npm install` em cada pasta irmã com `package.json` (e na raiz, para preparar o runner).

### 2) Rodar ambiente de desenvolvimento

Modo dev padrão (apenas `cht-base`, sem backend):

```bash
./run.sh
# ou: npm run dev
```

Cliente específico:

```bash
./run.sh --client:mecarvit
# ou: npm run dev -- --client:mecarvit
```

A sintaxe é genérica: para qualquer cliente declarado em `clients.json`, basta `--client:<name>`. Não há scripts hardcoded por cliente no `package.json` raiz.

O runner abre um TUI estilo htop com tabs por processo. Atalhos: `←`/`→` (ou `h`/`l`) para alternar tabs, `r` reinicia o processo ativo, `c` limpa o buffer, `q` (ou `Ctrl+C`) encerra. URLs detectados nos logs aparecem como hyperlinks clicáveis na status bar.

### 3) Sincronizar dependências compartilhadas

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
