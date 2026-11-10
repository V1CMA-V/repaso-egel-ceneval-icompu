import { Fragment } from 'react';
import { tokenize } from '@/lib/richtext';

/**
 * Renders plain text, formatting only the common formula fragments
 * (exponents like 2^(n-1) and short subscripts like V_ref) and keeping the surrounding font untouched.
 */
export default function RichText({ children }: { children: string }) {
  return (
    <>
      {tokenize(children).map((t, i) =>
        t.type === 'sup' ? (
          <sup key={i}>{t.value}</sup>
        ) : t.type === 'sub' ? (
          <sub key={i}>{t.value}</sub>
        ) : (
          <Fragment key={i}>{t.value}</Fragment>
        ),
      )}
    </>
  );
}
