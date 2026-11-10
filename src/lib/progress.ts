import { persistentAtom } from '@nanostores/persistent';
import { newCard, review, type CardState, type Grade } from './sm2';
import type { AreaScore, SimMode, SimState } from './simulacro';

export interface ExamRecord {
  best: number;
  total: number;
  passed: boolean;
  attempts: number[]; // timestamps
}

export interface ErrorRecord {
  count: number;
  last: number;
}

export interface SimRecord {
  id: string;
  at: number;
  mode: SimMode;
  areas: Record<string, AreaScore>;
}

export interface Progress {
  lessons: string[];
  exams: Record<string, ExamRecord>;
  errors: Record<string, ErrorRecord>;
  cards: Record<string, CardState>;
  /** práctica mixta acumulada por área */
  practice: Record<string, AreaScore>;
  sims: SimRecord[];
}

const empty = (): Progress => ({ lessons: [], exams: {}, errors: {}, cards: {}, practice: {}, sims: [] });

export const progress = persistentAtom<Progress>('ceneval:progress', empty(), {
  encode: JSON.stringify,
  decode: (raw) => {
    try {
      return { ...empty(), ...JSON.parse(raw) };
    } catch {
      return empty();
    }
  },
});

/** Simulacro en curso (se conserva al recargar la página). */
export const simActive = persistentAtom<SimState | null>('ceneval:sim', null, {
  encode: JSON.stringify,
  decode: (raw) => {
    try {
      return JSON.parse(raw) as SimState | null;
    } catch {
      return null;
    }
  },
});

export const theme = persistentAtom<'dark' | 'light'>('ceneval:theme', 'dark');

export function toggleLesson(id: string) {
  const p = progress.get();
  const done = p.lessons.includes(id);
  progress.set({ ...p, lessons: done ? p.lessons.filter((l) => l !== id) : [...p.lessons, id] });
}

/** Wrong answers add to the Tabla de errores; a correct answer on a tracked error counts it down. */
function applyErrors(prev: Record<string, ErrorRecord>, wrongIds: string[], rightIds: string[], now: number) {
  const errors = { ...prev };
  for (const id of wrongIds) errors[id] = { count: (errors[id]?.count ?? 0) + 1, last: now };
  for (const id of rightIds) {
    const e = errors[id];
    if (!e) continue;
    if (e.count <= 1) delete errors[id];
    else errors[id] = { ...e, count: e.count - 1 };
  }
  return errors;
}

export function recordExam(sectionKey: string, correct: number, total: number, passed: boolean, wrongIds: string[], rightIds: string[]) {
  const p = progress.get();
  const prev = p.exams[sectionKey];
  const now = Date.now();
  progress.set({
    ...p,
    errors: applyErrors(p.errors, wrongIds, rightIds, now),
    exams: {
      ...p.exams,
      [sectionKey]: {
        best: Math.max(prev?.best ?? 0, correct),
        total,
        passed: (prev?.passed ?? false) || passed,
        attempts: [...(prev?.attempts ?? []), now],
      },
    },
  });
}

export function recordPractice(areas: Record<string, AreaScore>, wrongIds: string[], rightIds: string[]) {
  const p = progress.get();
  const practice = { ...p.practice };
  for (const [area, s] of Object.entries(areas)) {
    const prev = practice[area] ?? { correct: 0, total: 0 };
    practice[area] = { correct: prev.correct + s.correct, total: prev.total + s.total };
  }
  progress.set({ ...p, practice, errors: applyErrors(p.errors, wrongIds, rightIds, Date.now()) });
}

export function recordSim(rec: SimRecord, wrongIds: string[], rightIds: string[]) {
  const p = progress.get();
  if (p.sims.some((s) => s.id === rec.id)) return; // idempotent
  progress.set({ ...p, sims: [...p.sims, rec], errors: applyErrors(p.errors, wrongIds, rightIds, Date.now()) });
}

export function gradeCard(id: string, grade: Grade) {
  const p = progress.get();
  progress.set({ ...p, cards: { ...p.cards, [id]: review(p.cards[id] ?? newCard(), grade) } });
}

export function exportProgress() {
  return JSON.stringify(progress.get(), null, 2);
}

export function importProgress(json: string) {
  const parsed = JSON.parse(json);
  progress.set({ ...empty(), ...parsed });
}
