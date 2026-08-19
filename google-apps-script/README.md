# Google Apps Script — Atividade de Biologia 2ºDS

Este endpoint recebe os envios feitos pelo backend da atividade e grava os dados na aba `2ºDS (Magnificação)` da planilha indicada:

`https://docs.google.com/spreadsheets/d/1CcoSFYXaP-x7pHe7uyyodSeD5Xa4sSy173egGAAZsno/edit`

## Publicação

Abra a planilha com uma conta que tenha permissão de edição e acesse **Extensões → Apps Script**. Crie ou substitua o conteúdo de `Code.gs` pelo arquivo fornecido. Salve o projeto e execute `setupSheet` uma vez, concedendo as permissões solicitadas.

Em seguida, abra **Implantar → Nova implantação**, selecione **Aplicativo da Web**, escolha **Executar como: Eu** e, em acesso, selecione **Qualquer pessoa**. Publique e copie a URL da seção **App da Web**, que termina em `/exec`. Essa URL deve ser configurada no backend como `GOOGLE_APPS_SCRIPT_URL`.

## Correção e nota final

A aplicação grava automaticamente as sete respostas objetivas, o gabarito objetivo, a pontuação objetiva e as três respostas dissertativas. As colunas `Nota dissertativa 8`, `Nota dissertativa 9` e `Nota dissertativa 10` ficam inicialmente vazias para correção manual do professor.

O professor deve atribuir a cada dissertativa uma nota de **0 a 1 ponto**, digitando os valores nas colunas `X`, `Y` e `Z`. A planilha calcula automaticamente a `Nota final` na coluna `AA`:

`Nota final = Pontuação objetiva + Nota dissertativa 8 + Nota dissertativa 9 + Nota dissertativa 10`

A coluna `AB` muda de `Pendente` para `Corrigida` quando as três notas discursivas são preenchidas. Como são 7 questões objetivas e 3 dissertativas, a nota final varia de 0 a 10 pontos.

Recomenda-se proteger as colunas de respostas e gabaritos, deixando editáveis para o professor apenas `X:Z`.

Quando um novo envio chegar, o Apps Script verifica a linha de cabeçalhos e amplia automaticamente uma aba antiga para incluir as colunas de correção, preservando os dados existentes.

## Segurança opcional por segredo

No editor do Apps Script, abra **Configurações do projeto → Propriedades do script** e crie `SCRIPT_SHARED_SECRET`. Se essa propriedade existir, o backend deverá enviar o mesmo valor no campo `secret` do JSON. Em produção, recomenda-se configurar esse segredo.

## Contrato esperado

```json
{
  "secret": "opcional-ou-segredo-configurado",
  "studentName": "NOME DO ALUNO",
  "attemptId": "id-unico-da-tentativa",
  "submittedAt": "2026-08-19T20:00:00.000Z",
  "objectiveAnswers": ["A", "B", "C", "D", "A", "B", "C"],
  "subjectiveAnswers": ["Resposta da questão 8", "Resposta da questão 9", "Resposta da questão 10"],
  "objectiveKey": ["A", "B", "C", "D", "A", "B", "C"],
  "objectiveScore": 7,
  "appVersion": "1.0.0",
  "userAgent": "informação opcional do navegador"
}
```

O gabarito deve ser enviado somente pelo backend, nunca diretamente pelo navegador do aluno. O Apps Script valida a quantidade de questões, as alternativas permitidas e o tamanho das respostas antes de inserir uma nova linha.
