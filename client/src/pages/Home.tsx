import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";

type Question = { id: string; kind: "objective" | "subjective"; topic: string; prompt: string; options?: string[]; image: string };
type StudentRecord = { name: string; number: string; series: string; ra: string; institutionalEmail: string };

export default function Home() {
  const [studentName, setStudentName] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attemptId, setAttemptId] = useState("");
  const [objectiveAnswers, setObjectiveAnswers] = useState<string[]>(Array(7).fill(""));
  const [subjectiveAnswers, setSubjectiveAnswers] = useState<string[]>(Array(3).fill(""));
  const [submitted, setSubmitted] = useState(false);
  const start = trpc.activity.start.useMutation();
  const submit = trpc.activity.submit.useMutation();
  const students = trpc.activity.students.useQuery();
  const objective = useMemo(() => questions.filter(q => q.kind === "objective"), [questions]);
  const subjective = useMemo(() => questions.filter(q => q.kind === "subjective"), [questions]);
  const selectedStudent = useMemo(() => (students.data as StudentRecord[] | undefined)?.find(student => student.name === studentName), [students.data, studentName]);

  useEffect(() => { start.mutate(undefined, { onSuccess: data => { setAttemptId(data.attemptId); setQuestions(data.questions); }, onError: () => toast.error("Não foi possível gerar a atividade. Tente novamente.") }); }, []);

  function answerObjective(index: number, value: string) { setObjectiveAnswers(prev => prev.map((answer, i) => i === index ? value : answer)); }
  function answerSubjective(index: number, value: string) { setSubjectiveAnswers(prev => prev.map((answer, i) => i === index ? value : answer)); }
  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!studentName) return toast.error("Selecione seu nome antes de enviar.");
    if (objectiveAnswers.some(answer => !answer)) return toast.error("Responda todas as questões objetivas.");
    if (subjectiveAnswers.some(answer => answer.trim().length < 10)) return toast.error("Desenvolva cada resposta dissertativa com pelo menos 10 caracteres.");
    submit.mutate({ attemptId, studentName, studentNumber: selectedStudent?.number ?? "", series: selectedStudent?.series ?? "2ºDS", ra: selectedStudent?.ra ?? "", institutionalEmail: selectedStudent?.institutionalEmail ?? "", objectiveAnswers: objectiveAnswers as any, subjectiveAnswers }, { onSuccess: result => { setSubmitted(true); toast.success(`Envio registrado. Você acertou ${result.score} de 7 questões objetivas.`); }, onError: error => toast.error(error.message) });
  }

  if (submitted) return <main className="success-screen"><div className="success-card"><div className="success-icon"><ShieldCheck size={34} /></div><p className="eyebrow">ATIVIDADE ENVIADA</p><h1>Resposta registrada</h1><p>Seu envio foi encaminhado para a correção. As respostas dissertativas serão analisadas pela professora.</p><div className="success-note">Você pode fechar esta página.</div></div></main>;
  if (start.isPending || questions.length === 0) return <main className="loading-screen"><Loader2 className="spin" size={34} /><p>Gerando uma nova versão da atividade...</p><small>As questões e as imagens são preparadas especialmente para esta tentativa.</small></main>;

  return <main className="page-shell"><div className="top-ribbon"><span>3º BIMESTRE</span><span>ENSINO MÉDIO</span><span>2ºDS</span></div><header className="school-header"><div><p className="school-name">E.E. PROFª WANDA MASCAGNI DE SÁ</p><div className="student-row"><label>Nome</label><Select value={studentName} onValueChange={setStudentName}><SelectTrigger className="student-select"><SelectValue placeholder="Selecione seu nome" /></SelectTrigger><SelectContent position="popper" sideOffset={8} className="student-dropdown"><div className="student-dropdown-heading">Selecione seu nome</div>{(students.data as StudentRecord[] | undefined)?.map(student => <SelectItem key={student.name} value={student.name}>{student.name}</SelectItem>)}</SelectContent></Select></div></div><div className="series-badge">Série: <strong>{selectedStudent?.series ?? "2ºDS"}</strong></div></header><section className="student-details" aria-label="Dados do aluno"><div><span>Nº</span><strong>{selectedStudent?.number ?? "—"}</strong></div><div><span>Série</span><strong>{selectedStudent?.series ?? "2ºDS"}</strong></div><div><span>RA</span><strong>{selectedStudent?.ra ?? "—"}</strong></div><div><span>E-mail institucional</span><strong>{selectedStudent?.institutionalEmail ?? "—"}</strong></div></section><section className="title-block"><div className="title-mark"><Sparkles size={19} /></div><div><p className="eyebrow">AVALIAÇÃO FORMATIVA</p><h1>ATIVIDADE DE BIOLOGIA <span>(3ºBIMESTRE)</span></h1><p className="subtitle">Células HeLa, bioética, DNA, RNA, genoma, replicação e transcrição</p></div></section><div className="notice"><ShieldCheck size={18} /><span>Esta versão é individual. As questões variam a cada acesso e o gabarito permanece protegido durante a resolução.</span></div><form onSubmit={handleSubmit}><section className="question-section"><div className="section-heading"><span>01</span><div><p className="eyebrow">QUESTÕES OBJETIVAS</p><h2>Leia, observe e escolha uma alternativa.</h2></div></div>{objective.map((question, index) => <article className="question-card" key={question.id}><div className="question-number">{String(index + 1).padStart(2, "0")}</div><div className="question-content"><div className="topic-tag">{question.topic}</div><h3>{question.prompt}</h3><img className="question-image" src={question.image} alt={`Ilustração contextual sobre ${question.topic}`} /> <div className="options">{question.options?.map((option, optionIndex) => { const letter = String.fromCharCode(65 + optionIndex); return <label className={`option ${objectiveAnswers[index] === letter ? "selected" : ""}`} key={letter}><input type="radio" name={`objective-${index}`} value={letter} checked={objectiveAnswers[index] === letter} onChange={() => answerObjective(index, letter)} /><span className="letter">{letter}</span><span>{option}</span></label>; })}</div></div></article>)}</section><section className="question-section essay-section"><div className="section-heading"><span>02</span><div><p className="eyebrow">QUESTÕES DISSERTATIVAS</p><h2>Argumente com suas próprias palavras.</h2></div></div>{subjective.map((question, index) => <article className="question-card" key={question.id}><div className="question-number">{String(index + 8).padStart(2, "0")}</div><div className="question-content"><div className="topic-tag">{question.topic}</div><h3>{question.prompt}</h3><img className="question-image" src={question.image} alt={`Ilustração contextual sobre ${question.topic}`} /><Textarea value={subjectiveAnswers[index]} onChange={event => answerSubjective(index, event.target.value)} placeholder="Digite sua resposta aqui..." maxLength={12000} /><div className="character-count">{subjectiveAnswers[index].length} caracteres</div></div></article>)}</section><footer className="submit-panel"><div><p className="eyebrow">ANTES DE ENVIAR</p><p>Confira se seu nome está selecionado e se respondeu todas as questões.</p></div><Button type="submit" disabled={submit.isPending} className="submit-button">{submit.isPending ? <Loader2 className="spin" size={18} /> : <Send size={18} />}Enviar atividade</Button></footer></form><p className="footer-credit">Biologia • 2ºDS • Atividade avaliativa online</p></main>;
}
