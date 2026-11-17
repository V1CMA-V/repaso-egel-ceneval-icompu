import { describe, expect, it } from 'vitest';
import { dueCards, nextStep, pendingErrors } from './today';

const NOW = 1_000_000;

describe('dueCards', () => {
  it('separa repasos vencidos de tarjetas nuevas', () => {
    const states = {
      a: { ease: 2.5, interval: 1, reps: 1, due: NOW - 1 },
      b: { ease: 2.5, interval: 6, reps: 2, due: NOW + 1 },
      c: { ease: 2.5, interval: 1, reps: 1, due: NOW },
    };
    expect(dueCards(['a', 'b', 'c', 'd', 'e'], states, NOW)).toEqual({ review: 2, fresh: 2 });
  });
});

describe('pendingErrors', () => {
  it('cuenta preguntas y fallos, ignorando ids fuera del banco', () => {
    const errors = { q1: { count: 2, last: 0 }, q2: { count: 1, last: 0 }, viejo: { count: 5, last: 0 } };
    expect(pendingErrors(['q1', 'q2', 'q3'], errors)).toEqual({ questions: 2, misses: 3 });
  });
});

describe('nextStep', () => {
  const lesson = (id: string) => ({ id, title: id.toUpperCase(), readMinutes: 10 });
  const areas = [
    {
      slug: 'a',
      title: 'Área A',
      sections: [
        { key: 'a/x', title: 'X', lessons: [lesson('a/x/1'), lesson('a/x/2')] },
        { key: 'a/vacia', title: 'Vacía', lessons: [] },
      ],
    },
    { slug: 'b', title: 'Área B', sections: [{ key: 'b/y', title: 'Y', lessons: [lesson('b/y/1')] }] },
  ];

  it('devuelve la primera lección sin completar en orden del temario', () => {
    expect(nextStep(areas, ['a/x/1'], [])).toMatchObject({ kind: 'lesson', id: 'a/x/2', section: 'X', area: 'Área A' });
    expect(nextStep(areas, ['a/x/1', 'a/x/2'], [])).toMatchObject({ kind: 'lesson', id: 'b/y/1' });
  });

  it('con todas las lecciones hechas sugiere el primer examen pendiente (sin secciones vacías)', () => {
    const all = ['a/x/1', 'a/x/2', 'b/y/1'];
    expect(nextStep(areas, all, [])).toMatchObject({ kind: 'exam', key: 'a/x' });
    expect(nextStep(areas, all, ['a/x'])).toMatchObject({ kind: 'exam', key: 'b/y' });
    expect(nextStep(areas, all, ['a/x', 'b/y'])).toBeNull();
  });
});
