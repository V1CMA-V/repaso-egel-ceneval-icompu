import { shuffle, type Question } from './scoring';

export interface BankQuestion extends Question {
  area: string; // hardware | redes | software | lenguaje
  section: string; // "redes/seguridad"
  lesson?: string;
}

let cache: Promise<BankQuestion[]> | null = null;

/** Loads the whole question bank (static /bank.json generated at build time). */
export function loadBank(): Promise<BankQuestion[]> {
  cache ??= fetch('/bank.json')
    .then((r) => {
      if (!r.ok) throw new Error(`No se pudo cargar el banco de preguntas (${r.status})`);
      return r.json() as Promise<BankQuestion[]>;
    })
    .catch((e) => {
      cache = null;
      throw e;
    });
  return cache;
}

export function sample<T>(arr: T[], n: number, rnd: () => number = Math.random): T[] {
  return shuffle(arr, rnd).slice(0, Math.max(0, Math.min(n, arr.length)));
}
