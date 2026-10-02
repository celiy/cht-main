---
name: security-review
description: >-
    Revisar código por falhas de segurança nesta stack (Express + SQLite + Vue/Electron).
    Use ao mexer em autenticação, entrada de usuário, segredos, endpoints, CORS,
    uploads, ou quando o usuário pedir /security-review ou revisão de segurança.
---

# Revisão de segurança

Adaptado do ECC (`security-review`) para a stack real deste monorepo: Express + drizzle/better-sqlite3
no backend, Vue 3 + Electron no front, `@shared/validators` para validação compartilhada.
Ver `THIRD_PARTY_NOTICES.md`.

Aplique apenas as seções relevantes à mudança. Não reescreva arquitetura sem o usuário pedir —
aponte o risco e deixe a decisão explícita.

## 1. Segredos

- Nada de chave, token ou senha no código. Tudo via `process.env`, validado no boot.
- `JWT_SECRET=change-me-please` no `.env.example` é um **placeholder**. Confirme que produção
  usa outro valor; se o boot aceitar o default silenciosamente, isso é um achado.
- Confirme que `.env`, `.env.local`, `*.sqlite*` e `data/empresas/` seguem no `.gitignore`
  de `cht-backend-mecarvit`.
- Segredo já commitado continua vazado no histórico — rotacionar, não só remover.

## 2. Validação de entrada

- Regra do projeto: validar no **backend** com `cht-shared/src/validators/`, mesmo que o front
  já valide. O `validate*` do `@shared` é a fonte única — não duplique regra no controller.
- Rejeite por lista branca, não por lista negra.
- O front valida para dar feedback rápido; isso **não** é fronteira de segurança.
- Mensagens de erro não devem revelar estrutura interna.

```bash
rg -n "req\.(body|params|query)" cht-backend-mecarvit/src/controllers | head -30
```

Para cada acesso, confirme que existe `validate*` correspondente antes do uso.

## 3. SQL

- O projeto usa drizzle com template marcado (`` sql`...` ``) e `.prepare()` — isso é
  parametrizado e é o padrão correto.
- O risco é concatenar string em SQL. Procure interpolação fora do template:

```bash
rg -n 'sql\.raw|\.exec\(|\+ *req\.' cht-backend-mecarvit/src
```

- `lint(collate noCase)` e afins são funções do drizzle, não concatenação — não confundir.

## 4. Autenticação e autorização

- Senhas com `bcrypt`. Nunca logar senha, nem em erro.
- Middlewares `protect` e `requirePasswordChanged` já existem — confirme que a rota nova está
  atrás deles (o `privateRouter` em `src/routes/index.ts`).
- **Decisão conhecida do projeto:** o token JWT fica em `localStorage` (`cht_auth_token`) e vai
  em `Authorization: Bearer`. Isso é suscetível a XSS, e o ECC recomenda `httpOnly` cookie.
  É uma troca consciente para o app Electron + API local — **não** troque sem o usuário pedir,
  mas registre se a mudança aumentar a superfície de XSS.
- Toda operação sensível precisa checar autorização pelo usuário autenticado, não por um id
  vindo do corpo da requisição.

## 5. Superfície do renderer

- Vue escapa interpolação por padrão. O risco é `v-html`:

```bash
rg -n "v-html" cht-base/src cht-design-system/src cht-client-*/src
```

- No Electron, confirme que `contextIsolation: true`, `nodeIntegration: false` e `sandbox: true`
  seguem em `cht-base/electron/main.ts`, e que o preload só expõe IPC — nunca o `require` cru.
- Arquivos em `public/` são acessíveis sem autenticação. Não sirva `data/` (SQLite por empresa) como estático.

## 6. CORS e limite de requisições

- `CORS_ORIGINS` é allowlist. O fallback é `true` (libera geral) quando a lista está vazia —
  confirme que produção **não** cai nesse caso.
- Loopback é expandido para `localhost`/`127.0.0.1`/`[::1]`; mantenha a intenção ao editar.
- **Lacuna atual:** não há `express-rate-limit` nas dependências. Login, cadastro e troca de
  senha são candidatos naturais a brute force. Aponte; não instale por conta própria.

## 7. Logs e erros

- `globalErrorHandler` registra `[errorHandler]` com stack. Confirme que o cliente recebe
  mensagem genérica e que a stack fica só no servidor.
- Não logue payload de login, token, nem dado pessoal completo (CPF, endereço).

## 8. Dependências

```bash
cd cht-backend-mecarvit && npm audit
```

Mantenha os lockfiles commitados e use `npm ci` em CI.

## Checklist antes de deploy

- [ ] Nenhum segredo no código; `JWT_SECRET` de produção trocado
- [ ] Toda entrada do backend passou por `@shared/validators`
- [ ] Nenhuma concatenação de string em SQL
- [ ] Rotas novas atrás de `protect` / `requirePasswordChanged`
- [ ] `v-html` ausente ou sanitizado
- [ ] `contextIsolation` / `sandbox` intactos no Electron
- [ ] `CORS_ORIGINS` definido (sem cair no fallback permissivo)
- [ ] Erros genéricos para o cliente, detalhe só no log
- [ ] `npm audit` sem vulnerabilidade conhecida

## Referências

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Electron Security](https://www.electronjs.org/docs/latest/tutorial/security)
- [drizzle ORM](https://orm.drizzle.team/docs/overview)
