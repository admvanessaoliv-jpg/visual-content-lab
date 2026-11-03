/**
 * Medição de texto usada pelo gerador para ajustar o tamanho da fonte
 * à caixa disponível (sem estouro). O algoritmo de quebra segue o do
 * Konva.Text (quebra por palavra + letterSpacing por caractere).
 */
export type WidthFn = (text: string, font: string) => number;

let ctx: CanvasRenderingContext2D | null = null;
let custom: WidthFn | null = null;

/** Permite injetar um medidor (testes em Node) */
export function setMeasurer(fn: WidthFn | null) { custom = fn; }

export function measureWidth(text: string, font: string) {
  if (custom) return custom(text, font);
  if (!ctx) ctx = document.createElement('canvas').getContext('2d');
  ctx!.font = font;
  return ctx!.measureText(text).width;
}

export interface TextSpec {
  fontFamily: string;
  fontWeight: number;
  italic?: boolean;
  /** espaçamento entre letras em em (ex.: 0.05 = 5% do tamanho) */
  letterSpacingEm?: number;
  lineHeight: number;
  uppercase?: boolean;
}

const fontString = (s: TextSpec, size: number) => `${s.italic ? 'italic ' : ''}${s.fontWeight} ${size}px "${s.fontFamily}", Inter, sans-serif`;

export function wrapLines(text: string, s: TextSpec, size: number, maxWidth: number): string[] {
  const t = s.uppercase ? text.toLocaleUpperCase('pt-BR') : text;
  const font = fontString(s, size);
  const ls = (s.letterSpacingEm ?? 0) * size;
  const w = (str: string) => measureWidth(str, font) + ls * str.length;
  const out: string[] = [];
  for (const para of t.split('\n')) {
    const words = para.split(' ');
    let line = '';
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (w(test) <= maxWidth || !line) {
        line = test;
      } else {
        out.push(line);
        line = word;
      }
    }
    out.push(line);
  }
  return out;
}

export function measureBlock(text: string, s: TextSpec, size: number, maxWidth: number) {
  const lines = wrapLines(text, s, size, maxWidth);
  const font = fontString(s, size);
  const ls = (s.letterSpacingEm ?? 0) * size;
  const widest = Math.max(...lines.map((l) => measureWidth(l, font) + ls * l.length));
  return { lines, height: lines.length * size * s.lineHeight, widest };
}

/** Maior tamanho de fonte que cabe na caixa, sem quebrar palavras ao meio */
export function fitFontSize(text: string, s: TextSpec, maxWidth: number, maxHeight: number, maxSize: number, minSize = 14) {
  let lo = minSize, hi = maxSize, best = minSize;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const m = measureBlock(text, s, mid, maxWidth);
    if (m.height <= maxHeight && m.widest <= maxWidth + 0.5) { best = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return best;
}
