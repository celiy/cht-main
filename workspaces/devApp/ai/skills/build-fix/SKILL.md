---
name: build-fix
description: >-
    Roda o build do workspace (npx chtmain build) e, se quebrar, corrige a causa até passar.
    Use quando o usuário pedir /build, build, "dá build" ou "o build quebrou", com ou sem
    nome de cliente.
---

# Build e correção

O build às vezes quebra. O trabalho não é só rodar o comando: é fazer o build **passar**.

## Comando

Da raiz do `cht-main`:

```bash
npx chtmain build <cliente>
```

- O usuário passou um nome (`/build mecarvit`): use esse nome como `<cliente>`.
- O usuário não passou nada (`/build`): use `dev` (`npx chtmain build dev`), o build da
  documentação. O comando exige um argumento; sem ele só imprime a ajuda.
- Nome desconhecido: o comando lista os clientes conhecidos. Mostre a lista e pergunte qual.

O artefacto sai em `builds/<cliente>/dist`.

## Se quebrar

1. Leia o erro **inteiro**, do primeiro erro para o último. O primeiro costuma causar os outros.
2. Descubra em que repo e ficheiro está a causa (`cht-base`, `cht-design-system`, `cht-shared`,
   o cliente ou o próprio `scripts/`). Corrija na causa, não no sintoma.
3. Corrija com o menor diff possível, seguindo o `CONTRIBUTING.md`. Não use `@ts-ignore`,
   `any`, nem desligue regras do lint ou do `vue-tsc` só para passar.
4. Rode o build de novo, com o mesmo cliente. Repita até passar.

Cuidados:

- Componente do design system **Pronto para uso**: a correção tem de ser aditiva, sem mudar
  props, emits ou slots existentes.
- Erro que só aparece num cliente: a correção fica no cliente, não no núcleo.
- Se a causa for dependência, ambiente ou rede (módulo faltando, falha de `npm install`,
  Node errado), diga isso em vez de mexer em código que não tem culpa.
- Se após algumas tentativas o erro mudar de natureza ou a correção exigir uma decisão do
  usuário (breaking change, mudança de escopo), pare e explique.

## Ao terminar

Reporte em poucas linhas:

- cliente buildado e se passou;
- o que quebrou e a causa;
- ficheiros alterados;
- qualquer coisa que ficou por decidir.

Não escreva no git. Apenas deixe as alterações no working tree e informe o que mudou.
