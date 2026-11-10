import { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { exportProgress, importProgress, progress } from '@/lib/progress';
import type { SidebarArea } from './Sidebar';

interface Props {
  areas: SidebarArea[];
  examStart: string;
  tools?: boolean;
}

export default function ProgressPanel({ areas, examStart, tools = false }: Props) {
  const p = useStore(progress);
  const [days, setDays] = useState<number | null>(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const ms = new Date(`${examStart}T08:30:00`).getTime() - Date.now();
    setDays(Math.max(0, Math.ceil(ms / 86_400_000)));
  }, [examStart]);

  function download() {
    const url = URL.createObjectURL(new Blob([exportProgress()], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: 'ceneval-progreso.json' });
    a.click();
    URL.revokeObjectURL(url);
  }

  async function upload(file?: File) {
    if (!file) return;
    try {
      importProgress(await file.text());
      setMsg('Progreso importado.');
    } catch {
      setMsg('Archivo inválido.');
    }
  }

  return (
    <div className="space-y-4">
      {days !== null && (
        <div className="panel flex items-center gap-4 p-4">
          <span className="font-display text-4xl font-extrabold text-accent">{days}</span>
          <span className="text-sm">días para el examen ({examStart})</span>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {areas.map((a) => {
          const lessons = a.sections.flatMap((s) => s.lessons);
          const done = lessons.filter((l) => p.lessons.includes(l.id)).length;
          const exams = a.sections.filter((s) => p.exams[s.key]?.passed).length;
          const pct = lessons.length ? Math.round((done / lessons.length) * 100) : 0;
          return (
            <div key={a.slug} className="panel p-4">
              <p className="font-display text-lg font-bold">{a.title}</p>
              <div className="mt-2 h-2 overflow-hidden rounded bg-[color:var(--line)]">
                <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-2 text-xs text-[color:var(--muted)]">
                {done}/{lessons.length} lecciones · {exams}/{a.sections.length} exámenes aprobados
              </p>
            </div>
          );
        })}
      </div>
      {(p.sims.length > 0 || Object.keys(p.practice).length > 0) && (
        <div className="panel space-y-4 p-4">
          {Object.keys(p.practice).length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--muted)]">Práctica mixta (acumulado)</p>
              <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
                {areas.map((a) => {
                  const s = p.practice[a.slug];
                  if (!s) return null;
                  const r = s.total ? s.correct / s.total : 0;
                  return (
                    <li key={a.slug} className={r >= 0.7 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}>
                      {a.title}: {Math.round(r * 100)} % ({s.correct}/{s.total})
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {p.sims.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--muted)]">Últimos simulacros</p>
              <ul className="mt-2 space-y-1 text-sm">
                {[...p.sims].reverse().slice(0, 5).map((s) => (
                  <li key={s.id}>
                    <span className="text-[color:var(--muted)]">{new Date(s.at).toLocaleDateString('es-MX')}</span> ·{' '}
                    {Object.entries(s.areas)
                      .map(([k, v]) => `${areas.find((a) => a.slug === k)?.title ?? k} ${v.total ? Math.round((v.correct / v.total) * 100) : 0} %`)
                      .join(' · ')}
                  </li>
                ))}
              </ul>
              <a href="/simulacro" className="mt-2 inline-block text-xs font-bold text-accent hover:underline">Hacer otro simulacro →</a>
            </div>
          )}
        </div>
      )}
      {tools && (
        <div className="panel flex flex-wrap items-center gap-3 p-4 text-sm">
          <button onClick={download} className="rounded-lg bg-accent px-4 py-2 font-bold text-white">
            Exportar progreso
          </button>
          <label className="cursor-pointer rounded-lg border border-[color:var(--line)] px-4 py-2">
            Importar
            <input type="file" accept="application/json" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
          </label>
          {msg && <span>{msg}</span>}
          <span className="basis-full text-xs text-[color:var(--muted)]">
            Tu progreso vive solo en este navegador. Expórtalo para llevarlo a otro dispositivo.
          </span>
        </div>
      )}
    </div>
  );
}
