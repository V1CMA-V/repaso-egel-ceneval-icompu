export const DAY = 86_400_000;

/** Minutos que se estiman por lección además de leerla: resolver sus preguntas de práctica. */
export const PRACTICE_MIN_PER_LESSON = 15;
/** Minutos estimados por examen de sección (12 preguntas + revisión). */
export const EXAM_MIN_PER_SECTION = 30;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Días naturales desde hoy hasta una fecha 'YYYY-MM-DD' (0 = hoy, negativo = ya pasó). */
export function daysUntil(dateStr: string, now: Date = new Date()): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(y!, m! - 1, d!);
  return Math.round((target.getTime() - startOfDay(now).getTime()) / DAY);
}

export interface LessonInfo {
  id: string;
  readMinutes: number;
  section: string; // "redes/seguridad"
}

export interface StudyLoad {
  total: number;
  pending: number;
  pendingExams: number;
  readMinutes: number;
  minutes: number; // lectura + práctica + exámenes pendientes
}

export function studyLoad(lessons: LessonInfo[], doneIds: string[], sectionKeys: string[], passedKeys: string[]): StudyLoad {
  const done = new Set(doneIds);
  const pending = lessons.filter((l) => !done.has(l.id));
  const passed = new Set(passedKeys);
  const pendingExams = sectionKeys.filter((k) => !passed.has(k)).length;
  const readMinutes = pending.reduce((n, l) => n + l.readMinutes, 0);
  return {
    total: lessons.length,
    pending: pending.length,
    pendingExams,
    readMinutes,
    minutes: readMinutes + pending.length * PRACTICE_MIN_PER_LESSON + pendingExams * EXAM_MIN_PER_SECTION,
  };
}

export function pace(load: StudyLoad, days: number) {
  const d = Math.max(1, days);
  return { lessonsPerDay: load.pending / d, minutesPerDay: load.minutes / d };
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}
