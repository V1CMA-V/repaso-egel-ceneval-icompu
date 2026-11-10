import { useStore } from '@nanostores/react';
import { progress, toggleLesson } from '@/lib/progress';

export default function CompleteButton({ lessonId }: { lessonId: string }) {
  const p = useStore(progress);
  const done = p.lessons.includes(lessonId);
  return (
    <button
      onClick={() => toggleLesson(lessonId)}
      className={`rounded-lg border px-4 py-2 text-sm font-bold ${
        done ? 'border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'border-accent bg-accent text-white'
      }`}
    >
      {done ? '✓ Lección completada (clic para desmarcar)' : 'Marcar como completada'}
    </button>
  );
}
