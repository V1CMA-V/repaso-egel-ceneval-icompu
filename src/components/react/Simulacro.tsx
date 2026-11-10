import { useEffect, useMemo, useState } from 'react';
import { useStore } from '@nanostores/react';
import { loadBank, type BankQuestion } from '@/lib/bank';
import RichText from './RichText';
import { useShortcuts } from './useShortcuts';
import { AREAS } from '@/lib/curriculum';
import { progress, recordSim, simActive } from '@/lib/progress';
import {
  MODES,
  SIM_INFO,
  TARGET,
  buildSim,
  formatClock,
  pct,
  remainingSeconds,
  scoreSim,
  summarize,
  type SimMode,
  type SimState,
} from '@/lib/simulacro';

const LETTERS = ['A', 'B', 'C'];
const areaTitle = (slug: string) => AREAS.find((a) => a.slug === slug)?.title ?? slug;
const percent = (n: number) => `${Math.round(n * 100)} %`;

export default function Simulacro() {
  const sim = useStore(simActive);
  const p = useStore(progress);
  const [bank, setBank] = useState<BankQuestion[] | null>(null);
  const [error, setError] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const [confirming, setConfirming] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    loadBank().then(setBank).catch((e) => setError(String(e.message ?? e)));
  }, []);

  const byId = useMemo(() => new Map((bank ?? []).map((q) => [q.id, q])), [bank]);
  const running = !!sim && !sim.finished && !sim.between;

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [running]);

  function update(patch: Partial<SimState>) {
    const s = simActive.get();
    if (s) simActive.set({ ...s, ...patch });
  }

  function finishPhase() {
    const s = simActive.get();
    if (!s) return;
    setConfirming(false);
    if (s.phaseIdx + 1 < s.phases.length) simActive.set({ ...s, phaseIdx: s.phaseIdx + 1, between: true, idx: 0 });
    else simActive.set({ ...s, finished: true, between: false });
  }

  // se acabó el tiempo de la parte
  useEffect(() => {
    if (running && sim && remainingSeconds(sim, now) <= 0) finishPhase();
  }, [now, running, sim]);

  // al terminar, guarda el resultado una sola vez
  useEffect(() => {
    if (!sim || !sim.finished || sim.saved || !bank) return;
    const res = scoreSim(sim, byId);
    recordSim({ id: String(sim.startedAt), at: Date.now(), mode: sim.mode, areas: res.byArea }, res.wrongIds, res.rightIds);
    simActive.set({ ...sim, saved: true });
  }, [sim, bank, byId]);

  // Atajos (solo mientras corre el examen): 1–4 contestan · ← → cambian de pregunta · F marca/desmarca
  const shownQ = running && sim ? byId.get(sim.phases[sim.phaseIdx]?.ids[sim.idx] ?? '') : undefined;
  useShortcuts((e) => {
    const s = simActive.get();
    if (!s || s.finished || s.between) return;
    const ids = s.phases[s.phaseIdx]?.ids ?? [];

    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const idx = Math.min(ids.length - 1, Math.max(0, s.idx + (e.key === 'ArrowRight' ? 1 : -1)));
      if (idx !== s.idx) simActive.set({ ...s, idx });
      return true; // evita que la flecha cambie la opción del radio enfocado
    }

    if (e.repeat) return;
    const id = ids[s.idx];
    if (!id) return;

    if (e.key.toLowerCase() === 'f') {
      simActive.set({ ...s, flags: s.flags.includes(id) ? s.flags.filter((f) => f !== id) : [...s.flags, id] });
      return true;
    }

    const n = Number(e.key);
    if (shownQ && Number.isInteger(n) && n >= 1 && n <= shownQ.options.length) {
      simActive.set({ ...s, answers: { ...s.answers, [id]: n - 1 } });
      return true;
    }
  }, running);

  if (error) return <p className="panel p-4 text-sm text-red-500">{error}</p>;
  if (!bank) return <p className="text-sm text-[color:var(--muted)]">Cargando preguntas…</p>;

  /* ───────── 1. Selección de modo ───────── */
  if (!sim) {
    return (
      <div>
        <div className="grid gap-4 sm:grid-cols-2">
          {MODES.map((mode) => {
            const info = SIM_INFO[mode];
            const s = summarize(mode, bank);
            return (
              <div key={mode} className={`panel flex flex-col p-5 ${mode === 'completo' ? 'sm:col-span-2' : ''}`}>
                <h2 className="font-display text-xl font-extrabold">{info.label}</h2>
                <p className="mt-1 flex-1 text-sm text-[color:var(--muted)]">{info.desc}</p>
                <p className="mt-3 text-xs uppercase tracking-widest text-[color:var(--muted)]">
                  {s.questions} reactivos · {s.minutes >= 60 ? `${Math.floor(s.minutes / 60)} h ${s.minutes % 60 ? `${s.minutes % 60} min` : ''}` : `${s.minutes} min`}
                </p>
                <button
                  onClick={() => {
                    simActive.set(buildSim(mode, bank));
                    setNow(Date.now());
                    setShowAll(false);
                  }}
                  disabled={s.questions === 0}
                  className="mt-3 self-start rounded-lg bg-accent px-5 py-2 text-sm font-bold text-white disabled:opacity-40"
                >
                  Iniciar
                </button>
              </div>
            );
          })}
        </div>
        <p className="mt-6 text-xs text-[color:var(--muted)]">
          Reglas: sin formulario ni notas; solo calculadora científica no programable. Puedes marcar preguntas para revisarlas. No hay
          retroalimentación hasta terminar. Las no contestadas cuentan como incorrectas. Meta: ≥ 70 % por área.
        </p>
        {p.sims.length > 0 && <History sims={p.sims} />}
      </div>
    );
  }

  /* ───────── 4. Resultados ───────── */
  if (sim.finished) {
    const res = scoreSim(sim, byId);
    const disc = ['hardware', 'redes', 'software'].reduce(
      (acc, a) => ({
        correct: acc.correct + (res.byArea[a]?.correct ?? 0),
        total: acc.total + (res.byArea[a]?.total ?? 0),
      }),
      { correct: 0, total: 0 },
    );
    const wrong = res.wrongIds.map((id) => byId.get(id)).filter((q): q is BankQuestion => !!q);
    const shown = showAll ? sim.phases.flatMap((ph) => ph.ids).map((id) => byId.get(id)).filter((q): q is BankQuestion => !!q) : wrong;

    return (
      <div className="space-y-6">
        <div className="panel p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-accent">{SIM_INFO[sim.mode].label} · resultados</p>
          <p className="mt-1 font-display text-4xl font-extrabold">
            {res.correct}/{res.total} <span className="text-xl text-[color:var(--muted)]">({percent(res.total ? res.correct / res.total : 0)})</span>
          </p>
          {res.unanswered > 0 && <p className="mt-1 text-sm text-[color:var(--muted)]">{res.unanswered} sin contestar (cuentan como incorrectas)</p>}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {sim.mode === 'completo' && disc.total > 0 && (
            <ScoreCard title="Disciplinar (global)" correct={disc.correct} total={disc.total} />
          )}
          {Object.entries(res.byArea).map(([area, s]) => (
            <ScoreCard key={area} title={areaTitle(area)} correct={s.correct} total={s.total} />
          ))}
        </div>
        <p className="text-xs text-[color:var(--muted)]">
          Meta del plan: ≥ 70 % por área. El modelo del examen es compensatorio: un área fuerte puede cubrir una débil. Tus fallos ya están en la Tabla de errores.
        </p>

        <div className="flex flex-wrap gap-3">
          <button onClick={() => simActive.set(null)} className="rounded-lg bg-accent px-5 py-2 text-sm font-bold text-white">
            Nuevo simulacro
          </button>
          <a href="/errores" className="rounded-lg border border-[color:var(--line)] px-5 py-2 text-sm font-bold hover:border-accent">
            Ver Tabla de errores
          </a>
          <a href="/practica" className="rounded-lg border border-[color:var(--line)] px-5 py-2 text-sm font-bold hover:border-accent">
            Practicar mis errores
          </a>
        </div>

        <section>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-2xl font-extrabold">Revisión</h2>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} className="accent-[#ff6a1a]" />
              Mostrar también las correctas
            </label>
          </div>
          <ol className="mt-4 space-y-4">
            {shown.map((q, i) => {
              const given = sim.answers[q.id];
              const ok = given === q.answer;
              return (
                <li key={q.id} className={`panel p-4 ${ok ? 'border-emerald-500/50' : 'border-red-500/60'}`}>
                  <p className="text-xs uppercase tracking-widest text-[color:var(--muted)]">
                    {i + 1} · {areaTitle(q.area)}
                  </p>
                  {q.passage && <blockquote className="mt-2 whitespace-pre-line border-l-4 border-accent pl-3 text-sm text-[color:var(--muted)]"><RichText>{q.passage}</RichText></blockquote>}
                  <p className="mt-2 font-display font-semibold"><RichText>{q.text}</RichText></p>
                  {q.code && (
                    <pre className="mt-2 overflow-x-auto rounded-lg border border-[color:var(--line)] bg-black/20 p-3 text-sm">
                      <code>{q.code}</code>
                    </pre>
                  )}
                  <ul className="mt-2 space-y-1 text-sm">
                    {q.options.map((o, oi) => (
                      <li
                        key={oi}
                        className={oi === q.answer ? 'font-semibold text-emerald-600 dark:text-emerald-400' : oi === given ? 'text-red-500' : ''}
                      >
                        <b className="mr-1">{LETTERS[oi]})</b>
                        <RichText>{o}</RichText>
                        {oi === q.answer && ' ✓'}
                        {oi === given && oi !== q.answer && ' ✗ (tu respuesta)'}
                      </li>
                    ))}
                  </ul>
                  {given === undefined && <p className="mt-1 text-xs text-red-500">Sin contestar</p>}
                  <p className="mt-2 rounded-lg bg-[color:var(--line)]/40 p-3 text-sm"><RichText>{q.explanation}</RichText></p>
                </li>
              );
            })}
            {shown.length === 0 && <li className="panel p-4 text-sm">¡Sin errores en este simulacro!</li>}
          </ol>
        </section>
      </div>
    );
  }

  const phase = sim.phases[sim.phaseIdx]!;

  /* ───────── 3. Receso entre partes ───────── */
  if (sim.between) {
    return (
      <div className="panel space-y-4 p-6 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-accent">Receso</p>
        <h2 className="font-display text-3xl font-extrabold">Siguiente parte: {phase.name}</h2>
        <p className="text-sm text-[color:var(--muted)]">
          {phase.ids.length} reactivos · {Math.floor(phase.minutes / 60)} h {phase.minutes % 60 ? `${phase.minutes % 60} min` : ''}. Descansa lo que necesites; el tiempo de esta parte empieza al continuar.
        </p>
        <button
          onClick={() => {
            update({ between: false, phaseStartedAt: Date.now(), idx: 0 });
            setNow(Date.now());
          }}
          className="rounded-lg bg-accent px-6 py-2.5 text-sm font-bold text-white"
        >
          Continuar
        </button>
      </div>
    );
  }

  /* ───────── 2. Examen en curso ───────── */
  const ids = phase.ids;
  const q = byId.get(ids[sim.idx] ?? '');
  const remaining = remainingSeconds(sim, now);
  const answered = ids.filter((id) => sim.answers[id] !== undefined).length;
  const flagged = new Set(sim.flags);
  const go = (i: number) => update({ idx: Math.min(ids.length - 1, Math.max(0, i)) });

  return (
    <div className="space-y-5">
      <div className="panel sticky top-2 z-10 flex flex-wrap items-center justify-between gap-3 p-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-accent">{phase.name}</p>
          <p className="text-xs text-[color:var(--muted)]">
            Pregunta {sim.idx + 1} de {ids.length} · {answered} contestadas
          </p>
        </div>
        <p className={`font-display text-3xl font-extrabold tabular-nums ${remaining < 600 ? 'text-red-500' : ''}`} role="timer" aria-label="Tiempo restante">
          {formatClock(remaining)}
        </p>
      </div>

      {q ? (
        <div className="panel p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">{sim.idx + 1}</span>
              <p className="font-display text-lg font-semibold leading-snug"><RichText>{q.text}</RichText></p>
            </div>
            <button
              onClick={() => update({ flags: flagged.has(q.id) ? sim.flags.filter((f) => f !== q.id) : [...sim.flags, q.id] })}
              className={`shrink-0 rounded-lg border px-3 py-1 text-xs font-bold ${
                flagged.has(q.id) ? 'border-amber-500 bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'border-[color:var(--line)]'
              }`}
              aria-pressed={flagged.has(q.id)}
            >
              🚩 {flagged.has(q.id) ? 'Marcada' : 'Marcar'} <span className="opacity-60">(F)</span>
            </button>
          </div>
          {q.passage && (
            <blockquote className="mt-3 whitespace-pre-line rounded-lg border-l-4 border-accent bg-[color:var(--line)]/30 p-3 text-sm leading-relaxed"><RichText>{q.passage}</RichText></blockquote>
          )}
          {q.code && (
            <pre className="mt-3 overflow-x-auto rounded-lg border border-[color:var(--line)] bg-black/20 p-3 text-sm">
              <code>{q.code}</code>
            </pre>
          )}
          <div className="mt-4 space-y-2">
            {q.options.map((opt, oi) => (
              <label
                key={oi}
                className={`flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2 text-sm hover:bg-accent/10 ${sim.answers[q.id] === oi ? 'bg-accent/15' : ''}`}
              >
                <input
                  type="radio"
                  name={`sim-${q.id}`}
                  className="mt-1 accent-[#ff6a1a]"
                  checked={sim.answers[q.id] === oi}
                  onChange={() => update({ answers: { ...sim.answers, [q.id]: oi } })}
                />
                <span>
                  <b className="mr-1 text-accent">{LETTERS[oi]})</b>
                  <RichText>{opt}</RichText>
                </span>
              </label>
            ))}
          </div>
        </div>
      ) : (
        <p className="panel p-4 text-sm">Esta pregunta ya no está en el banco; continúa con la siguiente.</p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={() => go(sim.idx - 1)} disabled={sim.idx === 0} className="rounded-lg border border-[color:var(--line)] px-4 py-2 text-sm font-bold disabled:opacity-40">
          ← Anterior
        </button>
        <button onClick={() => go(sim.idx + 1)} disabled={sim.idx >= ids.length - 1} className="rounded-lg bg-accent px-4 py-2 text-sm font-bold text-white disabled:opacity-40">
          Siguiente →
        </button>
      </div>

      <nav aria-label="Navegador de preguntas" className="panel p-3">
        <div className="flex flex-wrap gap-1.5">
          {ids.map((id, i) => (
            <button
              key={id}
              onClick={() => go(i)}
              aria-label={`Pregunta ${i + 1}${sim.answers[id] !== undefined ? ', contestada' : ''}${flagged.has(id) ? ', marcada' : ''}`}
              aria-current={i === sim.idx ? 'true' : undefined}
              className={`h-8 min-w-8 rounded px-1 text-xs font-bold ${
                sim.answers[id] !== undefined ? 'bg-accent text-white' : 'border border-[color:var(--line)]'
              } ${flagged.has(id) ? 'ring-2 ring-amber-500' : ''} ${i === sim.idx ? 'outline outline-2 outline-offset-1 outline-[color:var(--ink)]' : ''}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-[color:var(--muted)]">
          Naranja = contestada · aro ámbar = marcada · contorno = actual
          <br />
          ⌨ <b>1–3</b> responden (A–C) · <b>←</b> <b>→</b> cambian de pregunta · <b>F</b> marca o desmarca
        </p>
      </nav>

      <div className="panel p-4">
        {!confirming ? (
          <button onClick={() => setConfirming(true)} className="rounded-lg border border-red-500/60 px-4 py-2 text-sm font-bold text-red-600 dark:text-red-400">
            {sim.phaseIdx + 1 < sim.phases.length ? 'Terminar esta parte' : 'Terminar simulacro'}
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span>
              Te faltan <b>{ids.length - answered}</b> por contestar y <b>{flagged.size}</b> marcadas. ¿Terminar ahora?
            </span>
            <button onClick={finishPhase} className="rounded-lg bg-red-600 px-4 py-2 font-bold text-white">
              Sí, terminar
            </button>
            <button onClick={() => setConfirming(false)} className="rounded-lg border border-[color:var(--line)] px-4 py-2 font-bold">
              Seguir
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ScoreCard({ title, correct, total }: { title: string; correct: number; total: number }) {
  const ratio = total ? correct / total : 0;
  const ok = ratio >= TARGET;
  return (
    <div className={`panel p-4 ${ok ? 'border-emerald-500/50' : 'border-red-500/50'}`}>
      <p className="font-display text-lg font-bold">{title}</p>
      <p className="mt-1 text-2xl font-extrabold">
        {percent(ratio)} <span className="text-sm font-normal text-[color:var(--muted)]">({correct}/{total})</span>
      </p>
      <div className="mt-2 h-2 overflow-hidden rounded bg-[color:var(--line)]">
        <div className={ok ? 'h-full bg-emerald-500' : 'h-full bg-red-500'} style={{ width: `${Math.round(ratio * 100)}%` }} />
      </div>
      <p className="mt-1 text-xs text-[color:var(--muted)]">{ok ? '✓ Meta alcanzada (≥ 70 %)' : 'Por debajo de la meta (70 %)'}</p>
    </div>
  );
}

function History({ sims }: { sims: { id: string; at: number; mode: SimMode; areas: Record<string, { correct: number; total: number }> }[] }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-xl font-extrabold">Historial de simulacros</h2>
      <div className="panel mt-3 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-widest text-[color:var(--muted)]">
            <tr>
              <th className="p-3">Fecha</th>
              <th className="p-3">Modo</th>
              <th className="p-3">Resultado por área</th>
            </tr>
          </thead>
          <tbody>
            {[...sims].reverse().map((s) => (
              <tr key={s.id} className="border-t border-[color:var(--line)]">
                <td className="p-3 whitespace-nowrap">{new Date(s.at).toLocaleDateString('es-MX')}</td>
                <td className="p-3">{SIM_INFO[s.mode].label}</td>
                <td className="p-3">
                  {Object.entries(s.areas).map(([a, sc]) => (
                    <span key={a} className={`mr-3 inline-block ${pct(sc) >= TARGET ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                      {areaTitle(a)} {percent(pct(sc))}
                    </span>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
