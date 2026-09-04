---
name: add-ds-component
description: >-
    Add or extend a CHT design-system Vue component and its docs page.
    Use when creating a primitive or custom component under cht-design-system,
    wiring docs in cht-base/src/devApp, routes, or componentsNav.
---

# Add a design-system component

## Placement

- Primitive (Button, Card, Toast): `cht-design-system/src/components/Name.vue`
- Composite (Chat, Sidebar, Resizable): `cht-design-system/src/components/custom/Name.vue`
- Apps use them without import (`designSystemPlugin` glob-registers `components/*.vue`, `custom/*.vue`, `custom/charts/*.vue`).
- Add `name` matching the filename (`Button`, `Sidebar`). If a custom file would collide with a primitive, use `CustomName` (see `CustomAvatar`).
- Update `cht-base/src/global-components.d.ts` so Volar knows the tag.
- Internal helpers (`components/internal`) stay local imports.

## Implementation

- Options API, English identifiers, Portuguese UI copy.
- Follow `.cursor/rules/code-guidelines.mdc` (attribute order, braces, double quotes).
- Follow `.cursor/rules/vue-components.mdc` (Tailwind 4, tokens, no `Plugin<T>`).
- Clean timers/observers/listeners on unmount (`.cursor/rules/cleanup-timers.mdc`).
- Global chrome (toast host, similar): mount in the layout, not on each docs page. Plugin APIs live next to the component (see `.cursor/docs/toast.md`).

## Docs (devApp)

1. Page: `cht-base/src/devApp/pages/docs/components/<kebab-name>.vue` with `DocsExample`.
2. Route in `cht-base/src/devApp/routes.ts`.
3. Nav item in `cht-base/src/devApp/ts/componentsNav.ts`.
4. Exercise the page in the browser before finishing.

Do not add a `custom/` stub and a primitive stub for the same component unless both are intentional.
