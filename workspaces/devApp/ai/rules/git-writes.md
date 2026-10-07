---
description: Commits e pushes só com pedido explícito do usuário; nunca por conta própria
alwaysApply: true
---

# Escrita no Git exige autorização

`git commit`, `git push`, `git tag`, `git reset` e afins **não** são etapas de conclusão de tarefa. Só execute quando o usuário pedir isso de forma explícita naquela mensagem.

## O que conta como autorização

Vale apenas um pedido direto e sem ambiguidade, por exemplo:

- "commite isso"
- "faça o commit e o push"
- "sobe pro repositório"
- "prepara os commits" — autoriza o commit, **não** o push

## O que não conta

Não interprete como autorização:

- ter terminado uma alteração de código;
- o usuário ter dito "pode aplicar", "pode seguir" ou "continue";
- a alteração parecer obviamente correta;
- existir uma tarefa anterior semelhante;
- o usuário ter pedido push em outra ocasião, em outro momento da conversa;
- um pedido de revisão, teste ou build.

## Regra prática

Termine o trabalho e **apresente o estado**, sem escrever no repositório:

```bash
git status --short
git diff --stat
```

Depois informe o que está pendente e pergunte se deve commitar — ou, se o usuário já pediu o commit mas não o push, commite e pergunte antes de enviar.

## Permitido sem autorização

Comandos de leitura continuam liberados: `status`, `diff`, `log`, `show`, `branch`, `remote -v`, `check-ignore`, `stash list`.

## Nunca faça por iniciativa própria

- `git add -A` / `git add .` seguido de commit;
- `git commit --amend`;
- `git reset --hard`, `git checkout -- <arquivo>`, `git clean -fd`;
- `git push --force` (nem com autorização, sem confirmar antes);
- `git rebase`, `git filter-branch`, `git push --delete`;
- criar branches ou abrir pull requests.

Nada disso deve ser usado para "arrumar" o repositório sem o usuário pedir.
