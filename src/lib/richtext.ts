export type RichToken = { type: 'text' | 'sup' | 'sub'; value: string };

const isWord = (c: string | undefined) => c !== undefined && /[A-Za-z0-9_]/.test(c);
/** hyphen-minus → real minus sign, only inside exponents */
const minus = (s: string) => s.replace(/-/g, '−');

/** Reads the exponent after a "^": a balanced "(...)" group, or a number / single letter (optional sign). */
function readExponent(s: string, start: number): { value: string; end: number } | null {
  if (s[start] === '(') {
    let depth = 0;
    for (let i = start; i < s.length; i++) {
      if (s[i] === '(') depth++;
      else if (s[i] === ')' && --depth === 0) return { value: s.slice(start + 1, i), end: i + 1 };
    }
    return null;
  }
  const m = /^[-−]?(?:\d+(?:\.\d+)?|[A-Za-zζπαβγδ])/.exec(s.slice(start));
  return m ? { value: m[0], end: start + m[0].length } : null;
}

/**
 * Splits plain text into text / superscript / subscript tokens for the common cases only:
 *  - exponents:  2^n · 2^(n-1) · 10^-6 · e^(−ζπ/√(1−ζ²)) · (−1)^S
 *  - subscripts: V_ref · t_on · R_T   (single letter + short word; so id_cliente, nombre_producto stay untouched)
 */
export function tokenize(input: string): RichToken[] {
  const out: RichToken[] = [];
  let buf = '';
  const flush = () => {
    if (buf) out.push({ type: 'text', value: buf });
    buf = '';
  };

  let i = 0;
  while (i < input.length) {
    const c = input[i]!;

    if (c === '^' && i > 0 && /[A-Za-z0-9)\]]/.test(input[i - 1]!)) {
      const exp = readExponent(input, i + 1);
      if (exp) {
        flush();
        out.push({ type: 'sup', value: minus(exp.value) });
        i = exp.end;
        continue;
      }
    }

    if (c === '_' && i > 0 && /[A-Za-z]/.test(input[i - 1]!) && !isWord(input[i - 2])) {
      const m = /^[A-Za-z0-9]{1,10}/.exec(input.slice(i + 1));
      if (m && !isWord(input[i + 1 + m[0].length])) {
        flush();
        out.push({ type: 'sub', value: m[0] });
        i += 1 + m[0].length;
        continue;
      }
    }

    buf += c;
    i++;
  }
  flush();
  return out;
}
