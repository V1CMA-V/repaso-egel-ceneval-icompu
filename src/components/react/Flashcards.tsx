import { useMemo, useState } from 'react';
import { useStore } from '@nanostores/react';
import { ArrowRight, CalendarClock, CircleCheckBig } from 'lucide-react';
import { gradeCard, progress } from '@/lib/progress';
import { AREAS, sectionFileId } from '@/lib/curriculum';
import { formatInterval, isDue, previewIntervals, type Grade } from '@/lib/sm2';
import RichText from './RichText';
import { useShortcuts } from './useShortcuts';

function Kbd({ children }: { children: string }) {
  return <kbd className="rounded border border-[color:var(--line)] bg-[color:var(--panel)] px-1.5 py-0.5 font-mono text-[0.7rem]">{children}</kbd>;
}

interface Card {
  id: string;
  front: string;
  back: string;
  /** Content file id, e.g. "hardware-arquitectura". */
  section: string;
}

// Muted tints that sit on the cream/dark panels instead of saturated blocks.
const GRADES: { g: Grade; label: string; cls: string }[] = [
  { g: 0, label: 'Otra vez', cls: 'border-red-500/30 bg-red-500/10 text-red-700 hover:border-red-500 dark:text-red-400' },
  { g: 1, label: 'Difícil', cls: 'border-amber-500/30 bg-amber-500/10 text-amber-800 hover:border-amber-500 dark:text-amber-400' },
  { g: 2, label: 'Bien', cls: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 hover:border-emerald-500 dark:text-emerald-400' },
  { g: 3, label: 'Fácil', cls: 'border-sky-500/30 bg-sky-500/10 text-sky-700 hover:border-sky-500 dark:text-sky-400' },
];

/** "hardware-arquitectura" → area + section titles. */
const SECTION_INFO = new Map(
  AREAS.flatMap((a) => a.sections.map((s) => [sectionFileId(s.key), { area: a.slug, areaTitle: a.title, title: s.title }] as const)),
);

const chip = (active: boolean) =>
  `rounded-full border px-3 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
    active ? 'border-accent bg-accent/15 font-semibold text-accent' : 'border-[color:var(--line)] hover:border-accent'
  }`;

export default function Flashcards({ cards }: { cards: Card[] }) {
  const p = useStore(progress);
  const [area, setArea] = useState<string | null>(null);
  const [section, setSection] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [session, setSession] = useState({ done: 0, good: 0 });

  const now = Date.now();
  const dueCount = (list: Card[]) => list.filter((c) => isDue(p.cards[c.id], now) && !skipped.includes(c.id)).length;

  const areas = useMemo(
    () => AREAS.filter((a) => cards.some((c) => SECTION_INFO.get(c.section)?.area === a.slug)),
    [cards],
  );
  const areaCards = area ? cards.filter((c) => SECTION_INFO.get(c.section)?.area === area) : cards;
  const sections = area ? [...new Set(areaCards.map((c) => c.section))] : [];
  const pool = section ? areaCards.filter((c) => c.section === section) : areaCards;
  const due = pool.filter((c) => isDue(p.cards[c.id], now) && !skipped.includes(c.id));
  const current = due[0];
  const info = current ? SECTION_INFO.get(current.section) : undefined;
  const total = session.done + due.length;
  const intervals = current ? previewIntervals(p.cards[current.id], now) : null;

  function pick(nextArea: string | null, nextSection: string | null) {
    setArea(nextArea);
    setSection(nextSection);
    setRevealed(false);
    setSession({ done: 0, good: 0 });
  }

  function grade(g: Grade) {
    if (!current) return;
    gradeCard(current.id, g);
    // "otra vez" stays due in 10 min; hide it for this session so the queue moves on
    if (g === 0) setSkipped((s) => [...s, current.id]);
    setSession((s) => ({ done: s.done + 1, good: s.good + (g >= 2 ? 1 : 0) }));
    setRevealed(false);
  }

  // Espacio = mostrar/ocultar respuesta · 1–4 = calificar (solo con la respuesta visible)
  useShortcuts(
    (e) => {
      if (!current || e.repeat) return;
      if (e.key === ' ') {
        setRevealed((r) => !r);
        return true;
      }
      const n = Number(e.key);
      if (revealed && Number.isInteger(n) && n >= 1 && n <= GRADES.length) {
        grade(GRADES[n - 1]!.g);
        return true;
      }
    },
    !!current,
    [' '],
  );

  const nextDue = Math.min(...pool.map((c) => p.cards[c.id]?.due ?? Infinity).filter((d) => d > now));

  return (
    <div className="max-w-3xl">
      {/* Filters: area chips, then section chips for the chosen area. */}
      <div className="space-y-2 text-xs" role="group" aria-label="Filtrar tarjetas">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => pick(null, null)} aria-pressed={!area} className={chip(!area)}>
            Todas <span className="opacity-60">{dueCount(cards)}</span>
          </button>
          {areas.map((a) => (
            <button
              key={a.slug}
              type="button"
              onClick={() => pick(a.slug, null)}
              aria-pressed={area === a.slug}
              className={chip(area === a.slug)}
            >
              {a.title} <span className="opacity-60">{dueCount(cards.filter((c) => SECTION_INFO.get(c.section)?.area === a.slug))}</span>
            </button>
          ))}
        </div>
        {sections.length > 1 && (
          <div className="flex flex-wrap gap-2 border-l-2 border-[color:var(--line)] pl-3">
            <button type="button" onClick={() => pick(area, null)} aria-pressed={!section} className={chip(!section)}>
              Todas las secciones
            </button>
            {sections.map((s) => (
              <button key={s} type="button" onClick={() => pick(area, s)} aria-pressed={section === s} className={chip(section === s)}>
                {SECTION_INFO.get(s)?.title ?? s}{' '}
                <span className="opacity-60">{dueCount(areaCards.filter((c) => c.section === s))}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {!current ? (
        <div className="panel mt-6 flex flex-col items-center gap-3 px-6 py-10 text-center">
          <CircleCheckBig size={40} strokeWidth={1.75} className="text-accent" />
          <p className="font-display text-2xl font-bold">Mazo al día</p>
          {session.done > 0 && (
            <p className="text-sm">
              Repasaste <b className="text-accent">{session.done}</b> {session.done === 1 ? 'tarjeta' : 'tarjetas'} ·{' '}
              <b className="text-accent">{session.good}</b> bien o fácil
            </p>
          )}
          <p className="flex items-center gap-1.5 text-sm text-[color:var(--muted)]">
            <CalendarClock size={14} />
            {Number.isFinite(nextDue) ? `La próxima tarjeta vuelve en ${formatInterval(nextDue - now)}.` : 'No hay tarjetas programadas.'}
          </p>
          <a
            href="/practica"
            className="mt-2 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-bold text-white hover:brightness-110"
          >
            Ir a práctica <ArrowRight size={16} />
          </a>
        </div>
      ) : (
        <div className="mt-6">
          {/* Context + session progress */}
          <div className="flex items-baseline justify-between gap-3 text-xs">
            <p className="truncate uppercase tracking-wider text-[color:var(--muted)]">
              {info ? (
                <>
                  <span className="font-bold text-accent">{info.areaTitle}</span> · {info.title}
                </>
              ) : (
                current.section
              )}
            </p>
            <p className="shrink-0 tabular-nums text-[color:var(--muted)]">
              <b className="text-[color:var(--ink)]">{session.done + 1}</b> / {total}
            </p>
          </div>
          <div
            className="mt-2 h-1 overflow-hidden rounded-full bg-[color:var(--line)]"
            role="progressbar"
            aria-label="Avance de la sesión"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={session.done}
          >
            <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${(session.done / total) * 100}%` }} />
          </div>

          <article className="panel mt-4 overflow-hidden">
            <div className="px-6 pb-6 pt-5 sm:px-8">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[color:var(--muted)]">Pregunta</p>
              <div className="mt-2 font-display text-xl font-semibold leading-snug">
                <RichText>{current.front}</RichText>
              </div>
            </div>

            {revealed ? (
              <div key={current.id} className="border-t border-dashed border-[color:var(--line)] bg-accent/5 px-6 pb-6 pt-5 motion-safe:animate-reveal sm:px-8">
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-accent">Respuesta</p>
                <div className="mt-2 text-lg leading-relaxed">
                  <RichText>{current.back}</RichText>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setRevealed(true)}
                className="flex w-full items-center justify-center gap-3 border-t border-dashed border-[color:var(--line)] px-6 py-4 text-sm font-bold text-accent hover:bg-accent/10 focus-visible:bg-accent/10 focus-visible:outline-none"
              >
                Mostrar respuesta <Kbd>Espacio</Kbd>
              </button>
            )}
          </article>

          {revealed && intervals && (
            <>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {GRADES.map(({ g, label, cls }, i) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => grade(g)}
                    className={`rounded-xl border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${cls}`}
                  >
                    <span className="flex items-center justify-between text-sm font-bold">
                      {label}
                      <span className="font-mono text-[0.7rem] opacity-60">{i + 1}</span>
                    </span>
                    <span className="block text-xs opacity-80">{formatInterval(intervals[g])}</span>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-center text-xs text-[color:var(--muted)]">
                ¿Qué tan bien la recordaste? <Kbd>1</Kbd>–<Kbd>4</Kbd> califican · <Kbd>Espacio</Kbd> oculta
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
