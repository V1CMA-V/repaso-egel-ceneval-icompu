import { persistentAtom } from '@nanostores/persistent';
import { recordStudy, simActive } from './progress';
import {
  areaFromPath,
  complete,
  DEFAULT_SETTINGS,
  formatClock,
  idleState,
  mark,
  pause,
  remaining,
  restart,
  sanitizeSettings,
  skip,
  start,
  stop,
  type Phase,
  type PomoSettings,
  type StudyEntry,
  type TimerState,
} from './pomodoro';

export const pomoSettings = persistentAtom<PomoSettings>('ceneval:pomodoro-settings', DEFAULT_SETTINGS, {
  encode: JSON.stringify,
  decode: (raw) => {
    try {
      return sanitizeSettings(JSON.parse(raw));
    } catch {
      return DEFAULT_SETTINGS;
    }
  },
});

export const pomoTimer = persistentAtom<TimerState>('ceneval:pomodoro', idleState(), {
  encode: JSON.stringify,
  decode: (raw) => {
    try {
      const v = JSON.parse(raw);
      return v && typeof v.phase === 'string' && typeof v.status === 'string' ? { ...idleState(), ...v } : idleState();
    } catch {
      return idleState();
    }
  },
});

const currentArea = () => (typeof location === 'undefined' ? 'general' : areaFromPath(location.pathname));

function apply(result: { state: TimerState; log: StudyEntry | null }) {
  pomoTimer.set(result.state);
  if (result.log) recordStudy(result.log);
}

// ── Actions (buttons) ─────────────────────────────────────────────────────────

export function toggleTimer() {
  const t = pomoTimer.get();
  const now = Date.now();
  if (t.status === 'running') pomoTimer.set(pause(t, now));
  else {
    unlockAudio();
    pomoTimer.set(start(t, now, currentArea(), pomoSettings.get()));
  }
}

export const skipBlock = () => apply(skip(pomoTimer.get(), Date.now(), pomoSettings.get()));
export const restartBlock = () => apply(restart(pomoTimer.get(), Date.now(), pomoSettings.get()));
export const stopSession = () => apply(stop(pomoTimer.get(), Date.now(), pomoSettings.get()));

export function updateSettings(patch: Partial<PomoSettings>) {
  pomoSettings.set(sanitizeSettings({ ...pomoSettings.get(), ...patch }));
}

/** Turns browser notifications on (asking for permission) or off. Returns whether they are enabled. */
export async function setNotifications(on: boolean) {
  if (!on || typeof Notification === 'undefined') {
    updateSettings({ notify: false });
    return false;
  }
  const perm = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
  updateSettings({ notify: perm === 'granted' });
  return perm === 'granted';
}

// ── Sound ─────────────────────────────────────────────────────────────────────

let audio: AudioContext | null = null;

/** Browsers only allow audio after a user gesture: create/resume the context on Start. */
function unlockAudio() {
  try {
    audio ??= new AudioContext();
    if (audio.state === 'suspended') void audio.resume();
  } catch {}
}

/** Two soft sine tones. */
export function chime() {
  try {
    audio ??= new AudioContext();
    const ctx = audio;
    [660, 880].forEach((freq, i) => {
      const t0 = ctx.currentTime + i * 0.28;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.12, t0 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.1);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 1.2);
    });
  } catch {}
}

function notifyEnd(ended: Phase, next: TimerState, s: PomoSettings) {
  if (s.sound) chime();
  if (!s.notify || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  const body =
    ended === 'focus'
      ? `¡Pomodoro completado! Toca ${next.phase === 'long' ? `un descanso largo de ${s.long}` : `un descanso de ${s.short}`} min.`
      : 'Descanso terminado. ¿Listo para otro bloque de estudio?';
  try {
    new Notification('EGEL ICOMPU · Enfoque', { body, icon: '/icon-192.png', tag: 'ceneval-pomodoro' });
  } catch {}
}

// ── Engine: runs once per visit (bundled script in Base.astro) ───────────────

const TITLE_PREFIX = /^(?:🍅|☕)(?: ⏸)? \d{2}:\d{2} · /;

function updateTitle(now = Date.now()) {
  const t = pomoTimer.get();
  const base = document.title.replace(TITLE_PREFIX, '');
  let next = base;
  if (t.status !== 'idle') {
    const icon = t.phase === 'focus' ? '🍅' : '☕';
    next = `${icon}${t.status === 'paused' ? ' ⏸' : ''} ${formatClock(remaining(t, now, pomoSettings.get()))} · ${base}`;
  }
  if (document.title !== next) document.title = next;
}

function tick() {
  const now = Date.now();
  const t = pomoTimer.get();
  if (t.status === 'running' && t.endsAt !== null && now >= t.endsAt) {
    const s = pomoSettings.get();
    const result = complete(t, now, s);
    if (s.autoStart) result.state = start(result.state, now, currentArea(), s);
    apply(result);
    notifyEnd(t.phase, result.state, s);
  }
  updateTitle(now);
}

/** Pause while a simulacro is being answered: it has its own clock. */
function pauseForSimulacro() {
  const sim = simActive.get();
  const t = pomoTimer.get();
  if (t.status === 'running' && sim && !sim.finished && location.pathname.startsWith('/simulacro')) {
    pomoTimer.set(pause(t, Date.now(), 'simulacro'));
  }
}

let started = false;

export function startPomodoroEngine() {
  if (started) return;
  started = true;
  tick();
  setInterval(tick, 1000);
  pomoTimer.listen(() => updateTitle());
  simActive.listen(pauseForSimulacro);
  // New page: attribute the time so far to the previous area and re-apply the tab title.
  document.addEventListener('astro:page-load', () => {
    const t = pomoTimer.get();
    if (t.status === 'running') pomoTimer.set(mark(t, Date.now(), currentArea()));
    pauseForSimulacro();
    updateTitle();
  });
  document.addEventListener('astro:after-swap', () => updateTitle());
}

