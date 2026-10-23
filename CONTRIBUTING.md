# Contribuir

Este guia vale para o `cht-main` e para os repositórios irmãos: `cht-base`, `cht-design-system`, `cht-shared`, os clientes e os backends. Leia antes de mexer em código, componentes, scripts ou docs.

## Onde fica cada coisa

| Repositório                      | Serve para                                              |
| -------------------------------- | ------------------------------------------------------- |
| `cht-main`                       | Orquestração: `install`, runner, Electron e workspaces. |
| `cht-base`                       | Boot Vue e Vite, rotas e documentação (`src/devApp`).   |
| `cht-design-system`              | Componentes e tokens visuais.                           |
| `cht-shared`                     | Utilitários compartilhados, sem UI de cliente.          |
| `cht-client-*` e `cht-backend-*` | Código de um cliente específico.                        |

`cht-base`, `cht-main` e `cht-design-system` nunca importam cliente. O cliente depende do núcleo, e não o contrário.

Se a separação não for possível, por exemplo porque um util compartilhado precisa da forma de um cliente, pare e discuta. As saídas são inversão de controle, um hook público ou duplicar o código no cliente.

Não mexa no núcleo só porque um cliente precisa. Crie um hook público ou coloque a lógica no cliente.

Um alias temporário de path, como `@client`, só pode existir numa config local que não vai para o git.

## Qualidade esperada

- Faça o diff mínimo. Cada linha precisa responder ao pedido.
- Não crie abstração para um uso só, nem dependência nova quando a biblioteca padrão ou o que já está instalado resolve.
- Os componentes do design system usam Options API.
- Identificadores e comentários técnicos ficam em inglês. O texto da interface fica em português.
- Limpe timers, listeners, observers e subscriptions no unmount. Veja o exemplo abaixo.
- Todo `.ts` começa com um cabeçalho JSDoc de duas linhas, antes dos imports.
- A página de docs de um componente é o contrato de uso. Os exemplos dela precisam continuar funcionando.
- Teste a interface no browser. Screenshot não basta. Estados vazios, erro e acessibilidade fazem parte do trabalho.
- Lógica não trivial deixa um check executável, como um `*.check.mjs`. O front não tem runner de testes, então o gate é o `vue-tsc`, o lint, o format e o check que você adicionou.
- Commit e push só quando o dono do repositório pedir. Terminar uma tarefa não é pedido de commit.

Antes de dizer que terminou, rode o gate: type-check, lint, format e o seu check. Se você mudou uma API pública, confira se houve breaking change. Se mexeu em auth, segredos, HTTP ou upload, revise a segurança.

## Estilo de código

### Aspas e pontuação

- Use aspas duplas. Aspas simples só quando for necessário.
- Coloque `;` no fim das instruções JavaScript e TypeScript.
- Em encadeamento, cada chamada fica na sua linha. O `;` vai só na última.
- Sempre use `{}` em `if`, `for`, `while` e `else`.

### Ordem dos atributos no Vue

1. Estruturais: `v-if`, `v-for`, `v-show`, `key` e `ref`.
2. Estáticos: `class`, `id`, `type` e similares.
3. Props dinâmicas: `:prop` e `v-model`.
4. Eventos: `@click` e similares.

Separe os grupos com uma linha em branco quando o elemento tiver vários atributos.

### Tailwind e bordas

Não use `border-border`. As classes de largura, como `border`, `border-b` e `border-x`, já pegam a cor do tema. As classes de cor, como `border-primary`, já pintam 1px no lado certo.

Para tamanho e cor juntos, use `border-1-primary` ou `border-b-2-red-500`. Para largura arbitrária, use a barra: `border-[1rem]/muted`. O Tailwind não aceita um token depois de `]`.

Em `<style scoped>`, não use `@apply` sem `@reference "tailwindcss";` no topo do bloco. Quando der, prefira classes utilitárias no template.

### TypeScript

- Ative `noUncheckedIndexedAccess`. Assim `array[i]` vira `T | undefined`, e você precisa checar antes de usar.
- Todo `.ts` e `.d.ts` começa com um cabeçalho como este, antes dos imports:

```ts
/**
 * The Vue globals types module
 * This module is responsible for the Vue globals types of the project.
 */
```

Arquivo novo leva o cabeçalho no mesmo patch. Arquivo antigo, quando for editado, ganha o cabeçalho na mesma mudança.

### Plugins Vue

Instale plugins com um objeto `{ install(app, options?) { ... } }`. Não anote o tipo como `Plugin`, porque o `app.use` do Vue 3.5 falha com essa anotação. A API vai em `app.config.globalProperties`, e os tipos em `cht-base/src/env.d.ts` e em `cht-design-system/src/types/vue-globals.d.ts`.

### Timers e subscriptions

Quem cria um timer, listener, observer ou subscription num componente precisa cancelá-lo no unmount. Guarde o id, limpe em `beforeUnmount` e limpe o anterior antes de agendar outro.

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

O mesmo vale para `clearInterval`, `cancelAnimationFrame`, `removeEventListener`, `AbortController.abort()`, `observer.disconnect()` e `unsubscribe()`.

## Documentação

- Escreva a referência técnica, como JSDoc e READMEs de módulo, em inglês. O texto da interface vai em português.
- Documente só o que não é óbvio, o que é sensível a erro e o que contraria a intuição. Não documente método trivial nem campo de `data()`.
- Para APIs públicas de plugin, como `$toast` e `$project`, os tipos são a fonte da verdade. Use JSDoc só quando os tipos não bastarem.
- Vue: `props` só levam JSDoc quando o nome não se explica sozinho. `emits`, `components` e `name` normalmente não levam nada.
- Exemplos em `DocsExample`: o aba Code mostra só o template do slot. Por isso, não passe dados vindos de `data()` ao exemplo. Escreva os arrays, as opções e as configurações literalmente no template, mesmo que fique repetido. Estado que muda ao clicar, como contadores e o último item clicado, pode continuar em `data()`.

## Componentes do design system

Não reescreva a funcionalidade base de um componente. Você pode acrescentar: uma prop opcional, uma variante ou uma melhoria que os hosts atuais ignoram.

Não aceite um corte profundo que:

- mude o comportamento padrão;
- obrigue quem já usa o componente a mudar, como renomear prop, emit ou slot, ou tornar prop obrigatória;
- quebre os casos da documentação em `cht-base/src/devApp/pages/docs/`.

O `Select` é o exemplo. Ele está pronto, então um PR que force todos os `<Select>` existentes a mudar não é aceito.

### Estados de prontidão

O banner da página de docs vem do campo `readiness` de cada entrada em `cht-base/src/devApp/ts/docsPages.ts`. Se o estado não bater com o código, corrija essa entrada. Não ignore o banner.

| Estado           | Chave         | Contrato                                                                                         |
| ---------------- | ------------- | ------------------------------------------------------------------------------------------------ |
| Pronto para uso  | `success`     | API estável. Só mudanças aditivas. Breaking change é recusada.                                   |
| Implementado     | `info`        | Prefira mudanças aditivas. Breaking só com pedido explícito e docs atualizados.                  |
| Em evolução      | `warning`     | Você pode mexer na base para completar o componente. Atualize docs e exemplos no mesmo PR.       |
| Em implementação | `destructive` | Ainda não vai para produção. Mudanças profundas são aceitas, desde que a documentação acompanhe. |

Componente novo precisa de página de docs, rota, item de navegação e entrada de prontidão. Use os tokens e os padrões que já existem.

Primitivos ficam em `cht-design-system/src/components/*.vue` e compostos em `components/custom/*.vue`. Os dois são globais. Hosts globais, como o Toast, são montados uma vez no layout, e não em cada página.

Para cores, use os tokens `success`, `info`, `warning` e `destructive` (com os `*-foreground`), definidos em `cht-base/src/css/style.css`. Ícones são Font Awesome `fa-solid`.

## Tooling da raiz

Os arquivos de tooling na raiz do `cht-main` são cópias locais. A fonte está no pack, em `workspaces/devApp/` ou em `<cliente>/workspace/`. Use `--workspace` e `--workspace-clean` para copiar ou apagar esses arquivos. O `--new` só oferece as opções pré-configuradas.

## O que evitar

- Código de cliente vazando para `cht-base`, `cht-design-system` ou `cht-shared`.
- Comentários que repetem o que o código já diz.
- Docs de interface em inglês.
- Expandir o escopo porque o resultado "ficaria mais completo".
