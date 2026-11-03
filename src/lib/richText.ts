/**
 * Motor de texto rico do Visual Content Lab.
 *
 * Um único bloco de texto aceita estilos misturados por marcação simples:
 *   ==destaque==   cor + fonte de destaque (ex.: serifa itálica verde)
 *   **negrito**    peso de negrito
 *   *itálico*      itálico
 * Também suporta letra capitular decorativa (fonte script em escala maior)
 * e espaçamento entre parágrafos. O mesmo layout é usado para medir
 * (gerador), desenhar no editor e exportar o PNG.
 */
import { measureWidth } from './measure';

export interface RichStyle {
  fontFamily: string;
  fontWeight: number;
  italic: boolean;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number; // px
  align: 'left' | 'center' | 'right';
  uppercase: boolean;
  fill: string;
  highlightColor: string;
  highlightFamily: string;
  highlightItalic: boolean;
  highlightWeight: number;
  boldWeight: number;
  dropCap: { family: string; scale: number; color?: string } | null;
  paragraphSpacing: number; // em
}

interface Flags { bold: boolean; italic: boolean; hl: boolean; cap?: boolean }
interface Seg { text: string; f: Flags }
type Token = { kind: 'word'; segs: Seg[] } | { kind: 'para' } | { kind: 'br' };

export interface PlacedSeg { text: string; font: string; color: string; x: number; baseline: number }
export interface RichLayout { segs: PlacedSeg[]; width: number; height: number; lines: number; widest: number }

/** Remove as marcações (para busca, nomes de camada, etc.) */
export const stripMarkup = (t: string) => t.replace(/==|\*\*|\*/g, '');
export const hasMarkup = (t: string) => /==.+?==|\*\*.+?\*\*|\*[^*\s][^*]*\*/.test(t);

function tokenize(text: string, dropCap: boolean): Token[] {
  const tokens: Token[] = [];
  const f: Flags = { bold: false, italic: false, hl: false };
  let word: Seg[] = [];
  let capDone = !dropCap;
  const push = (s: string) => {
    if (!s) return;
    if (!capDone) {
      const ch = [...s][0];
      if (/\p{L}/u.test(ch)) {
        word.push({ text: ch, f: { ...f, cap: true } });
        s = s.slice(ch.length);
        capDone = true;
        if (!s) return;
      }
    }
    const last = word[word.length - 1];
    if (last && !last.f.cap && last.f.bold === f.bold && last.f.italic === f.italic && last.f.hl === f.hl) last.text += s;
    else word.push({ text: s, f: { ...f } });
  };
  const endWord = () => { if (word.length) tokens.push({ kind: 'word', segs: word }); word = []; };

  let i = 0;
  let buf = '';
  const flush = () => { push(buf); buf = ''; };
  while (i < text.length) {
    const two = text.slice(i, i + 2);
    if (two === '==') { flush(); f.hl = !f.hl; i += 2; continue; }
    if (two === '**') { flush(); f.bold = !f.bold; i += 2; continue; }
    const ch = text[i];
    if (ch === '*') { flush(); f.italic = !f.italic; i++; continue; }
    if (ch === '\n') {
      flush(); endWord();
      if (text[i + 1] === '\n') {
        tokens.push({ kind: 'para' });
        while (text[i + 1] === '\n') i++;
      } else tokens.push({ kind: 'br' });
      i++; continue;
    }
    if (ch === ' ' || ch === '\t') { flush(); endWord(); i++; continue; }
    buf += ch; i++;
  }
  flush(); endWord();
  return tokens;
}

function fontOf(s: RichStyle, f: Flags) {
  if (f.cap && s.dropCap) return { font: `400 ${s.fontSize * s.dropCap.scale}px "${s.dropCap.family}", serif`, color: s.dropCap.color ?? s.fill };
  if (f.hl) {
    const italic = s.highlightItalic || f.italic;
    const w = f.bold ? s.boldWeight : s.highlightWeight;
    return { font: `${italic ? 'italic ' : ''}${w} ${s.fontSize}px "${s.highlightFamily}", "${s.fontFamily}", serif`, color: s.highlightColor };
  }
  const italic = s.italic || f.italic;
  const w = f.bold ? s.boldWeight : s.fontWeight;
  return { font: `${italic ? 'italic ' : ''}${w} ${s.fontSize}px "${s.fontFamily}", Inter, sans-serif`, color: s.fill };
}

const cache = new Map<string, number>();
function w(text: string, font: string, ls: number) {
  const k = font + '|' + text;
  let v = cache.get(k);
  if (v === undefined) {
    v = measureWidth(text, font);
    if (cache.size > 20000) cache.clear();
    cache.set(k, v);
  }
  return v + ls * [...text].length;
}

/** Limpa o cache de medidas (chamar quando uma fonte termina de carregar) */
export const clearRichCache = () => cache.clear();

export function layoutRich(raw: string, s: RichStyle, maxWidth: number): RichLayout {
  const text = s.uppercase ? raw.toLocaleUpperCase('pt-BR') : raw;
  const tokens = tokenize(text, !!s.dropCap);
  const lh = s.fontSize * s.lineHeight;
  const ls = s.letterSpacing;

  type LineItem = { segs: { text: string; font: string; color: string; w: number }[]; w: number; space: number };
  const lines: { items: LineItem[]; width: number; gapBefore: number }[] = [];
  let cur: LineItem[] = [];
  let curW = 0;
  let gap = 0;
  const newLine = (g = 0) => { lines.push({ items: cur, width: curW, gapBefore: gap }); cur = []; curW = 0; gap = g; };

  for (const t of tokens) {
    if (t.kind === 'para') { newLine(s.paragraphSpacing * s.fontSize); continue; }
    if (t.kind === 'br') { newLine(0); continue; }
    const segs = t.segs.map((sg) => { const fo = fontOf(s, sg.f); return { text: sg.text, font: fo.font, color: fo.color, w: w(sg.text, fo.font, sg.f.cap ? 0 : ls) }; });
    const ww = segs.reduce((a, b) => a + b.w, 0);
    const space = w(' ', segs[0].font, ls);
    if (cur.length && curW + space + ww > maxWidth) newLine(0);
    const sp = cur.length ? space : 0;
    cur.push({ segs, w: ww, space: sp });
    curW += sp + ww;
  }
  lines.push({ items: cur, width: curW, gapBefore: gap });

  const placed: PlacedSeg[] = [];
  let y = 0;
  let widest = 0;
  // deslocamento da linha de base dentro da linha (aproximação estável entre fontes)
  const baseOffset = lh / 2 + s.fontSize * 0.34;
  lines.forEach((ln, idx) => {
    if (idx > 0) y += lh + ln.gapBefore;
    widest = Math.max(widest, ln.width);
    let x = s.align === 'center' ? (maxWidth - ln.width) / 2 : s.align === 'right' ? maxWidth - ln.width : 0;
    for (const it of ln.items) {
      x += it.space;
      for (const sg of it.segs) {
        placed.push({ text: sg.text, font: sg.font, color: sg.color, x, baseline: y + baseOffset });
        x += sg.w;
      }
    }
  });
  return { segs: placed, width: maxWidth, height: y + lh, lines: lines.length, widest };
}

/** Desenha um layout num contexto 2D nativo (usado pelo Konva.Shape) */
export function drawRich(ctx: CanvasRenderingContext2D, layout: RichLayout, letterSpacing: number) {
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  const anyCtx = ctx as any;
  const hasLS = 'letterSpacing' in ctx;
  for (const sg of layout.segs) {
    ctx.font = sg.font;
    ctx.fillStyle = sg.color;
    if (hasLS) anyCtx.letterSpacing = `${letterSpacing}px`;
    ctx.fillText(sg.text, sg.x, sg.baseline);
  }
  if (hasLS) anyCtx.letterSpacing = '0px';
}

/** Maior tamanho que faz o bloco caber na caixa */
export function fitRich(text: string, s: Omit<RichStyle, 'fontSize' | 'letterSpacing'> & { letterSpacingEm: number }, maxWidth: number, maxHeight: number, maxSize: number, minSize = 14) {
  let lo = minSize, hi = Math.round(maxSize), best = minSize;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const L = layoutRich(text, { ...s, fontSize: mid, letterSpacing: s.letterSpacingEm * mid }, maxWidth);
    if (L.height <= maxHeight && L.widest <= maxWidth + 0.5) { best = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return best;
}
