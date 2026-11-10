import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const lessons = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/lessons' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    order: z.number(),
    readMinutes: z.number().default(5),
    examWeight: z.string().optional(),
  }),
});

export const questionSchema = z.object({
  id: z.string(),
  lesson: z.string().optional(),
  text: z.string(),
  /** reading passage shown above the question (comprensión lectora) */
  passage: z.string().optional(),
  code: z.string().optional(),
  options: z.array(z.string()).min(3).max(4),
  answer: z.number().int().min(0).max(3),
  explanation: z.string(),
  difficulty: z.enum(['facil', 'media', 'dificil']).default('media'),
});

const questions = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/questions' }),
  schema: z.object({ questions: z.array(questionSchema) }),
});

const flashcards = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/flashcards' }),
  schema: z.object({
    cards: z.array(z.object({ id: z.string(), front: z.string(), back: z.string() })),
  }),
});

export const collections = { lessons, questions, flashcards };
