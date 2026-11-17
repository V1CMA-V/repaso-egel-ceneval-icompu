import { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { AREAS } from '@/lib/curriculum';
import { dayKey, dayMs, formatDuration, streak, totalsByArea } from '@/lib/pomodoro';
import { pomoSettings } from '@/lib/pomodoro-store';
import { progress } from '@/lib/progress';

const TOTAL_REACTIVOS = AREAS.reduce((n, a) => n + a.reactivos, 0);
/** Below this share of its exam weight (with enough data) an area is flagged as behind. */
const BEHIND = 0.5;
const ENOUGH_DATA_MS = 60 * 60_000;

/** Study time: today, streak and minutes per area compared with each area's weight in the exam. */
export default function StudyStats({ compact = false }: { compact?: boolean }) {
  const p = useStore(progress);
  const s = useStore(pomoSettings);
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => setToday(dayKey(Date.now())), []);
  if (!today) return <div className="panel h-40" aria-hidden="true" />;

  const day = p.study[today];
  const pomos = day?.pomodoros ?? 0;
  const days = streak(p.study, s.goal, today);
  const byArea = totalsByArea(p.study);
  const areaTotal = AREAS.reduce((n, a) => n + (byArea[a.slug] ?? 0), 0);
  const allTotal = Object.values(byArea).reduce((a, b) => a + b, 0);

  const rows = AREAS.map((a) => {
    const ms = byArea[a.slug] ?? 0;
    const share = areaTotal > 0 ? ms / areaTotal : 0;
    const weight = a.reactivos / TOTAL_REACTIVOS;
    return { ...a, ms, share, weight, behind: areaTotal >= ENOUGH_DATA_MS && share < weight * BEHIND };
  });
  const behind = rows.filter((r) => r.behind);

  return (
    <section className="space-y-4" aria-labelledby="study-stats">
      <h2 id="study-stats" className={compact ? 'sr-only' : 'font-display text-2xl font-extrabold'}>
        Tiempo de estudio
      </h2>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="panel p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--muted)]">Hoy</p>
          <p className="font-display mt-1 text-3xl font-extrabold text-accent">{formatDuration(dayMs(day))}</p>
          <p className="text-xs text-[color:var(--muted)]">de estudio enfocado</p>
        </div>
        <div className="panel p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--muted)]">Meta diaria</p>
          <p className="font-display mt-1 text-3xl font-extrabold">
            <span className="text-accent">{pomos}</span>/{s.goal} 🍅
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[color:var(--line)]">
            <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, (pomos / s.goal) * 100)}%` }} />
          </div>
        </div>
        <div className="panel p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--muted)]">Racha</p>
          <p className="font-display mt-1 text-3xl font-extrabold">
            🔥 <span className="text-accent">{days}</span> {days === 1 ? 'día' : 'días'}
          </p>
          <p className="text-xs text-[color:var(--muted)]">cumpliendo la meta</p>
        </div>
      </div>

      <div className="panel p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-display text-lg font-bold">Por área</p>
          <p className="text-xs text-[color:var(--muted)]">Total: {formatDuration(allTotal)}</p>
        </div>
        {allTotal === 0 ? (
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            Aún no hay bloques registrados. Inicia un pomodoro mientras estudias una lección y aquí verás a qué área le dedicas tiempo.
          </p>
        ) : (
          <>
            <ul className="mt-4 space-y-3">
              {rows.map((r) => (
                <li key={r.slug}>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className={r.behind ? 'font-bold text-red-600 dark:text-red-400' : 'font-bold'}>{r.title}</span>
                    <span className="text-xs text-[color:var(--muted)]">
                      {formatDuration(r.ms)} · {Math.round(r.share * 100)}% del tiempo · {Math.round(r.weight * 100)}% del examen
                    </span>
                  </div>
                  <div className="relative mt-1 h-2 overflow-hidden rounded-full bg-[color:var(--line)]">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${r.share * 100}%` }} />
                    <span
                      className="absolute inset-y-0 w-0.5 bg-[color:var(--ink)]"
                      style={{ left: `${r.weight * 100}%` }}
                      title={`Peso en el examen: ${Math.round(r.weight * 100)}%`}
                    />
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-[color:var(--muted)]">
              La marca vertical es el peso del área en el examen.
              {(byArea.general ?? 0) > 0 && ` Repaso general (flashcards, práctica, simulacros): ${formatDuration(byArea.general!)}.`}
            </p>
            {behind.length > 0 && (
              <p role="status" className="mt-3 rounded-lg border border-red-500/40 p-3 text-sm">
                ⚠ Vas por debajo en <b>{behind.map((r) => r.title).join(', ')}</b> respecto a su peso en el examen.
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
