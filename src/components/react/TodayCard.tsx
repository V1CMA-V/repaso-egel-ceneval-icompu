import type { ReactNode } from 'react';
import { useStore } from '@nanostores/react';
import { progress } from '@/lib/progress';
import { lastLesson, lessonPath, RESUME_FLAG } from '@/lib/resume';
import { dueCards, nextStep, pendingErrors } from '@/lib/today';
import type { SidebarArea } from './Sidebar';

const dateFmt = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' });

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function Task({
  href,
  icon,
  label,
  value,
  sub,
  done = false,
  onClick,
  children,
}: {
  href: string;
  icon: string;
  label: string;
  value: ReactNode;
  sub: ReactNode;
  done?: boolean;
  onClick?: () => void;
  children?: ReactNode;
}) {
  return (
    <a
      href={href}
      onClick={onClick}
      className={`group flex min-w-0 flex-col rounded-xl border border-[color:var(--line)] p-4 hover:border-accent ${done ? 'opacity-70' : ''}`}
    >
      <span className="text-xs font-bold uppercase tracking-widest text-[color:var(--muted)]">
        <span aria-hidden="true">{icon}</span> {label}
      </span>
      <span className="font-display mt-2 text-2xl font-extrabold leading-tight group-hover:text-accent">{value}</span>
      <span className="mt-1 text-xs text-[color:var(--muted)]">{sub}</span>
      {children}
    </a>
  );
}

/** "Hoy toca": what to study today — due flashcards, errors to clear and the next step of the plan. */
export default function TodayCard({
  areas,
  cardIds,
  questionIds,
}: {
  areas: SidebarArea[];
  cardIds: string[];
  questionIds: string[];
}) {
  const p = useStore(progress);
  const last = useStore(lastLesson);

  const cards = dueCards(cardIds, p.cards);
  const errors = pendingErrors(questionIds, p.errors);
  const passed = Object.keys(p.exams).filter((k) => p.exams[k]?.passed);
  const next = nextStep(areas, p.lessons, passed);

  // The next lesson may be the one the user left half-read: show how far they got and resume there.
  const reading = next?.kind === 'lesson' && last?.id === next.id && last.progress < 0.95 ? last.progress : null;
  const markResume = () => {
    if (reading === null || next?.kind !== 'lesson') return;
    try {
      sessionStorage.setItem(RESUME_FLAG, next.id);
    } catch {}
  };

  const allClear = cards.review === 0 && errors.questions === 0 && next === null;

  return (
    <section aria-labelledby="today-title" className="panel mt-6 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="today-title" className="font-display text-2xl font-extrabold">
          Hoy toca
        </h2>
        <p className="text-xs uppercase tracking-widest text-[color:var(--muted)]">{dateFmt.format(new Date())}</p>
      </div>
      {allClear && (
        <p className="mt-1 text-sm text-[color:var(--muted)]">Vas al día: aprovecha para hacer un simulacro completo.</p>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {next?.kind === 'lesson' ? (
          <Task
            href={lessonPath(next.id)}
            onClick={markResume}
            icon="📖"
            label={reading !== null ? 'Lección en curso' : 'Siguiente lección'}
            value={<span className="line-clamp-2 text-lg">{next.title}</span>}
            sub={`${next.section} · ⏱ ${next.readMinutes} min`}
          >
            {reading !== null && (
              <span className="mt-2 flex items-center gap-2">
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[color:var(--line)]">
                  <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.round(reading * 100)}%` }} />
                </span>
                <span className="text-xs text-[color:var(--muted)]">{Math.round(reading * 100)}%</span>
              </span>
            )}
          </Task>
        ) : next?.kind === 'exam' ? (
          <Task
            href={`/examen/${next.key}`}
            icon="📋"
            label="Examen pendiente"
            value={<span className="line-clamp-2 text-lg">{next.section}</span>}
            sub={`${next.area} · lecciones completas`}
          />
        ) : (
          <Task href="/simulacro" icon="🏁" label="Plan completo" value="✓" sub="Haz un simulacro completo" done />
        )}

        {cards.review > 0 ? (
          <Task
            href="/flashcards"
            icon="🃏"
            label="Flashcards"
            value={cards.review}
            sub={`por repasar${cards.fresh > 0 ? ` · +${cards.fresh} nuevas` : ''}`}
          />
        ) : cards.fresh > 0 ? (
          <Task href="/flashcards" icon="🃏" label="Flashcards" value="Al día ✓" sub={`${plural(cards.fresh, 'nueva', 'nuevas')} por estudiar`} />
        ) : (
          <Task href="/flashcards" icon="🃏" label="Flashcards" value="Al día ✓" sub="Sin repasos pendientes" done />
        )}

        {errors.questions > 0 ? (
          <Task
            href="/errores"
            icon="❌"
            label="Errores"
            value={errors.questions}
            sub={`${errors.questions === 1 ? 'pregunta' : 'preguntas'} por practicar · ${plural(errors.misses, 'fallo', 'fallos')}`}
          />
        ) : (
          <Task href="/errores" icon="❌" label="Errores" value="Limpio ✓" sub="Sin errores pendientes" done />
        )}
      </div>
    </section>
  );
}
