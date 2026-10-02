---
alwaysApply: true
---

# Project structure guideline: separation of cht-base, cht-main, cht-design-system from client code

The core repositories **cht-base**, **cht-main**, and **cht-design-system** must remain maximally isolated from any client-specific code. These packages **must not**:

- Import, reference, or include files, modules, or components from any client-facing repo (e.g., including code from `cht-client-*`).
- Assume the existence of any client-specific types, global variables, or assets.
- Have code or config changes solely for the needs of a particular client.

**Exception:** Build-time conveniences such as temporary TypeScript path mappings (e.g., `"@client"`) may exist _solely_ in local or ephemeral build config files (not committed to the repo) to support development or linking workflows. These must not leave a permanent trace in the shared codebase.

If you reach a scenario where complete separation is not feasible (e.g., a shared util strictly requires client shape), you **must**:

1. Notify the user and request guidance or approval.
2. Present available alternatives (e.g., inversion of control, public hooks, or duplicating code in the client).
3. Document any such exception in the repo and in this rule, if approved.

**Principle:** The design system and core engine are libraries; **clients depend on them, never the reverse**.

Violations of this separation are blocking and must be flagged for review.
