import { describe, expect, it } from 'vitest';
import { tokenize } from './richtext';

const sup = (value: string) => ({ type: 'sup', value });
const sub = (value: string) => ({ type: 'sub', value });
const text = (value: string) => ({ type: 'text', value });

describe('tokenize · exponentes', () => {
  it('formatea el caso de la tarjeta (complemento a 2)', () => {
    expect(tokenize('Rango: −2^(n−1) a 2^(n−1)−1 (8 bits)')).toEqual([
      text('Rango: −2'),
      sup('n−1'),
      text(' a 2'),
      sup('n−1'),
      text('−1 (8 bits)'),
    ]);
  });

  it('exponentes simples y con signo', () => {
    expect(tokenize('2^n − 1')).toEqual([text('2'), sup('n'), text(' − 1')]);
    expect(tokenize('10^-6 F')).toEqual([text('10'), sup('−6'), text(' F')]);
    expect(tokenize('2^10 y 2^h')).toEqual([text('2'), sup('10'), text(' y 2'), sup('h')]);
  });

  it('soporta paréntesis anidados y base entre paréntesis', () => {
    expect(tokenize('Mp = e^(−ζπ/√(1−ζ²)) (16 %)')).toEqual([text('Mp = e'), sup('−ζπ/√(1−ζ²)'), text(' (16 %)')]);
    expect(tokenize('(−1)^S × 1.M')).toEqual([text('(−1)'), sup('S'), text(' × 1.M')]);
  });

  it('no toca un ^ sin base ni exponente válido', () => {
    expect(tokenize('^ solo')).toEqual([text('^ solo')]);
    expect(tokenize('a^(sin cerrar')).toEqual([text('a^(sin cerrar')]);
  });
});

describe('tokenize · subíndices', () => {
  it('formatea una letra con subíndice corto', () => {
    expect(tokenize('V_prom = D × Vcc')).toEqual([text('V'), sub('prom'), text(' = D × Vcc')]);
    expect(tokenize('R_T y V_LED')).toEqual([text('R'), sub('T'), text(' y V'), sub('LED')]);
    expect(tokenize('T_acierto')).toEqual([text('T'), sub('acierto')]);
  });

  it('no toca identificadores tipo snake_case', () => {
    expect(tokenize('id_cliente = 999')).toEqual([text('id_cliente = 999')]);
    expect(tokenize('nombre_producto depende de id_producto')).toEqual([text('nombre_producto depende de id_producto')]);
    expect(tokenize('dato_listo')).toEqual([text('dato_listo')]);
  });

  it('el texto normal pasa intacto', () => {
    expect(tokenize('Hola, mundo 2ⁿ O(n²)')).toEqual([text('Hola, mundo 2ⁿ O(n²)')]);
  });
});
