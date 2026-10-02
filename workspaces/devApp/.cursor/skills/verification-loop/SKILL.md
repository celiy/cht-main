---
name: verification-loop
description: >-
    Run the full quality gate before claiming work is complete.
    Use when finishing a feature or fix, before commit/PR, after a refactor,
    or when the user asks to verify, /verify, or check that everything passes.
---

# Loop de verificação

Antes de declarar uma tarefa concluída, corra as fases abaixo na ordem. Se uma fase falhar,
**pare e corrija** — não acumule falhas.

Adaptado do ECC (`verification-loop`). Ver `THIRD_PARTY_NOTICES.md`.

## Fase 0 — Reconhecer o alvo

Este workspace é multi-repo: a raiz `cht-main` é o orquestrador e `cht-*` são repositórios
git separados, ignorados pelo `.gitignore` da raiz (`/cht-*`).

Escolha as fases conforme o que mudou:

| Mudou                                                         | Corra               |
| ------------------------------------------------------------- | ------------------- |
| `cht-base`, `cht-design-system`, `cht-shared`, `cht-client-*` | Fases 1, 2, 3, 6    |
| `cht-backend-*`                                               | Fases 1, 2, 3, 4, 6 |
| Scripts em `scripts/`                                         | Fases 1, 3, 6       |

## Fase 1 — Build

```bash
npx chtmain build <cliente>   # ex.: npx chtmain build mecarvit
```

Para um cliente específico, o build do front é:

```bash
cd cht-base && CLIENT=<cliente> npm run build:client
```

Se `npx chtmain` não resolver, o equivalente é `npm run cht -- <comando>`.

## Fase 2 — Tipos

```bash
cd cht-base && npx vue-tsc -b     # front (Vue + TS)
cd cht-backend-mecarvit && npm run typecheck
```

`vue-tsc -b` é incremental: se o cache estiver velho, limpe antes de concluir que está limpo.

## Fase 3 — Lint e formatação

```bash
npm run lint
npm run format:check
```

`npm run lint` cobre `cht-base`, `cht-design-system` e `cht-shared`. O backend tem lint próprio.

## Fase 4 — Testes

Os testes vivem **apenas no backend** hoje:

```bash
cd cht-backend-mecarvit && npm run tests     # vitest run — note o plural
```

O script é `tests`, não `test`. Não existe script de cobertura — não declare percentual de
cobertura sem medi-la. As packages de front (`cht-base`, `cht-design-system`, `cht-shared`,
`cht-client-*`) não têm runner de teste configurado.

Se a mudança for de front e não houver teste, diga isso explicitamente no relatório em vez de
omitir a fase.

## Fase 5 — Varredura de segurança

Versão curta. Para revisão aprofundada, use a skill `security-review`.

```bash
rg -n "sk-[A-Za-z0-9]{10,}|ghp_|AKIA" --glob "!**/node_modules/**"
rg -n "console\.log" cht-base/src cht-design-system/src cht-shared/src cht-client-*/src
git -C cht-backend-mecarvit check-ignore .env || echo "ATENÇÃO: .env nao esta ignorado"
```

Confirme que `.env`, `*.sqlite` e `data/empresas/` continuam no `.gitignore` do backend.

## Fase 6 — Revisão do diff

Como são vários repositórios, um `git status` da raiz não mostra o trabalho. Verifique cada um:

```bash
for d in cht-base cht-design-system cht-shared cht-client-* cht-backend-*; do
    [ -d "$d/.git" ] && { echo "== $d"; git -C "$d" status --short; }
done
```

Para cada arquivo alterado, procure: alteração não intencional, tratamento de erro ausente,
caso de fronteira não coberto, e se um consumidor do monorepo quebra.

## Relatório

Ao terminar, reporte o resultado real — inclusive fases que não se aplicam:

```text
RELATÓRIO DE VERIFICAÇÃO
========================
Build:      [OK/FALHOU]
Tipos:      [OK/FALHOU] (N erros)
Lint:       [OK/FALHOU] (N avisos)
Formato:    [OK/FALHOU]
Testes:     [OK/FALHOU/N/A - sem runner no front] (N passaram)
Segurança:  [OK/FALHOU] (N achados)
Diff:       N arquivos em N repositórios

Pronto para commit? [SIM/NÃO]

Pendências:
1. ...
```

Não escreva em git por causa desta skill. `git-writes.mdc` manda: commit e push só quando
o usuário pedir naquela mensagem.
