# Curadoria venues grupo de pesquisa em educacao - Insper

Site estático em português, com lista de conferências e linha do tempo de prazos. Inspirado na organização do [Real-Time & Embedded Conferences](https://github.com/automaticdai/realtime-embedded-conferences), com implementação própria e sem dependências npm.

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

Para identificar uma conferência brasileira, inclua `"nacional": true` em cada edição em `data/conferences.json`. A interface exibirá 🇧🇷 ao lado do nome; o campo pode ser omitido para as demais.

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

A visualização inicial é a linha do tempo horizontal, com uma faixa por edição, eixo mensal compartilhado e linha de hoje. Pontos indicam dias e intervalos vazados indicam meses estimados. A tabela aparece logo abaixo da linha do tempo. As duas visualizações exibem todas as conferências, sem busca ou filtros. No celular, o gráfico permite rolagem horizontal com nomes fixos.

`npm run build` valida IDs, campos, URLs, datas, precisão, confirmação e fonte, e gera `site/`. `npm test` verifica importação, renderização do catálogo, fusos e geometria da linha do tempo.

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

A lista e a timeline usam `upcomingVenues`: há no máximo uma edição por `slug`. Uma edição posterior fica oculta enquanto o prazo da anterior estiver aberto ou dentro do mês estimado. Prazos exatos respeitam o fuso publicado; estimativas mensais encerram quando termina o mês. Edições sem data permanecem a confirmar, sem inventar um deadline.

Depois do encerramento, usa-se a próxima edição cadastrada. Se ela não existir ou estiver sem prazo, o site projeta o mesmo mês no próximo ciclo anual, com `deadline_precision: "month"` e `deadline_status: "estimated"`. O ano do deadline e o ano da edição são avançados separadamente: um prazo de outubro de 2026 para a edição 2027 vira outubro de 2027 para a edição 2028. A projeção não copia confirmação, fuso, datas auxiliares ou correção manual de outra edição. O link é apenas uma referência e pode continuar apontando para a edição anterior.

Essa seleção/projeção é calculada ao carregar o site, sem precisar de uma execução da LLM. O JSON mantém as edições anteriores como histórico e base das projeções; o site não grava arquivos no navegador. Projeções anuais não confirmam a realização da próxima conferência.
