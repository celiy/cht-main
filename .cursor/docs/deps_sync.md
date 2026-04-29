# Dependency Version Sync

Este projeto possui um sincronizador de versoes para dependencias Node compartilhadas entre as subrepos.

## Arquivos

- Script: `sync-common-deps.mjs`
- Arquivo-base (fonte da verdade): `common-dependencies.json`

## Comandos

No diretorio raiz `cht-main`:

- `npm run sync:deps`
- ou `node sync-common-deps.mjs`
- ou `./sync-common-deps.mjs`

## Como funciona

1. O script busca subpastas com `package.json` no raiz.
2. Lê as secoes:
   - `dependencies`
   - `devDependencies`
   - `peerDependencies`
   - `optionalDependencies`
3. Considera apenas dependencias em comum (presentes em 2 ou mais repositorios).

### Primeira execucao (sem arquivo-base)

- Se `common-dependencies.json` nao existir, o script:
  - identifica as dependencias em comum;
  - escolhe a versao mais recente encontrada entre as repos;
  - cria `common-dependencies.json`.

### Execucoes seguintes

- O script sempre usa `common-dependencies.json` como base.
- Em seguida, ele atualiza os `package.json` das subrepos para usar essas versoes.

## Personalizacao manual

Voce pode editar ou criar manualmente `common-dependencies.json`.
Na proxima execucao, o script vai respeitar esse arquivo e normalizar as repos de acordo com ele.

Exemplo:

```json
{
  "generatedAt": "2026-04-29T16:04:26.841Z",
  "description": "Shared dependencies across repositories. This file is the source of truth for version normalization.",
  "dependencies": {
    "typescript": "~5.9.3",
    "vue": "^3.5.25"
  }
}
```

## Saida esperada

Ao rodar, o script informa:

- arquivo-base usado/criado;
- quantidade de dependencias base;
- quantidade de `package.json` atualizados;
- total de versoes normalizadas.

