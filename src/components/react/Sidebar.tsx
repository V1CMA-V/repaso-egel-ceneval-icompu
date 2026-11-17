import { useEffect, useRef, useState } from 'react';
import { useStore } from '@nanostores/react';
import { openAreas, progress, theme } from '@/lib/progress';
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
  const opened = useStore(openAreas);
  // The area containing the current page is open by default; closing it only lasts for this page view.
  const currentArea = areas.find((a) =>
    a.sections.some((s) => currentPath === `/examen/${s.key}` || s.lessons.some((l) => currentPath === `/leccion/${l.id}`)),
  )?.slug;
  const [currentClosed, setCurrentClosed] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const lastPath = useRef(currentPath);

  // The island is persisted across ClientRouter navigations: when the page changes,
  // reopen the new current area and reveal its item (the initial load is handled inline in Base).
  useEffect(() => {
    if (currentPath === lastPath.current) return;
    lastPath.current = currentPath;
    setCurrentClosed(false);
    requestAnimationFrame(() => {
      const nav = navRef.current;
      const active = nav?.querySelector('[aria-current="page"]');
      if (!nav || !active || nav.clientHeight === 0) return;
      const n = nav.getBoundingClientRect();
      const a = active.getBoundingClientRect();
      const margin = 48;
      if (a.top < n.top + margin || a.bottom > n.bottom - margin) {
        nav.scrollTo({ top: nav.scrollTop + a.top - n.top - (nav.clientHeight - a.height) / 2, behavior: 'smooth' });
      }
    });
  }, [currentPath]);

  function isOpen(slug: string) {
    return slug === currentArea ? !currentClosed : opened.includes(slug);
  }

  function toggleArea(slug: string) {
    if (slug === currentArea) setCurrentClosed((c) => !c);
    else openAreas.set(opened.includes(slug) ? opened.filter((s) => s !== slug) : [...opened, slug]);
  }

  function toggleTheme() {
    const next = t === 'dark' ? 'light' : 'dark';
    theme.set(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  }

  return (
    <nav ref={navRef} className="scroll-thin flex h-full flex-col gap-4 overflow-y-auto p-4 text-sm" aria-label="Contenido">
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
        const sections = area.sections
          .map((s) => ({ ...s, lessons: s.lessons.filter((l) => !query || l.title.toLowerCase().includes(query)) }))
          .filter((s) => !query || s.lessons.length > 0);
        if (query && sections.length === 0) return null;
        // While searching, every area with matches is expanded.
        const open = query ? true : isOpen(area.slug);
        const bodyId = `area-${area.slug}`;
        return (
          <section key={area.slug}>
            <h2 className="text-xs font-bold uppercase tracking-widest">
              <button
                type="button"
                onClick={() => toggleArea(area.slug)}
                disabled={!!query}
                aria-expanded={open}
                aria-controls={bodyId}
                className="flex w-full items-baseline justify-between gap-2 rounded px-1 py-1 text-left font-bold uppercase tracking-widest hover:bg-accent/10 disabled:cursor-default disabled:hover:bg-transparent"
              >
                <span className="flex items-baseline">
                  <span
                    aria-hidden="true"
                    className={`mr-1 inline-block w-3 text-[0.6rem] text-[color:var(--muted)] transition-transform ${open ? 'rotate-90' : ''}`}
                  >
                    ▶
                  </span>
                  <span className="mr-2 text-2xl text-accent">{String(ai + 1).padStart(2, '0')}</span>
                  {area.title}
                </span>
                <span className="shrink-0 text-[color:var(--muted)]">{done}/{total}</span>
              </button>
            </h2>
            <div id={bodyId} hidden={!open}>
              {sections.map((s) => {
                const { lessons } = s;
                const examPath = `/examen/${s.key}`;
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
                          aria-current={currentPath === examPath ? 'page' : undefined}
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
            </div>
          </section>
        );
      })}
    </nav>
  );
}
