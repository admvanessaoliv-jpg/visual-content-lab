/**
 * Direção P — Editorial premium.
 * Linguagem: foto que se dissolve em cor profunda com granulado, serifa
 * condensada com capitular caligráfica e destaque em itálico colorido;
 * slides internos em off-white com texto-fantasma, grotesca escura de
 * entrelinha apertada e navegação "PASSE →" em pílula.
 */
import type { DesignElement, TextElement } from '../types';
import { makeBackground, makeLine, makeShape, makeText } from '../lib/defaults';
import { nearestWeight } from '../lib/fonts';
import { fitRich, layoutRich, stripMarkup, type RichStyle } from '../lib/richText';
import { photo, type GenCtx, type LayoutResult, type Swatch } from './kit';
import type { LayoutDef } from './layouts';

const k = (c: GenCtx) => c.W / 1080; // escala relativa à largura de referência
const R = (n: number) => Math.round(n);

interface RichOpts {
  font: 'heading' | 'body' | 'accent';
  color: Swatch;
  highlight?: Swatch;
  maxSize: number;
  minSize?: number;
  lineHeight: number;
  letterSpacingEm: number;
  align: 'left' | 'center' | 'right';
  uppercase?: boolean;
  weight?: number;
  boldWeight?: number;
  italic?: boolean;
  paragraphSpacing?: number;
  dropCap?: boolean;
  size?: number;
  name: string;
  role: TextElement['role'];
  anchor?: 'top' | 'bottom' | 'middle';
  opacity?: number;
}

function familyOf(c: GenCtx, f: RichOpts['font']) {
  return f === 'heading' ? c.brand.headingFont : f === 'accent' ? c.brand.accentFont : c.brand.bodyFont;
}

/** Bloco de texto rico ajustado à caixa */
export function richBlock(c: GenCtx, text: string, box: { x: number; y: number; w: number; h: number }, o: RichOpts): TextElement {
  const f = familyOf(c, o.font);
  const weight = nearestWeight(f.family, o.weight ?? f.weight);
  const script = c.brand.scriptFont ?? { family: 'Pinyon Script', weight: 400 };
  const style: Omit<RichStyle, 'fontSize' | 'letterSpacing'> = {
    fontFamily: f.family,
    fontWeight: weight,
    italic: !!o.italic,
    lineHeight: o.lineHeight,
    align: o.align,
    uppercase: !!o.uppercase,
    fill: o.color.c,
    highlightColor: (o.highlight ?? o.color).c,
    highlightFamily: f.family,
    highlightItalic: true,
    highlightWeight: weight,
    boldWeight: nearestWeight(f.family, o.boldWeight ?? 700),
    dropCap: o.dropCap ? { family: script.family, scale: 1.95 } : null,
    paragraphSpacing: o.paragraphSpacing ?? 0,
  };
  const size = o.size ?? fitRich(text, { ...style, letterSpacingEm: o.letterSpacingEm }, box.w, box.h, o.maxSize, o.minSize ?? 16);
  const L = layoutRich(text, { ...style, fontSize: size, letterSpacing: o.letterSpacingEm * size }, box.w);
  const anchor = o.anchor ?? 'top';
  const y = anchor === 'bottom' ? box.y + box.h - L.height : anchor === 'middle' ? box.y + (box.h - L.height) / 2 : box.y;
  return makeText({
    name: o.name, role: o.role, text,
    x: R(box.x), y: R(y), width: R(box.w), height: R(L.height),
    fontFamily: f.family, fontWeight: weight, italic: !!o.italic, fontSize: size,
    fill: o.color.c, colorRole: o.color.r,
    align: o.align, lineHeight: o.lineHeight, letterSpacing: +(o.letterSpacingEm * size).toFixed(2), uppercase: !!o.uppercase,
    rich: true,
    highlightColor: style.highlightColor, highlightColorRole: (o.highlight ?? o.color).r, highlightFamily: f.family, highlightItalic: true,
    highlightWeight: weight, boldWeight: style.boldWeight,
    dropCap: style.dropCap, paragraphSpacing: style.paragraphSpacing,
    opacity: o.opacity ?? 1,
  });
}

/** Botão de navegação "PASSE →" em pílula */
export function navPill(c: GenCtx, cx: number, top: number, color: Swatch, label: string): DesignElement[] {
  const s = k(c);
  const size = R(24 * s);
  const pillW = R(104 * s), pillH = R(62 * s), gap = R(18 * s);
  const t = richBlock(c, label, { x: 0, y: 0, w: 400 * s, h: 60 * s }, {
    font: 'accent', color, size, maxSize: size, lineHeight: 1.1, letterSpacingEm: 0.01, align: 'left', uppercase: true, weight: 500, name: 'Navegação · texto', role: 'caption',
  });
  const labelW = layoutRich(label.toUpperCase(), { ...rs(t), fontSize: size, letterSpacing: t.letterSpacing }, 400 * s).widest;
  const total = labelW + gap + pillW;
  const x0 = cx - total / 2;
  t.x = R(x0); t.y = R(top + (pillH - t.height) / 2); t.width = R(labelW + 4);
  const pill = makeShape({ name: 'Navegação · pílula', shape: 'rect', x: R(x0 + labelW + gap), y: R(top), width: pillW, height: pillH, fillEnabled: false, fill: color.c, strokeColor: color.c, strokeWidth: Math.max(2, 2.6 * s), cornerRadius: pillH / 2, colorRole: color.r });
  const arrow = makeLine({ name: 'Navegação · seta', x: R(pill.x + pillW * 0.22), y: R(top + pillH / 2), width: R(pillW * 0.56), stroke: color.c, colorRole: color.r, strokeWidth: Math.max(2, 2.6 * s), arrowEnd: true, arrowStyle: 'open', lineCap: 'round' });
  return [t, pill, arrow];
}

const rs = (t: TextElement): RichStyle => ({
  fontFamily: t.fontFamily, fontWeight: t.fontWeight, italic: t.italic, fontSize: t.fontSize, lineHeight: t.lineHeight, letterSpacing: t.letterSpacing,
  align: t.align, uppercase: t.uppercase, fill: t.fill, highlightColor: t.fill, highlightFamily: t.fontFamily, highlightItalic: true,
  highlightWeight: t.fontWeight, boldWeight: 700, dropCap: null, paragraphSpacing: 0,
});

function handle(c: GenCtx, y: number, color: Swatch, opacity = 1, spacingEm = 0.02) {
  const h = (c.content.handle || c.brand.handle || '').trim();
  if (!h) return null;
  const s = k(c);
  return richBlock(c, h.replace(/[*=]/g, ''), { x: c.M, y, w: c.W - 2 * c.M, h: 50 * s }, {
    font: 'accent', color, size: R(23 * s), maxSize: 30, lineHeight: 1.1, letterSpacingEm: spacingEm, align: 'center', uppercase: true, weight: 400, name: '@ Perfil', role: 'caption', opacity,
  });
}

const isLast = (c: GenCtx) => !!c.slide && c.slide.index === c.slide.total - 1;
const navLabel = (c: GenCtx) => c.content.nav?.trim() || 'Passe';

function fadeTo(color: string, x: number, y: number, w: number, h: number, angle = 180) {
  return makeShape({
    name: 'Degradê da foto', shape: 'rect', x: R(x), y: R(y), width: R(w), height: R(h), fillEnabled: false, gradientEnabled: true, fill: color,
    gradient: { from: color, to: color, fromOpacity: 0, toOpacity: 1, angle },
  });
}

/** Texto-fantasma ao fundo: serifa grande quase transparente */
function ghostText(c: GenCtx, color: Swatch, seed: string): TextElement {
  const s = k(c);
  const words = stripMarkup(seed || c.brand.name).replace(/\s+/g, ' ').trim();
  let filler = '';
  while (filler.length < 900) filler += words + ' ';
  return makeText({
    name: 'Textura de fundo', locked: true, role: 'caption',
    text: filler, x: R(-60 * s), y: R(-30 * s), width: R(c.W + 120 * s), height: c.H + R(60 * s), autoHeight: false,
    fontFamily: c.brand.headingFont.family, fontWeight: nearestWeight(c.brand.headingFont.family, 400), fontSize: R(70 * s),
    lineHeight: 0.95, letterSpacing: -1, fill: color.c, colorRole: color.r, opacity: 0.032, align: 'right',
  });
}

const useCap = (c: GenCtx) => c.brand.useDropCap !== false;

// ================================================================ capas

const coverPhoto: LayoutDef = {
  id: 'premium-cover-photo', label: 'Premium · capa com foto e degradê', directions: ['P', 'B', 'D'], tags: ['photo', 'cover', 'editorial'], needsImage: true,
  fn: (c): LayoutResult => {
    const s = k(c);
    const deep: Swatch = { c: c.brand.colors.primary, r: 'primary' };
    const light: Swatch = { c: c.brand.colors.background, r: 'background' };
    const hl: Swatch = { c: c.brand.colors.accent, r: 'accent' };
    const els: DesignElement[] = [];
    const photoH = c.H * 0.6;
    els.push(photo(c, { x: 0, y: 0, w: c.W, h: photoH }, { focusY: 0.35 }));
    els.push(fadeTo(deep.c, 0, photoH * 0.42, c.W, photoH * 0.58 + 2));
    els.push(makeShape({ name: 'Véu superior', shape: 'rect', x: 0, y: 0, width: c.W, height: R(c.H * 0.16), fillEnabled: false, gradientEnabled: true, fill: '#000000', gradient: { from: '#000000', to: '#000000', fromOpacity: 0.22, toOpacity: 0, angle: 180 } }));
    const h = handle(c, c.safe.y - c.M * 0.15 + 0 * s, light, 0.62, 0.2);
    if (h) els.push(h);

    const navTop = c.safe.y + c.safe.h - 70 * s;
    const sub = c.content.subtitle ? richBlock(c, c.content.subtitle, { x: c.M, y: 0, w: c.W - 2 * c.M, h: 120 * s }, {
      font: 'accent', color: light, maxSize: R(34 * s), minSize: 18, lineHeight: 1.15, letterSpacingEm: 0, align: 'center', uppercase: true, weight: 500, name: 'Subtítulo', role: 'subheading',
    }) : null;
    const subTop = navTop - 62 * s - (sub?.height ?? 0);
    if (sub) sub.y = R(subTop);
    const headBottom = (sub ? subTop : navTop) - 80 * s;
    const headTop = c.H * 0.3;
    const head = richBlock(c, c.content.title, { x: 140 * s, y: headTop, w: c.W - 280 * s, h: headBottom - headTop }, {
      font: 'heading', color: light, highlight: hl, maxSize: R(124 * s), minSize: 40, lineHeight: 0.93, letterSpacingEm: Math.min(-0.02, c.brand.headingLetterSpacing),
      align: 'center', weight: c.brand.headingFont.weight, dropCap: useCap(c), name: 'Título', role: 'heading', anchor: 'bottom',
    });
    els.push(head);
    if (sub) els.push(sub);
    if (!isLast(c)) els.push(...navPill(c, c.W / 2, navTop, light, navLabel(c)));
    return { bg: { ...makeBackground({ color: deep.c, colorRole: 'primary' }), grain: 0.55 }, els };
  },
};

const coverType: LayoutDef = {
  id: 'premium-cover-type', label: 'Premium · capa tipográfica', directions: ['P', 'A'], tags: ['typographic', 'cover'], needsImage: false,
  fn: (c): LayoutResult => {
    const s = k(c);
    const deep: Swatch = { c: c.brand.colors.primary, r: 'primary' };
    const light: Swatch = { c: c.brand.colors.background, r: 'background' };
    const hl: Swatch = { c: c.brand.colors.accent, r: 'accent' };
    const els: DesignElement[] = [ghostText(c, light, c.content.title)];
    els[0].opacity = 0.035;
    const h = handle(c, c.safe.y - c.M * 0.15, light, 0.62, 0.2);
    if (h) els.push(h);
    const navTop = c.safe.y + c.safe.h - 70 * s;
    const sub = c.content.subtitle ? richBlock(c, c.content.subtitle, { x: c.M, y: 0, w: c.W - 2 * c.M, h: 120 * s }, {
      font: 'accent', color: light, maxSize: R(34 * s), minSize: 18, lineHeight: 1.15, letterSpacingEm: 0, align: 'center', uppercase: true, weight: 500, name: 'Subtítulo', role: 'subheading',
    }) : null;
    const head = richBlock(c, c.content.title, { x: c.M * 1.25, y: c.safe.y + 120 * s, w: c.W - c.M * 2.5, h: c.safe.h * 0.62 }, {
      font: 'heading', color: light, highlight: hl, maxSize: R(136 * s), minSize: 40, lineHeight: 0.93, letterSpacingEm: Math.min(-0.02, c.brand.headingLetterSpacing),
      align: 'center', weight: c.brand.headingFont.weight, dropCap: useCap(c), name: 'Título', role: 'heading', anchor: 'middle',
    });
    els.push(head);
    if (sub) { sub.y = R(head.y + head.height + 70 * s); els.push(sub); }
    if (!isLast(c)) els.push(...navPill(c, c.W / 2, navTop, light, navLabel(c)));
    return { bg: { ...makeBackground({ color: deep.c, colorRole: 'primary' }), grain: 0.55 }, els };
  },
};

// ================================================================ conteúdo

/** Ajusta título + corpo juntos para caber na área útil */
function textColumn(c: GenCtx, top: number, bottom: number, x: number, w: number, ink: Swatch, hl: Swatch) {
  const s = k(c);
  const title = (c.content.title || '').trim();
  const body = (c.content.body || '').trim();
  const make = (size: number) => {
    const els: TextElement[] = [];
    let y = top;
    if (title) {
      const t = richBlock(c, title, { x, y, w, h: 9999 }, {
        font: 'body', color: ink, highlight: hl, size, maxSize: size, lineHeight: 1.0, letterSpacingEm: -0.035, align: 'left', uppercase: true, weight: 700, boldWeight: 800, name: 'Título', role: 'heading',
      });
      els.push(t); y += t.height + size * 0.95;
    }
    if (body) {
      const b = richBlock(c, body, { x, y, w, h: 9999 }, {
        font: 'body', color: ink, highlight: hl, size, maxSize: size, lineHeight: 1.0, letterSpacingEm: -0.022, align: 'left', weight: 400, boldWeight: 700,
        paragraphSpacing: 0.9, name: 'Texto', role: 'body',
      });
      els.push(b); y += b.height;
    }
    return { els, bottom: y };
  };
  let lo = 22, hi = R(48 * s), best = make(lo);
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const r = make(mid);
    if (r.bottom <= bottom) { best = r; lo = mid + 1; } else hi = mid - 1;
  }
  return best;
}

const contentText: LayoutDef = {
  id: 'premium-text', label: 'Premium · texto editorial', directions: ['P', 'A'], tags: ['typographic', 'content', 'list'], needsImage: false,
  fn: (c): LayoutResult => {
    const s = k(c);
    const paper: Swatch = { c: c.brand.colors.background, r: 'background' };
    const ink: Swatch = { c: c.brand.colors.text, r: 'text' };
    const hl: Swatch = { c: c.brand.colors.primary, r: 'primary' };
    const els: DesignElement[] = [ghostText(c, ink, c.content.body || c.content.title)];
    const h = handle(c, c.safe.y - c.M * 0.15 + 10 * s, ink, 1, 0);
    if (h) els.push(h);
    const x = 108 * s;
    const navTop = c.safe.y + c.safe.h - 90 * s;
    const col = textColumn(c, c.safe.y + 160 * s, navTop - 60 * s, x, c.W - x - 150 * s, ink, hl);
    els.push(...col.els);
    if (!isLast(c)) els.push(...navPill(c, c.W / 2, navTop, ink, navLabel(c)));
    return { bg: { ...makeBackground({ color: paper.c, colorRole: 'background' }), grain: 0.32 }, els };
  },
};

const contentPhoto: LayoutDef = {
  id: 'premium-text-photo', label: 'Premium · texto com foto', directions: ['P', 'E', 'B'], tags: ['photo', 'content', 'editorial'], needsImage: true,
  fn: (c): LayoutResult => {
    const s = k(c);
    const paper: Swatch = { c: c.brand.colors.background, r: 'background' };
    const ink: Swatch = { c: c.brand.colors.text, r: 'text' };
    const hl: Swatch = { c: c.brand.colors.primary, r: 'primary' };
    const els: DesignElement[] = [];
    const h = handle(c, c.safe.y - c.M * 0.15 + 10 * s, ink, 1, 0);
    if (h) els.push(h);
    const x = 108 * s;
    const w = c.W - 2 * x;
    const pTop = c.safe.y + 110 * s;
    const pH = c.H * 0.34;
    els.push(photo(c, { x, y: pTop, w, h: pH }, { cornerRadius: c.brand.cornerRadius }));
    const navTop = c.safe.y + c.safe.h - 90 * s;
    const col = textColumn(c, pTop + pH + 60 * s, navTop - 60 * s, x, w, ink, hl);
    els.push(...col.els);
    if (!isLast(c)) els.push(...navPill(c, c.W / 2, navTop, ink, navLabel(c)));
    return { bg: { ...makeBackground({ color: paper.c, colorRole: 'background' }), grain: 0.32 }, els };
  },
};

// ================================================================ encerramento

const closing: LayoutDef = {
  id: 'premium-cta', label: 'Premium · encerramento', directions: ['P'], tags: ['cta'], needsImage: false,
  fn: (c): LayoutResult => {
    const s = k(c);
    const deep: Swatch = { c: c.brand.colors.primary, r: 'primary' };
    const light: Swatch = { c: c.brand.colors.background, r: 'background' };
    const hl: Swatch = { c: c.brand.colors.accent, r: 'accent' };
    const els: DesignElement[] = [];
    const head = richBlock(c, c.content.title || 'Salve para ==voltar aqui== sempre que precisar', { x: c.M * 1.3, y: c.safe.y + c.safe.h * 0.16, w: c.W - c.M * 2.6, h: c.safe.h * 0.42 }, {
      font: 'heading', color: light, highlight: hl, maxSize: R(112 * s), minSize: 36, lineHeight: 0.95, letterSpacingEm: Math.min(-0.02, c.brand.headingLetterSpacing),
      align: 'center', weight: c.brand.headingFont.weight, dropCap: useCap(c), name: 'Título', role: 'heading', anchor: 'bottom',
    });
    els.push(head);
    let y = head.y + head.height + 60 * s;
    if (c.content.body) {
      const b = richBlock(c, c.content.body, { x: c.M * 1.6, y, w: c.W - c.M * 3.2, h: 200 * s }, {
        font: 'body', color: light, highlight: hl, maxSize: R(32 * s), minSize: 18, lineHeight: 1.2, letterSpacingEm: -0.01, align: 'center', weight: 400, name: 'Texto', role: 'body', opacity: 0.85,
      });
      els.push(b); y = b.y + b.height + 70 * s;
    }
    const handleText = (c.content.handle || c.brand.handle || '').trim();
    const label = (c.content.cta || (handleText ? `Siga ${handleText}` : 'Siga para mais')).toUpperCase();
    const t = richBlock(c, label, { x: 0, y: 0, w: c.W, h: 60 * s }, {
      font: 'accent', color: deep, size: R(24 * s), maxSize: 40, lineHeight: 1.1, letterSpacingEm: 0.04, align: 'center', weight: 600, name: 'Botão · texto', role: 'cta',
    });
    const tw = layoutRich(label, { ...rs(t), fontSize: t.fontSize, letterSpacing: t.letterSpacing }, c.W).widest;
    const pw = tw + 90 * s, ph = 74 * s;
    const pill = makeShape({ name: 'Botão', shape: 'rect', x: R(c.W / 2 - pw / 2), y: R(y), width: R(pw), height: R(ph), fill: hl.c, colorRole: 'accent', cornerRadius: ph / 2 });
    t.x = pill.x; t.width = pill.width; t.y = R(y + (ph - t.height) / 2);
    els.push(pill, t);
    const h = handle(c, c.safe.y + c.safe.h - 40 * s, light, 0.62, 0.2);
    if (h) els.push(h);
    return { bg: { ...makeBackground({ color: deep.c, colorRole: 'primary' }), grain: 0.55 }, els };
  },
};

export const PREMIUM_LAYOUTS: LayoutDef[] = [coverPhoto, coverType, contentText, contentPhoto, closing];
