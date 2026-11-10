import { useMemo, useState } from 'react';
import { useStore } from '@nanostores/react';
import { gradeCard, progress } from '@/lib/progress';
import { isDue, type Grade } from '@/lib/sm2';

interface Card {
  id: string;
  front: string;
  back: string;
  section: string;
}

const GRADES: { g: Grade; label: string; cls: string }[] = [
  { g: 0, label: 'Otra vez', cls: 'bg-red-500' },
  { g: 1, label: 'Difícil', cls: 'bg-amber-500' },
  { g: 2, label: 'Bien', cls: 'bg-emerald-600' },
  { g: 3, label: 'Fácil', cls: 'bg-sky-600' },
];

export default function Flashcards({ cards }: { cards: Card[] }) {
  const p = useStore(progress);
  const [section, setSection] = useState('todas');
  const [flipped, setFlipped] = useState(false);
  const [skipped, setSkipped] = useState<string[]>([]);

  const sections = useMemo(() => ['todas', ...new Set(cards.map((c) => c.section))], [cards]);
  const pool = cards.filter((c) => section === 'todas' || c.section === section);
  const due = pool.filter((c) => isDue(p.cards[c.id]) && !skipped.includes(c.id));
  const current = due[0];

  function grade(g: Grade) {
    if (!current) return;
    gradeCard(current.id, g);
    // "otra vez" stays due in 10 min; hide it for this session so the queue moves on
    if (g === 0) setSkipped((s) => [...s, current.id]);
    setFlipped(false);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <select
          value={section}
          onChange={(e) => {
            setSection(e.target.value);
            setFlipped(false);
          }}
          className="panel px-3 py-2"
        >
          {sections.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <span className="text-[color:var(--muted)]">
          {due.length} pendientes · {pool.length} en el mazo
        </span>
      </div>

      {!current ? (
        <div className="panel mt-6 p-8 text-center">
          <p className="font-display text-2xl font-bold">🎉 Mazo al día</p>
          <p className="mt-2 text-sm text-[color:var(--muted)]">No quedan tarjetas pendientes. Vuelve más tarde.</p>
        </div>
      ) : (
        <div className="mt-6">
          <button
            onClick={() => setFlipped((f) => !f)}
            className="panel flex min-h-56 w-full items-center justify-center p-8 text-center"
            aria-label={flipped ? 'Ocultar respuesta' : 'Mostrar respuesta'}
          >
            <span className="font-display text-xl font-semibold leading-snug">
              {flipped ? current.back : current.front}
            </span>
          </button>
          {!flipped ? (
            <p className="mt-3 text-center text-xs text-[color:var(--muted)]">Intenta responder y toca la tarjeta</p>
          ) : (
            <div className="mt-4 grid grid-cols-4 gap-2">
              {GRADES.map(({ g, label, cls }) => (
                <button key={g} onClick={() => grade(g)} className={`${cls} rounded-lg py-2 text-sm font-bold text-white`}>
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
