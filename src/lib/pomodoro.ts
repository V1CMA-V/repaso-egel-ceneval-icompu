/**
 * Pomodoro logic (pure). The timer is stored as timestamps, not counters, so it survives
 * page navigations, reloads and closed tabs: the remaining time is always `endsAt - now`.
 */

export type Phase = 'focus' | 'short' | 'long';
export type Status = 'idle' | 'running' | 'paused';

export interface PomoSettings {
  /** minutes */
  focus: number;
  short: number;
  long: number;
  /** focus blocks before a long break */
  every: number;
  /** pomodoros per day */
  goal: number;
  sound: boolean;
  notify: boolean;
  autoStart: boolean;
}

export const DEFAULT_SETTINGS: PomoSettings = {
  focus: 25,
  short: 5,
  long: 15,
  every: 4,
  goal: 4,
  sound: true,
  notify: false,
  autoStart: false,
};

export interface TimerState {
  /** phase that is running, paused, or ready to start when idle */
  phase: Phase;
  status: Status;
  endsAt: number | null;
  remainingMs: number | null;
  /** full length of the current block, fixed when it starts */
  durationMs: number;
  /** focus blocks completed in the current series (resets after a long break) */
  cycle: number;
  /** start timestamp of the current block; identifies it in the study log */
  blockId: number | null;
  pausedBy: 'simulacro' | null;
  /** phase that just ended while idle, to offer the next one ("¡Bloque terminado!") */
  finished: Phase | null;
  /** time of the current block attributed to each area */
  areaMs: Record<string, number>;
  markAt: number | null;
  markArea: string | null;
}

export interface StudyEntry {
  blockId: number;
  day: string;
  areaMs: Record<string, number>;
  completed: boolean;
}

export interface StudyDay {
  ms: Record<string, number>;
  pomodoros: number;
}

export type StudyLog = Record<string, StudyDay>;

const MIN = 60_000;
/** Shorter interrupted focus blocks are not logged. */
export const MIN_LOGGED_MS = MIN;

export const PHASE_LABEL: Record<Phase, string> = { focus: 'Estudio', short: 'Descanso', long: 'Descanso largo' };

export function phaseMs(phase: Phase, s: PomoSettings) {
  return (phase === 'focus' ? s.focus : phase === 'short' ? s.short : s.long) * MIN;
}

export function idleState(s: PomoSettings = DEFAULT_SETTINGS): TimerState {
  return {
    phase: 'focus',
    status: 'idle',
    endsAt: null,
    remainingMs: null,
    durationMs: phaseMs('focus', s),
    cycle: 0,
    blockId: null,
    pausedBy: null,
    finished: null,
    areaMs: {},
    markAt: null,
    markArea: null,
  };
}

/** Something to show outside the idle start screen: a block in progress or one waiting for the next. */
export const isActive = (t: TimerState) => t.status !== 'idle' || t.finished !== null || t.cycle > 0;

export function remaining(t: TimerState, now: number, s: PomoSettings) {
  if (t.status === 'running' && t.endsAt !== null) return Math.max(0, t.endsAt - now);
  if (t.status === 'paused' && t.remainingMs !== null) return t.remainingMs;
  return phaseMs(t.phase, s);
}

/** Total length of the block shown (fixed once started; follows the settings while idle). */
export const total = (t: TimerState, s: PomoSettings) => (t.status === 'idle' ? phaseMs(t.phase, s) : t.durationMs);

export function areaFromPath(path: string) {
  const m = /^\/(?:leccion|examen|repaso)\/([^/]+)/.exec(path);
  return m?.[1] ?? 'general';
}

/** Local calendar day, YYYY-MM-DD. */
export function dayKey(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Adds the time since the last mark to the area it belongs to, and starts a new mark. */
export function mark(t: TimerState, now: number, area: string | null): TimerState {
  if (t.status !== 'running' || t.markAt === null) return t;
  const until = t.endsAt !== null ? Math.min(now, t.endsAt) : now;
  const areaMs = { ...t.areaMs };
  if (t.markArea && until > t.markAt) areaMs[t.markArea] = (areaMs[t.markArea] ?? 0) + (until - t.markAt);
  return { ...t, areaMs, markAt: now, markArea: area };
}

export function start(t: TimerState, now: number, area: string, s: PomoSettings): TimerState {
  if (t.status === 'running') return t;
  if (t.status === 'paused') return resume(t, now, area);
  const durationMs = phaseMs(t.phase, s);
  return {
    ...t,
    status: 'running',
    endsAt: now + durationMs,
    remainingMs: null,
    durationMs,
    blockId: now,
    pausedBy: null,
    finished: null,
    areaMs: {},
    markAt: now,
    markArea: area,
  };
}

export function pause(t: TimerState, now: number, by: TimerState['pausedBy'] = null): TimerState {
  if (t.status !== 'running' || t.endsAt === null) return t;
  const marked = mark(t, now, null);
  return { ...marked, status: 'paused', remainingMs: Math.max(0, t.endsAt - now), endsAt: null, markAt: null, pausedBy: by };
}

export function resume(t: TimerState, now: number, area: string): TimerState {
  if (t.status !== 'paused' || t.remainingMs === null) return t;
  return { ...t, status: 'running', endsAt: now + t.remainingMs, remainingMs: null, pausedBy: null, markAt: now, markArea: area };
}

function entryFor(t: TimerState, areaMs: Record<string, number>, at: number, completed: boolean): StudyEntry | null {
  if (t.phase !== 'focus' || t.blockId === null) return null;
  const spent = Object.values(areaMs).reduce((a, b) => a + b, 0);
  if (!completed && spent < MIN_LOGGED_MS) return null;
  return { blockId: t.blockId, day: dayKey(at), areaMs, completed };
}

/** Ends the current block (completed or skipped) and leaves the next phase ready, idle. */
function finish(t: TimerState, now: number, s: PomoSettings, completed: boolean) {
  const end = t.status === 'running' && t.endsAt !== null ? Math.min(now, t.endsAt) : now;
  const marked = t.status === 'running' ? mark(t, end, null) : t;
  const log = t.status === 'idle' ? null : entryFor(t, marked.areaMs, end, completed);

  let phase: Phase;
  let cycle = t.cycle;
  if (t.phase === 'focus') {
    if (completed) cycle += 1;
    phase = completed && cycle >= s.every ? 'long' : 'short';
  } else {
    phase = 'focus';
    if (t.phase === 'long') cycle = 0;
  }
  const state: TimerState = {
    ...t,
    phase,
    status: 'idle',
    endsAt: null,
    remainingMs: null,
    durationMs: phaseMs(phase, s),
    cycle,
    blockId: null,
    pausedBy: null,
    finished: t.phase,
    areaMs: {},
    markAt: null,
    markArea: null,
  };
  return { state, log };
}

/** Called once the running block reached its end (possibly long ago, if the tab was closed). */
export function complete(t: TimerState, now: number, s: PomoSettings) {
  return finish(t, now, s, true);
}

/** Jump to the next phase; an interrupted focus block is logged if it lasted ≥ 1 min. */
export function skip(t: TimerState, now: number, s: PomoSettings) {
  return finish(t, now, s, false);
}

/** Restart the current block from zero (logging the interrupted focus time). */
export function restart(t: TimerState, now: number, s: PomoSettings) {
  const end = t.status === 'running' && t.endsAt !== null ? Math.min(now, t.endsAt) : now;
  const marked = t.status === 'running' ? mark(t, end, null) : t;
  const log = t.status === 'idle' ? null : entryFor(t, marked.areaMs, end, false);
  const state: TimerState = {
    ...t,
    status: 'idle',
    endsAt: null,
    remainingMs: null,
    durationMs: phaseMs(t.phase, s),
    blockId: null,
    pausedBy: null,
    finished: null,
    areaMs: {},
    markAt: null,
    markArea: null,
  };
  return { state, log };
}

/** End the whole session: logs the interrupted focus time and goes back to the first block. */
export function stop(t: TimerState, now: number, s: PomoSettings) {
  return { state: idleState(s), log: restart(t, now, s).log };
}

/** Adds a block to the log. Idempotent: block ids are start timestamps, so older or equal ids are ignored. */
export function addEntry(log: StudyLog, lastBlock: number, e: StudyEntry): { log: StudyLog; lastBlock: number } | null {
  if (e.blockId <= lastBlock) return null;
  const day = log[e.day] ?? { ms: {}, pomodoros: 0 };
  const ms = { ...day.ms };
  for (const [area, v] of Object.entries(e.areaMs)) ms[area] = (ms[area] ?? 0) + v;
  return { log: { ...log, [e.day]: { ms, pomodoros: day.pomodoros + (e.completed ? 1 : 0) } }, lastBlock: e.blockId };
}

export const dayMs = (d: StudyDay | undefined) => (d ? Object.values(d.ms).reduce((a, b) => a + b, 0) : 0);

export function totalsByArea(log: StudyLog) {
  const out: Record<string, number> = {};
  for (const d of Object.values(log)) for (const [a, v] of Object.entries(d.ms)) out[a] = (out[a] ?? 0) + v;
  return out;
}

function shiftDay(key: string, delta: number) {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y!, m! - 1, d! + delta).getTime());
}

/** Consecutive days meeting the goal. If today is not met yet, the streak counts up to yesterday. */
export function streak(log: StudyLog, goal: number, today: string) {
  const met = (k: string) => (log[k]?.pomodoros ?? 0) >= Math.max(1, goal);
  let day = met(today) ? today : shiftDay(today, -1);
  let n = 0;
  while (met(day)) {
    n++;
    day = shiftDay(day, -1);
  }
  return n;
}

export function formatClock(ms: number) {
  const secs = Math.ceil(ms / 1000);
  return `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
}

export function formatDuration(ms: number) {
  const mins = Math.round(ms / MIN);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function sanitizeSettings(raw: unknown): PomoSettings {
  const v = (raw && typeof raw === 'object' ? raw : {}) as Partial<PomoSettings>;
  const num = (x: unknown, def: number, min: number, max: number) =>
    typeof x === 'number' && Number.isFinite(x) ? Math.min(max, Math.max(min, Math.round(x))) : def;
  const bool = (x: unknown, def: boolean) => (typeof x === 'boolean' ? x : def);
  const d = DEFAULT_SETTINGS;
  return {
    focus: num(v.focus, d.focus, 1, 180),
    short: num(v.short, d.short, 1, 60),
    long: num(v.long, d.long, 1, 90),
    every: num(v.every, d.every, 1, 12),
    goal: num(v.goal, d.goal, 1, 24),
    sound: bool(v.sound, d.sound),
    notify: bool(v.notify, d.notify),
    autoStart: bool(v.autoStart, d.autoStart),
  };
}
