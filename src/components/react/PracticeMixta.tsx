import { useEffect, useMemo, useState } from 'react';
import { useStore } from '@nanostores/react';
import Quiz from './Quiz';
import { loadBank, sample, type BankQuestion } from '@/lib/bank';
import { AREAS } from '@/lib/curriculum';
import { progress, recordPractice } from '@/lib/progress';
import type { Question, ScoreResult } from '@/lib/scoring';

const COUNTS = [10, 20, 30];

export default function PracticeMixta() {
  const p = useStore(progress);
  const [bank, setBank] = useState<BankQuestion[] | null>(null);
  const [error, setError] = useState('');
  const [area, setArea] = useState('todas');
  const [section, setSection] = useState('todas');
  const [count, setCount] = useState(20);
  const [onlyErrors, setOnlyErrors] = useState(false);
  const [run, setRun] = useState<{ id: number; questions: BankQuestion[] } | null>(null);

  useEffect(() => {
    loadBank().then(setBank).catch((e) => setError(String(e.message ?? e)));
  }, []);

  const byId = useMemo(() => new Map((bank ?? []).map((q) => [q.id, q])), [bank]);
  const sections = AREAS.find((a) => a.slug === area)?.sections ?? [];

  const pool = useMemo(
    () =>
      (bank ?? []).filter(
        (q) =>
          (area === 'todas' || q.area === area) &&
          (section === 'todas' || q.section === section) &&
          (!onlyErrors || p.errors[q.id]),
      ),
    [bank, area, section, onlyErrors, p.errors],
  );

  function start() {
    setRun({ id: Date.now(), questions: sample(pool, count) });
  }

  function onFinish(qs: Question[], r: ScoreResult) {
    const areas: Record<string, { correct: number; total: number }> = {};
    for (const q of qs) {
      const a = byId.get(q.id)?.area ?? 'otros';
      const s = (areas[a] ??= { correct: 0, total: 0 });
      s.total++;
      if (!r.wrongIds.includes(q.id)) s.correct++;
    }
    recordPractice(areas, r.wrongIds, qs.filter((q) => !r.wrongIds.includes(q.id)).map((q) => q.id));
  }

  if (error) return <p className="panel p-4 text-sm text-red-500">{error}</p>;
  if (!bank) return <p className="text-sm text-[color:var(--muted)]">Cargando preguntas…</p>;

  if (run) {
    return (
      <div>
        <button onClick={() => setRun(null)} className="mb-4 text-sm text-accent hover:underline">
          ← Configurar otra práctica
        </button>
        <Quiz
          key={run.id}
          sectionKey="practica-mixta"
          title="Práctica mixta"
          questions={run.questions}
          graded={false}
          onFinish={onFinish}
        />
      </div>
    );
  }

  const errorCount = Object.keys(p.errors).length;

  return (
    <div className="panel space-y-5 p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-[color:var(--muted)]">Área</span>
          <select
            value={area}
            onChange={(e) => {
              setArea(e.target.value);
              setSection('todas');
            }}
            className="panel w-full px-3 py-2"
          >
            <option value="todas">Todas (mixta)</option>
            {AREAS.map((a) => (
              <option key={a.slug} value={a.slug}>
                {a.title}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-[color:var(--muted)]">Sección</span>
          <select
            value={section}
            onChange={(e) => setSection(e.target.value)}
            disabled={area === 'todas'}
            className="panel w-full px-3 py-2 disabled:opacity-50"
          >
            <option value="todas">Todas las secciones</option>
            {sections.map((s) => (
              <option key={s.key} value={s.key}>
                {s.code} {s.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset>
        <legend className="mb-1 text-xs font-bold uppercase tracking-widest text-[color:var(--muted)]">Número de preguntas</legend>
        <div className="flex gap-2">
          {COUNTS.map((c) => (
            <button
              key={c}
              onClick={() => setCount(c)}
              className={`rounded-lg border px-4 py-2 text-sm font-bold ${
                count === c ? 'border-accent bg-accent text-white' : 'border-[color:var(--line)] hover:border-accent'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={onlyErrors} onChange={(e) => setOnlyErrors(e.target.checked)} className="accent-[#ff6a1a]" />
        Solo preguntas de mi Tabla de errores ({errorCount})
      </label>

      <div className="flex flex-wrap items-center gap-4">
        <button
          onClick={start}
          disabled={pool.length === 0}
          className="rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-white disabled:opacity-40"
        >
          Empezar ({Math.min(count, pool.length)} preguntas)
        </button>
        <span className="text-xs text-[color:var(--muted)]">{pool.length} disponibles con este filtro</span>
      </div>
      {pool.length === 0 && onlyErrors && <p className="text-sm text-[color:var(--muted)]">No hay errores registrados con este filtro. ¡Buen trabajo!</p>}
    </div>
  );
}
