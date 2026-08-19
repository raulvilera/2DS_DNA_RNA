/**
 * Endpoint de registro da atividade de Biologia — 2ºDS.
 *
 * Implantação:
 * 1. Abra a planilha indicada pelo professor.
 * 2. Extensões > Apps Script.
 * 3. Cole este arquivo em Code.gs.
 * 4. Altere SPREADSHEET_ID se necessário.
 * 5. Execute setupSheet uma vez e autorize o projeto.
 * 6. Em Implantar > Nova implantação > Aplicativo da Web:
 *    - Executar como: Eu
 *    - Quem tem acesso: Qualquer pessoa com o link
 * 7. Copie a URL /exec para a configuração GOOGLE_APPS_SCRIPT_URL do site.
 */

const CONFIG = Object.freeze({
  SPREADSHEET_ID: '1CcoSFYXaP-x7pHe7uyyodSeD5Xa4sSy173egGAAZsno',
  SHEET_NAME: '2ºDS (Magnificação)',
  MAX_NAME_LENGTH: 160,
  MAX_TEXT_LENGTH: 12000,
  OBJECTIVE_COUNT: 7,
  TOTAL_COUNT: 10,
});

/**
 * Cria a aba e os cabeçalhos. Pode ser executada manualmente no editor.
 */
function setupSheet() {
  const sheet = getOrCreateSheet_();
  const headers = buildHeaders_();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#0f766e')
    .setFontColor('#ffffff');
  sheet.autoResizeColumns(1, headers.length);
  return `Aba pronta: ${CONFIG.SHEET_NAME}`;
}

/**
 * Endpoint HTTP POST usado pelo backend da atividade.
 */
function doPost(e) {
  try {
    const payload = parsePayload_(e);
    validatePayload_(payload);

    const sheet = getOrCreateSheet_();
    ensureHeaders_(sheet);

    const lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      const row = buildRow_(payload);
      sheet.getRange(sheet.getLastRow() + 1, 1, 1, row.length).setValues([row]);
    } finally {
      lock.releaseLock();
    }

    return jsonResponse_({
      ok: true,
      message: 'Envio registrado com sucesso.',
      receivedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    return jsonResponse_({
      ok: false,
      error: error instanceof Error ? error.message : 'Não foi possível registrar o envio.',
    });
  }
}

/**
 * Permite testar o endpoint pelo editor sem depender de uma requisição externa.
 */
function testPost() {
  const sample = {
    secret: PropertiesService.getScriptProperties().getProperty('SCRIPT_SHARED_SECRET') || '',
    studentName: 'TESTE — remover esta linha após validar',
    attemptId: 'teste-local',
    submittedAt: new Date().toISOString(),
    objectiveAnswers: ['A', 'B', 'C', 'D', 'A', 'B', 'C'],
    subjectiveAnswers: ['Resposta de teste 8', 'Resposta de teste 9', 'Resposta de teste 10'],
    objectiveKey: ['A', 'B', 'C', 'D', 'A', 'B', 'C'],
    objectiveScore: 7,
    appVersion: 'test',
    userAgent: 'Apps Script testPost',
  };
  return doPost({ postData: { contents: JSON.stringify(sample) } });
}

function getOrCreateSheet_() {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  return spreadsheet.getSheetByName(CONFIG.SHEET_NAME) || spreadsheet.insertSheet(CONFIG.SHEET_NAME);
}

function ensureHeaders_(sheet) {
  const headers = buildHeaders_();
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
}

function buildHeaders_() {
  return [
    'Nome do aluno',
    'Data/hora do envio',
    'ID da tentativa',
    ...Array.from({ length: CONFIG.OBJECTIVE_COUNT }, (_, index) => `Objetiva ${index + 1}`),
    ...Array.from({ length: 3 }, (_, index) => `Dissertativa ${index + 8}`),
    ...Array.from({ length: CONFIG.OBJECTIVE_COUNT }, (_, index) => `Gabarito ${index + 1}`),
    'Pontuação objetiva',
    'Versão da aplicação',
    'Navegador / dispositivo',
  ];
}

function buildRow_(payload) {
  const objectiveAnswers = payload.objectiveAnswers.map(normalizeAnswer_);
  const subjectiveAnswers = payload.subjectiveAnswers.map(value => normalizeText_(value));
  const objectiveKey = payload.objectiveKey.map(normalizeAnswer_);

  return [
    normalizeText_(payload.studentName),
    normalizeDate_(payload.submittedAt),
    normalizeText_(payload.attemptId),
    ...objectiveAnswers,
    ...subjectiveAnswers,
    ...objectiveKey,
    Number.isFinite(Number(payload.objectiveScore)) ? Number(payload.objectiveScore) : '',
    normalizeText_(payload.appVersion || ''),
    normalizeText_(payload.userAgent || ''),
  ];
}

function parsePayload_(event) {
  if (!event || !event.postData || !event.postData.contents) {
    throw new Error('Payload ausente.');
  }

  const payload = JSON.parse(event.postData.contents);
  const expectedSecret = PropertiesService.getScriptProperties().getProperty('SCRIPT_SHARED_SECRET');
  if (expectedSecret && payload.secret !== expectedSecret) {
    throw new Error('Credencial de integração inválida.');
  }
  return payload;
}

function validatePayload_(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('Formato de envio inválido.');
  if (!payload.studentName || typeof payload.studentName !== 'string') throw new Error('Nome do aluno é obrigatório.');
  if (payload.studentName.length > CONFIG.MAX_NAME_LENGTH) throw new Error('Nome do aluno excede o limite.');
  if (!Array.isArray(payload.objectiveAnswers) || payload.objectiveAnswers.length !== CONFIG.OBJECTIVE_COUNT) {
    throw new Error('É necessário enviar 7 respostas objetivas.');
  }
  if (!Array.isArray(payload.subjectiveAnswers) || payload.subjectiveAnswers.length !== 3) {
    throw new Error('É necessário enviar 3 respostas dissertativas.');
  }
  if (!Array.isArray(payload.objectiveKey) || payload.objectiveKey.length !== CONFIG.OBJECTIVE_COUNT) {
    throw new Error('Gabarito objetivo inválido.');
  }

  payload.objectiveAnswers.forEach(validateOption_);
  payload.objectiveKey.forEach(validateOption_);
  payload.subjectiveAnswers.forEach(value => {
    if (typeof value !== 'string' || value.length > CONFIG.MAX_TEXT_LENGTH) {
      throw new Error('Uma resposta dissertativa excede o limite permitido.');
    }
  });
}

function validateOption_(value) {
  if (!['A', 'B', 'C', 'D', ''].includes(String(value).toUpperCase())) {
    throw new Error('Alternativa inválida.');
  }
}

function normalizeAnswer_(value) {
  return String(value || '').trim().toUpperCase();
}

function normalizeText_(value) {
  return String(value || '').trim().slice(0, CONFIG.MAX_TEXT_LENGTH);
}

function normalizeDate_(value) {
  const date = value ? new Date(value) : new Date();
  return isNaN(date.getTime()) ? new Date() : date;
}

function jsonResponse_(body) {
  return ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}
