import { describe, expect, it } from 'vitest';
import type { BankQuestion } from './bank';
import { buildSim, formatClock, remainingSeconds, scoreSim, summarize } from './simulacro';

const make = (area: string, n: number): BankQuestion[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `${area}-${i}`,
    area,
    section: `${area}/x`,
    text: 'q',
    options: ['a', 'b', 'c'],
    answer: 1,
    explanation: '',
  }));

const bank = [...make('hardware', 100), ...make('redes', 80), ...make('software', 100), ...make('lenguaje', 120)];

describe('buildSim', () => {
  it('completo respeta la composición del examen real (49/41/50 + 60)', () => {
    const sim = buildSim('completo', bank, 1000);
    expect(sim.phases).toHaveLength(2);
    expect(sim.phases[0]!.ids).toHaveLength(140);
    expect(sim.phases[0]!.minutes).toBe(420);
    expect(sim.phases[1]!.ids).toHaveLength(60);
    expect(sim.phases[1]!.minutes).toBe(120);
    const disc = sim.phases[0]!.ids;
    expect(disc.filter((id) => id.startsWith('hardware')).length).toBe(49);
    expect(disc.filter((id) => id.startsWith('redes')).length).toBe(41);
    expect(disc.filter((id) => id.startsWith('software')).length).toBe(50);
    expect(new Set(disc).size).toBe(140); // sin repetidas
  });

  it('mini simulacro usa solo su área y 3 min por reactivo', () => {
    const sim = buildSim('redes', bank, 0);
    expect(sim.phases[0]!.ids).toHaveLength(14);
    expect(sim.phases[0]!.ids.every((id) => id.startsWith('redes'))).toBe(true);
    expect(sim.phases[0]!.minutes).toBe(42);
  });

  it('si el banco es chico usa todo lo disponible', () => {
    const small = make('hardware', 5);
    expect(summarize('hardware', small).questions).toBe(5);
  });
});

describe('tiempo y calificación', () => {
  it('calcula el tiempo restante y no baja de cero', () => {
    const sim = buildSim('hardware', bank, 0); // 12 q → 36 min
    expect(remainingSeconds(sim, 60_000)).toBe(36 * 60 - 60);
    expect(remainingSeconds(sim, 10 * 3_600_000)).toBe(0);
  });

  it('formatea el reloj', () => {
    expect(formatClock(3661)).toBe('01:01:01');
    expect(formatClock(-5)).toBe('00:00:00');
  });

  it('las no contestadas cuentan como incorrectas y se agrupa por área', () => {
    const sim = buildSim('hardware', bank, 0);
    const ids = sim.phases[0]!.ids;
    sim.answers[ids[0]!] = 1; // correcta
    sim.answers[ids[1]!] = 0; // incorrecta
    const byId = new Map(bank.map((q) => [q.id, q]));
    const s = scoreSim(sim, byId);
    expect(s.total).toBe(12);
    expect(s.correct).toBe(1);
    expect(s.unanswered).toBe(10);
    expect(s.byArea.hardware).toEqual({ correct: 1, total: 12 });
    expect(s.wrongIds).toHaveLength(11);
  });
});
