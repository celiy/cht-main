# Avisos de terceiros

## ECC

Parte das instruções de agente em `workspaces/devApp/ai/skills/` foi **adaptada** do projeto ECC:

- Projeto: ECC — the agent harness operating system
- Autor: Affaan Mustafa (`affaan-m`)
- Fonte: https://github.com/affaan-m/ECC
- Licença: MIT

As adaptações foram reescritas para a stack e as convenções deste monorepo (Vue 3 + TypeScript,
Express + SQLite, comandos via `npx chtmain`, `git-writes.mdc`). Não são cópias literais.

| Arquivo neste repositório                   | Origem no ECC              |
| ------------------------------------------- | -------------------------- |
| `workspaces/devApp/ai/skills/verification-loop/SKILL.md` | `skills/verification-loop` |
| `workspaces/devApp/ai/skills/security-review/SKILL.md`   | `skills/security-review`   |
| `workspaces/devApp/ai/skills/tdd-workflow/SKILL.md`      | `skills/tdd-workflow`      |

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

A regra `workspaces/devApp/ai/rules/karpathy-guidelines.md` foi **copiada** do repositório Multica
(guidelines derivadas das observações públicas de Andrej Karpathy sobre armadilhas
de coding com LLMs):

- Projeto: andrej-karpathy-skills
- Mantenedor: Multica (`multica-ai`)
- Fonte: https://github.com/multica-ai/andrej-karpathy-skills
- Arquivo de origem: `workspaces/devApp/ai/rules/karpathy-guidelines.md`
- Licença: o repositório upstream não declara LICENSE no momento da inclusão;
  crédito mantido ao Multica e às observações de Andrej Karpathy.

| Arquivo neste repositório                    | Origem                                              |
| -------------------------------------------- | --------------------------------------------------- |
| `.cursor/rules/karpathy-guidelines.mdc`      | `.cursor/rules/karpathy-guidelines.mdc` (upstream) |

## Ponytail

A regra `workspaces/devApp/ai/rules/ponytail.md` foi **copiada** do projeto Ponytail
(“lazy senior dev mode”):

- Projeto: ponytail
- Autor: Dietrich Gebert (`DietrichGebert`)
- Fonte: https://github.com/DietrichGebert/ponytail
- Arquivo de origem: `workspaces/devApp/ai/rules/ponytail.md`
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

A skill `workspaces/devApp/ai/skills/ui-ux-pro-max/` veio do [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)
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
| `workspaces/devApp/ai/skills/ui-ux-pro-max/SKILL.md`   | Adaptado ao CHT                                               |
| `workspaces/devApp/ai/skills/ui-ux-pro-max/data/`      | Dados de busca do upstream (intactos)                         |
| `workspaces/devApp/ai/skills/ui-ux-pro-max/scripts/`   | Upstream + adaptações locais em `search.py` / fallbacks `ux`  |

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

## SimpleScrollbar

O componente `Scrollable` do design system usa a biblioteca
[simple-scrollbar](https://github.com/buzinas/simple-scrollbar) (Vitor Buzinaro),
licença MIT.

| Caminho neste repositório                         | Origem      |
| ------------------------------------------------- | ----------- |
| `cht-design-system` / `cht-base` (`npm`)          | pacote npm  |
| `cht-design-system/src/components/Scrollable.vue` | wrapper Vue |

### Licença MIT do SimpleScrollbar

```text
The MIT License (MIT)

Copyright (c) 2015-2017 Vitor Buzinaro

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
