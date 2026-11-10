import { sample, type BankQuestion } from './bank';
import { shuffle } from './scoring';

export type SimMode = 'completo' | 'hardware' | 'redes' | 'software' | 'lenguaje';

export interface SimPhase {
  name: string;
  minutes: number;
  ids: string[];
}

export interface SimState {
  mode: SimMode;
  phases: SimPhase[];
  phaseIdx: number;
  /** true while waiting for the user to start the next phase (receso) */
  between: boolean;
  finished: boolean;
  saved: boolean;
  startedAt: number;
  phaseStartedAt: number;
  idx: number;
  answers: Record<string, number>;
  flags: string[];
}

export interface AreaScore {
  correct: number;
  total: number;
}

/** Reactivos del examen real (guía dic. 2026): Disciplinar = 140, Lenguaje y Comunicación = 60 (30 lectura + 30 redacción). */
export const COMPOSICION: Record<'hardware' | 'redes' | 'software', number> = { hardware: 49, redes: 41, software: 50 };
export const LENGUAJE_N = 60;
export const MINI_N: Record<'hardware' | 'redes' | 'software' | 'lenguaje', number> = {
  hardware: 12,
  redes: 14,
  software: 16,
  lenguaje: 30,
};
/** Minutos por reactivo: Disciplinar 8:30–13:00 + 14:30–17:00 = 7 h / 140; Lenguaje 17:00–19:00 = 2 h / 60. */
export const MIN_PER_Q = 3;
export const MIN_PER_Q_LANG = 2;
export const DISCIPLINAR_MINUTES = 420;
export const LENGUAJE_MINUTES = 120;
export const TARGET = 0.7;

export const SIM_INFO: Record<SimMode, { label: string; desc: string }> = {
  completo: {
    label: 'Simulacro completo',
    desc: 'Como el examen real: Disciplinar (140 reactivos, 7 h) y Lenguaje y Comunicación (60 reactivos, 2 h). Con receso entre partes. Tu avance se guarda si recargas la página.',
  },
  hardware: { label: 'Mini simulacro · Hardware', desc: 'Reactivos de Hardware con tiempo límite, sin retroalimentación hasta el final.' },
  redes: { label: 'Mini simulacro · Redes', desc: 'Reactivos de Redes con tiempo límite, sin retroalimentación hasta el final.' },
  software: { label: 'Mini simulacro · Software', desc: 'Reactivos de Software con tiempo límite, sin retroalimentación hasta el final.' },
  lenguaje: { label: 'Mini simulacro · Lenguaje', desc: 'Reactivos de Lenguaje y Comunicación con tiempo límite, sin retroalimentación hasta el final.' },
};

export const MODES: SimMode[] = ['completo', 'hardware', 'redes', 'software', 'lenguaje'];

const byArea = (bank: BankQuestion[], area: string) => bank.filter((q) => q.area === area);

function phasesFor(mode: SimMode, bank: BankQuestion[], rnd: () => number): SimPhase[] {
  if (mode === 'completo') {
    const disc = shuffle(
      (Object.keys(COMPOSICION) as (keyof typeof COMPOSICION)[]).flatMap((a) => sample(byArea(bank, a), COMPOSICION[a], rnd)),
      rnd,
    );
    const leng = sample(byArea(bank, 'lenguaje'), LENGUAJE_N, rnd);
    return [
      { name: 'Sección Disciplinar', minutes: DISCIPLINAR_MINUTES, ids: disc.map((q) => q.id) },
      { name: 'Lenguaje y Comunicación', minutes: LENGUAJE_MINUTES, ids: leng.map((q) => q.id) },
    ];
  }
  const qs = sample(byArea(bank, mode), MINI_N[mode], rnd);
  const per = mode === 'lenguaje' ? MIN_PER_Q_LANG : MIN_PER_Q;
  return [{ name: SIM_INFO[mode].label, minutes: Math.max(1, qs.length * per), ids: qs.map((q) => q.id) }];
}

/** What a mode would contain given the bank (for the selection screen). */
export function summarize(mode: SimMode, bank: BankQuestion[]) {
  const phases = phasesFor(mode, bank, () => 0.5);
  return {
    questions: phases.reduce((n, p) => n + p.ids.length, 0),
    minutes: phases.reduce((n, p) => n + p.minutes, 0),
  };
}

export function buildSim(mode: SimMode, bank: BankQuestion[], now = Date.now(), rnd: () => number = Math.random): SimState {
  return {
    mode,
    phases: phasesFor(mode, bank, rnd),
    phaseIdx: 0,
    between: false,
    finished: false,
    saved: false,
    startedAt: now,
    phaseStartedAt: now,
    idx: 0,
    answers: {},
    flags: [],
  };
}

export function remainingSeconds(sim: SimState, now = Date.now()): number {
  const phase = sim.phases[sim.phaseIdx];
  if (!phase) return 0;
  return Math.max(0, phase.minutes * 60 - Math.floor((now - sim.phaseStartedAt) / 1000));
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(h)}:${p(m)}:${p(ss)}`;
}

export interface SimScore {
  byArea: Record<string, AreaScore>;
  wrongIds: string[];
  rightIds: string[];
  total: number;
  correct: number;
  unanswered: number;
}

/** Unanswered questions count as wrong. Questions missing from the bank are ignored. */
export function scoreSim(sim: SimState, byId: Map<string, BankQuestion>): SimScore {
  const result: SimScore = { byArea: {}, wrongIds: [], rightIds: [], total: 0, correct: 0, unanswered: 0 };
  for (const id of sim.phases.flatMap((p) => p.ids)) {
    const q = byId.get(id);
    if (!q) continue;
    const a = (result.byArea[q.area] ??= { correct: 0, total: 0 });
    a.total++;
    result.total++;
    const given = sim.answers[id];
    if (given === undefined) result.unanswered++;
    if (given === q.answer) {
      a.correct++;
      result.correct++;
      result.rightIds.push(id);
    } else {
      result.wrongIds.push(id);
    }
  }
  return result;
}

export const pct = (s: AreaScore | undefined) => (s && s.total ? s.correct / s.total : 0);
