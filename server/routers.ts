import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import { generateImage } from "./_core/imageGeneration";
import { publicProcedure, router } from "./_core/trpc";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";

type StudentRecord = { name: string; number: string; series: string; ra: string; institutionalEmail: string };
const students: StudentRecord[] = [
  ["1", "ALAN EDUARDO DOS SANTOS BARBOSA", "111875511", "0000111875511XSP@al.educacao.sp.gov.br"],
  ["3", "ANA BEATRIZ DE LIMA TOMAZ", "113210071", "00001132100719SP@al.educacao.sp.gov.br"],
  ["4", "ANA BEATRIZ MOURA AMARO OLIVEIRA", "110212382", "00001102123821SP@al.educacao.sp.gov.br"],
  ["6", "ANDRÉ DOS REIS ARAÚJO", "111880119", "00001118801192SP@al.educacao.sp.gov.br"],
  ["7", "ANNY LUIZA MARQUES DE SOUZA", "111794550", "00001117945509SP@al.educacao.sp.gov.br"],
  ["8", "ARTUR SANTOS DE OLIVEIRA", "113221702", "00001132217027SP@al.educacao.sp.gov.br"],
  ["9", "BEATRIZ TEODORO FURLAN", "114163979", "00001141639798SP@al.educacao.sp.gov.br"],
  ["10", "CATHARINA KESS RUBIO MENDES", "115022281", "00001150222815SP@al.educacao.sp.gov.br"],
  ["11", "DANIEL FERREIRA DOS SANTOS", "112222620", "00001122226202SP@al.educacao.sp.gov.br"],
  ["15", "FELIPE AUGUSTO DE SOUZA ALCARAZ", "112600640", "00001126006403SP@al.educacao.sp.gov.br"],
  ["16", "GEOVANNA DOS SANTOS MENDES", "114164783", "00001141647837SP@al.educacao.sp.gov.br"],
  ["17", "HENRY ALVES TOZZI DA SILVA PIRES", "113218140", "00001132181409SP@al.educacao.sp.gov.br"],
  ["18", "ISABELLA MONTEIRO BARCELLOS", "114240619", "00001142406192SP@al.educacao.sp.gov.br"],
  ["19", "JENNIFER CARVALHO COSTA", "114160908", "00001141609083SP@al.educacao.sp.gov.br"],
  ["20", "JUHAN DOS SANTOS MARIN", "114240559", "0000114240559XSP@al.educacao.sp.gov.br"],
  ["21", "JULIA ARAUJO DE LIMA", "111722111", "00001117221118SP@al.educacao.sp.gov.br"],
  ["22", "JULIANA SILVA DE LIMA NEVES", "111772387", "00001117723872SP@al.educacao.sp.gov.br"],
  ["25", "LEANDRO MACIEL CORRÊA", "113805632", "00001138056327SP@al.educacao.sp.gov.br"],
  ["26", "LEONARDO LIMA DE JESUS", "112210601", "00001122106014SP@al.educacao.sp.gov.br"],
  ["27", "MARIAH LUIZA DO NASCIMENTO CARVALHO", "114156246", "00001141562467SP@al.educacao.sp.gov.br"],
  ["29", "MISAEL MARTINS DE ANDRADE JUNIOR", "113211001", "00001132110014SP@al.educacao.sp.gov.br"],
  ["30", "MURILO GABRIEL RIOS LEAO", "112226021", "00001122260210SP@al.educacao.sp.gov.br"],
  ["31", "NATAN SANTOS XAVIER", "112219880", "00001122198802SP@al.educacao.sp.gov.br"],
  ["33", "NICOLE PEREIRA LUCIANO", "113213561", "00001132135618SP@al.educacao.sp.gov.br"],
  ["35", "PIETRO COELHO MARTINS", "115110037", "00001151100377SP@al.educacao.sp.gov.br"],
  ["36", "POUL WILLYAM MACHADO ALVES DOS SANTOS", "111126877", "00001111268770SP@al.educacao.sp.gov.br"],
  ["38", "RAPHAEL DA SILVA TAVARES", "115083570", "00001150835709SP@al.educacao.sp.gov.br"],
  ["40", "VICTOR DANIEL GARCIA SANCHEZ", "121000792", "00001210007927SP@al.educacao.sp.gov.br"],
  ["42", "VITOR HUGO SILVA RIO BRANCO", "113209983", "00001132099833SP@al.educacao.sp.gov.br"],
  ["43", "VITOR VINICIUS PEREIRA VASCONCELOS", "110335387", "00001103353871SP@al.educacao.sp.gov.br"],
  ["45", "ESTELA RODRIGUES DE OLIVEIRA", "114241807", "00001142418078SP@al.educacao.sp.gov.br"],
].map(([number, name, ra, institutionalEmail]) => ({ name, number, series: "2ºDS", ra, institutionalEmail }));

type PublicQuestion = { id: string; kind: "objective" | "subjective"; topic: string; prompt: string; options?: string[]; image: string };
type PrivateQuestion = PublicQuestion & { answer?: string; rubric?: string };
const attempts = new Map<string, PrivateQuestion[]>();
const generatedImageCache = new Map<string, string>();

function shuffle<T>(items: T[], seed: number): T[] {
  const copy = [...items]; let state = seed || 1;
  for (let i = copy.length - 1; i > 0; i--) { state = (state * 1664525 + 1013904223) >>> 0; const j = state % (i + 1); [copy[i], copy[j]] = [copy[j], copy[i]]; }
  return copy;
}
function svgImage(topic: string, accent: string) {
  const label = topic.toUpperCase();
  const body = topic === "DNA/RNA" ? `<path d="M92 26c50 34 50 74 0 108M188 26c-50 34-50 74 0 108M101 43h78M91 69h98M91 95h98M101 121h78"/><circle cx="92" cy="26" r="6"/><circle cx="188" cy="134" r="6"/>` : topic === "TRANSCRIÇÃO" ? `<path d="M45 116c44-66 82-66 126 0M79 116c44-66 82-66 126 0"/><path d="M72 90h96M61 72h96M84 54h96"/><path d="M135 28v28"/>` : topic === "BIOÉTICA" ? `<circle cx="140" cy="80" r="48"/><path d="M116 80h48M140 56v48M88 142h104"/><path d="M140 18v18M140 124v18M78 80H60M220 80h-18"/>` : `<circle cx="140" cy="80" r="42"/><circle cx="140" cy="80" r="16"/><path d="M140 14v26M140 120v26M74 80H48M232 80h-26M93 33l18 18M187 109l18 18M187 51l18-18M93 109l-18 18"/>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 170"><rect width="280" height="170" rx="22" fill="#f1f5f9"/><g fill="none" stroke="${accent}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">${body}</g><text x="140" y="158" text-anchor="middle" font-family="Arial" font-size="13" font-weight="700" fill="#334155">${label}</text></svg>`)}`;
}
const imageBank = [
  "/manus-storage/dna-double-helix_6249396e.png",
  "/manus-storage/rna-polymerase_20f7f191.png",
  "/manus-storage/hela-cells_1a148774.jpg",
  "/manus-storage/henrietta-lacks_cc414bc5.jpg",
  "/manus-storage/chromosomes-microscope_006a3c8d.jpg",
  "/manus-storage/ribosome-shape_ab3bede2.png",
  "/manus-storage/dna-replication_80449b82.png",
  "/manus-storage/cells-microscope_d050457a.jpg",
  "/manus-storage/rna-transcription_8aa532eb.jpg",
  "/manus-storage/dna-chemical-structure_ee0efb40.png",
];
function imageForTopic(topic: string) {
  if (["DNA e RNA", "DNA/RNA"].includes(topic)) return imageBank[0];
  if (["Replicação", "Genoma"].includes(topic)) return imageBank[6];
  if (topic === "Enzimas") return imageBank[1];
  if (topic === "Transcrição") return imageBank[8];
  if (topic === "Tipos de RNA") return imageBank[5];
  if (topic === "Células HeLa") return imageBank[2];
  if (["Bioética", "Confidencialidade"].includes(topic)) return imageBank[3];
  return imageBank[0];
}

function ensureUniqueImages(questions: PrivateQuestion[], seed: number) {
  const topicPriority: Record<string, number[]> = {
    "DNA e RNA": [0, 9], "DNA/RNA": [9, 0], Replicação: [6, 4], Genoma: [4, 9],
    Enzimas: [1, 6], Transcrição: [8, 1], "Tipos de RNA": [5, 8],
    "Células HeLa": [2, 7], Bioética: [3, 7], Confidencialidade: [3, 7],
  };
  const used = new Set<string>();
  return questions.map((question, index) => {
    const preferred = topicPriority[question.topic] ?? [];
    const allImages = Array.from({ length: imageBank.length }, (_, i) => i);
    const preferredAvailable = preferred.find(indexValue => !used.has(imageBank[indexValue]));
    const fallbackAvailable = allImages.find(indexValue => !used.has(imageBank[indexValue]));
    const selectedIndex = preferredAvailable ?? fallbackAvailable ?? preferred[0] ?? (Math.abs(seed + index) % imageBank.length);
    const selected = imageBank[selectedIndex];
    used.add(selected);
    return { ...question, image: selected };
  });
}

const objectivePool: PrivateQuestion[] = [
  { id: "o1", kind: "objective", topic: "DNA e RNA", prompt: "Durante uma investigação sobre material genético em células humanas, uma equipe compara duas moléculas envolvidas no armazenamento e no uso da informação hereditária. Em relação ao DNA e ao RNA, qual alternativa apresenta uma diferença correta entre essas moléculas?", options: ["O DNA contém ribose e o RNA contém desoxirribose.", "O DNA possui, em geral, duas fitas; o RNA, uma fita simples.", "O DNA usa uracila no lugar da timina.", "O RNA é formado por aminoácidos, não por nucleotídeos."], answer: "B", image: imageForTopic("DNA e RNA") },
  { id: "o2", kind: "objective", topic: "Replicação", prompt: "Em uma aula prática, uma estudante observa uma pequena sequência de uma fita de DNA e precisa prever a fita complementar para compreender como a molécula é copiada. Uma fita apresenta A–T–G–C. Qual sequência representa sua complementaridade?", options: ["A–T–G–C", "U–A–C–G", "T–A–C–G", "G–C–A–T"], answer: "C", image: imageForTopic("Replicação") },
  { id: "o3", kind: "objective", topic: "Genoma", prompt: "Em um projeto de sequenciamento, pesquisadores reúnem todas as informações presentes no material genético de um organismo. Nesse contexto, o conceito de genoma corresponde a:", options: ["Uma única proteína produzida por uma célula.", "O conjunto completo de DNA de um organismo.", "Apenas as moléculas de RNA mensageiro.", "O conjunto de órgãos de um indivíduo."], answer: "B", image: imageForTopic("Genoma") },
  { id: "o4", kind: "objective", topic: "Transcrição", prompt: "Em uma célula, a informação de um gene precisa ser transformada em uma molécula que possa deixar o núcleo e participar da produção de proteínas. Na expressão gênica, a transcrição é o processo que produz:", options: ["RNA usando uma sequência de DNA como molde.", "DNA usando uma proteína como molde.", "Aminoácidos usando lipídios como molde.", "Glicose a partir de RNA."], answer: "A", image: imageForTopic("Transcrição") },
  { id: "o5", kind: "objective", topic: "Tipos de RNA", prompt: "Durante a síntese de uma proteína, uma cópia temporária da informação genética sai do núcleo e chega ao ribossomo. Qual tipo de RNA realiza essa função?", options: ["RNA mensageiro (RNAm).", "RNA transportador (RNAt).", "RNA ribossômico (RNAr).", "RNA de reserva."], answer: "A", image: imageForTopic("Tipos de RNA") },
  { id: "o6", kind: "objective", topic: "Bioética", prompt: "Ao estudar o caso Henrietta Lacks, uma turma debate quais direitos devem ser respeitados quando células humanas são coletadas e utilizadas em pesquisas. Qual princípio bioético está diretamente relacionado à autorização para coleta e uso de material biológico?", options: ["Autonomia e consentimento.", "Competição entre pesquisadores.", "Velocidade experimental.", "Publicidade dos dados pessoais."], answer: "A", image: imageForTopic("Bioética") },
  { id: "o7", kind: "objective", topic: "Confidencialidade", prompt: "Uma equipe deseja publicar resultados de uma pesquisa, mas o relatório contém nomes e diagnósticos dos participantes sem autorização. Essa conduta viola principalmente o princípio da:", options: ["Replicação.", "Confidencialidade.", "Transcrição.", "Seleção natural."], answer: "B", image: imageForTopic("Confidencialidade") },
  { id: "o8", kind: "objective", topic: "Replicação", prompt: "Antes de uma célula se dividir, seu DNA precisa ser copiado com fidelidade. Por que a replicação do DNA é chamada de semiconservativa?", options: ["Porque utiliza apenas metade das bases.", "Porque cada molécula nova possui uma fita antiga e uma fita nova.", "Porque acontece apenas em metade da célula.", "Porque produz somente metade dos cromossomos."], answer: "B", image: imageForTopic("Replicação") },
  { id: "o9", kind: "objective", topic: "Enzimas", prompt: "Em uma animação de laboratório, uma enzima abre a dupla-hélice e outra adiciona nucleotídeos complementares às novas fitas. Quais enzimas participam diretamente desses dois momentos da replicação?", options: ["Helicase e DNA polimerase.", "Amilase e pepsina.", "Lipase e RNAse.", "Catalase e lactase."], answer: "A", image: imageForTopic("Enzimas") },
  { id: "o10", kind: "objective", topic: "Células HeLa", prompt: "As células HeLa são utilizadas em diferentes linhas de pesquisa biomédica. Considerando sua relevância histórica e científica, é correto afirmar que elas:", options: ["Terem encerrado todos os estudos sobre câncer.", "Terem contribuído para pesquisas em vacinas, medicamentos e tumores.", "Serem células de uma planta usada em fotossíntese.", "Não poderem ser cultivadas em laboratório."], answer: "B", image: imageForTopic("Células HeLa") },
];
const subjectivePool: PrivateQuestion[] = [
  { id: "s1", kind: "subjective", topic: "Bioética", prompt: "Imagine que um hospital queira utilizar células retiradas de uma paciente em uma pesquisa que poderá gerar tratamentos e patentes. Explique, a partir do caso Henrietta Lacks, por que consentimento, justiça e respeito à dignidade humana devem ser considerados.", rubric: "Deve relacionar consentimento/autonomia, uso de material biológico, desigualdades históricas e dignidade.", image: imageForTopic("Bioética") },
  { id: "s2", kind: "subjective", topic: "Replicação", prompt: "Durante a preparação para a divisão celular, uma equipe precisa explicar como o DNA é duplicado. Descreva, com suas palavras, as etapas da replicação semiconservativa e as funções da helicase e da DNA polimerase.", rubric: "Deve mencionar separação das fitas, complementaridade e uma fita antiga + uma nova.", image: imageForTopic("Replicação") },
  { id: "s3", kind: "subjective", topic: "Transcrição", prompt: "Uma célula do fígado precisa produzir uma proteína específica após receber um sinal hormonal. Compare transcrição e tradução e explique o papel do RNA mensageiro nesse processo.", rubric: "Deve diferenciar DNA→RNA e RNA→proteína, com função do RNAm.", image: imageForTopic("Transcrição") },
  { id: "s4", kind: "subjective", topic: "Confidencialidade", prompt: "Uma pesquisa sobre uma doença rara pretende divulgar diagnósticos acompanhados de nome, cidade e idade dos participantes. Analise o problema ético e proponha uma forma responsável de apresentar os resultados.", rubric: "Deve reconhecer quebra de confidencialidade e propor anonimização/consentimento.", image: imageForTopic("Confidencialidade") },
  { id: "s5", kind: "subjective", topic: "DNA/RNA", prompt: "Em uma análise comparativa, você precisa explicar por que o DNA é adequado para armazenar informação por longos períodos e o RNA atua frequentemente como intermediário. Descreva duas diferenças estruturais entre DNA e RNA e relacione-as às funções dessas moléculas.", rubric: "Deve citar fita, açúcar ou base e relacionar estrutura/função.", image: imageForTopic("DNA e RNA") },
];

async function maybeGenerateWithLlm(seed: number) {
  if (process.env.USE_LLM_GENERATION !== "true") return null;
  try {
    const response = await Promise.race([
      invokeLLM({
        messages: [
          { role: "system", content: "Você é professor de Biologia do ensino médio. Gere uma atividade em português brasileiro com 7 objetivas e 3 dissertativas sobre bioética, DNA, RNA, genoma, replicação e transcrição. Não inclua explicações fora do JSON." },
          { role: "user", content: `Gere uma nova variação para a turma 2ºDS. Semente: ${seed}. Cada objetiva deve ter 4 alternativas e a resposta correta como letra. As dissertativas devem ter rubrica curta. Use linguagem clara e cientificamente correta.` },
        ],
        response_format: { type: "json_schema", json_schema: { name: "atividade_biologia", strict: true, schema: { type: "object", properties: { objective: { type: "array", items: { type: "object", properties: { prompt: { type: "string" }, options: { type: "array", items: { type: "string" } }, answer: { type: "string", enum: ["A", "B", "C", "D"] }, topic: { type: "string" } }, required: ["prompt", "options", "answer", "topic"], additionalProperties: false } }, subjective: { type: "array", items: { type: "object", properties: { prompt: { type: "string" }, rubric: { type: "string" }, topic: { type: "string" } }, required: ["prompt", "rubric", "topic"], additionalProperties: false } } }, required: ["objective", "subjective"], additionalProperties: false } } },
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("LLM timeout")), 4500)),
    ]);
    const content = response.choices?.[0]?.message?.content;
    if (typeof content !== "string") return null;
    const parsed = JSON.parse(content);
    if (parsed.objective?.length !== 7 || parsed.subjective?.length !== 3) return null;
    return [...parsed.objective.map((q: any, i: number) => ({ id: `llm-o-${i}`, kind: "objective", ...q, image: imageForTopic(q.topic) })), ...parsed.subjective.map((q: any, i: number) => ({ id: `llm-s-${i}`, kind: "subjective", ...q, image: imageForTopic(q.topic) }))] as PrivateQuestion[];
  } catch (error) { console.warn("LLM indisponível; usando banco curricular local.", error); return null; }
}

async function enrichQuestionImages(questions: PrivateQuestion[]) {
  if (process.env.USE_IMAGE_GENERATION !== "true") return questions;
  return Promise.all(questions.map(async question => {
    const cacheKey = `${question.topic}:${question.prompt}`;
    const cached = generatedImageCache.get(cacheKey);
    if (cached) return { ...question, image: cached };
    try {
      const generated = await Promise.race([
        generateImage({ prompt: `Ilustração científica didática, sem texto e sem respostas, para uma atividade de Biologia do ensino médio sobre ${question.topic}. Contexto do enunciado: ${question.prompt}` }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("image timeout")), 9000)),
      ]);
      if (generated?.url) { generatedImageCache.set(cacheKey, generated.url); return { ...question, image: generated.url }; }
    } catch (error) { console.warn("Imagem IA indisponível; usando ilustração vetorial de fallback.", error); }
    return question;
  }));
}

async function createAttempt() {
  const seed = Date.now() ^ Math.floor(Math.random() * 1_000_000);
  const llmSet = await maybeGenerateWithLlm(seed);
  const objective = llmSet?.filter(q => q.kind === "objective") ?? shuffle(objectivePool, seed).slice(0, 7);
  const subjective = llmSet?.filter(q => q.kind === "subjective") ?? shuffle(subjectivePool, seed + 23).slice(0, 3);
  const privateQuestions = ensureUniqueImages(await enrichQuestionImages([...objective, ...subjective]), seed);
  const attemptId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  attempts.set(attemptId, privateQuestions);
  setTimeout(() => attempts.delete(attemptId), 45 * 60 * 1000);
  return { attemptId, questions: privateQuestions.map(({ answer, rubric, ...question }) => question), generatedBy: llmSet ? "llm" : "bank" };
}

async function sendToSheets(payload: Record<string, unknown>) {
  const url = process.env.GOOGLE_APPS_SCRIPT_URL;
  if (!url) return { sent: false, reason: "GOOGLE_APPS_SCRIPT_URL não configurada" };
  const response = await fetch(url, { method: "POST", redirect: "manual", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload) });
  const text = await response.text();
  const accepted = response.ok || [301, 302, 303, 307, 308].includes(response.status);
  if (!accepted) throw new Error(`Apps Script respondeu ${response.status}: ${text.slice(0, 200)}`);
  return { sent: true, status: response.status };
}

export const appRouter = router({
  system: router({}),
  auth: router({ me: publicProcedure.query(opts => opts.ctx.user), logout: publicProcedure.mutation(({ ctx }) => { const options = getSessionCookieOptions(ctx.req); ctx.res.clearCookie(COOKIE_NAME, { ...options, maxAge: -1 }); return { success: true } as const; }) }),
  activity: router({
    students: publicProcedure.query(() => students),
    start: publicProcedure.mutation(() => createAttempt()),
    submit: publicProcedure.input(z.object({ attemptId: z.string(), studentName: z.string().min(1), studentNumber: z.string().optional(), series: z.string().optional(), ra: z.string().optional(), institutionalEmail: z.string().email().optional(), objectiveAnswers: z.array(z.enum(["A", "B", "C", "D", ""])).length(7), subjectiveAnswers: z.array(z.string().max(12000)).length(3) })).mutation(async ({ input }) => {
      const questions = attempts.get(input.attemptId);
      if (!questions) throw new Error("Tentativa expirada. Recarregue a atividade para gerar uma nova versão.");
      const objective = questions.filter(q => q.kind === "objective");
      const subjective = questions.filter(q => q.kind === "subjective");
      const key = objective.map(q => q.answer || "");
      const score = input.objectiveAnswers.reduce((total, answer, index) => total + (answer === key[index] ? 1 : 0), 0);
      const student = students.find(candidate => candidate.name === input.studentName);
      if (!student) throw new Error("Aluno não encontrado no cadastro do 2ºDS.");
      const sheets = await sendToSheets({ secret: process.env.GOOGLE_APPS_SCRIPT_SECRET || "", studentName: student.name, studentNumber: student.number, series: student.series, ra: student.ra, institutionalEmail: student.institutionalEmail, attemptId: input.attemptId, submittedAt: new Date().toISOString(), objectiveAnswers: input.objectiveAnswers, subjectiveAnswers: input.subjectiveAnswers, objectiveKey: key, objectiveScore: score, appVersion: "2ds-bio-1.0", userAgent: "server" });
      attempts.delete(input.attemptId);
      return { ok: true, score, objectiveCount: objective.length, subjectiveCount: subjective.length, sheets };
    }),
  }),
});
export type AppRouter = typeof appRouter;
