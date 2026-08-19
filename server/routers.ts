import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import { generateImage } from "./_core/imageGeneration";
import { publicProcedure, router } from "./_core/trpc";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";

const students = [
  "ALAN EDUARDO DOS SANTOS BARBOSA", "ANA BEATRIZ DE LIMA TOMAZ", "ANA BEATRIZ MOURA AMARO OLIVEIRA",
  "ANDRÉ DOS REIS ARAÚJO", "ANNY LUIZA MARQUES DE SOUZA", "ARTUR SANTOS DE OLIVEIRA", "BEATRIZ TEODORO FURLAN",
  "CATHARINA KESS RUBIO MENDES", "DANIEL FERREIRA DOS SANTOS", "FELIPE AUGUSTO DE SOUZA ALCARAZ", "GEOVANNA DOS SANTOS MENDES",
  "HENRY ALVES TOZZI DA SILVA PIRES", "ISABELLA MONTEIRO BARCELLOS", "JENNIFER CARVALHO COSTA", "JUHAN DOS SANTOS MARIN",
  "JULIA ARAUJO DE LIMA", "JULIANA SILVA DE LIMA NEVES", "LEANDRO MACIEL CORRÊA", "LEONARDO LIMA DE JESUS",
  "MARIAH LUIZA DO NASCIMENTO CARVALHO", "MISAEL MARTINS DE ANDRADE JUNIOR", "MURILO GABRIEL RIOS LEAO", "NATAN SANTOS XAVIER",
  "NICOLE PEREIRA LUCIANO", "PIETRO COELHO MARTINS", "POUL WILLYAM MACHADO ALVES DOS SANTOS", "RAPHAEL DA SILVA TAVARES",
  "VICTOR DANIEL GARCIA SANCHEZ", "VITOR HUGO SILVA RIO BRANCO", "VITOR VINICIUS PEREIRA VASCONCELOS", "ESTELA RODRIGUES DE OLIVEIRA",
];

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
];
function imageForTopic(topic: string) {
  if (["DNA e RNA", "Replicação", "Genoma", "Enzimas", "DNA/RNA"].includes(topic)) return imageBank[0];
  if (["Transcrição", "Tipos de RNA"].includes(topic)) return imageBank[1];
  if (topic === "Células HeLa") return imageBank[2];
  if (["Bioética", "Confidencialidade"].includes(topic)) return imageBank[3];
  return imageBank[0];
}

const objectivePool: PrivateQuestion[] = [
  { id: "o1", kind: "objective", topic: "DNA e RNA", prompt: "Em relação ao DNA e ao RNA, qual alternativa apresenta uma diferença correta entre essas moléculas?", options: ["O DNA contém ribose e o RNA contém desoxirribose.", "O DNA possui, em geral, duas fitas; o RNA, uma fita simples.", "O DNA usa uracila no lugar da timina.", "O RNA é formado por aminoácidos, não por nucleotídeos."], answer: "B", image: imageForTopic("DNA e RNA") },
  { id: "o2", kind: "objective", topic: "Replicação", prompt: "Uma fita de DNA apresenta a sequência A–T–G–C. Qual sequência representa sua complementaridade?", options: ["A–T–G–C", "U–A–C–G", "T–A–C–G", "G–C–A–T"], answer: "C", image: imageForTopic("DNA e RNA") },
  { id: "o3", kind: "objective", topic: "Genoma", prompt: "O conceito de genoma corresponde a:", options: ["Uma única proteína produzida por uma célula.", "O conjunto completo de DNA de um organismo.", "Apenas as moléculas de RNA mensageiro.", "O conjunto de órgãos de um indivíduo."], answer: "B", image: imageForTopic("DNA e RNA") },
  { id: "o4", kind: "objective", topic: "Transcrição", prompt: "Na expressão gênica, a transcrição é o processo que produz:", options: ["RNA usando uma sequência de DNA como molde.", "DNA usando uma proteína como molde.", "Aminoácidos usando lipídios como molde.", "Glicose a partir de RNA."], answer: "A", image: imageForTopic("Transcrição") },
  { id: "o5", kind: "objective", topic: "Tipos de RNA", prompt: "Qual tipo de RNA leva a informação genética do DNA até o ribossomo?", options: ["RNA mensageiro (RNAm).", "RNA transportador (RNAt).", "RNA ribossômico (RNAr).", "RNA de reserva."], answer: "A", image: imageForTopic("Transcrição") },
  { id: "o6", kind: "objective", topic: "Bioética", prompt: "No caso Henrietta Lacks, qual princípio bioético é diretamente relacionado à autorização para coleta e uso de material biológico?", options: ["Autonomia e consentimento.", "Competição entre pesquisadores.", "Velocidade experimental.", "Publicidade dos dados pessoais."], answer: "A", image: imageForTopic("Bioética") },
  { id: "o7", kind: "objective", topic: "Confidencialidade", prompt: "Divulgar dados de saúde identificáveis de participantes de uma pesquisa, sem autorização, viola principalmente o princípio da:", options: ["Replicação.", "Confidencialidade.", "Transcrição.", "Seleção natural."], answer: "B", image: imageForTopic("Bioética") },
  { id: "o8", kind: "objective", topic: "Replicação", prompt: "Por que a replicação do DNA é chamada de semiconservativa?", options: ["Porque utiliza apenas metade das bases.", "Porque cada molécula nova possui uma fita antiga e uma fita nova.", "Porque acontece apenas em metade da célula.", "Porque produz somente metade dos cromossomos."], answer: "B", image: imageForTopic("DNA e RNA") },
  { id: "o9", kind: "objective", topic: "Enzimas", prompt: "Quais enzimas participam diretamente da abertura e da síntese de novas fitas durante a replicação?", options: ["Helicase e DNA polimerase.", "Amilase e pepsina.", "Lipase e RNAse.", "Catalase e lactase."], answer: "A", image: imageForTopic("DNA e RNA") },
  { id: "o10", kind: "objective", topic: "Células HeLa", prompt: "A importância científica das células HeLa está relacionada ao fato de elas:", options: ["Terem encerrado todos os estudos sobre câncer.", "Terem contribuído para pesquisas em vacinas, medicamentos e tumores.", "Serem células de uma planta usada em fotossíntese.", "Não poderem ser cultivadas em laboratório."], answer: "B", image: imageForTopic("Células HeLa") },
];
const subjectivePool: PrivateQuestion[] = [
  { id: "s1", kind: "subjective", topic: "Bioética", prompt: "Explique por que o caso de Henrietta Lacks é importante para discutir consentimento, justiça e respeito à dignidade humana na pesquisa científica.", rubric: "Deve relacionar consentimento/autonomia, uso de material biológico, desigualdades históricas e dignidade.", image: imageForTopic("Bioética") },
  { id: "s2", kind: "subjective", topic: "Replicação", prompt: "Explique, com suas palavras, como ocorre a replicação semiconservativa do DNA e qual é a função da helicase e da DNA polimerase.", rubric: "Deve mencionar separação das fitas, complementaridade e uma fita antiga + uma nova.", image: imageForTopic("DNA e RNA") },
  { id: "s3", kind: "subjective", topic: "Transcrição", prompt: "Compare transcrição e tradução, indicando o papel do RNA mensageiro na produção de proteínas.", rubric: "Deve diferenciar DNA→RNA e RNA→proteína, com função do RNAm.", image: imageForTopic("Transcrição") },
  { id: "s4", kind: "subjective", topic: "Confidencialidade", prompt: "Uma pesquisa divulga diagnósticos dos participantes com nome e cidade. Analise o problema ético e proponha uma forma responsável de divulgar os resultados.", rubric: "Deve reconhecer quebra de confidencialidade e propor anonimização/consentimento.", image: imageForTopic("Bioética") },
  { id: "s5", kind: "subjective", topic: "DNA/RNA", prompt: "Descreva duas diferenças estruturais entre DNA e RNA e explique por que essas diferenças são importantes para suas funções.", rubric: "Deve citar fita, açúcar ou base e relacionar estrutura/função.", image: imageForTopic("DNA e RNA") },
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
  const privateQuestions = await enrichQuestionImages([...objective, ...subjective]);
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
    submit: publicProcedure.input(z.object({ attemptId: z.string(), studentName: z.string().min(1), objectiveAnswers: z.array(z.enum(["A", "B", "C", "D", ""])).length(7), subjectiveAnswers: z.array(z.string().max(12000)).length(3) })).mutation(async ({ input }) => {
      const questions = attempts.get(input.attemptId);
      if (!questions) throw new Error("Tentativa expirada. Recarregue a atividade para gerar uma nova versão.");
      const objective = questions.filter(q => q.kind === "objective");
      const subjective = questions.filter(q => q.kind === "subjective");
      const key = objective.map(q => q.answer || "");
      const score = input.objectiveAnswers.reduce((total, answer, index) => total + (answer === key[index] ? 1 : 0), 0);
      const sheets = await sendToSheets({ secret: process.env.GOOGLE_APPS_SCRIPT_SECRET || "", studentName: input.studentName, attemptId: input.attemptId, submittedAt: new Date().toISOString(), objectiveAnswers: input.objectiveAnswers, subjectiveAnswers: input.subjectiveAnswers, objectiveKey: key, objectiveScore: score, appVersion: "2ds-bio-1.0", userAgent: "server" });
      attempts.delete(input.attemptId);
      return { ok: true, score, objectiveCount: objective.length, subjectiveCount: subjective.length, sheets };
    }),
  }),
});
export type AppRouter = typeof appRouter;
