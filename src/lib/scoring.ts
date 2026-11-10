export const PASS_RATIO = 0.7;
export const MAX_ATTEMPTS_PER_HOUR = 5;
const HOUR = 3_600_000;

export interface Question {
  id: string;
  text: string;
  passage?: string;
  code?: string;
  options: string[];
  answer: number;
  explanation: string;
}

export interface ScoreResult {
  correct: number;
  total: number;
  needed: number;
  passed: boolean;
  wrongIds: string[];
}

export function neededToPass(total: number, ratio = PASS_RATIO) {
  return Math.ceil(total * ratio);
}

export function score(questions: Question[], answers: Record<string, number | undefined>): ScoreResult {
  const wrongIds = questions.filter((q) => answers[q.id] !== q.answer).map((q) => q.id);
  const correct = questions.length - wrongIds.length;
  const needed = neededToPass(questions.length);
  return { correct, total: questions.length, needed, passed: correct >= needed, wrongIds };
}

export function attemptsLeft(timestamps: number[], now = Date.now()) {
  const recent = timestamps.filter((t) => now - t < HOUR).length;
  return Math.max(0, MAX_ATTEMPTS_PER_HOUR - recent);
}

export function shuffle<T>(arr: T[], rnd: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Ceneval-style index (700–1300) estimated linearly from % correct. Rough estimate only. */
export function estimateIndex(ratio: number) {
  return Math.round(700 + Math.min(1, Math.max(0, ratio)) * 600);
}
