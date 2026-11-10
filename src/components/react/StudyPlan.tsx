import { useEffect, useMemo, useState } from 'react';
import { useStore } from '@nanostores/react';
import { EXAM_START, STUDY_DEADLINE } from '@/lib/curriculum';
import {
  EXAM_MIN_PER_SECTION,
  PRACTICE_MIN_PER_LESSON,
  daysUntil,
  formatDuration,
  pace,
  studyLoad,
  type LessonInfo,
} from '@/lib/plan';
import { progress } from '@/lib/progress';
import type { SidebarArea } from './Sidebar';

const one = (n: number) => (Math.round(n * 10) / 10).toString().replace('.', ',');

export default function StudyPlan({ areas }: { areas: SidebarArea[] }) {
  const p = useStore(progress);
  const [toExam, setToExam] = useState<number | null>(null);
  const [toDeadline, setToDeadline] = useState<number | null>(null);

  useEffect(() => {
    setToExam(daysUntil(EXAM_START));
    setToDeadline(daysUntil(STUDY_DEADLINE));
  }, []);

  const lessons: LessonInfo[] = useMemo(
    () => areas.flatMap((a) => a.sections.flatMap((s) => s.lessons.map((l) => ({ id: l.id, readMinutes: l.readMinutes, section: s.key })))),
    [areas],
  );
  const sectionKeys = useMemo(() => areas.flatMap((a) => a.sections.filter((s) => s.lessons.length > 0).map((s) => s.key)), [areas]);
  const passed = Object.keys(p.exams).filter((k) => p.exams[k]?.passed);
  const load = studyLoad(lessons, p.lessons, sectionKeys, passed);

  if (toExam === null || toDeadline === null) return <div className="panel h-48" aria-hidden="true" />;

  const useDeadline = toDeadline > 0;
  const days = useDeadline ? toDeadline : Math.max(0, toExam);
  const target = useDeadline ? 'el simulacro completo (28 nov)' : 'el examen';
  const need = pace(load, days);
  const done = load.total - load.pending;
  const pctDone = load.total ? Math.round((done / load.total) * 100) : 0;
  const examOver = toExam < 0;

  const perArea = areas.map((a) => {
    const ls = lessons.filter((l) => a.sections.some((s) => s.key === l.section));
    const keys = a.sections.filter((s) => s.lessons.length > 0).map((s) => s.key);
    return { title: a.title, ...studyLoad(ls, p.lessons, keys, passed) };
  });

  const hoursPerDay = need.minutesPerDay / 60;
  const verdict =
    load.pending === 0
      ? '¡Terminaste todas las lecciones! Dedica el tiempo a simulacros, práctica mixta y tu Tabla de errores.'
      : examOver
        ? 'La fecha del examen ya pasó.'
        : hoursPerDay <= 2
          ? 'Ritmo llevadero: mantenlo constante y no acumules lecciones para el final.'
          : hoursPerDay <= 3.5
            ? 'Ritmo exigente: conviene estudiar todos los días, incluidos fines de semana.'
            : 'Ritmo muy alto: prioriza Seguridad, Datos y algoritmos, y las áreas de mayor peso.';

  return (
    <section aria-labelledby="plan-title">
      <h2 id="plan-title" className="font-display text-3xl font-extrabold">
        Tu ritmo para llegar al examen
      </h2>
      <p className="mt-1 text-sm text-[color:var(--muted)]">
        Se actualiza con tus lecciones completadas y exámenes de sección aprobados.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Lecciones pendientes" value={`${load.pending}`} sub={`de ${load.total} · ${done} completadas`} />
        <Tile label="Tiempo estimado" value={formatDuration(load.minutes)} sub={`${formatDuration(load.readMinutes)} de lectura + práctica + ${load.pendingExams} exámenes`} />
        <Tile
          label={`Ritmo hasta ${useDeadline ? '28 nov' : 'el examen'}`}
          value={load.pending === 0 ? '—' : `${one(need.lessonsPerDay)} lecc./día`}
          sub={load.pending === 0 ? 'sin pendientes' : `≈ ${formatDuration(need.minutesPerDay)} al día`}
        />
        <Tile label="Días restantes" value={`${Math.max(0, days)}`} sub={`para ${target}${useDeadline ? ` · examen en ${Math.max(0, toExam)} d` : ''}`} />
      </div>

      <div className="mt-4" role="progressbar" aria-valuenow={pctDone} aria-valuemin={0} aria-valuemax={100} aria-label="Lecciones completadas">
        <div className="h-2 overflow-hidden rounded bg-[color:var(--line)]">
          <div className="h-full bg-accent" style={{ width: `${pctDone}%` }} />
        </div>
        <p className="mt-1 text-xs text-[color:var(--muted)]">{pctDone} % de las lecciones completadas</p>
      </div>

      <p className="mt-3 text-sm font-semibold">{verdict}</p>

      <div className="panel mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-widest text-[color:var(--muted)]">
            <tr>
              <th className="p-3">Área</th>
              <th className="p-3">Lecciones pendientes</th>
              <th className="p-3">Tiempo estimado</th>
            </tr>
          </thead>
          <tbody>
            {perArea.map((a) => (
              <tr key={a.title} className="border-t border-[color:var(--line)]">
                <td className="p-3 font-semibold">{a.title}</td>
                <td className="p-3">
                  {a.pending} de {a.total}
                </td>
                <td className="p-3">{formatDuration(a.minutes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-[color:var(--muted)]">
        Cálculo: tiempo de lectura de cada lección + {PRACTICE_MIN_PER_LESSON} min de práctica por lección + {EXAM_MIN_PER_SECTION} min por examen de
        sección pendiente. No incluye flashcards (≈ 15 min al día) ni los simulacros: el completo dura 9 h y conviene hacer también los
        mini por área. La fecha límite sugerida (28 nov) es la del simulacro completo de tu plan; la semana siguiente queda para corregir errores y repasar.
      </p>
    </section>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="panel p-4">
      <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--muted)]">{label}</p>
      <p className="mt-1 font-display text-3xl font-extrabold text-accent">{value}</p>
      <p className="mt-1 text-xs text-[color:var(--muted)]">{sub}</p>
    </div>
  );
}
