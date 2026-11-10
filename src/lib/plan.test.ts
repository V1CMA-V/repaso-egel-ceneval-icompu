import { describe, expect, it } from 'vitest';
import { daysUntil, formatDuration, pace, studyLoad } from './plan';

describe('daysUntil', () => {
  it('cuenta días naturales sin importar la hora', () => {
    expect(daysUntil('2026-12-07', new Date(2026, 10, 9, 23, 59))).toBe(28);
    expect(daysUntil('2026-12-07', new Date(2026, 10, 9, 0, 1))).toBe(28);
  });
  it('0 el mismo día y negativo cuando ya pasó', () => {
    expect(daysUntil('2026-12-07', new Date(2026, 11, 7, 15))).toBe(0);
    expect(daysUntil('2026-12-07', new Date(2026, 11, 8))).toBe(-1);
  });
});

describe('studyLoad y ritmo', () => {
  const lessons = [
    { id: 'a/x/1', readMinutes: 10, section: 'a/x' },
    { id: 'a/x/2', readMinutes: 20, section: 'a/x' },
    { id: 'b/y/1', readMinutes: 30, section: 'b/y' },
  ];
  it('suma lectura + práctica + exámenes pendientes', () => {
    const l = studyLoad(lessons, [], ['a/x', 'b/y'], []);
    expect(l.pending).toBe(3);
    expect(l.readMinutes).toBe(60);
    expect(l.minutes).toBe(60 + 3 * 15 + 2 * 30);
  });
  it('descuenta lo completado y los exámenes aprobados', () => {
    const l = studyLoad(lessons, ['a/x/1', 'a/x/2'], ['a/x', 'b/y'], ['a/x']);
    expect(l.pending).toBe(1);
    expect(l.pendingExams).toBe(1);
    expect(l.minutes).toBe(30 + 15 + 30);
  });
  it('calcula ritmo diario sin dividir entre cero', () => {
    const l = studyLoad(lessons, [], [], []);
    expect(pace(l, 3).lessonsPerDay).toBe(1);
    expect(pace(l, 0).lessonsPerDay).toBe(3);
  });
  it('formatea duraciones', () => {
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDuration(120)).toBe('2 h');
    expect(formatDuration(95)).toBe('1 h 35 min');
  });
});
