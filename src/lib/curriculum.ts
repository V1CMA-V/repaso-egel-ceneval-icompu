export interface SectionMeta {
  key: string; // "redes/seguridad"
  slug: string; // "seguridad"
  title: string;
  code: string; // "2.3"
  reactivos?: number;
}

export interface AreaMeta {
  slug: string;
  title: string;
  weight: string;
  reactivos: number;
  sections: SectionMeta[];
}

const s = (area: string, slug: string, code: string, title: string, reactivos?: number): SectionMeta => ({
  key: `${area}/${slug}`,
  slug,
  code,
  title,
  reactivos,
});

export const AREAS: AreaMeta[] = [
  {
    slug: 'hardware',
    title: 'Hardware',
    weight: '35%',
    reactivos: 49,
    sections: [
      s('hardware', 'electronica', '1.1', 'Circuitos y electrónica digital'),
      s('hardware', 'arquitectura', '1.2', 'Arquitectura de computadoras'),
      s('hardware', 'embebidos', '1.3', 'Sistemas embebidos'),
      s('hardware', 'control', '1.4', 'Teoría de control'),
    ],
  },
  {
    slug: 'redes',
    title: 'Redes',
    weight: '29%',
    reactivos: 41,
    sections: [
      s('redes', 'diseno', '2.1', 'Diseño de redes'),
      s('redes', 'administracion', '2.2', 'Administración de redes'),
      s('redes', 'seguridad', '2.3', 'Seguridad en redes', 17),
    ],
  },
  {
    slug: 'software',
    title: 'Software',
    weight: '36%',
    reactivos: 50,
    sections: [
      s('software', 'ingenieria', '3.1', 'Ingeniería de software'),
      s('software', 'so', '3.2', 'Programación y software base'),
      s('software', 'datos', '3.3', 'Datos y algoritmos', 21),
    ],
  },
  {
    slug: 'lenguaje',
    title: 'Lenguaje y Comunicación',
    weight: 'sección aparte',
    reactivos: 30,
    sections: [
      s('lenguaje', 'lectura', 'L.1', 'Comprensión lectora'),
      s('lenguaje', 'redaccion', 'L.2', 'Redacción indirecta'),
    ],
  },
];

/** Día exacto del examen (la aplicación abarca la semana del 7 al 10 dic; a este usuario le toca el 9). */
export const EXAM_START = '2026-12-09';
export const EXAM_END = '2026-12-09';
/** Fecha límite sugerida para terminar las lecciones: el simulacro completo del plan (28 nov). */
export const STUDY_DEADLINE = '2026-11-28';

export const sectionFileId = (key: string) => key.replace('/', '-');
export const findSection = (key: string) =>
  AREAS.flatMap((a) => a.sections).find((x) => x.key === key);
export const findArea = (slug: string) => AREAS.find((a) => a.slug === slug);
