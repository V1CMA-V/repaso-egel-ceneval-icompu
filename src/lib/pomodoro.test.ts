import { describe, expect, it } from 'vitest';
import {
  addEntry,
  areaFromPath,
  complete,
  dayKey,
  DEFAULT_SETTINGS as S,
  formatClock,
  idleState,
  mark,
  pause,
  remaining,
  restart,
  resume,
  skip,
  start,
  streak,
  type StudyLog,
} from './pomodoro';

const MIN = 60_000;
const T0 = new Date(2026, 10, 17, 10, 0, 0).getTime();

describe('ciclo de fases', () => {
  it('después de cada estudio va un descanso corto y cada 4 uno largo', () => {
    let t = idleState(S);
    const phases: string[] = [];
    let now = T0;
    for (let i = 0; i < 8; i++) {
      t = start(t, now, 'hardware', S);
      now = t.endsAt!;
      t = complete(t, now, S).state;
      phases.push(t.phase);
    }
    expect(phases).toEqual(['short', 'focus', 'short', 'focus', 'short', 'focus', 'long', 'focus']);
    expect(t.cycle).toBe(0);
  });

  it('saltar un estudio no cuenta el ciclo', () => {
    const t = skip(start(idleState(S), T0, 'redes', S), T0 + 2 * MIN, S).state;
    expect(t).toMatchObject({ phase: 'short', cycle: 0, status: 'idle', finished: 'focus' });
  });
});

describe('tiempo restante', () => {
  it('se calcula con la hora de fin y se congela en pausa', () => {
    let t = start(idleState(S), T0, 'general', S);
    expect(remaining(t, T0 + 5 * MIN, S)).toBe(20 * MIN);
    t = pause(t, T0 + 5 * MIN);
    expect(remaining(t, T0 + 50 * MIN, S)).toBe(20 * MIN);
    t = resume(t, T0 + 50 * MIN, 'general');
    expect(remaining(t, T0 + 60 * MIN, S)).toBe(10 * MIN);
  });

  it('en reposo sigue los ajustes actuales', () => {
    expect(remaining(idleState(S), T0, { ...S, focus: 50 })).toBe(50 * MIN);
  });
});

describe('atribución por área', () => {
  it('reparte el tiempo entre las páginas visitadas y excluye las pausas', () => {
    let t = start(idleState(S), T0, 'hardware', S);
    t = mark(t, T0 + 10 * MIN, 'redes');
    t = pause(t, T0 + 15 * MIN);
    t = resume(t, T0 + 40 * MIN, 'redes');
    const { log } = complete(t, t.endsAt!, S);
    expect(log).toMatchObject({ completed: true, areaMs: { hardware: 10 * MIN, redes: 15 * MIN } });
  });

  it('con la pestaña cerrada, el resto del bloque va a la última área', () => {
    const t = start(idleState(S), T0, 'software', S);
    const { state, log } = complete(t, T0 + 3 * 60 * MIN, S);
    expect(log?.areaMs).toEqual({ software: 25 * MIN });
    expect(state).toMatchObject({ status: 'idle', phase: 'short', finished: 'focus' });
  });

  it('no registra descansos ni estudios interrumpidos de menos de 1 min', () => {
    const brk = start({ ...idleState(S), phase: 'short' }, T0, 'general', S);
    expect(complete(brk, brk.endsAt!, S).log).toBeNull();
    expect(restart(start(idleState(S), T0, 'general', S), T0 + 30_000, S).log).toBeNull();
    expect(restart(start(idleState(S), T0, 'general', S), T0 + 3 * MIN, S).log).toMatchObject({ completed: false });
  });

  it('obtiene el área de la ruta', () => {
    expect(areaFromPath('/leccion/hardware/arquitectura/modos')).toBe('hardware');
    expect(areaFromPath('/examen/redes/seguridad')).toBe('redes');
    expect(areaFromPath('/repaso/software/datos')).toBe('software');
    expect(areaFromPath('/flashcards')).toBe('general');
  });
});

describe('registro y racha', () => {
  it('es idempotente por bloque', () => {
    const e = { blockId: T0, day: dayKey(T0), areaMs: { redes: 25 * MIN }, completed: true };
    const first = addEntry({}, 0, e)!;
    expect(first.log[dayKey(T0)]).toEqual({ ms: { redes: 25 * MIN }, pomodoros: 1 });
    expect(addEntry(first.log, first.lastBlock, e)).toBeNull();
  });

  it('cuenta días seguidos con la meta; hoy sin cumplir no rompe la racha', () => {
    const log: StudyLog = {
      '2026-11-14': { ms: {}, pomodoros: 4 },
      '2026-11-15': { ms: {}, pomodoros: 5 },
      '2026-11-16': { ms: {}, pomodoros: 4 },
      '2026-11-17': { ms: {}, pomodoros: 1 },
    };
    expect(streak(log, 4, '2026-11-17')).toBe(3);
    expect(streak({ ...log, '2026-11-17': { ms: {}, pomodoros: 4 } }, 4, '2026-11-17')).toBe(4);
    expect(streak(log, 4, '2026-11-19')).toBe(0);
  });

  it('formatea el reloj', () => {
    expect(formatClock(25 * MIN)).toBe('25:00');
    expect(formatClock(61_500)).toBe('01:02');
  });
});
