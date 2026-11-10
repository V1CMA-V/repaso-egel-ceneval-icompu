import { useMemo, useState } from 'react';
import { useStore } from '@nanostores/react';
import { gradeCard, progress } from '@/lib/progress';
import { isDue, type Grade } from '@/lib/sm2';
import RichText from './RichText';
import { useShortcuts } from './useShortcuts';

function Kbd({ children }: { children: string }) {
  return <kbd className="rounded border border-[color:var(--line)] bg-[color:var(--panel)] px-1.5 py-0.5 font-mono text-[0.7rem]">{children}</kbd>;
}

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

  // Espacio = voltear la tarjeta · 1–4 = calificar (solo con la respuesta visible)
  useShortcuts(
    (e) => {
      if (!current || e.repeat) return;
      if (e.key === ' ') {
        setFlipped((f) => !f);
        return true;
      }
      const n = Number(e.key);
      if (flipped && Number.isInteger(n) && n >= 1 && n <= GRADES.length) {
        grade(GRADES[n - 1]!.g);
        return true;
      }
    },
    !!current,
    [' '],
  );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <select
          value={section}
          onChange={(e) => {
            setSection(e.target.value);
            setFlipped(false);
            e.target.blur(); // para que los atajos vuelvan a funcionar sin hacer clic fuera
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
              <RichText>{flipped ? current.back : current.front}</RichText>
            </span>
          </button>
          {!flipped ? (
            <p className="mt-3 text-center text-xs text-[color:var(--muted)]">
              Intenta responder y toca la tarjeta o pulsa <Kbd>Espacio</Kbd>
            </p>
          ) : (
            <>
              <div className="mt-4 grid grid-cols-4 gap-2">
                {GRADES.map(({ g, label, cls }, i) => (
                  <button key={g} onClick={() => grade(g)} className={`${cls} rounded-lg py-2 text-sm font-bold text-white`}>
                    <span className="mr-1 opacity-70">{i + 1}</span>
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-center text-xs text-[color:var(--muted)]">
                <Kbd>1</Kbd>–<Kbd>4</Kbd> califican · <Kbd>Espacio</Kbd> vuelve a ocultar
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
