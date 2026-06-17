# Aplicação Web — Strategic Choice Approach (SCA)

Aplicação interativa em português para apoiar grupos, pesquisadores e decisores na aplicação completa do método SCA (Friend & Hickling — *Planning Under Pressure* / AIDA), da formulação do problema decisório até o pacote de compromisso. Fonte metodológica: **Guia SCA.docx**.

A aplicação respeita a lógica do SCA como abordagem **incremental, participativa e interativa** para estruturar decisões interdependentes sob incerteza — não como otimização matemática nem ranking simples de alternativas.

## Como instalar e rodar

Pré-requisito: Node.js 18+.

```bash
cd sca-app
npm install
npm run dev      # abre em http://localhost:5173
```

Outros comandos: `npm run build` (produção), `npm run typecheck` (verificação TypeScript), `npm run preview`.

## Stack

React 18 + TypeScript + Vite + Tailwind CSS. Os grafos usam **SVG interativo próprio** (arrastar nós, criar/remover conexões) — escolhido em vez de React Flow/D3 por ser a solução mais simples de manter sem dependências adicionais. Sem backend: salvamento automático em `localStorage`, com exportação/importação do projeto em JSON e relatório completo em Markdown.

## As 16 etapas (wizard, organizadas pelos 4 modos do SCA)

| Modo | Etapas |
|---|---|
| Shaping | 1 Problema · 2 Lista de decisões · 3 Conexões · 4 Gráfico de decisão · 5 Áreas relevantes · 6 Foco |
| Designing | 7 Opções + matriz de compatibilidade (option bars) · 8 Gráfico de opções · 9 Esquemas viáveis (+ árvore) |
| Comparing | 10 Áreas de comparação · 11 Avaliação relativa à base · 12 Vantagem comparativa (+12.1 lista restrita) |
| Choosing | 13 Incertezas UE/UV/UR · 14 Opções exploratórias · 15 Esquemas de ação + robustez · 16 Pacote de compromisso |

É possível avançar, voltar e editar etapas anteriores a qualquer momento; esquemas, métricas e indicadores são recalculados automaticamente (esquemas são derivados, identificados por chave estável, de modo que avaliações sobrevivem a recálculos).

## Estrutura do código

```
src/
  types.ts            # modelo de dados completo (Project, DecisionArea, ...)
  store.tsx           # estado global + localStorage + import/export JSON
  lib/sca.ts          # ALGORITMOS: produto cartesiano com poda por option
                      # bars, esquemas viáveis, métricas de grafo, lista
                      # restrita, aceitabilidade e índice de robustez
  lib/report.ts       # geração do relatório Markdown
  data/southside.ts   # dados de exemplo (South Side) — apenas exemplo editável
  components/ui.tsx   # componentes reutilizáveis (inputs, cards, escala 1–5)
  components/graphs.tsx # gráfico de decisão (SVG arrastável) e gráfico de opções
  steps/shaping.tsx   # etapas 1–6
  steps/designing.tsx # etapas 7–9
  steps/comparing.tsx # etapas 10–12 (+12.1)
  steps/choosing.tsx  # etapas 13–16
  App.tsx             # wizard, menu lateral, painel de validações
```

## Pontos algorítmicos principais (comentados no código)

- **Geração de combinações** (`lib/sca.ts → generateSchemes`): busca em profundidade sobre o produto cartesiano das opções das áreas em foco, com **poda** ao primeiro par incompatível (registrando a option bar violada e quantas combinações completas o corte removeu). Limite de segurança: 50.000 combinações.
- **Filtragem por incompatibilidade**: relações são consultadas em qualquer ordem do par (`findRelation`); só `incompativel` bloqueia — `indefinido` não bloqueia, mas gera aviso de matriz incompleta.
- **Robustez** (`actionSchemeStats`): dado um compromisso parcial, conta os esquemas completos ainda disponíveis (*total count*) e quantos atingem o critério de aceitabilidade do usuário (*robustness index*), em modo manual ou por regra (limiar numérico sobre uma área de comparação + confiança mínima).
- **Exportação/importação**: JSON íntegro do projeto (com validação de versão na importação) e relatório Markdown com todas as seções do método.

## Validações implementadas

Sem esquemas se alguma área em foco não tiver opções; rótulos vazios bloqueados; aviso de áreas sem conexão; aviso de foco indefinido; aviso de matriz incompleta; aviso de ausência de áreas de comparação. Convenções verificadas: áreas de decisão terminam com "?", áreas de comparação com ":".

## Avisos metodológicos embutidos na interface

O gráfico de decisão **não é fluxograma cronológico**; incompatibilidade **não é preferência**; a pontuação de priorização **não substitui o julgamento do grupo**; a lista restrita é **provisória e revisável**; o pacote de compromisso **não é "a alternativa ótima"**, mas um plano de progresso incremental.

## Como citar

Esta aplicação é uma contribuição metodológica de autoria própria e pode ser citada como software. Os metadados estão em `CITATION.cff` (lido automaticamente por GitHub e Zenodo). Para que a citação seja rastreável por um periódico, recomenda-se arquivar uma versão no **Zenodo**, **OSF** ou **figshare**, obtendo um **DOI** e um link permanente; em seguida, preencha os campos de DOI/URL no `CITATION.cff` e nas referências abaixo. Substitua o sobrenome, o ano e o DOI conforme o caso.

**ABNT (NBR 6023):**

> SILVA, João Henrique Ferreira Barbosa da. **SCA App: aplicação web para estruturação de decisões pelo Strategic Choice Approach**. Versão 1.0.0. [*S. l.*], 2026. 1 software. Disponível em: https://doi.org/10.5281/zenodo.20736997. Acesso em: 17 jun. 2026.

**APA 7:**

> Silva, J. H. F. B. da (2026). *SCA App: A web application for structuring decisions with the Strategic Choice Approach* (Versão 1.0.0) [Software]. Zenodo. https://doi.org/10.5281/zenodo.20736997

No corpo do artigo (seção de Método), descreva-a como uma aplicação desenvolvida pelos autores para operacionalizar o SCA, referenciando Friend & Hickling (*Planning Under Pressure*) como base do método que ela implementa.
