# Guia de documentação

Como documentar código e APIs neste projeto. Documentação de **referência técnica** (JSDoc, READMEs de módulo) em **inglês**. Texto voltado ao usuário final do produto segue o idioma da interface.

---

## Quando documentar

- Documentar o que for **não óbvio**, **sensível a erro** ou **contraintuitivo**.
- Evitar comentários que apenas repetem o que a linha já diz.

**Evitar:**

```ts
// When user has "name"
if (user === "name")

// Assigns anotherValue to value
const value = anotherValue;
```

**Preferir (exemplo):**

```ts
// Strip non-digits for numeric masked fields before validation
for (const type of this.numericTypes) {
    if (this.type.includes(type)) {
        value = String(value).replace(/\D/g, "");
    }
}
```

---

## JSDoc em métodos e funções

Usar blocos JSDoc com descrição curta e tags padronizadas.

### Função com parâmetros

```ts
/**
 * Short description of what the function does.
 *
 * @param param1 - First parameter description
 * @param param2 - Second parameter description
 */
function example(param1: string, param2: boolean): void;
```

### Função com retorno

```ts
/**
 * Short description.
 *
 * @param param1 - Description
 * @returns Description of the return value
 */
function example(param1: string): number;
```

### Sem parâmetros

```ts
/**
 * Short description of side effects or behavior.
 */
function reset(): void;
```

**Notas:**

- Usar `@param nome` ou `@param nome Descrição` de forma consistente no repositório.
- Para retorno, preferir **`@returns`** (TSDoc) em vez de texto solto “Returns - …”.

---

### Escrevendo descrições em JSDoc

- **Evite o uso de hífens longos (`—`) para separar frases/descrições**. Use frases diretas e claras.
- **Não coloque descrições entre parênteses** a menos que seja absolutamente necessário para clarificar, como por exemplo, para parâmetros.

Exemplo incorreto:
```ts
/**
 * Description (does something special) — handles values.
 */
```

Exemplo correto:
```ts
/**
 * Description of what the function does.
 * 
 * @param value Description of the value parameter
 */
```

Siga este modelo para manter clareza, profissionalismo e consistência em toda a base de código.

---

## Vue: o que documentar

| Área | Orientação |
|------|------------|
| **`props`** | Documentar com JSDoc acima de cada prop quando o nome não for autoexplicativo |
| **`data()`** | Não documentar campo a campo, salvo exceção com regra de negócio obscura |
| **`emits`**, `components`, `name`, `directives` | Normalmente não precisam de JSDoc |
| **Lógica em `methods` / `computed`** | Comentar só trechos não triviais |

Exemplo de prop documentada:

```ts
props: {
    /**
     * Current value bound to the field (controlled).
     */
    value: {
        type: [String, Number, Boolean],
        required: false,
        default: ""
    }
}
```

---

## Consistência

- Corrigir typos em comentários existentes ao editar o arquivo (`another`, `ambiguous`, `understand`).
- Manter o mesmo tom: frases curtas, imperativo ou descritivo neutro (“Fetches…”, “Validates…”).

---

## Resumo

| Tipo | Idioma | Onde |
|------|--------|------|
| JSDoc / comentários técnicos | Inglês | Código |
| UI / cópia de produto | Idioma do app | Templates e i18n |
| Comentários | Só quando agrega | Trechos complexos |
