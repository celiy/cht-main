# Instruções para o modelo de IA

Este workspace inclui um diretório `.cursor` com convenções, regras e skills específicas para orientar o trabalho. Sempre que o modelo executar tarefas neste repositório, ele deve seguir estas instruções antes de concluir qualquer alteração.

## Regras principais

1. Ler e respeitar os arquivos em `.cursor/` antes de iniciar implementações relevantes.
2. Priorizar as instruções de `.cursor/rules/` e `.cursor/docs/` sobre convenções gerais do ambiente.
3. Usar as skills disponíveis em `.cursor/skills/` quando houver um fluxo específico para a tarefa.
4. Manter o código e a documentação consistentes com as regras do projeto.
5. Não ignorar requisitos locais, padrões de nomes, estilos e boas práticas documentados neste workspace.

## Procedimento esperado

- Antes de codificar, verificar se existe uma regra aplicável para o tipo de tarefa.
- Quando a tarefa envolver revisão, refatoração, componentes Vue, limpeza de timers, ou outros padrões documentados, seguir os guias do `.cursor`.
- Se houver uma skill específica para a tarefa, utilizar a skill correspondente em vez de improvisar um fluxo alternativo.
- Quando a documentação do projeto for relevante, preferir os documentos do diretório `.cursor/docs/` e os arquivos de referência do workspace.

## Ações proibidas

- Ignorar as instruções locais do workspace.
- Fazer alterações sem validar se há guia ou regra específica no `.cursor`.
- Aplicar padrões genéricos que contradigam as convenções fornecidas no repositório.

## Objetivo

O modelo deve agir como um colaborador do projeto, seguindo as normas e processos definidos em `.cursor`, mantendo qualidade, consistência e aderência ao contexto do workspace.
