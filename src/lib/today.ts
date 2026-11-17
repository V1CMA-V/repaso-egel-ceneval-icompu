import type { SidebarArea } from '@/components/react/Sidebar';
import type { ErrorRecord } from './progress';
import type { CardState } from './sm2';

export interface DueCards {
  /** Cards already studied whose review date has arrived. */
  review: number;
  /** Cards never studied (the Flashcards queue shows them too). */
  fresh: number;
}

/** Flashcards waiting in the review queue, split into due reviews and new cards. */
export function dueCards(cardIds: string[], states: Record<string, CardState>, now = Date.now()): DueCards {
  let review = 0;
  let fresh = 0;
  for (const id of cardIds) {
    const s = states[id];
    if (!s) fresh++;
    else if (s.due <= now) review++;
  }
  return { review, fresh };
}

export interface PendingErrors {
  /** Distinct questions in the Tabla de errores. */
  questions: number;
  /** Sum of misses still to be cleared. */
  misses: number;
}

/** Errors still tracked, ignoring ids no longer present in the question bank. */
export function pendingErrors(questionIds: string[], errors: Record<string, ErrorRecord>): PendingErrors {
  let questions = 0;
  let misses = 0;
  for (const id of questionIds) {
    const e = errors[id];
    if (!e) continue;
    questions++;
    misses += e.count;
  }
  return { questions, misses };
}

export type NextStep =
  | { kind: 'lesson'; id: string; title: string; readMinutes: number; section: string; area: string }
  | { kind: 'exam'; key: string; section: string; area: string }
  | null;

/**
 * Next step of the study plan, following the temario order: the first lesson not completed;
 * once every lesson is done, the first section exam not passed yet.
 */
export function nextStep(areas: SidebarArea[], doneLessons: string[], passedExams: string[]): NextStep {
  const done = new Set(doneLessons);
  for (const a of areas) {
    for (const s of a.sections) {
      const l = s.lessons.find((x) => !done.has(x.id));
      if (l) return { kind: 'lesson', id: l.id, title: l.title, readMinutes: l.readMinutes, section: s.title, area: a.title };
    }
  }
  const passed = new Set(passedExams);
  for (const a of areas) {
    for (const s of a.sections) {
      if (s.lessons.length > 0 && !passed.has(s.key)) return { kind: 'exam', key: s.key, section: s.title, area: a.title };
    }
  }
  return null;
}
