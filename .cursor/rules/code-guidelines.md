# Diretrizes de código

Regras de estilo e consistência para este repositório. Código (identificadores, comentários técnicos inline quando necessário) em **inglês**, conforme seção abaixo.

---

## Aspas e strings

- Preferir **aspas duplas** (`"`) em JavaScript/TypeScript e em atributos de template quando possível.
- Aspas simples (`'`) só quando necessário (por exemplo, string dentro de outra string para evitar escape excessivo).

```ts
import item from "module"; // preferido
```

```vue
<div :class="'correct'" />
```

---

## Pontuação e encadeamento

- Usar **`;`** no fim de instruções quando fizer sentido na linguagem (JavaScript/TypeScript).

Encadeamento de métodos: cada chamada em sua própria linha, com `;` apenas na última.

```ts
// Correto
something
    .method()
    .method();

// Evitar
something.method().method();
```

---

## Vue: ordem de atributos em elementos

Em um único elemento, seguir esta ordem (cada grupo separado por linha em branco quando houver vários atributos):

1. Diretivas estruturais e de template: `v-if`, `v-for`, `v-show`, `v-bind` genérico, `key`, `ref`.
2. Atributos estáticos: `class`, `id`, `name`, `type`, etc.
3. Props dinâmicas: `:prop`, `v-model`.
4. Eventos: `@click`, `@update:modelValue`, etc.

```vue
<div
    v-if="visible"
    :key="item.id"

    class="flex"
    id="field"

    :value="value"
    :disabled="disabled"

    @click="onClick"
/>
```

---

## Espaçamento em blocos

- Entre blocos lógicos (`if`/`else`, loops, `return` antecipado) e entre funções, usar **linha em branco** para legibilidade.
- Evitar “paredes” de código sem respiro entre trechos independentes.

---

## Nomenclatura

- Identificadores em **camelCase** (`userName`, `fetchItems`).
- Constantes globais imutáveis podem usar **UPPER_SNAKE_CASE** quando for convenção do projeto.

---

## Controle de fluxo

Sempre usar **chaves `{}`** em `if`, `for`, `while`, `else`, mesmo para uma única instrução.

```ts
// Correto
if (value) {
    action();
}

// Evitar
if (value) action();
```

---

## Idioma do código

- Nomes de variáveis, funções, classes, arquivos de código e comentários que explicam lógica devem estar em **inglês**, salvo strings de UI voltadas ao usuário final no idioma do produto.

---

## Resumo rápido

| Tema | Regra |
|------|--------|
| Aspas | Preferir `"` |
| `;` | Usar onde a linguagem recomendar |
| Vue | `v-*` / `key` / `ref` → estáticos → dinâmicos → eventos |
| Blocos | Linhas em branco entre trechos lógicos |
| `if`/`for` | Sempre `{}` |
| Idioma | Código e nomes em inglês |
