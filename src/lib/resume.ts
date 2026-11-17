import { persistentAtom } from '@nanostores/persistent';

/** Last lesson the user was reading and how far they got (0–1), for "Continuar donde te quedaste". */
export interface LastLesson {
  id: string;
  title: string;
  section: string;
  progress: number;
  at: number;
}

export const lastLesson = persistentAtom<LastLesson | null>('ceneval:last-lesson', null, {
  encode: JSON.stringify,
  decode: (raw) => {
    try {
      const v = JSON.parse(raw);
      return v && typeof v.id === 'string' && typeof v.progress === 'number' ? (v as LastLesson) : null;
    } catch {
      return null;
    }
  },
});

/** Set right before navigating from the resume button, so the lesson page restores the position once. */
export const RESUME_FLAG = 'ceneval:resume';

export function lessonPath(id: string) {
  return `/leccion/${id}`;
}
