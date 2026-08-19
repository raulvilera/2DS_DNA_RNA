# Google Apps Script — Atividade de Biologia 2ºDS

Este endpoint recebe os envios feitos pelo backend da atividade e grava os dados na aba `2ºDS (Magnificação)` da planilha indicada:

`https://docs.google.com/spreadsheets/d/1CcoSFYXaP-x7pHe7uyyodSeD5Xa4sSy173egGAAZsno/edit`

## Publicação

Abra a planilha com uma conta que tenha permissão de edição e acesse **Extensões > Apps Script**. Crie ou substitua o conteúdo de `Code.gs` pelo arquivo fornecido. Salve o projeto e execute a função `setupSheet` uma vez, concedendo as permissões solicitadas. Essa função cria a aba, se necessário, e prepara a primeira linha com os cabeçalhos.

Em seguida, abra **Implantar > Nova implantação**, selecione **Aplicativo da Web**, escolha **Executar como: Eu** e, em acesso, selecione **Qualquer pessoa com o link**. Publique e copie a URL que termina em `/exec`.

A URL deverá ser informada na configuração do backend da atividade como `GOOGLE_APPS_SCRIPT_URL`. O endpoint foi projetado para receber requisições `POST` com corpo JSON.

## Segurança opcional por segredo

No editor do Apps Script, abra **Configurações do projeto > Propriedades do script** e crie a propriedade:

| Propriedade | Valor |
|---|---|
| `SCRIPT_SHARED_SECRET` | Uma sequência longa e aleatória, por exemplo, gerada por um gerenciador de senhas |

Quando essa propriedade existir, o backend deverá enviar o mesmo valor no campo `secret` do JSON. Caso a propriedade não exista, o endpoint continuará funcionando sem essa camada adicional; para produção, recomenda-se configurar o segredo.

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

O gabarito deve ser enviado somente pelo backend da aplicação, nunca diretamente pelo navegador do aluno. O Apps Script valida a quantidade das questões, as alternativas permitidas e o tamanho das respostas antes de inserir uma nova linha.

## Teste

Depois de executar `setupSheet`, execute `testPost` no editor. A função insere uma linha de teste. Após confirmar que o formato está correto, remova essa linha manualmente da planilha. Em produção, o site fará o envio para a URL `/exec` usando `POST`.

## Colunas criadas

A planilha receberá o nome do aluno, a data/hora, o ID da tentativa, as sete respostas objetivas, as três respostas dissertativas, os sete itens do gabarito objetivo, a pontuação objetiva, a versão da aplicação e uma informação opcional do navegador.
