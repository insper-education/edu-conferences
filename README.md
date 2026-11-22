# Curadoria venues grupo de pesquisa em educacao - Insper

Site estático em português, com lista de conferências e linha do tempo de prazos e realização. Inspirado na organização do [Real-Time & Embedded Conferences](https://github.com/automaticdai/realtime-embedded-conferences), com implementação própria e sem dependências npm.

## Prévia local

Requer Node.js 22+ e Python 3.

```sh
npm test
npm run build
npm run dev
```

Abra http://127.0.0.1:8000. O HTML precisa ser servido por HTTP para carregar o JSON.

## GitHub Pages

Envie os arquivos para a branch `main` do seu repositório. Em Settings → Pages → Build and deployment, selecione **GitHub Actions**. O workflow `.github/workflows/pages.yml` testa, valida e publica a pasta `site/`. Caminhos relativos funcionam sob `/nome-do-repositorio/`. O workflow também atualiza os prazos semanalmente (segunda-feira, 10:23 UTC) ou quando acionado manualmente e salva no catálogo as mudanças detectadas.

## Dados e precisão

`deadline` é o prazo principal de submissão, seja de resumo, artigo ou outra modalidade. `deadline_track` identifica a etapa acompanhada; quando ela ainda não foi confirmada, isso é indicado.

Edite `data/conferences.json`. O catálogo mantém 37 edições e 19 venues da lista do grupo. A revisão de 19/11/2026 consultou as páginas oficiais e buscou chamadas para 2027 e 2028. Os registros têm fonte e notas individuais; o atualizador também é executado semanalmente e por acionamento manual no GitHub Actions.

`deadline_precision` define a precisão do prazo exibido:

Para identificar uma conferência brasileira, inclua `"nacional": true` em cada edição em `data/conferences.json`. A interface exibe bandeiras ao lado do nome na lista e na timeline, usando `event_country` da edição. Os países europeus compartilham 🇪🇺, incluindo o Reino Unido; os demais usam a bandeira nacional. O país permanece por extenso na célula do evento e no tooltip. Sem país conhecido, `nacional: true` mantém 🇧🇷 como alternativa; para os demais casos não se infere uma bandeira.

O índice h5 é registrado em `h5_index`, com a URL em `h5_source` e a data de consulta em `h5_checked_at` (`YYYY-MM-DD`). Use `null` quando não houver informação verificada. O atualizador semanal preserva esses campos, mas não os pesquisa nem atualiza automaticamente; é necessário consultar uma fonte confiável e cadastrá-los manualmente.

- `day`: data completa (`YYYY-MM-DD`).
- `month`: mês (`YYYY-MM`), sem inventar um dia.
- `null`: prazo ainda desconhecido.

A precisão é independente de `deadline_status`: `confirmed` (confirmado na fonte), `estimated` (estimativa do grupo ou calendário indicativo da organização), `unknown` (prazo não localizado) . A busca não encontrou prazos confirmados para 2028; os meses da lista original foram mantidos como estimativas.

`source_url` registra a fonte consultada; `deadline_source` é preenchido quando a fonte sustenta o prazo. `checked_at` indica a data da consulta e `source_access` distingue leitura direta de conteúdo oficial indexado em busca. `note` registra ressalvas. Uma fonte de 2027 nunca confirma um prazo de 2028.

`deadline_timezone` e `deadline_at` preservam fuso e instante quando publicados. O status usa esse instante, ou o dia local do navegador se o horário for desconhecido. Estimativas mensais não são tratadas como chamadas confirmadas em aberto.

### Particularidades verificadas

- LAK: resumo antecipado recomendado, não obrigatório.
- CSEDU: deadline principal de artigos regulares (primeira etapa); a trilha independente de resumos está descrita na nota.
- EDUNINE: o deadline principal é o de artigos, sem exigir uma etapa separada de resumo.
- SEFI 2027: deadline de trabalhos em abril de 2027, indicativo e com precisão mensal. Não há etapa preliminar de resumo.
- ISLS: acesso direto bloqueado (HTTP 403); datas verificadas no conteúdo oficial indexado pela busca.
- CompEd: site não carregou; boletim oficial SIGCSE consultado, sem data confirmada. Março continua estimativa do grupo.

O campo `deadline_artigo_precision` refere-se apenas ao prazo de artigo e não altera `deadline_precision`, que se refere ao prazo principal `deadline`.

## Visualizações e validação

A visualização inicial é a linha do tempo horizontal, com uma linha por edição e eixo mensal de hoje (inclusive) até a mesma data no próximo ano (exclusive). Em 29 de fevereiro, o limite do ano seguinte é 28 de fevereiro. Períodos que cruzam os limites são recortados. Círculos indicam deadlines; losangos e faixas indicam início e período de realização. Verde identifica informações confirmadas e amarelo identifica estimativas, tanto nos indicadores quanto nas datas da tabela. A legenda usa os mesmos estilos dos indicadores. Os dois indicadores ficam na mesma altura, conectados por uma linha horizontal cinza-clara tracejada entre deadline e início da conferência quando ambos estão visíveis; para deadlines mensais, a ligação parte do centro da faixa de incerteza. Lista e timeline mostram primeiro os deadlines ainda abertos ou estimados, do mais próximo ao mais distante, considerando correções manuais e o fuso publicado. Prazos encerrados vêm depois, do mais recente ao mais antigo, e os desconhecidos ficam no final; a data do evento não altera essa ordem. Contorno tracejado identifica estimativas. Datas sem informação ou fora da janela continuam na tabela. A tabela aparece logo abaixo da linha do tempo. As duas visualizações exibem todas as conferências, sem busca ou filtros. No celular, o gráfico permite rolagem horizontal com nomes fixos.

`npm run build` valida IDs, campos, URLs, datas, precisão, confirmação e fonte, e gera `site/`. `npm test` verifica importação, renderização do catálogo, fusos, validação das datas do evento, projeções e recorte da linha do tempo.

## Deadline manual e automático

Os campos `deadline`, `deadline_precision`, `deadline_status` e os metadados associados no nível principal são o resultado da curadoria automática. `deadline_manual` é um objeto separado, ou `null`, que identifica uma entrada manual:

```json
{
  "deadline": "2026-12",
  "deadline_precision": "month",
  "deadline_status": "estimated",
  "deadline_manual": {
    "date": "2027-01-18",
    "precision": "day",
    "status": "confirmed",
    "track": "Artigos completos",
    "source": "https://educomp.sbc.org.br/2027/",
    "checked_at": "2026-11-19"
  }
}
```

A regra é única para lista, timeline e ordenação:

1. Automático com data e `deadline_status: "confirmed"`: mostrar o automático.
2. Caso contrário, havendo `deadline_manual.date`: mostrar o manual.
3. Sem manual: mostrar o automático disponível ou “A confirmar”.

`confirmed` é o equivalente à confiança alta mencionada na regra de preferência. `deadline_precision` continua significando granularidade (`day` ou `month`), não confiança. Uma data automática com dia exato mas ainda estimada não substitui o manual.

O valor exibido inclui os metadados da mesma origem (etapa, fuso, fonte, notas e data de consulta). A interface identifica “Inserido manualmente” ou “Campo automático”. O EduComp 2027 já usa esse mecanismo; sua confirmação manual não altera o campo automático.

Ao atualizar o JSON com uma LLM, preserve integralmente `deadline_manual`, mesmo quando encontrar um prazo automático confirmado. Atualize somente os campos automáticos e seus metadados. Se a informação automática voltar a ser estimada ou desconhecida, a entrada manual volta a aparecer. Não há bloqueio de campos nem exclusão do histórico manual ao trocar a preferência.

### Atualização local dos prazos

O script `scripts/update-conferences.mjs` consulta as páginas oficiais registradas para cada venue e pede à implantação Azure OpenAI configurada que atualize os campos automáticos. Ele lê `GPT6_AZURE_ENDPOINT`, `GPT6_DEPLOYMENT_NAME`, `GPT6_API_VERSION` e `GPT6_API_KEY` das variáveis de ambiente. No GitHub Actions, configure esses quatro valores como secrets do repositório. O cabeçalho padrão é `api-key`; `GPT6_API_KEY_HEADER` pode alterá-lo. `GPT6_CHAT_COMPLETIONS_URL` permite informar uma rota completa se o gateway usar um caminho customizado.

Rode `npm run update-conferences -- --limit=1` para simular uma edição. Por padrão, o script nunca grava o JSON; `npm run update-conferences -- --write` aplica as alterações depois da revisão. A validação rejeita IDs/edições alterados, prazos inválidos e confirmações sem fonte. `deadline_manual` e os demais dados editoriais são preservados. O script repete até três vezes falhas temporárias de rede, HTTP 429 e erros 5xx; erros 4xx como 400 são exibidos sem repetição. O modelo só recebe o texto das páginas oficiais que o script consegue baixar; páginas inacessíveis e PDFs são ignorados, então a ausência de evidência não deve ser tratada como confirmação. Para executar localmente, forneça as quatro variáveis no ambiente do processo; o repositório não precisa de arquivo `.env`.

## Uma próxima edição por conferência

A lista e a timeline usam `upcomingVenues`: há no máximo uma edição por `slug`. Quando há período de realização, a edição permanece visível até o último dia do evento, inclusive, mesmo se o deadline já encerrou. Quando só há mês do evento, permanece até o fim desse mês. Sem data do evento, vale a regra anterior: o prazo de submissão define a próxima edição. Prazos exatos respeitam o fuso publicado; estimativas mensais encerram quando termina o mês. Há no máximo uma edição por conferência; as anteriores continuam no JSON.

Depois do encerramento, usa-se a próxima edição cadastrada. Se ela não existir ou estiver sem prazo, o site projeta o mesmo mês no próximo ciclo anual, com `deadline_precision: "month"` e `deadline_status: "estimated"`. O ano do deadline e o ano da edição são avançados separadamente: um prazo de outubro de 2026 para a edição 2027 vira outubro de 2027 para a edição 2028. A projeção não copia confirmação, fuso, datas auxiliares ou correção manual de outra edição. O link é apenas uma referência e pode continuar apontando para a edição anterior.

Essa seleção/projeção é calculada ao carregar o site, sem precisar de uma execução da LLM. O JSON mantém as edições anteriores como histórico e base das projeções; o site não grava arquivos no navegador. Projeções anuais não confirmam a realização da próxima conferência.

## Datas e local de realização

Cada registro continua no mesmo array de `data/conferences.json`, com os campos anteriores preservados. Os campos adicionais são:

| Campo | Conteúdo |
| --- | --- |
| `event_start` | Primeiro dia (`YYYY-MM-DD`), mês (`YYYY-MM`) ou `null` |
| `event_end` | Último dia **inclusive**, ou `null` quando a duração é desconhecida |
| `event_precision` | `day`, `month` ou `null`; início e fim usam a mesma precisão |
| `event_status` | `confirmed`, `estimated` ou `unknown` |
| `event_source` | URL da evidência oficial ou da referência que fundamenta a estimativa |
| `event_checked_at` | Data da consulta, `YYYY-MM-DD` |
| `event_provenance` | Evidência, ressalvas e fundamento da estimativa |
| `event_country`, `event_city` | Local publicado para aquela edição; `null` se não confirmado |

Precisão e confirmação são independentes: CompEd 2027 tem outubro e São Paulo oficialmente publicados, portanto usa `month` e `confirmed`, com fim `null`. Estimativas anuais guardam somente o mês e nunca copiam dias, duração ou local da edição anterior. Um mês informado com fim `null` ocupa o mês na timeline como janela de incerteza, sem afirmar que a conferência dura o mês inteiro. O tooltip explicita que dias e duração estão a confirmar.

Sem data, use início/fim/precisão `null` e status `unknown`. Uma data exige fonte e justificativa. O build rejeita datas impossíveis, período invertido, ano incompatível, cidade sem país e confirmação sem fonte. Datas do evento são dias de calendário, sem horário ou fuso de deadline.

A coluna **Data da conferência**, imediatamente após **Deadline**, mostra período, confirmação e cidade/país. As referências permanecem nos campos `event_source` e `event_provenance` do JSON. Os indicadores do evento exibem essas informações ao passar o mouse ou receber foco pelo teclado.

A pesquisa inicial de 22/11/2026 foi feita uma conferência por vez para as 19 séries (37 registros): 18 períodos confirmados e 19 estimativas mensais. ASEE e SEFI têm datas oficiais para 2028; EDUCON tem Dubai confirmado para 2028, mas mês ainda projetado. EduComp, COBENGE e Koli 2027 usam estimativas baseadas em 2026. As URLs e ressalvas ficam em cada registro. Para EDUCON 2027, adotou-se 5–9 de abril da página da edição, registrando a divergência com o calendário da sociedade (6–9 de abril).

O atualizador semanal também considera `event_source` e pode atualizar os campos `event_*` com evidência da mesma edição. Sem nova evidência, deve preservar os valores e a data da última consulta do evento. Datas e locais conhecidos para edições futuras são mantidos quando o site projeta um deadline ausente. Ao precisar criar uma nova edição em memória, o site projeta somente o mês do evento, com status `estimated` e local vazio.
