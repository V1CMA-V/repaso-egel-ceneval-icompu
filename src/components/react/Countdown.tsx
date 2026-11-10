import { useEffect, useState } from 'react';
import { EXAM_END, EXAM_START } from '@/lib/curriculum';
import { daysUntil } from '@/lib/plan';

const fmt = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' });
const label = (d: string) => {
  const [y, m, day] = d.split('-').map(Number);
  return fmt.format(new Date(y!, m! - 1, day!)).replace('.', '');
};

/** Cuenta regresiva al examen. Se calcula en el cliente (evita desajustes con la fecha del build). */
export default function Countdown({ compact = false }: { compact?: boolean }) {
  const [days, setDays] = useState<number | null>(null);
  const [left, setLeft] = useState<number | null>(null); // días hasta el último día de la ventana

  useEffect(() => {
    const tick = () => {
      setDays(daysUntil(EXAM_START));
      setLeft(daysUntil(EXAM_END));
    };
    tick();
    const t = setInterval(tick, 30 * 60_000);
    return () => clearInterval(t);
  }, []);

  if (days === null || left === null) {
    return <div className={compact ? 'panel h-12' : 'panel h-24'} aria-hidden="true" />;
  }

  const inWindow = days <= 0 && left >= 0;
  const passed = left < 0;
  const single = EXAM_START === EXAM_END;
  const big = passed ? '—' : inWindow ? '¡HOY!' : String(days);
  const text = passed
    ? 'El examen ya pasó'
    : inWindow
      ? single
        ? 'Hoy es el examen'
        : 'Es la semana del examen'
      : days === 1
        ? 'día para el examen'
        : 'días para el examen';
  const weeks = days > 7 ? ` · ${Math.floor(days / 7)} sem ${days % 7} d` : '';
  const range = single ? label(EXAM_START) : `${label(EXAM_START)}–${label(EXAM_END)}`;

  if (compact) {
    return (
      <a href="/#plan" className="panel flex items-center gap-3 px-3 py-2 hover:border-accent" aria-label={`${text}: ${big}`}>
        <span className="font-display text-3xl font-extrabold leading-none text-accent tabular-nums">{big}</span>
        <span className="text-xs leading-tight">
          <span className="block font-bold">{text}</span>
          <span className="text-[color:var(--muted)]">EGEL {range}</span>
        </span>
      </a>
    );
  }

  return (
    <div className="panel flex items-center gap-4 px-5 py-4">
      <span className="font-display text-6xl font-extrabold leading-none text-accent tabular-nums">{big}</span>
      <div>
        <p className="font-display text-lg font-bold leading-tight">{text}</p>
        <p className="text-xs text-[color:var(--muted)]">
          Examen: {range} de 2026{weeks}
        </p>
      </div>
    </div>
  );
}
