# `.cursor` neste repositório

Orientação para o agente. Preferir **poucas regras sempre ativas**; o resto aplica-se por glob ou quando a tarefa o pede.

## Regras (`.cursor/rules/`)

| Ficheiro              | Quando                                |
| --------------------- | ------------------------------------- |
| `code-guidelines.mdc` | Sempre                                |
| `git-writes.mdc`      | Sempre (commit/push só se pedido)     |
| `cleanup-timers.mdc`  | Ficheiros `*.{vue,ts,…}`              |
| `vue-components.mdc`  | Vue/TS do DS e do base                |
| `document-guide.mdc`  | Documentar código (não JSDoc em tudo) |

Ficheiros `.md` nesta pasta **não** são regras Cursor. Usar `.mdc` com frontmatter.

## Docs (`.cursor/docs/`)

| Ficheiro             | Conteúdo                                  |
| -------------------- | ----------------------------------------- |
| `context.md`         | Monorepo, clientes, runner, aliases       |
| `toast.md`           | Plugin `$toast` e host `<Toast>`          |
| `deps_sync.md`       | `common-dependencies.json`                |
| `desktop-release.md` | Release do app desktop e auto-atualização |

## Skills (`.cursor/skills/`)

| Skill              | Quando                                            |
| ------------------ | ------------------------------------------------- |
| `add-ds-component` | Novo componente no design system + página de docs |
| `code-review`      | Revisar mudanças git por breaking changes         |

## Fora de `.cursor`

- `todo.txt` na raiz é lista de trabalho humana; não editar salvo pedido explícito.
