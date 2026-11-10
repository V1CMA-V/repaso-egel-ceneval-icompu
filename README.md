# EGEL Plus ICOMPU · Plataforma de estudio

Sitio web para prepararse para el **EGEL Plus de Ingeniería en Computación (ICOMPU) de CENEVAL**: lecciones por bloques, exámenes por sección, flashcards con repetición espaciada, práctica mixta, simulacros cronometrados y seguimiento del progreso. Todo el contenido está en español.

> Material de estudio independiente. **No está afiliado a CENEVAL** ni reproduce reactivos oficiales; úsalo junto con la guía oficial y los exámenes de práctica de CENEVAL.

## Qué incluye

| Función | Descripción |
| --- | --- |
| **Lecciones** | Hardware, Redes, Software y Lenguaje y Comunicación, con explicación detallada, tips, errores comunes, ejemplo resuelto y preguntas de práctica. |
| **Exámenes de sección** | 12 preguntas al azar por sección; se aprueban con 70 % y tienen 5 intentos por hora. |
| **Preguntas tipo CENEVAL** | Casos aplicados con opciones A–D y explicación de cada respuesta. Las de lectura incluyen su texto. |
| **Flashcards** | Repetición espaciada (SM-2 simplificado) con sesión diaria. |
| **Práctica mixta** (`/practica`) | Preguntas al azar por área o sección, o solo de tu Tabla de errores. |
| **Simulacros** (`/simulacro`) | Completo (Disciplinar 140 reactivos en 7 h + Lenguaje 30 en 2 h) y mini por área, con cronómetro, marcar para revisar y revisión al final. El avance sobrevive a una recarga. |
| **Tabla de errores** | Acumula tus fallos; acertar de nuevo los va quitando. |
| **Progreso y ritmo** | Contador de días al examen y cálculo de lecciones/tiempo pendientes según tu avance. |

El progreso se guarda **solo en el navegador** (`localStorage`), sin cuentas. Se puede exportar e importar desde `/progreso`.

## Stack

- [Astro](https://astro.build) 7 + MDX (contenido estático) con islas de [React](https://react.dev) 19
- [Tailwind CSS](https://tailwindcss.com) v4 + `@tailwindcss/typography`
- [nanostores](https://github.com/nanostores/nanostores) + `@nanostores/persistent` para el estado y el progreso local
- KaTeX (`remark-math` + `rehype-katex`) para fórmulas
- Vitest para la lógica (puntuación, SM-2, simulacros, plan de estudio)
- Gestor de paquetes: **pnpm**

## Requisitos

- Node.js reciente (probado con v26)
- pnpm 12 (`packageManager` en `package.json`)

## Primeros pasos

```bash
pnpm install
pnpm dev        # http://localhost:4321
```

| Comando | Qué hace |
| --- | --- |
| `pnpm dev` | Servidor de desarrollo |
| `pnpm exec astro build` | Compila el sitio estático en `dist/` |
| `pnpm preview` | Sirve el build local |
| `pnpm test` | Ejecuta los tests de Vitest |
| `pnpm exec tsc --noEmit -p . --ignoreDeprecations 6.0` | Revisa tipos de los `.ts`/`.tsx` |

### Problema conocido: `pnpm build` y `pnpm check`

El script `build` ejecuta `astro check` antes de compilar, y `astro check` falla hoy con un error interno de Node 26 (`this.bridge.deleteEnv is not a function`). Mientras tanto, compila con `pnpm exec astro build` y revisa tipos con el comando de `tsc` de la tabla.

## Estructura

```
src/
├── content/
│   ├── lessons/<area>/<seccion>/NN-slug.mdx   # lecciones
│   ├── questions/<area>-<seccion>.json        # banco de preguntas
│   └── flashcards/<area>-<seccion>.json       # tarjetas
├── content.config.ts      # esquemas Zod de las colecciones
├── components/            # Callout, LessonPractice (Astro) y componentes React
│   └── react/             # Quiz, Simulacro, PracticeMixta, Flashcards, Sidebar…
├── layouts/Base.astro
├── lib/
│   ├── curriculum.ts      # áreas, secciones y fechas del examen
│   ├── scoring.ts, sm2.ts, simulacro.ts, plan.ts, progress.ts, bank.ts, content.ts
│   └── *.test.ts
├── pages/                 # inicio, lecciones, exámenes, práctica, simulacro, errores…
└── styles/global.css
```

Áreas y secciones (ver `src/lib/curriculum.ts`):

- **Hardware**: electrónica, arquitectura, embebidos y control
- **Redes**: diseño, administración y seguridad
- **Software**: ingeniería, programación y software base, datos y algoritmos
- **Lenguaje**: comprensión lectora y redacción indirecta

## Agregar contenido

### Lección

Crea `src/content/lessons/<area>/<seccion>/NN-nombre.mdx` con este frontmatter:

```mdx
---
title: 'Título de la lección'
summary: 'Resumen de una línea.'
order: 1            # orden dentro de la sección
readMinutes: 10
examWeight: 'Redes 2.3 · Seguridad (17 reactivos)'   # opcional
---

import Callout from '@/components/Callout.astro';

## ¿Qué es?

<Callout type="que">Definición breve.</Callout>
```

Tipos de `Callout`: `que`, `tip`, `importante`, `error`, `examen`. Las fórmulas usan `$...$` y `$$...$$`. En MDX evita `{`, `<` y `$` sueltos fuera de código o fórmulas.

### Preguntas

Agrega objetos a `src/content/questions/<area>-<seccion>.json` (`{ "questions": [...] }`). El campo `lesson` enlaza la pregunta con su lección y define su área y sección en el banco.

```json
{
  "id": "red-seg-030",
  "lesson": "redes/seguridad/03-criptografia",
  "text": "Enunciado…",
  "passage": "Texto de lectura opcional",
  "code": "Código opcional",
  "options": ["A", "B", "C", "D"],
  "answer": 2,
  "explanation": "Por qué es correcta y por qué fallan las demás.",
  "difficulty": "media"
}
```

- `options`: de 3 a 4 opciones; `answer` es el índice (0–3).
- `difficulty`: `facil`, `media` o `dificil`.
- Los `id` deben ser únicos en todo el banco. Las preguntas de una lección aparecen como práctica al final de ella.

### Flashcards

`src/content/flashcards/<area>-<seccion>.json`:

```json
{ "cards": [{ "id": "fc-red-seg-25", "front": "Pregunta", "back": "Respuesta" }] }
```

### Fechas del examen

En `src/lib/curriculum.ts`: `EXAM_START`, `EXAM_END` y `STUDY_DEADLINE` (fecha sugerida para terminar las lecciones). Alimentan el contador y el panel "Tu ritmo para llegar al examen". Los minutos estimados por lección y por examen están en `src/lib/plan.ts`.

## Despliegue

El sitio es **100 % estático** (`dist/`) y se puede publicar en Vercel, Cloudflare Pages, Netlify o GitHub Pages con el comando de build `pnpm exec astro build` y directorio de salida `dist`.

## Notas

- El banco de preguntas se sirve como `/bank.json`, generado en el build, para la práctica mixta y los simulacros.
- El avance de un simulacro en curso se guarda en `localStorage` (`ceneval:sim`) y el progreso general en `ceneval:progress`.
- Las respuestas y cálculos del contenido fueron redactados para estudio y no se contrastaron con la guía oficial: revísalos antes de confiar en ellos.
