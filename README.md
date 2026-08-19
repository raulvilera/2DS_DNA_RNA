# Atividade de Biologia — 2ºDS

Aplicação avaliativa online para a turma 2ºDS da E.E. Profª Wanda Mascagni de Sá. A atividade aborda células HeLa, bioética, DNA, RNA, genoma, replicação e transcrição.

## Funcionalidades

A aplicação sorteia 7 questões objetivas e 3 dissertativas por tentativa. O banco pode ser ampliado por LLM no backend quando `USE_LLM_GENERATION=true`; o fallback curricular local mantém a aplicação utilizável quando o serviço de IA não estiver disponível. O gabarito das objetivas permanece no backend até o envio.

As imagens exibidas nos enunciados são recursos reais licenciados, com créditos em [`ATTRIBUTIONS.md`](./ATTRIBUTIONS.md). O projeto usa imagens de DNA, RNA polimerase, células HeLa e Henrietta Lacks, mapeadas semanticamente aos temas das questões.

## Execução local

Instale as dependências com `pnpm install`, execute `pnpm dev` e acesse a porta informada pelo servidor. Para validar o projeto, use `pnpm check` e `pnpm test`.

## Registro no Google Sheets

O backend envia os resultados para `GOOGLE_APPS_SCRIPT_URL` quando essa variável está configurada. O código do endpoint está em [`google-apps-script/Code.gs`](./google-apps-script/Code.gs), com instruções em [`google-apps-script/README.md`](./google-apps-script/README.md). A aba esperada é `2ºDS (Magnificação)`.

A planilha registra as respostas discursivas nas colunas correspondentes. O professor lança notas de 0 a 1 nas três colunas de correção; então as fórmulas calculam a `Nota final` de 0 a 10 e alteram o `Status da correção` para `Corrigida`.

Opcionalmente, configure `GOOGLE_APPS_SCRIPT_SECRET` no backend e a propriedade `SCRIPT_SHARED_SECRET` no Apps Script. Para habilitar a geração dinâmica por LLM, configure `USE_LLM_GENERATION=true`. Para habilitar geração de imagens por IA como camada adicional, configure `USE_IMAGE_GENERATION=true`; as imagens reais licenciadas permanecem como fallback didático.

## Licenças

O código deste projeto é disponibilizado para uso educacional. Consulte [`ATTRIBUTIONS.md`](./ATTRIBUTIONS.md) para as licenças e atribuições obrigatórias das imagens.
