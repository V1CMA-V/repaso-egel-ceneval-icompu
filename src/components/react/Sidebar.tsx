import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { progress, theme } from '@/lib/progress';
import Countdown from './Countdown';

export interface SidebarLesson {
  id: string;
  title: string;
  readMinutes: number;
}
export interface SidebarSection {
  key: string;
  title: string;
  lessons: SidebarLesson[];
}
export interface SidebarArea {
  slug: string;
  title: string;
  sections: SidebarSection[];
}

export default function Sidebar({ areas, currentPath }: { areas: SidebarArea[]; currentPath: string }) {
  const p = useStore(progress);
  const t = useStore(theme);
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();

  function toggleTheme() {
    const next = t === 'dark' ? 'light' : 'dark';
    theme.set(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  }

  return (
    <nav className="flex h-full flex-col gap-4 overflow-y-auto p-4 text-sm" aria-label="Contenido">
      <div className="flex items-center justify-between">
        <a href="/" className="font-display text-xl font-extrabold">
          EGEL <span className="text-accent">ICOMPU</span>
        </a>
        <button onClick={toggleTheme} aria-label="Cambiar tema" className="panel h-9 w-9">
          {t === 'dark' ? '☾' : '☀'}
        </button>
      </div>

      <Countdown compact />

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="> buscar lección…"
        className="panel w-full px-3 py-2 outline-none focus:border-accent"
      />

      <div className="flex flex-wrap gap-2 text-xs">
        <a href="/flashcards" className="panel px-2 py-1 hover:border-accent">🃏 Flashcards</a>
        <a href="/practica" className="panel px-2 py-1 hover:border-accent">🎯 Práctica</a>
        <a href="/simulacro" className="panel px-2 py-1 hover:border-accent">📝 Simulacro</a>
        <a href="/errores" className="panel px-2 py-1 hover:border-accent">
          ❌ Errores ({Object.keys(p.errors).length})
        </a>
        <a href="/progreso" className="panel px-2 py-1 hover:border-accent">📊 Progreso</a>
      </div>

      {areas.map((area, ai) => {
        const total = area.sections.reduce((n, s) => n + s.lessons.length, 0);
        const done = area.sections.reduce((n, s) => n + s.lessons.filter((l) => p.lessons.includes(l.id)).length, 0);
        return (
          <section key={area.slug}>
            <h2 className="mb-1 flex items-baseline justify-between text-xs font-bold uppercase tracking-widest">
              <span>
                <span className="mr-2 text-2xl text-accent">{String(ai + 1).padStart(2, '0')}</span>
                {area.title}
              </span>
              <span className="text-[color:var(--muted)]">{done}/{total}</span>
            </h2>
            {area.sections.map((s) => {
              const lessons = s.lessons.filter((l) => !query || l.title.toLowerCase().includes(query));
              const examPath = `/examen/${s.key}`;
              if (query && lessons.length === 0) return null;
              return (
                <div key={s.key} className="ml-2 border-l border-[color:var(--line)] pl-3">
                  <p className="mt-2 text-[0.7rem] uppercase tracking-wider text-[color:var(--muted)]">{s.title}</p>
                  <ul>
                    {lessons.map((l) => {
                      const path = `/leccion/${l.id}`;
                      return (
                        <li key={l.id}>
                          <a
                            href={path}
                            aria-current={currentPath === path ? 'page' : undefined}
                            className={`flex gap-2 rounded px-2 py-1 hover:bg-accent/10 ${
                              currentPath === path ? 'bg-accent/15 font-semibold text-accent' : ''
                            }`}
                          >
                            <span>{p.lessons.includes(l.id) ? '✓' : '○'}</span>
                            <span>{l.title}</span>
                          </a>
                        </li>
                      );
                    })}
                    <li>
                      <a
                        href={examPath}
                        className={`flex gap-2 rounded px-2 py-1 hover:bg-accent/10 ${
                          currentPath === examPath ? 'bg-accent/15 font-semibold text-accent' : ''
                        }`}
                      >
                        <span>{p.exams[s.key]?.passed ? '✅' : '📋'}</span>
                        <span><b className="text-accent">examen</b> {s.title}</span>
                      </a>
                    </li>
                  </ul>
                </div>
              );
            })}
          </section>
        );
      })}
    </nav>
  );
}
