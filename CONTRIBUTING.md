# Contribuir

Este ficheiro é o contrato de contribuição do workspace CHT (`cht-main` e os repositórios irmãos `cht-base`, `cht-design-system`, `cht-shared`, clientes e backends).

**IAs:** lê este documento **antes** de alterar código, componentes, scripts ou docs de componente. Não inventes um estilo paralelo.

**Humanos:** o mesmo texto aplica-se a PRs e patches locais.

## Onde vive o quê

| Sítio | Serve para |
| --- | --- |
| `cht-main` | Orquestração: `install`, runner, Electron, packs em `workspaces/` |
| `cht-base` | Boot Vue/Vite, router, docs (`src/devApp`) |
| `cht-design-system` | Componentes e tokens visuais |
| `cht-shared` | Utilitários partilhados, sem UI de cliente |
| `cht-client-*` / `cht-backend-*` | Código **desse** cliente |

`cht-base`, `cht-main` e `cht-design-system` **não** importam clientes. Clientes dependem do núcleo, nunca o contrário. Detalhe: `.cursor/rules/project-structure-guidelines.mdc`.

Não faças mudanças no núcleo “só porque o Mecarvit precisa”. Extraí um hook público ou mete a lógica no cliente.

## Qualidade esperada

- Diff mínimo. Cada linha tem de responder ao pedido. Sem refactors de vizinhos, sem abstrações para um único uso, sem dependência nova se o stdlib ou o que já está instalado chega.
- Options API nos componentes do design system. Identificadores e comentários técnicos em **inglês**; cópia de UI em **português**.
- Aspas duplas, `;` no fim das instruções, `{}` em todos os `if` / `for` / `while` / `else`, `camelCase`. Encadeamento: uma chamada por linha.
- Vue: ordem de atributos em `code-guidelines.mdc`. Tailwind: não uses `border-border`.
- TypeScript com `noUncheckedIndexedAccess`: `arr[i]` é `T | undefined`.
- Timers, listeners, observers e subscriptions limpos no unmount (`cleanup-timers.mdc`).
- Documentação de código só no que não é óbvio (`document-guide.mdc`). A página de docs do componente **é** o contrato de uso: os exemplos têm de continuar a funcionar.
- UI: verifica no browser o fluxo real (não chega um screenshot). Acessibilidade e estados vazios/erro fazem parte do trabalho, não são extra.
- Lógica não trivial deixa **um** check executável (ficheiro `*.check.mjs` ou teste do backend). Front hoje não tem runner de testes; o gate é `vue-tsc`, lint, format e o check que adicionares.
- Commit e push **só** se o dono do repo pedir (`git-writes.mdc`).

Estilo detalhado: `.cursor/rules/code-guidelines.mdc`, `vue-components.mdc`, `karpathy-guidelines.mdc`, `ponytail.mdc`.

Antes de dizer que acabaste: skill `verification-loop` (`/verify`). Alterações de API pública: skill `code-review`. Auth, segredos, HTTP, uploads: skill `security-review`.

## Componentes do design system

A funcionalidade **base** de um componente não se reescreve. Aceita-se acrescentar (prop opcional, variante, melhoria que os hosts atuais ignoram sem mudar). Não se aceita um corte profundo que:

- mude o comportamento por omissão;
- obrigue código que já usa o componente a ser alterado (rename de prop/emit/slot, prop a passar a required, tipo mais estreito, evento com outro payload);
- parta os casos de uso da documentação em `cht-base/src/devApp/pages/docs/`.

O `Select` é o exemplo: está pronto. Um PR que force todos os `<Select>` existentes a mudar **não entra**.

### Estado (fonte: docs)

O banner na página do componente vem de `cht-base/src/devApp/data/componentReadiness.json` (textos em `ts/componentReadiness.ts`):

| Estado no docs | Chave | Contrato |
| --- | --- | --- |
| Pronto para uso | `success` | API estável. Só aditivo. Breaking change recusado. |
| Implementado | `info` | Preferir aditivo. Pode ainda não cobrir todos os cenários reais; breaking só com pedido explícito e atualização dos docs. |
| Em evolução | `warning` | Exceção: podes mexer na base se for preciso completar o componente. Atualiza docs e exemplos no mesmo PR. |
| Em implementação | `destructive` | Exceção: ainda não está para produção. Mudanças profundas ok, desde que a página de docs acompanhe. |

Se o estado não bater certo com o código, corrige o JSON — não ignores o banner.

Componente novo: skill `add-ds-component` (`/add-ds-component`). Inclui página, rota, nav e entrada de prontidão. Não inventes marca visual; usa tokens e padrões que já existem (`ui-ux-pro-max`).

## Scripts e tooling da raiz

Ficheiros de tooling na raiz do `cht-main` são **cópia local** (gitignore + manifesto `.cht-workspace.json`). A fonte é o pack (`workspaces/devApp/` ou `<cliente>/workspace/`). `--workspace` / `--workspace-clean` copiam ou apagam **qualquer** ficheiro do pack. O wizard `--new` só oferece as opções pré-configuradas.

Flags: `--new`, `--workspace:<nome>`, `--workspace-clean`. Ver o README.

## O que não fazer

- Cliente a vazar para `cht-base` / `cht-design-system` / `cht-shared`.
- Guardar tokens de login em `localStorage` / `sessionStorage` nas libs partilhadas.
- JSDoc em todo o lado, comentários que repetem o código, ou docs de UI em inglês.
- Expandir o âmbito porque “ficava mais completo”.
