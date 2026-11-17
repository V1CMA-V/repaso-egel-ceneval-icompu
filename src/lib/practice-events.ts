/** Fired on window when a non-graded practice quiz is submitted (lesson practice). */
export const PRACTICE_FINISHED = 'ceneval:practice-finished';

export interface PracticeFinishedDetail {
  sectionKey: string;
  correct: number;
  total: number;
  passed: boolean;
}

export function emitPracticeFinished(detail: PracticeFinishedDetail) {
  window.dispatchEvent(new CustomEvent<PracticeFinishedDetail>(PRACTICE_FINISHED, { detail }));
}
