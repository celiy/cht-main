# Contribuir

Este ficheiro é o contrato de contribuição do workspace CHT (`cht-main` e os repositórios irmãos `cht-base`, `cht-design-system`, `cht-shared`, clientes e backends).

Lê este documento **antes** de alterar código, componentes, scripts ou docs de componente, seja à mão, em PR ou com um agente de IA. Não inventes um estilo paralelo.

## Onde vive o quê

| Sítio                            | Serve para                                                        |
| -------------------------------- | ----------------------------------------------------------------- |
| `cht-main`                       | Orquestração: `install`, runner, Electron, packs em `workspaces/` |
| `cht-base`                       | Boot Vue/Vite, router, docs (`src/devApp`)                        |
| `cht-design-system`              | Componentes e tokens visuais                                      |
| `cht-shared`                     | Utilitários partilhados, sem UI de cliente                        |
| `cht-client-*` / `cht-backend-*` | Código **desse** cliente                                          |

`cht-base`, `cht-main` e `cht-design-system` **não** importam clientes. Clientes dependem do núcleo, nunca o contrário. Se a separação completa não for possível (um util partilhado que precisa mesmo da forma do cliente), pára e discute: alternativas são inversão de controlo, hook público ou duplicar no cliente. Mapeamentos temporários de path (`@client`) só valem em config local, nunca commitada.

Não faças mudanças no núcleo “só porque o Mecarvit precisa”. Extraí um hook público ou mete a lógica no cliente.

## Qualidade esperada

- Diff mínimo. Cada linha tem de responder ao pedido. Sem refactors de vizinhos, sem abstrações para um único uso, sem dependência nova se o stdlib ou o que já está instalado chega.
- Options API nos componentes do design system. Identificadores e comentários técnicos em **inglês**; cópia de UI em **português**.
- Aspas duplas, `;` no fim das instruções, `{}` em todos os `if` / `for` / `while` / `else`, `camelCase`. Encadeamento: uma chamada por linha.
- TypeScript com `noUncheckedIndexedAccess`: `arr[i]` é `T | undefined`.
- Timers, listeners, observers e subscriptions limpos no unmount (ver abaixo).
- Cada ficheiro `.ts` começa com um JSDoc de módulo em inglês (ver abaixo). Comentários **inline** só no que não é óbvio. A página de docs do componente **é** o contrato de uso: os exemplos têm de continuar a funcionar.
- UI: verifica no browser o fluxo real (não chega um screenshot). Acessibilidade e estados vazios/erro fazem parte do trabalho, não são extra.
- Lógica não trivial deixa **um** check executável (ficheiro `*.check.mjs` ou teste do backend). Front hoje não tem runner de testes; o gate é `vue-tsc`, lint, format e o check que adicionares.
- Commit e push **só** se o dono do repo pedir. Terminar uma tarefa não é pedido de commit.

Antes de dizer que acabaste, corre o gate (type-check, lint, format e o check que adicionaste). Alterações de API pública: revê se há breaking change. Auth, segredos, HTTP e uploads: revê a segurança.

## Estilo de código

Código (identificadores, comentários técnicos) em **inglês**. Strings de UI no idioma do produto (português neste projeto).

### Aspas e pontuação

- Preferir aspas duplas (`"`). Aspas simples só quando necessário.
- Usar `;` no fim de instruções em JavaScript/TypeScript.
- Encadeamento: cada chamada na sua linha; `;` só na última.

### Vue: ordem de atributos

1. Estruturais: `v-if`, `v-for`, `v-show`, `key`, `ref`
2. Estáticos: `class`, `id`, `type`, …
3. Props dinâmicas: `:prop`, `v-model`
4. Eventos: `@click`, …

Grupos separados por linha em branco quando o elemento tem vários atributos.

### Tailwind: bordas

Não usar `border-border`. Classes de largura (`border`, `border-b`, `border-x`, …) já recebem a cor de borda do tema. Classes de cor (`border-primary`, `border-b-muted`, `border-red-500`, …) já pintam borda 1px no lado correspondente. Combo tamanho+cor: `border-1-primary`, `border-b-2-red-500`; largura arbitrária: `border-[1rem]/muted`, `border-b-[4px]/primary` (barra — o Tailwind não aceita token depois de `]`).

Em `<style scoped>` de Vue, não uses `@apply` sem `@reference "tailwindcss";` no topo do bloco. Prefere classes utilitárias no template quando bastarem.

### Espaçamento e fluxo

- Linha em branco entre blocos lógicos e entre funções.
- Sempre `{}` em `if` / `for` / `while` / `else`.

### Nomenclatura

- `camelCase` para identificadores.
- Constantes globais imutáveis: `UPPER_SNAKE_CASE` quando for convenção.

### TypeScript

- `noUncheckedIndexedAccess`: `array[i]` é `T | undefined`. Não indexar sem guarda.
- Cada ficheiro `.ts` / `.d.ts` (não `.vue`) começa, **antes** dos imports, com um JSDoc de módulo de duas linhas em inglês:

```ts
/**
 * The Vue globals types module
 * This module is responsible for the Vue globals types of the project.
 */
```

Sem `@file`, sem tags extra. Ficheiro novo: o cabeçalho entra no mesmo patch. Ficheiro editado sem cabeçalho: acrescenta-o.

### Vue e design system

- Primitivos em `cht-design-system/src/components/*.vue`; compostos em `components/custom/*.vue`. Ambos são globais (`designSystemPlugin` em `main.ts`); `components/internal` usa import local.
- Docs do DS: `cht-base/src/devApp/pages/docs/` + rota em `devApp/routes.ts` + item em `devApp/ts/componentsNav.ts`.
- Hosts globais (Toast, futuros overlays) montam-se **uma vez no layout**, não em cada página.
- Tokens de cor: `success`, `info`, `warning`, `destructive` (e `*-foreground`) em `cht-base/src/css/style.css`. Ícones: Font Awesome `fa-solid`.
- Plugins Vue: objeto `{ install(app, options?) { ... } }` **sem** anotar como `Plugin` / `Plugin<T>` (o `app.use` do Vue 3.5 falha nessas anotações). API em `app.config.globalProperties`; tipos em `cht-base/src/env.d.ts` e `cht-design-system/src/types/vue-globals.d.ts`.

### Timers e subscriptions

`setTimeout`, `setInterval`, `requestAnimationFrame`, `addEventListener`, observers e subscriptions (`$toast.on`, etc.) criados num componente **têm** de ser cancelados no unmount. Guarda o id/handle, limpa em `beforeUnmount` (Options API) e limpa o anterior antes de agendar de novo.

```ts
data() {
    return {
        loadTimer: null as number | null
    };
},

beforeUnmount() {
    this.clearLoadTimer();
},

methods: {
    clearLoadTimer() {
        if (this.loadTimer == null) {
            return;
        }

        window.clearTimeout(this.loadTimer);
        this.loadTimer = null;
    },

    loadImage() {
        this.clearLoadTimer();
        this.loadTimer = window.setTimeout(() => {
            this.loadTimer = null;
        }, 2000);
    }
}
```

O mesmo para `clearInterval`, `cancelAnimationFrame`, `removeEventListener`, `AbortController.abort()`, `observer.disconnect()` e `unsubscribe()`.

### Documentação

- Referência técnica (JSDoc, READMEs de módulo) em inglês; cópia de UI no idioma do produto.
- Documenta só o **não óbvio**, o sensível a erro ou o contraintuitivo. Não documentes cada método trivial, cada campo de `data()`, nem linhas que já se leem sozinhas.
- APIs públicas de plugins (`$toast`, `$project`): os tipos TypeScript são a fonte da verdade; JSDoc só se o contrato não for claro pelos tipos.
- Quando fizer falta, JSDoc curto com `@param` e `@returns`; sem hífens longos nem parênteses desnecessários.
- Vue: `props` só com JSDoc se o nome não for autoexplicativo; `emits`, `components` e `name` normalmente sem; `methods` / `computed` só trechos não triviais.

## Componentes do design system

A funcionalidade **base** de um componente não se reescreve. Aceita-se acrescentar (prop opcional, variante, melhoria que os hosts atuais ignoram sem mudar). Não se aceita um corte profundo que:

- mude o comportamento por omissão;
- obrigue código que já usa o componente a ser alterado (rename de prop/emit/slot, prop a passar a required, tipo mais estreito, evento com outro payload);
- parta os casos de uso da documentação em `cht-base/src/devApp/pages/docs/`.

O `Select` é o exemplo: está pronto. Um PR que force todos os `<Select>` existentes a mudar **não entra**.

### Estado (fonte: docs)

O banner na página do componente vem de `cht-base/src/devApp/data/componentReadiness.json` (textos em `ts/componentReadiness.ts`):

| Estado no docs   | Chave         | Contrato                                                                                                                  |
| ---------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Pronto para uso  | `success`     | API estável. Só aditivo. Breaking change recusado.                                                                        |
| Implementado     | `info`        | Preferir aditivo. Pode ainda não cobrir todos os cenários reais; breaking só com pedido explícito e atualização dos docs. |
| Em evolução      | `warning`     | Exceção: podes mexer na base se for preciso completar o componente. Atualiza docs e exemplos no mesmo PR.                 |
| Em implementação | `destructive` | Exceção: ainda não está para produção. Mudanças profundas ok, desde que a página de docs acompanhe.                       |

Se o estado não bater certo com o código, corrige o JSON — não ignores o banner.

Componente novo: inclui página de docs, rota, item de nav e entrada de prontidão. Não inventes marca visual; usa tokens e padrões que já existem.

## Scripts e tooling da raiz

Ficheiros de tooling na raiz do `cht-main` são **cópia local** (gitignore + manifesto `.cht-workspace.json`). A fonte é o pack (`workspaces/devApp/` ou `<cliente>/workspace/`). `--workspace` / `--workspace-clean` copiam ou apagam **qualquer** ficheiro do pack. O wizard `--new` só oferece as opções pré-configuradas.

Flags: `--new`, `--workspace:<nome>`, `--workspace-clean`. Ver o README.

## O que não fazer

- Cliente a vazar para `cht-base` / `cht-design-system` / `cht-shared`.
- Comentários que repetem o código, ou docs de UI em inglês.
- Expandir o âmbito porque “ficava mais completo”.
