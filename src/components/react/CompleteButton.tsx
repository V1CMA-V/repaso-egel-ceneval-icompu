import { useEffect, useRef, useState } from 'react';
import { useStore } from '@nanostores/react';
import { progress, toggleLesson } from '@/lib/progress';
import { PRACTICE_FINISHED, type PracticeFinishedDetail } from '@/lib/practice-events';

/**
 * Manual toggle plus a suggestion to mark the lesson as completed once the reader reaches the end
 * and has submitted the lesson practice (or right away if the lesson has no practice).
 */
export default function CompleteButton({ lessonId }: { lessonId: string }) {
  const p = useStore(progress);
  const done = p.lessons.includes(lessonId);

  const ref = useRef<HTMLDivElement>(null);
  const [hasPractice, setHasPractice] = useState(false);
  const [practice, setPractice] = useState<PracticeFinishedDetail | null>(null);
  const [reachedEnd, setReachedEnd] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setHasPractice(!!document.getElementById('practica'));
    const onFinished = (e: Event) => setPractice((e as CustomEvent<PracticeFinishedDetail>).detail);
    window.addEventListener(PRACTICE_FINISHED, onFinished);
    return () => window.removeEventListener(PRACTICE_FINISHED, onFinished);
  }, []);

  // "Reached the end" = this block scrolled into view at least once.
  useEffect(() => {
    const el = ref.current;
    if (!el || reachedEnd) return;
    if (typeof IntersectionObserver === 'undefined') {
      setReachedEnd(true);
      return;
    }
    const io = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) setReachedEnd(true);
    }, { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, [reachedEnd]);

  const ready = !hasPractice || practice !== null;
  const suggest = !done && !dismissed && reachedEnd && ready;
  const pendingPractice = !done && reachedEnd && !ready;

  return (
    <div ref={ref}>
      {suggest && (
        <div role="status" className="panel mb-4 border-accent/60 p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-accent">¿Terminaste la lección?</p>
          <p className="mt-2 text-sm">
            {!practice
              ? 'Llegaste al final. Márcala como completada para llevar tu avance.'
              : practice.passed
                ? `¡Bien! Acertaste ${practice.correct}/${practice.total} en la práctica. Márcala como completada.`
                : `Acertaste ${practice.correct}/${practice.total} en la práctica. Puedes marcarla ya o repasar y reintentar antes.`}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={() => toggleLesson(lessonId)}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-bold text-white shadow-lg shadow-accent/30 hover:brightness-110"
            >
              ✓ Sí, marcar como completada
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="rounded-lg border border-[color:var(--line)] px-4 py-2 text-sm font-bold hover:border-accent"
            >
              Ahora no
            </button>
          </div>
        </div>
      )}

      {!suggest && (
        <button
          onClick={() => toggleLesson(lessonId)}
          className={`rounded-lg border px-4 py-2 text-sm font-bold ${
            done ? 'border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'border-accent bg-accent text-white'
          }`}
        >
          {done ? '✓ Lección completada (clic para desmarcar)' : 'Marcar como completada'}
        </button>
      )}

      {pendingPractice && (
        <p className="mt-2 text-xs text-[color:var(--muted)]">
          Responde las{' '}
          <a href="#practica" className="text-accent underline">
            preguntas de práctica
          </a>{' '}
          y te sugeriremos marcarla.
        </p>
      )}
    </div>
  );
}
