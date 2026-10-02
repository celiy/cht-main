# Toast (`$toast`)

Plugin em `cht-design-system/src/toast/` (não é `vue-toastification`).

## Ligação

1. `cht-base/src/main.ts`: `app.use(toastPlugin, { timeout: 4000 })`.
2. Layout (ex. `DevAppLayout.vue`): `<Toast position="bottom" width="20rem" />`.
3. Um host por app. `position`: polos (`top` / `bottom` / `left` / `right`) ou cantos (`top-left`, …).

## API

```ts
$toast.success(message, options?)
$toast.info(message, options?)
$toast.error(message, options?)
$toast.warning(message, options?)
$toast.dismiss(id)   // sem evento
$toast.close(id)     // botão Fechar: emite `event` se existir, depois remove
$toast.clear()
$toast.on(handler)   // retorna unsubscribe; limpar no unmount
$toast.off(handler)
```

`options`:

- `timeout?: number` (0 = persistente)
- `closeButton?: boolean | string` — default `true` (label `"Fechar"`); `false` esconde; string = label
- `event?: string | Record<string, unknown>` — só no clique do botão Fechar, não no timeout/swipe

```ts
const stop = this.$toast.on((payload, item) => {
    /* ... */
});
// beforeUnmount: stop()
```

Hover na pilha pausa **todos** os timeouts. Swipe é só touch, não rato.
