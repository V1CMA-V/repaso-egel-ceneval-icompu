import { getCollection } from 'astro:content';
import { createMarkdownProcessor, type MarkdownRenderer } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { extractReviewCallouts, type ReviewKind } from './review';
import { AREAS, sectionFileId } from './curriculum';
import type { SidebarArea } from '@/components/react/Sidebar';
import type { Question } from './scoring';

export async function getLessons() {
  const all = await getCollection('lessons');
  return all.sort((a, b) => a.id.localeCompare(b.id));
}

export async function getSidebarAreas(): Promise<SidebarArea[]> {
  const lessons = await getLessons();
  return AREAS.map((a) => ({
    slug: a.slug,
    title: a.title,
    sections: a.sections.map((s) => ({
      key: s.key,
      title: s.title,
      lessons: lessons
        .filter((l) => l.id.startsWith(`${s.key}/`))
        .sort((x, y) => x.data.order - y.data.order)
        .map((l) => ({ id: l.id, title: l.data.title, readMinutes: l.data.readMinutes })),
    })),
  }));
}

// Same markdown pipeline as the lessons (see astro.config.mjs) so math renders identically.
let renderer: Promise<MarkdownRenderer> | undefined;
async function renderMarkdown(md: string) {
  renderer ??= createMarkdownProcessor({ remarkPlugins: [remarkMath], rehypePlugins: [rehypeKatex] });
  return (await (await renderer).render(md)).code;
}

export interface ReviewLesson {
  id: string;
  title: string;
  importante: string[];
  error: string[];
}

/** "Importante recordar" and "Errores comunes" of every lesson in a section, rendered to HTML. */
export async function getSectionReview(key: string): Promise<ReviewLesson[]> {
  const lessons = (await getLessons())
    .filter((l) => l.id.startsWith(`${key}/`))
    .sort((a, b) => a.data.order - b.data.order);
  const out = await Promise.all(
    lessons.map(async (l) => {
      const callouts = extractReviewCallouts(l.body ?? '');
      const render = (kind: ReviewKind) =>
        Promise.all(callouts.filter((c) => c.kind === kind).map((c) => renderMarkdown(c.markdown)));
      return { id: l.id, title: l.data.title, importante: await render('importante'), error: await render('error') };
    }),
  );
  return out.filter((l) => l.importante.length > 0 || l.error.length > 0);
}

export async function getSectionQuestions(key: string): Promise<(Question & { lesson?: string })[]> {
  const all = await getCollection('questions');
  return all.find((e) => e.id === sectionFileId(key))?.data.questions ?? [];
}

/** Every question tagged with its area and section (derived from the lesson id). */
export async function getBank() {
  const all = await getCollection('questions');
  return all.flatMap((e) =>
    e.data.questions.map((q) => {
      const [area = '', sec = ''] = (q.lesson ?? '').split('/');
      return { ...q, area, section: `${area}/${sec}` };
    }),
  );
}

export async function getAllQuestions() {
  const all = await getCollection('questions');
  return all.flatMap((e) => e.data.questions);
}

export async function getAllCards() {
  const all = await getCollection('flashcards');
  return all.flatMap((e) => e.data.cards.map((c) => ({ ...c, section: e.id })));
}
