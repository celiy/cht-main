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

## Karpathy behavioral guidelines (Multica)

A regra `.cursor/rules/karpathy-guidelines.mdc` foi **copiada** do repositório Multica
(guidelines derivadas das observações públicas de Andrej Karpathy sobre armadilhas
de coding com LLMs):

- Projeto: andrej-karpathy-skills
- Mantenedor: Multica (`multica-ai`)
- Fonte: https://github.com/multica-ai/andrej-karpathy-skills
- Arquivo de origem: `.cursor/rules/karpathy-guidelines.mdc`
- Licença: o repositório upstream não declara LICENSE no momento da inclusão;
  crédito mantido ao Multica e às observações de Andrej Karpathy.

| Arquivo neste repositório                    | Origem                                              |
| -------------------------------------------- | --------------------------------------------------- |
| `.cursor/rules/karpathy-guidelines.mdc`      | `.cursor/rules/karpathy-guidelines.mdc` (upstream) |

## Ponytail

A regra `.cursor/rules/ponytail.mdc` foi **copiada** do projeto Ponytail
(“lazy senior dev mode”):

- Projeto: ponytail
- Autor: Dietrich Gebert (`DietrichGebert`)
- Fonte: https://github.com/DietrichGebert/ponytail
- Arquivo de origem: `.cursor/rules/ponytail.mdc`
- Licença: MIT

| Arquivo neste repositório       | Origem                                 |
| ------------------------------- | -------------------------------------- |
| `.cursor/rules/ponytail.mdc`    | `.cursor/rules/ponytail.mdc` (upstream) |

### Licença MIT do Ponytail

```text
MIT License

Copyright (c) 2026 DietrichGebert

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

## UI UX Pro Max

A skill `.cursor/skills/ui-ux-pro-max/` veio do [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)
(instalação via `ui-ux-pro-max-cli` / `uipro init --ai cursor`) e foi **adaptada** a este
monorepo: o `SKILL.md` prioriza o `cht-design-system`, Vue 3, tokens existentes e review de
UX/acessibilidade. Skills irmãs do pacote (`ui-styling`, `design`, `brand`, `slides`, etc.)
foram **removidas** por não se encaixarem no produto.

- Projeto: ui-ux-pro-max-skill
- Autor / organização: Next Level Builder (`nextlevelbuilder`)
- Fonte: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
- Site: https://www.uupm.cc/
- Licença: MIT

| Caminho neste repositório                 | Notas                                                         |
| ----------------------------------------- | ------------------------------------------------------------- |
| `.cursor/skills/ui-ux-pro-max/SKILL.md`   | Adaptado ao CHT                                               |
| `.cursor/skills/ui-ux-pro-max/data/`      | Dados de busca do upstream (intactos)                         |
| `.cursor/skills/ui-ux-pro-max/scripts/`   | Upstream + adaptações locais em `search.py` / fallbacks `ux`  |

### Licença MIT do UI UX Pro Max

```text
MIT License

Copyright (c) 2024 Next Level Builder

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
