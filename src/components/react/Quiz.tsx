import { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { progress, recordExam } from '@/lib/progress';
import { attemptsLeft, neededToPass, score, shuffle, type Question, type ScoreResult, MAX_ATTEMPTS_PER_HOUR } from '@/lib/scoring';

interface Props {
  sectionKey: string;
  title: string;
  questions: Question[];
  /** when true, results are recorded as an exam attempt for the section */
  graded?: boolean;
  /** use only N random questions per attempt */
  limit?: number;
  /** called after each submission (used by the práctica mixta to record results) */
  onFinish?: (questions: Question[], result: ScoreResult) => void;
}

const LETTERS = ['A', 'B', 'C', 'D'];

export default function Quiz({ sectionKey, title, questions, graded = true, limit, onFinish }: Props) {
  const p = useStore(progress);
  const [run, setRun] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<ScoreResult | null>(null);
  // deterministic on first render (avoids hydration mismatch); shuffled after mount and on every retry
  const [ordered, setOrdered] = useState<Question[]>(() => (limit ? questions.slice(0, limit) : questions));

  useEffect(() => {
    const s = shuffle(questions);
    setOrdered(limit ? s.slice(0, limit) : s);
  }, [questions, limit, run]);

  const record = p.exams[sectionKey];
  const left = attemptsLeft(record?.attempts ?? []);
  const answered = Object.keys(answers).length;

  function submit() {
    const r = score(ordered, answers);
    setResult(r);
    onFinish?.(ordered, r);
    if (graded) {
      const rightIds = ordered.filter((q) => !r.wrongIds.includes(q.id)).map((q) => q.id);
      recordExam(sectionKey, r.correct, r.total, r.passed, r.wrongIds, rightIds);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function retry() {
    setAnswers({});
    setResult(null);
    setRun((n) => n + 1);
  }

  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-[color:var(--muted)]">
        {ordered.length} preguntas · Aprueba con {neededToPass(ordered.length)}/{ordered.length}
        {graded && ` · ${left}/${MAX_ATTEMPTS_PER_HOUR} intentos esta hora`}
        {graded && record?.passed && ' · ✅ ya aprobado'}
      </p>

      {result && (
        <div
          role="status"
          className={`panel mt-4 p-4 text-sm font-semibold ${
            result.passed ? 'border-emerald-500/60 text-emerald-600 dark:text-emerald-400' : 'border-red-500/60 text-red-600 dark:text-red-400'
          }`}
        >
          {result.passed ? '¡Aprobado!' : 'No superado'} ({result.correct}/{result.total}, necesitas {result.needed}).{' '}
          {graded && result.wrongIds.length > 0 && 'Las preguntas en rojo son las que fallaste; quedaron en tu Tabla de errores.'}
        </div>
      )}

      <ol className="mt-6 space-y-5">
        {ordered.map((q, i) => {
          const chosen = answers[q.id];
          const wrong = result?.wrongIds.includes(q.id);
          return (
            <li key={q.id} className={`panel p-5 ${result ? (wrong ? 'border-red-500/60' : 'border-emerald-500/50') : ''}`}>
              <div className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">
                  {i + 1}
                </span>
                <p className="font-display text-lg font-semibold leading-snug">{q.text}</p>
              </div>
              {q.passage && (
                <blockquote className="mt-3 whitespace-pre-line rounded-lg border-l-4 border-accent bg-[color:var(--line)]/30 p-3 text-sm leading-relaxed">
                  {q.passage}
                </blockquote>
              )}
              {q.code && (
                <pre className="mt-3 overflow-x-auto rounded-lg border border-[color:var(--line)] bg-black/20 p-3 text-sm">
                  <code>{q.code}</code>
                </pre>
              )}
              <div className="mt-4 space-y-2">
                {q.options.map((opt, oi) => {
                  const isRight = result && oi === q.answer;
                  const isWrongPick = result && chosen === oi && oi !== q.answer;
                  return (
                    <label
                      key={oi}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2 text-sm hover:bg-accent/10 ${
                        chosen === oi ? 'bg-accent/10' : ''
                      } ${isRight ? 'ring-1 ring-emerald-500' : ''} ${isWrongPick ? 'ring-1 ring-red-500' : ''}`}
                    >
                      <input
                        type="radio"
                        name={`${sectionKey}-${q.id}`}
                        className="mt-1 accent-[#ff6a1a]"
                        checked={chosen === oi}
                        disabled={!!result}
                        onChange={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                      />
                      <span>
                        <b className="mr-1 text-accent">{LETTERS[oi]})</b>
                        {opt}
                      </span>
                    </label>
                  );
                })}
              </div>
              {result && (
                <p className="mt-3 rounded-lg bg-[color:var(--line)]/40 p-3 text-sm">
                  <strong>{wrong ? 'Incorrecta.' : 'Correcta.'} Respuesta: {LETTERS[q.answer]}.</strong> {q.explanation}
                </p>
              )}
            </li>
          );
        })}
      </ol>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        {!result ? (
          <button
            onClick={submit}
            disabled={(graded && left === 0) || answered === 0}
            className="rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-white disabled:opacity-40"
          >
            Enviar {graded ? 'examen' : 'práctica'} ({answered}/{ordered.length})
          </button>
        ) : (
          <button onClick={retry} className="rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-white">
            Reintentar
          </button>
        )}
        {graded && left === 0 && !result && (
          <span className="text-sm text-red-500">Sin intentos esta hora. Repasa la lección y vuelve luego.</span>
        )}
        <span className="sr-only">{title}</span>
      </div>
    </div>
  );
}
