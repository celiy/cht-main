---
name: ui-ux-pro-max
description: >-
  UX review and UI guidance for this CHT monorepo (Vue 3 + cht-design-system).
  Use when reviewing or fixing accessibility, interaction, responsive layout,
  forms, tables, focus, or density — not to invent a new visual brand.
  Bundled searchable data (ux, charts, vue stack) remains available via scripts.
---

# ui-ux-pro-max (adaptado ao CHT)

Baseado no [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) (MIT).
Crédito e licença: `THIRD_PARTY_NOTICES.md`.

Este monorepo **já tem** design system e convenções. Esta skill é para **revisar e melhorar
UX/acessibilidade** dentro desse sistema — não para gerar landing pages, novas paletas ou
“design systems” paralelos.

## Fonte de verdade (não negociável)

1. Componentes: `cht-design-system` (primitivos + `custom/`). Novos → skill `add-ds-component`.
2. Convenções Vue/tokens: `.cursor/rules/vue-components.mdc`, `code-guidelines.mdc`.
3. Tokens de cor: `cht-base/src/css/style.css` (`success`, `info`, `warning`, `destructive`, …).
4. Ícones: **Font Awesome** `fa-solid` (não Phosphor/Heroicons/Lucide).
5. Copy de UI: **português**. Identificadores/comentários técnicos: inglês.
6. Stack: Vue 3 Options API + Tailwind 4. Preferir `--stack vue` nas buscas.
7. Apps clientes (ex.: Mecarvit) e Electron desktop — padrões de **web/desktop**, não mobile nativo.

### Não fazer

- Não inventar paleta, tipografia ou estilo visual novo sem pedido explícito.
- Não rodar `--design-system --persist` nem criar `design-system/*/MASTER.md` sem autorização.
- Não sugerir shadcn, Radix, Next.js, React Native ou troca de icon set.
- Não “melhorar” layout adjacente ou refatorar o DS por estética genérica.
- Dataset = recomendação; regras do repo e do usuário têm prioridade.
  (O `stacks/vue.csv` upstream favorece Composition API — neste repo prevalece Options API.)

## Quando usar

| Cenário | Ação |
| ------- | ---- |
| Review de página/form/tabela | Checklist abaixo + busca `--domain ux` |
| Bug de foco, contraste, overflow | Busca focada (`ux` / `vue`) |
| Novo componente de UI | `add-ds-component` primeiro; esta skill só para checklist UX |
| “Que estilo/paleta usar?” | Recusar inventar: usar tokens e componentes existentes |

## Prerequisites (scripts)

Python 3 (stdlib only). Se faltar, **não instalar** — pedir ao usuário ou pular a CLI e usar o checklist.

```bash
python3 --version || python --version
```

Scripts em `.cursor/skills/ui-ux-pro-max/scripts/` (relativo à raiz do monorepo).
Neste monorepo a CLI **recusa** `--design-system` / `--persist` (ver `search.py`).

## Buscas úteis neste projeto

Preferir **uma intenção**, 2–5 termos, um domínio. Stack padrão: `vue`.

```bash
# UX / acessibilidade (mais comum aqui)
python3 .cursor/skills/ui-ux-pro-max/scripts/search.py "keyboard focus modal" --domain ux
python3 .cursor/skills/ui-ux-pro-max/scripts/search.py "error summary validation" --domain ux
python3 .cursor/skills/ui-ux-pro-max/scripts/search.py "badge chip label wraps" --domain ux
python3 .cursor/skills/ui-ux-pro-max/scripts/search.py "focus not obscured" --domain ux

# Implementação Vue (dataset pode sugerir Composition API — ignore; use Options API)
python3 .cursor/skills/ui-ux-pro-max/scripts/search.py "form accessibility labels" --stack vue

# Charts (só se a tarefa for chart)
python3 .cursor/skills/ui-ux-pro-max/scripts/search.py "trend comparison dashboard" --domain chart
```

| Domain / flag | Uso neste repo |
| ------------- | -------------- |
| `ux` | Checklist, a11y, forms, densidade, anti-padrões |
| `vue` (`--stack`) | Práticas Vue — filtrar o que conflitar com Options API / DS |
| `chart` | Só páginas com charts do DS |
| `--design-system` | Bloqueado na CLI deste projeto |
| `product` / `style` / `color` / `typography` / `landing` | Evitar (empurram marca genérica) |

Antes de aplicar um resultado: conferir se encaixa em **produto B2B de oficina**, Vue DS CHT e desktop/web. Se for off-topic, retry uma vez com query mais estreita; se falhar, checklist + regras do repo.

## Checklist pré-entrega (web / Vue / CHT)

### Visual e DS

- [ ] Usa componentes do `cht-design-system` (não reinventar Button/Input/Modal/Table)
- [ ] Cores via tokens Tailwind do projeto (não hex soltos)
- [ ] Ícones `fa-solid`, sem emoji como ícone estrutural
- [ ] Copy de UI em português; semântica coerente com páginas irmãs

### Interação

- [ ] Controles clicáveis têm feedback e `cursor` adequado
- [ ] Estados disabled claros e não acionáveis
- [ ] Focus keyboard visível; ordem de foco sensata
- [ ] Timers/listeners/observers limpos no unmount (`cleanup-timers.mdc`)

### Layout

- [ ] Sem overflow/corte de labels, chips, badges em larguras estreitas
- [ ] Tabelas/filtros alinhados; headers batem com `field` das linhas
- [ ] Conteúdo não fica escondido sob chrome fixo (header/sidebar)
- [ ] Espaçamento coerente com páginas existentes do cliente

### Acessibilidade

- [ ] Campos com label/placeholder/helper coerentes
- [ ] Erros de formulário claros (inline / toast conforme padrão do app)
- [ ] Ícones decorativos com `aria-hidden` quando o texto já comunica
- [ ] Controles só-ícone com `aria-label` (ou tooltip + label acessível)
- [ ] Cor não é o único sinal (badge + texto, etc.)
- [ ] Respeitar `prefers-reduced-motion` se houver animação nova
- [ ] Verificar no browser (fluxo real), não só screenshot

## Fluxo sugerido

1. Ler a página/componente afetado e o padrão vizinho no mesmo app.
2. Se for primitivo/custom novo → seguir `add-ds-component`.
3. Para dúvidas de UX → 1–2 buscas `--domain ux` (e `--stack vue` se for implementação).
4. Aplicar o mínimo que resolve; não expandir escopo visual.
5. Validar no browser quando a mudança for visual.
