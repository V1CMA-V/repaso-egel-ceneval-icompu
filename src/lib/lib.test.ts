import { describe, expect, it } from 'vitest';
import { attemptsLeft, neededToPass, score, type Question } from './scoring';
import { isDue, newCard, review } from './sm2';

const q = (id: string, answer: number): Question => ({ id, text: id, options: ['a', 'b', 'c'], answer, explanation: '' });

describe('scoring', () => {
  it('needs 70% rounded up', () => {
    expect(neededToPass(10)).toBe(7);
    expect(neededToPass(6)).toBe(5);
  });
  it('scores answers and lists wrong ones', () => {
    const r = score([q('1', 0), q('2', 1), q('3', 2)], { '1': 0, '2': 0 });
    expect(r.correct).toBe(1);
    expect(r.wrongIds).toEqual(['2', '3']);
    expect(r.passed).toBe(false);
  });
  it('limits attempts per hour', () => {
    const now = Date.now();
    expect(attemptsLeft([now, now - 1000, now - 7_200_000], now)).toBe(3);
  });
});

describe('sm2', () => {
  it('new cards are due; good reviews push the due date out', () => {
    const now = 1_000_000;
    const c = review(newCard(now), 2, now);
    expect(c.due).toBeGreaterThan(now);
    expect(isDue(c, now)).toBe(false);
    expect(isDue(undefined)).toBe(true);
  });
  it('failing resets repetitions', () => {
    const good = review(review(newCard(0), 2, 0), 2, 0);
    expect(review(good, 0, 0).reps).toBe(0);
  });
});
