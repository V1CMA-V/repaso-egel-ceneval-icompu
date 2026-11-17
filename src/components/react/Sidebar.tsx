import { useEffect, useRef, useState } from 'react';
import { useStore } from '@nanostores/react';
import {
  ChartColumn,
  Check,
  ChevronRight,
  Circle,
  CircleCheck,
  CircleX,
  ClipboardList,
  ClipboardPen,
  Layers,
  Moon,
  NotebookText,
  Sun,
  Target,
  Timer,
} from 'lucide-react';
import { openAreas, progress, theme } from '@/lib/progress';
import Countdown from './Countdown';
import PomodoroTimer from './PomodoroTimer';

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

const TOOLS = [
  { href: '/flashcards', Icon: Layers, label: 'Flashcards' },
  { href: '/practica', Icon: Target, label: 'Práctica' },
  { href: '/simulacro', Icon: ClipboardPen, label: 'Simulacro' },
  { href: '/errores', Icon: CircleX, label: 'Errores' },
  { href: '/progreso', Icon: ChartColumn, label: 'Progreso' },
  { href: '/enfoque', Icon: Timer, label: 'Enfoque' },
] as const;

/** Lesson/exam/review rows: same size so titles line up. */
const ITEM_ICON = { size: 14, strokeWidth: 2.25 } as const;

export default function Sidebar({ areas, currentPath }: { areas: SidebarArea[]; currentPath: string }) {
  const p = useStore(progress);
  const t = useStore(theme);
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const opened = useStore(openAreas);
  // The area containing the current page is open by default; closing it only lasts for this page view.
  const currentArea = areas.find((a) =>
    a.sections.some(
      (s) =>
        currentPath === `/examen/${s.key}` ||
        currentPath === `/repaso/${s.key}` ||
        s.lessons.some((l) => currentPath === `/leccion/${l.id}`),
    ),
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
        <button onClick={toggleTheme} aria-label="Cambiar tema" className="panel grid h-9 w-9 place-items-center hover:border-accent hover:text-accent">
          {t === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
        </button>
      </div>

      {/*
        Top-of-sidebar rules (keep the syllabus visible on short screens):
        1. Status lives in ONE card; each row is h-11 with the same columns:
           fixed w-9 lead (number/clock/icon) · one-line label · muted meta on the right.
        2. Tools are ONE row of equal icon tiles (h-9); the name is in the tooltip and aria-label.
           Max 6 tools; a 7th means one moves out of the sidebar.
        3. Counts go in a corner badge on the tile, never in the name.
        4. The active page's tile is highlighted the same way as the active lesson.
        5. Nothing else goes above the syllabus; new widgets belong on /enfoque or /progreso.
        6. Navigation icons are lucide (currentColor, no emojis): 18px tools, 16px buttons, 14px list rows.
      */}
      <div className="flex flex-col gap-2">
        <div className="panel divide-y divide-[color:var(--line)] overflow-hidden">
          <Countdown compact />
          <PomodoroTimer variant="compact" />
        </div>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="> buscar lección…"
          aria-label="Buscar lección"
          className="panel w-full px-3 py-2 outline-none focus:border-accent"
        />

        <ul className="grid grid-cols-6 gap-1.5" aria-label="Herramientas">
          {TOOLS.map((tool) => {
            const active = currentPath === tool.href;
            const count = tool.href === '/errores' ? Object.keys(p.errors).length : 0;
            const name = count > 0 ? `${tool.label} (${count})` : tool.label;
            return (
              <li key={tool.href}>
                <a
                  href={tool.href}
                  aria-current={active ? 'page' : undefined}
                  aria-label={name}
                  title={name}
                  className={`panel relative grid h-9 place-items-center hover:border-accent hover:bg-accent/10 hover:text-accent ${
                    active ? '!border-accent bg-accent/15 text-accent' : ''
                  }`}
                >
                  <tool.Icon size={18} />
                  {count > 0 && (
                    <span
                      aria-hidden="true"
                      className="absolute -right-1.5 -top-1.5 min-w-4 rounded-full bg-accent px-1 text-center text-[0.6rem] font-bold leading-4 text-white"
                    >
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                </a>
              </li>
            );
          })}
        </ul>
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
                  <ChevronRight
                    size={12}
                    strokeWidth={3}
                    className={`mr-1 shrink-0 self-center text-[color:var(--muted)] transition-transform ${open ? 'rotate-90' : ''}`}
                  />
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
                const reviewPath = `/repaso/${s.key}`;
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
                              {p.lessons.includes(l.id) ? <Check {...ITEM_ICON} className="mt-0.5 shrink-0 text-accent" /> : <Circle {...ITEM_ICON} className="mt-0.5 shrink-0 text-[color:var(--muted)]" />}
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
                          {p.exams[s.key]?.passed ? <CircleCheck {...ITEM_ICON} className="mt-0.5 shrink-0 text-accent" /> : <ClipboardList {...ITEM_ICON} className="mt-0.5 shrink-0" />}
                          <span><b className="text-accent">examen</b> {s.title}</span>
                        </a>
                      </li>
                      <li>
                        <a
                          href={reviewPath}
                          aria-current={currentPath === reviewPath ? 'page' : undefined}
                          className={`flex gap-2 rounded px-2 py-1 hover:bg-accent/10 ${
                            currentPath === reviewPath ? 'bg-accent/15 font-semibold text-accent' : ''
                          }`}
                        >
                          <NotebookText {...ITEM_ICON} className="mt-0.5 shrink-0" />
                          <span><b className="text-accent">repaso</b> {s.title}</span>
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
