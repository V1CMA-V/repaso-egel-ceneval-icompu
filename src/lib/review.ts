export type ReviewKind = 'importante' | 'error';

export interface ReviewCallout {
  kind: ReviewKind;
  /** Raw markdown inside the callout. */
  markdown: string;
}

const CALLOUT = /<Callout\s+[^>]*?type=["'](importante|error)["'][^>]*>([\s\S]*?)<\/Callout>/g;

/** Extracts the "Importante recordar" and "Error común" callouts from a lesson's MDX source, in order. */
export function extractReviewCallouts(mdx: string): ReviewCallout[] {
  const out: ReviewCallout[] = [];
  for (const m of mdx.matchAll(CALLOUT)) {
    const markdown = dedent(m[2] ?? '').trim();
    if (markdown) out.push({ kind: m[1] as ReviewKind, markdown });
  }
  return out;
}

/** Removes the common leading indentation so indented callout bodies aren't parsed as code blocks. */
function dedent(text: string) {
  const lines = text.split('\n');
  const indents = lines.filter((l) => l.trim()).map((l) => l.match(/^[ \t]*/)![0].length);
  const min = indents.length ? Math.min(...indents) : 0;
  return min ? lines.map((l) => l.slice(min)).join('\n') : text;
}
