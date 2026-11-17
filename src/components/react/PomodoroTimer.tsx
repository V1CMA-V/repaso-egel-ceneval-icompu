import { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { Brain, ChevronRight, Coffee, Pause, Play, RotateCcw, SkipForward, Square, Timer, type LucideIcon } from 'lucide-react';
import { formatClock, isActive, PHASE_LABEL, remaining, total, type TimerState } from '@/lib/pomodoro';
import { pomoSettings, pomoTimer, restartBlock, skipBlock, stopSession, toggleTimer } from '@/lib/pomodoro-store';

type Variant = 'compact' | 'pill' | 'full';

const BREAK_TIPS: { text: string; href?: string }[] = [
  { text: 'Repasa 5 flashcards', href: '/flashcards' },
  { text: 'Levántate, estírate y toma agua' },
  { text: 'Mira algo lejano 20 segundos para descansar la vista' },
  { text: 'Repasa una pregunta de tu tabla de errores', href: '/errores' },
  { text: 'Respira hondo 5 veces, lejos de la pantalla' },
  { text: 'Explica en voz alta lo último que estudiaste' },
];

function usePomodoro() {
  const t = useStore(pomoTimer);
  const s = useStore(pomoSettings);
  const [now, setNow] = useState(() => Date.now());
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    setNow(Date.now());
    if (t.status !== 'running') return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [t.status, t.endsAt]);

  const left = remaining(t, now, s);
  const tot = total(t, s);
  const pct = tot > 0 ? Math.min(1, Math.max(0, 1 - left / tot)) : 0;
  return { t, s, left, pct, mounted };
}

const PhaseIcon = ({ t, size = 14 }: { t: TimerState; size?: number }) => {
  const I: LucideIcon = t.phase === 'focus' ? Brain : Coffee;
  return <I size={size} className="inline-block shrink-0 align-[-0.125em]" />;
};

function statusText(t: TimerState) {
  if (t.status === 'idle') return t.finished ? `Listo: ${PHASE_LABEL[t.phase]}` : PHASE_LABEL[t.phase];
  return t.status === 'paused' ? `${PHASE_LABEL[t.phase]} · en pausa` : PHASE_LABEL[t.phase];
}

function primaryLabel(t: TimerState) {
  if (t.status === 'running') return 'Pausar';
  if (t.status === 'paused') return 'Reanudar';
  if (t.finished) return t.phase === 'focus' ? 'Iniciar estudio' : 'Iniciar descanso';
  return 'Iniciar';
}

const PlayPause = ({ t, size }: { t: TimerState; size: number }) =>
  t.status === 'running' ? <Pause size={size} /> : <Play size={size} />;

function Controls({ t, size = 'sm' }: { t: TimerState; size?: 'sm' | 'lg' }) {
  const big = size === 'lg';
  const btn = `inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--line)] font-bold hover:border-accent hover:text-accent ${big ? 'px-4 py-2.5 text-sm' : 'px-2 py-1 text-xs'}`;
  const is = big ? 16 : 12;
  return (
    <div className={`flex flex-wrap items-center ${big ? 'justify-center gap-3' : 'gap-2'}`}>
      <button
        type="button"
        onClick={toggleTimer}
        className={`inline-flex items-center gap-1.5 rounded-lg bg-accent font-bold text-white shadow-lg shadow-accent/30 hover:brightness-110 ${big ? 'px-6 py-2.5 text-sm' : 'px-3 py-1 text-xs'}`}
      >
        <PlayPause t={t} size={is} />
        {primaryLabel(t)}
      </button>
      <button type="button" onClick={skipBlock} className={btn} title={t.phase === 'focus' ? 'Saltar al descanso' : 'Saltar al estudio'}>
        <SkipForward size={is} />
        {big && 'Saltar'}
      </button>
      {t.status !== 'idle' && (
        <button type="button" onClick={restartBlock} className={btn} title="Reiniciar este bloque">
          <RotateCcw size={is} />
          {big && 'Reiniciar'}
        </button>
      )}
      {big && isActive(t) && (
        <button type="button" onClick={stopSession} className={btn} title="Terminar la sesión y volver al primer bloque">
          <Square size={is} />
          Terminar
        </button>
      )}
    </div>
  );
}

function Bar({ pct, flush = false }: { pct: number; flush?: boolean }) {
  return (
    <span className={`${flush ? '' : 'mt-2 '}block h-0.5 overflow-hidden rounded-full bg-[color:var(--line)]`}>
      <span className="block h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${pct * 100}%` }} />
    </span>
  );
}

/** Sidebar row (no border): one line with clock + expandable controls. The sidebar wraps it in a card. */
function Compact() {
  const { t, s, left, pct, mounted } = usePomodoro();
  const [open, setOpen] = useState(false);
  if (!mounted) return <div className="h-11" aria-hidden="true" />;

  if (!isActive(t)) {
    return (
      <div className="flex h-11 items-center">
        <button type="button" onClick={toggleTimer} className="focus-inset flex h-full min-w-0 flex-1 items-center gap-2 px-3 text-left hover:bg-accent/10">
          <span className="grid w-9 shrink-0 place-items-center text-accent">
            <Play size={16} />
          </span>
          <span className="min-w-0 flex-1 truncate text-xs font-bold">Iniciar pomodoro</span>
          <span className="shrink-0 text-xs text-[color:var(--muted)]">
            {s.focus}/{s.short} min
          </span>
        </button>
        <a href="/enfoque" className="focus-inset grid h-full w-9 shrink-0 place-items-center text-xs text-[color:var(--muted)] hover:bg-accent/10 hover:text-accent" title="Abrir enfoque" aria-label="Abrir enfoque">
          <Timer size={16} />
        </a>
      </div>
    );
  }

  const cycle = Math.min(t.cycle + (t.phase === 'focus' ? 1 : 0), s.every);
  return (
    <div className={t.status === 'running' ? 'bg-accent/5' : ''}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="focus-inset relative flex h-11 w-full items-center gap-2 px-3 text-left hover:bg-accent/10"
      >
        <span className="w-9 shrink-0 text-center font-display text-sm font-extrabold tabular-nums leading-none text-accent">
          {formatClock(left)}
        </span>
        <span className="min-w-0 flex-1 truncate text-xs font-bold">
          <PhaseIcon t={t} /> {statusText(t)}
        </span>
        <span className="shrink-0 text-xs text-[color:var(--muted)]">
          {cycle}/{s.every}
        </span>
        <ChevronRight
          size={12}
          strokeWidth={3}
          className={`shrink-0 text-[color:var(--muted)] transition-transform ${open ? 'rotate-90' : ''}`}
        />
        <span className="absolute inset-x-3 bottom-0">
          <Bar pct={pct} flush />
        </span>
      </button>
      {open && (
        <div className="space-y-2 px-3 pb-3 pt-2">
          <Controls t={t} />
          <a href="/enfoque" className="block text-xs text-accent hover:underline">
            Abrir enfoque →
          </a>
        </div>
      )}
    </div>
  );
}

/** Floating pill, shown (via CSS) only when the sidebar is hidden and a session is active. */
function Pill() {
  const { t, left, pct, mounted } = usePomodoro();
  if (!mounted || !isActive(t)) return null;
  return (
    <div className="pomo-pill panel fixed bottom-6 left-6 z-30 flex items-center gap-2 !rounded-full py-1.5 pl-3 pr-1.5 shadow-lg">
      <a href="/enfoque" className="flex items-center gap-2 hover:text-accent" title={statusText(t)}>
        <PhaseIcon t={t} size={16} />
        <span className="font-display text-lg font-extrabold tabular-nums text-accent">{formatClock(left)}</span>
        <span className="sr-only">{statusText(t)}</span>
      </a>
      <span className="h-6 w-px bg-[color:var(--line)]" aria-hidden="true" />
      <button
        type="button"
        onClick={toggleTimer}
        aria-label={primaryLabel(t)}
        className="grid h-8 w-8 place-items-center rounded-full hover:bg-accent/15 hover:text-accent"
      >
        <PlayPause t={t} size={16} />
      </button>
      <span className="sr-only" aria-live="polite">{Math.round(pct * 100)}%</span>
    </div>
  );
}

/** Big clock for the /enfoque page. */
function Full() {
  const { t, s, left, pct, mounted } = usePomodoro();
  if (!mounted) return <div className="panel h-96" aria-hidden="true" />;

  const onBreak = t.phase !== 'focus';
  const tip = BREAK_TIPS[t.cycle % BREAK_TIPS.length]!;
  const R = 46;

  return (
    <section className="panel flex flex-col items-center gap-6 px-6 py-10" aria-label="Temporizador pomodoro">
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-accent">
        <PhaseIcon t={t} /> {statusText(t)}
      </p>

      <div className="relative grid h-64 w-64 place-items-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r={R} fill="none" stroke="var(--line)" strokeWidth="3" />
          <circle
            cx="50"
            cy="50"
            r={R}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="3"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={100}
            strokeDashoffset={100 - pct * 100}
            strokeOpacity={pct > 0 ? 1 : 0}
            className="transition-[stroke-dashoffset] duration-500"
          />
        </svg>
        <div className="text-center">
          <p className="font-display text-6xl font-extrabold tabular-nums" role="timer" aria-live="off">
            {formatClock(left)}
          </p>
          <p className="mt-1 text-xs text-[color:var(--muted)]">
            {Math.round(total(t, s) / 60_000)} min · {PHASE_LABEL[t.phase].toLowerCase()}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2" aria-label={`Ciclo: ${t.cycle} de ${s.every} pomodoros antes del descanso largo`}>
        {Array.from({ length: s.every }, (_, i) => (
          <span key={i} className={`h-2.5 w-2.5 rounded-full ${i < t.cycle ? 'bg-accent' : 'bg-[color:var(--line)]'}`} />
        ))}
      </div>

      {t.status === 'idle' && t.finished && (
        <p role="status" className="text-center font-display text-lg font-bold">
          {t.finished === 'focus' ? '¡Bloque de estudio terminado! Toca descansar.' : 'Descanso terminado. ¿Otro bloque?'}
        </p>
      )}
      {t.pausedBy === 'simulacro' && (
        <p role="status" className="text-center text-sm text-[color:var(--muted)]">
          <Pause size={14} className="mr-1 inline-block align-[-0.125em]" />
          Pausado durante el simulacro (tiene su propio tiempo). Reanúdalo cuando termines.
        </p>
      )}

      <Controls t={t} size="lg" />

      {onBreak && (
        <p className="rounded-xl border border-[color:var(--line)] px-4 py-3 text-center text-sm">
          <span className="mr-1 text-xs font-bold uppercase tracking-widest text-accent">En el descanso:</span>
          {tip.href ? (
            <a href={tip.href} className="underline hover:text-accent">
              {tip.text}
            </a>
          ) : (
            tip.text
          )}
        </p>
      )}
    </section>
  );
}

export default function PomodoroTimer({ variant }: { variant: Variant }) {
  if (variant === 'pill') return <Pill />;
  if (variant === 'full') return <Full />;
  return <Compact />;
}
