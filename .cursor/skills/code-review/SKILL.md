---
name: code-review
description: >-
  Review git-modified files in the workspace for breaking changes.
  Use when the user asks for a code review, /code-review, breaking-change check,
  or to review local/staged/uncommitted changes before commit or PR.
---

# Code review (breaking changes)

Review **all modified files detected by git** in the workspace. For now, the only review goal is:

> **Check whether any change introduces a breaking change for consumers of this monorepo** (apps, other packages, docs, or public component APIs).

Do not review style, naming, or unrelated quality unless the user asks.

## Workflow

1. **Collect changes** from every git repository under the workspace root (not only `cht-main`):
   ```bash
   bash .cursor/skills/code-review/scripts/collect-git-changes.sh
   ```
   Run from the workspace root. The script scans repos up to depth 2 (`cht-main`, `cht-base`, `cht-design-system`, `cht-shared`, `cht-client-*`, …).

2. **If the script reports no changes**, stop and tell the user there is nothing to review.

3. **Read each changed file** when the diff alone is not enough (moved code, deleted exports, renamed props). Prefer the diff first; open files only for ambiguous cases.

4. **Review only for breaking changes**. Use the checklist below.

5. **Respond in Portuguese** with the output format in [Output](#output).

Do not edit code, commit, or fix findings unless the user explicitly asks after the review.

## Breaking-change checklist

Flag a finding when a change can break a consumer that relied on the previous behavior or contract.

### Design system (`cht-design-system`)

- Removed or renamed **component props**, **emits**, or **slots**
- Prop made **required** or type narrowed incompatibly
- Changed default behavior visible to hosts (modal, dropdown, select, sidebar, chat, …)
- Removed or renamed **globally registered** components
- Plugin / global API changes (`$toast`, `designSystemPlugin`, directives)
- CSS variable / token renames without alias

### Base / dev app (`cht-base`)

- Route path or name changes under `/docs` or client routes
- Changes to `componentsNav`, aliases, or env vars consumed by clients
- `global-components.d.ts` out of sync with registered components

### Shared (`cht-shared`)

- Removed or renamed **exported** functions, types, constants, validators
- Changed function signatures or return shapes used by base or design-system

### Cross-package

- Import path or alias changes (`@design/*`, `@shared/*`, `@client/*`)
- Build / `tsconfig` path changes that break sibling packages
- Dependency version bumps with known breaking APIs (only if visible in the diff)

### Not breaking (do not report)

- Internal refactors with the same public API
- Docs-only or comment-only edits
- New optional props, new emits, new components
- Formatting / lint fixes with no behavior change

## Output

```markdown
# Code review — breaking changes

## Resumo
[Uma frase: nenhuma breaking change / N breaking change(s) encontrada(s).]

## Alterações revistas
- `repo/path` — [breve descrição do que mudou]

## Breaking changes
[Se nenhuma: escrever "Nenhuma."]

| Severidade | Local | O que quebra | Quem é afetado |
|------------|-------|--------------|----------------|
| Alta | `path:linha` | … | … |

## Risco residual
[Opcional: incerteza que o diff não resolveu, sem inventar problemas.]
```

Severity:

- **Alta** — consumidor quebra em compile-time ou runtime sem mudança do lado dele
- **Média** — quebra em cenário específico ou depreciação imediata
- **Baixa** — improvável afetar consumidores atuais; mencionar só se relevante

## Scope notes

- Include **staged, unstaged, and untracked** files listed by `git status` in each repo.
- This monorepo has **multiple git roots**; always run the collect script instead of assuming a single `git diff` at the workspace root.
- Compare against the **current working tree**, not a remote PR, unless the user names a branch or PR.
