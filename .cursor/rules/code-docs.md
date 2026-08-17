# Documentação de Código

Todo método/função deve conter um bloco de documentação anterior à sua definição, utilizando comentários padrão do estilo JSDoc. O objetivo é facilitar entendimento, manutenção e facilitar uso de ferramentas de análise/autodocumentação.

## Diretrizes

- Use comentários do tipo `/** ... */` antes de métodos, funções, componentes, classes ou blocos complexos.
- O bloco de documentação deve incluir:
    - Descrição clara e objetiva do propósito do método/função.
    - Parâmetros (`@param`) com tipo e explicação, para cada argumento.
    - Valor de retorno (`@return` ou `@returns`), se aplicável.
    - Qualquer pré-condição, efeito colateral ou observação relevante.

### Exemplo

```ts
/**
 * Fetches a list of users from server.
 * @param {string} endpoint - Endpoint URL to request.
 * @param {number} timeout - Timeout in milliseconds.
 * @return {Promise<User[]>} List of users as a Promise.
 */
async function fetchUsers(endpoint: string, timeout: number): Promise<User[]> {
    // ...
}
```

### Regras

- Sempre documente funções públicas/exportadas. Para funções privadas, use documentação caso a lógica não for trivial.
- Prefira o idioma **inglês** para a documentação técnica (exceto anotações contextuais restritas ao time local).
- Documente *todas* as props e eventos em componentes Vue, seguindo o padrão acima.

### Observações

- Para componentes Vue `<script setup>`, utilize comentários JSDoc acima de cada função ou bloco significativo.
- Exemplos e observações podem ser colocadas após as tags principais no bloco de comentário.

# Resumo rápido

| O quê        | Regra                                   |
| ------------ | --------------------------------------- |
| Função/método | Sempre precedido de bloco JSDoc         |
| @param       | Cada parâmetro listado e explicado      |
| @return      | Tipo de retorno documentado             |
| Idioma       | Inglês                                  |
| Componentes  | Props e eventos documentados            |