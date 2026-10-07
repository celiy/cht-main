# Docs de IA (fonte neutra)

Fonte única das regras, comandos, skills e docs para agentes. **Não é lida por nenhum agente
diretamente.** O `install` converte esta pasta para o formato de cada ferramenta
(`scripts/lib/aiDocs.mjs`).

| Pasta       | Conteúdo                                                             |
| ----------- | -------------------------------------------------------------------- |
| `rules/`    | `*.md` com frontmatter `description`, `globs`, `alwaysApply`         |
| `commands/` | atalhos `/nome` que mandam ler uma skill                             |
| `skills/`   | `<nome>/SKILL.md` (+ `scripts/`, `data/`), copiadas como estão       |
| `docs/`     | índices de arquitetura referenciados pelas regras                    |

## Destinos

| Destino   | Regras                                         | Comandos                  | Outros                      |
| --------- | ---------------------------------------------- | ------------------------- | --------------------------- |
| `cursor`  | `.cursor/rules/<nome>.mdc`                     | `.cursor/commands/`       | `skills/`, `docs/`          |
| `claude`  | `.claude/rules/<nome>.md` (`paths` se há glob) | `.claude/commands/`       | `skills/`, `docs/`, `CLAUDE.md` |
| `copilot` | `.github/instructions/<nome>.instructions.md`  | `.github/prompts/<nome>.prompt.md` | `skills/`, `docs/` |

`--workspace:devApp` gera `cursor` e `claude`. O assistente `--new` gera os que forem marcados
(opção Project-Opinionated). Para suportar outro agente, acrescentar uma entrada em `TARGETS`.

## Placeholders

Os ficheiros usam placeholders que o conversor resolve por destino:

| Placeholder                     | Resultado                                              |
| ------------------------------- | ------------------------------------------------------ |
| `{{aiDir}}`                     | `.cursor`, `.claude` ou `.github`                      |
| `{{aiDir}}/rules/<nome>.md`     | caminho da regra no destino                            |
| `{{rule:<nome>}}`               | nome do ficheiro da regra no destino                   |
| `{{rulesDir}}`                  | `rules` ou `instructions`                              |

## Regras

Preferir **poucas regras sempre ativas**; o resto aplica-se por glob ou quando a tarefa o pede.

| Regra                   | Quando                                                       |
| ----------------------- | ------------------------------------------------------------ |
| `contributing`          | Sempre (ler `CONTRIBUTING.md` antes de alterar código)       |
| `code-guidelines`       | Sempre                                                       |
| `git-writes`            | Sempre (commit/push só se pedido)                            |
| `karpathy-guidelines`   | Sempre (pensar antes, simplicidade, mudanças cirúrgicas)     |
| `ponytail`              | Sempre (solução mínima / YAGNI)                              |
| `pt-br`                 | Sempre (falar em português brasileiro)                       |
| `project-structure-guidelines` | Sempre (núcleo isolado dos clientes)                  |
| `cleanup-timers`        | Ficheiros `*.{vue,ts,…}`                                     |
| `vue-components`        | Vue/TS do DS e do base                                       |
| `document-guide`        | Documentar código (não JSDoc em tudo)                        |
| `ts-module-header`      | Cabeçalho JSDoc dos `.ts`                                    |

## Docs (`docs/`)

| Ficheiro             | Conteúdo                                  |
| -------------------- | ----------------------------------------- |
| `context.md`         | Monorepo, clientes, runner, aliases       |
| `toast.md`           | Plugin `$toast` e host `<Toast>`          |
| `deps_sync.md`       | `common-dependencies.json`                |
| `desktop-release.md` | Release do app desktop e auto-atualização |

## Skills (`skills/`)

| Skill               | Quando                                            |
| ------------------- | ------------------------------------------------- |
| `add-ds-component`  | Novo componente no design system + página de docs |
| `code-review`       | Revisar mudanças git por breaking changes         |
| `verification-loop` | Gate de qualidade antes de dizer que terminou     |
| `security-review`   | Autenticação, entrada de usuário, segredos, CORS  |
| `tdd-workflow`      | Ciclo RED → GREEN → REFACTOR com evidência        |
| `ui-ux-pro-max`     | Review UX/a11y no DS Vue CHT (não inventar marca) |

Créditos e licenças de material de terceiros em `THIRD_PARTY_NOTICES.md` (raiz).

## Comandos (`commands/`)

Entry points finos: cada arquivo é um atalho `/nome` que manda ler a skill correspondente.
Não duplicar conteúdo aqui — a fonte é o `SKILL.md`.

| Comando             | Skill               |
| ------------------- | ------------------- |
| `/verify`           | `verification-loop` |
| `/tdd`              | `tdd-workflow`      |
| `/security-review`  | `security-review`   |
| `/code-review`      | `code-review`       |
| `/add-ds-component` | `add-ds-component`  |

## Fora desta pasta

- `todo.txt` na raiz é lista de trabalho humana; não editar salvo pedido explícito.
