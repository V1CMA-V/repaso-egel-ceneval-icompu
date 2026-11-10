import { getCollection } from 'astro:content';
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
