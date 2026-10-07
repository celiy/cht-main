---
description: Contrato de contribuição. Ler CONTRIBUTING.md antes de alterar código, componentes, scripts ou docs de componente.
alwaysApply: true
---

# Contribuição

Antes de escrever ou mudar código neste workspace, lê `CONTRIBUTING.md` na raiz do `cht-main`.

Aplica-se a `cht-main`, `cht-base`, `cht-design-system`, `cht-shared`, clientes e backends. Resumo: diff mínimo, sem breaking em componentes **Prontos para uso**, exceções só em **Em evolução** / **Em implementação** (banner nos docs).

## Manter o CONTRIBUTING.md em sincronia

O `CONTRIBUTING.md` é lido por humanos, que não abrem esta pasta. Quando criares ou alterares uma regra em `rules/`, decide se ela pertence lá e, se sim, reflete-a no documento (copia o conteúdo, não só um ponteiro para o ficheiro da regra).

Entra no `CONTRIBUTING.md`: convenções de código, estrutura do monorepo, contrato dos componentes, gates de qualidade, o que um revisor humano exigiria num PR.

Fica só aqui: instruções de comportamento do agente (modo de trabalho, idioma das respostas, estilo de raciocínio, fluxo de git do agente), e regras históricas ou muito específicas de um incidente ou de uma única feature. Não acrescentes ao `CONTRIBUTING.md` uma regra que só faz sentido por causa de um episódio passado.

No `CONTRIBUTING.md` não referencies ficheiros desta pasta (`rules/`, `skills/`, comandos `/nome`): quem o lê pode não ter nada disso instalado.
