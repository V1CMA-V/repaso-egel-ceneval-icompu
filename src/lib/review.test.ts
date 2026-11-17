import { describe, expect, it } from 'vitest';
import { extractReviewCallouts } from './review';

const mdx = `
import Callout from '@/components/Callout.astro';

## ¿Qué es?

<Callout type="que">
Definición.
</Callout>

<Callout type="importante">
- Dato inline con $2^n$.
</Callout>

## Importante recordar

<Callout type="importante" title="Clave">
- 1 hex = **4 bits**.
- Rango: $-2^{n-1}$.
</Callout>

## Errores comunes

<Callout type="error">
  - Sumar 1 de más.
  - Confundir \`carry\` con overflow.
</Callout>

<Callout type="tip">
No va.
</Callout>
`;

describe('extractReviewCallouts', () => {
  it('toma solo importante y error, en orden', () => {
    expect(extractReviewCallouts(mdx).map((c) => c.kind)).toEqual(['importante', 'importante', 'error']);
  });

  it('conserva el markdown interno sin espacios sobrantes', () => {
    const [, second, error] = extractReviewCallouts(mdx);
    expect(second?.markdown).toBe('- 1 hex = **4 bits**.\n- Rango: $-2^{n-1}$.');
    expect(error?.markdown).toBe('- Sumar 1 de más.\n- Confundir `carry` con overflow.');
  });

  it('ignora callouts vacíos y lecciones sin callouts', () => {
    expect(extractReviewCallouts('<Callout type="error">\n\n</Callout>')).toEqual([]);
    expect(extractReviewCallouts('## Solo texto')).toEqual([]);
  });
});
