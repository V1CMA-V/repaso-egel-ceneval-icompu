import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { progress } from '@/lib/progress';
import type { Question } from '@/lib/scoring';

export default function Errors({ questions }: { questions: Question[] }) {
  const p = useStore(progress);
  const [open, setOpen] = useState<string | null>(null);
  const items = questions
    .filter((q) => p.errors[q.id])
    .sort((a, b) => p.errors[b.id]!.count - p.errors[a.id]!.count);

  if (items.length === 0) {
    return <p className="panel p-6 text-sm">Sin errores registrados. Los que falles en los exámenes aparecerán aquí.</p>;
  }

  return (
    <ul className="space-y-3">
      {items.map((q) => (
        <li key={q.id} className="panel p-4">
          <button className="w-full text-left" onClick={() => setOpen(open === q.id ? null : q.id)}>
            <span className="mr-2 rounded bg-red-500/20 px-2 py-0.5 text-xs">×{p.errors[q.id]!.count}</span>
            <span className="font-display font-semibold">{q.text}</span>
          </button>
          {open === q.id && (
            <div className="mt-3 text-sm">
              {q.passage && (
                <blockquote className="mb-2 whitespace-pre-line border-l-4 border-accent pl-3 text-[color:var(--muted)]">{q.passage}</blockquote>
              )}
              <p><strong>Correcta:</strong> {q.options[q.answer]}</p>
              <p className="mt-1 text-[color:var(--muted)]">{q.explanation}</p>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
