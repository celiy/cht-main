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
- `install.sh`: clona repositórios e instala dependências.
- `run.sh`: runner de desenvolvimento com UI de múltiplos processos.
- `sync-common-deps.mjs`: sincronizador de dependências comuns entre repos.
- `common-dependencies.json`: arquivo-base de versões compartilhadas.

## Clientes

Atualmente, este workspace está preparado para:

- **mecarvit**: frontend (`cht-client-mecarvit`) + backend (`cht-backend-mecarvit`)
- **dev**: modo de desenvolvimento interno do `cht-base` (sem backend de cliente)

## Como funciona (visão geral)

1. O `cht-base` funciona como shell principal e carrega o cliente ativo.
2. O cliente define páginas/componentes específicos.
3. O `run.sh` inicia os processos necessários conforme o cliente escolhido.
4. O `sync-common-deps.mjs` normaliza versões de dependências compartilhadas:
  - na primeira execução, gera `common-dependencies.json` com as versões mais recentes encontradas;
  - nas próximas execuções, usa sempre esse arquivo como fonte da verdade.

## Como executar

No diretório raiz `cht-main`:

### 1) Instalar / preparar ambiente

```bash
npm run install
```

Isso executa o `install.sh` para clonar repositórios necessários e rodar `npm i` em cada pasta com `package.json`.

Para instalar também os repositórios do cliente Mecarvit (frontend e backend):

```bash
npm run install -- --client:mecarvit
```

Isso irá clonar além dos repositórios padrão, os específicos do cliente (`cht-client-mecarvit` e `cht-backend-mecarvit`), e instalar as dependências em todos eles.

### 2) Rodar ambiente de desenvolvimento

Modo dev padrão:

```bash
npm run dev
```

Cliente Mecarvit:

```bash
npm run dev:mecarvit
```

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
