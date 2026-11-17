import { useStore } from '@nanostores/react';
import { lastLesson, lessonPath, RESUME_FLAG } from '@/lib/resume';

const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });

function timeAgo(at: number) {
  const minutes = Math.round((Date.now() - at) / 60_000);
  if (minutes < 1) return 'hace un momento';
  if (minutes < 60) return rtf.format(-minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (hours < 24) return rtf.format(-hours, 'hour');
  return rtf.format(-Math.round(hours / 24), 'day');
}

/** "Continuar donde te quedaste": links back to the last lesson and restores the reading position. */
export default function ResumeReading() {
  const last = useStore(lastLesson);
  if (!last) return null;

  const pct = Math.round(last.progress * 100);
  const finished = pct >= 95;

  function markResume() {
    if (finished || !last) return;
    try {
      sessionStorage.setItem(RESUME_FLAG, last.id);
    } catch {}
  }

  return (
    <a
      href={lessonPath(last.id)}
      onClick={markResume}
      className="panel group mt-6 flex flex-wrap items-center gap-4 p-5 hover:border-accent"
    >
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-widest text-accent">
          {finished ? 'Última lección leída' : 'Continuar donde te quedaste'}
        </p>
        <p className="font-display mt-1 truncate text-xl font-extrabold">{last.title}</p>
        <p className="mt-1 text-xs text-[color:var(--muted)]">
          {last.section && `${last.section} · `}
          {timeAgo(last.at)}
        </p>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[color:var(--line)]">
            <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs text-[color:var(--muted)]">{pct}%</span>
        </div>
      </div>
      <span className="rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-accent/30 group-hover:brightness-110">
        {finished ? 'Volver a abrir →' : 'Continuar →'}
      </span>
    </a>
  );
}
