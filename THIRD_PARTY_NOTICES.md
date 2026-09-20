# Avisos de terceiros

## ECC

Parte das instruções de agente em `.cursor/skills/` foi **adaptada** do projeto ECC:

- Projeto: ECC — the agent harness operating system
- Autor: Affaan Mustafa (`affaan-m`)
- Fonte: https://github.com/affaan-m/ECC
- Licença: MIT

As adaptações foram reescritas para a stack e as convenções deste monorepo (Vue 3 + TypeScript,
Express + SQLite, comandos via `npx chtmain`, `git-writes.mdc`). Não são cópias literais.

| Arquivo neste repositório                   | Origem no ECC              |
| ------------------------------------------- | -------------------------- |
| `.cursor/skills/verification-loop/SKILL.md` | `skills/verification-loop` |
| `.cursor/skills/security-review/SKILL.md`   | `skills/security-review`   |
| `.cursor/skills/tdd-workflow/SKILL.md`      | `skills/tdd-workflow`      |

### Licença MIT do ECC

Texto reproduzido integralmente, conforme exigido pela própria licença.

```text
MIT License

Copyright (c) 2026 Affaan Mustafa

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

Se alguma adaptação for sincronizada de volta para o ECC, ela passa a ser distribuída
sob a licença do ECC naquele repositório.
