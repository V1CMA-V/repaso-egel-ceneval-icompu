export interface CardState {
  ease: number; // easiness factor
  interval: number; // days
  reps: number;
  due: number; // epoch ms
}

export type Grade = 0 | 1 | 2 | 3; // 0 otra vez, 1 difícil, 2 bien, 3 fácil

const DAY = 86_400_000;

export const newCard = (now = Date.now()): CardState => ({ ease: 2.5, interval: 0, reps: 0, due: now });

/** Simplified SM-2 spaced repetition. */
export function review(card: CardState, grade: Grade, now = Date.now()): CardState {
  if (grade === 0) {
    return { ease: Math.max(1.3, card.ease - 0.2), interval: 0, reps: 0, due: now + 10 * 60_000 };
  }
  const ease = Math.max(1.3, card.ease + (grade === 1 ? -0.15 : grade === 3 ? 0.15 : 0));
  const reps = card.reps + 1;
  let interval: number;
  if (reps === 1) interval = grade === 1 ? 1 : grade === 3 ? 3 : 1;
  else if (reps === 2) interval = grade === 1 ? 3 : grade === 3 ? 8 : 6;
  else interval = Math.round(card.interval * ease * (grade === 1 ? 0.8 : grade === 3 ? 1.3 : 1));
  return { ease, interval, reps, due: now + Math.max(1, interval) * DAY };
}

export const isDue = (card: CardState | undefined, now = Date.now()) => !card || card.due <= now;
