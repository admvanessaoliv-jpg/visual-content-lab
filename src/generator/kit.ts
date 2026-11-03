import type {
  BrandKit, ColorRole, DesignElement, Direction, ImageFilters, PageBackground, TextElement, TextRole,
} from '../types';
import { bestContrast, isDark } from '../lib/color';
import { makeBackground, makeImage, makeLine, makeShape, makeText, noFilters } from '../lib/defaults';
import { nearestWeight } from '../lib/fonts';
import { fitFontSize, measureBlock, type TextSpec } from '../lib/measure';

export interface Box { x: number; y: number; w: number; h: number }

export interface Swatch { c: string; r?: ColorRole }

export interface Palette {
  bg: Swatch; fg: Swatch; muted: Swatch; accent: Swatch; surface: Swatch; onSurface: Swatch; onAccent: Swatch;
}

export interface GenContent {
  kicker?: string;
  title: string;
  subtitle?: string;
  body?: string;
  cta?: string;
  handle?: string;
  /** Texto do botão de navegação (ex.: PASSE) */
  nav?: string;
}

export interface SlideInfo { index: number; total: number; role: 'cover' | 'content' | 'cta' }

export interface GenCtx {
  W: number;
  H: number;
  M: number;
  safe: Box;
  brand: BrandKit;
  pal: Palette;
  content: GenContent;
  image: string | null;
  logo: { assetId: string; ratio: number } | null;
  photoFilters: ImageFilters;
  rand: () => number;
  slide?: SlideInfo;
  direction: Direction;
}

export interface LayoutResult { bg: PageBackground; els: DesignElement[] }

// ------------------------------------------------------------------ paleta

const sw = (brand: BrandKit, r: ColorRole): Swatch => ({ c: brand.colors[r], r });

function onColor(brand: BrandKit, bg: string): Swatch {
  const options: Swatch[] = [sw(brand, 'text'), sw(brand, 'background'), sw(brand, 'surface'), sw(brand, 'primary'), { c: '#FFFFFF' }, { c: '#111111' }];
  const best = bestContrast(bg, options.map((o) => o.c));
  return options.find((o) => o.c === best)!;
}

function mutedOn(brand: BrandKit, bg: string, fg: Swatch): Swatch {
  // tom secundário legível sobre o fundo
  const m = sw(brand, 'muted');
  return isDark(bg) === isDark(m.c) ? { ...fg } : m;
}

export function makePalette(brand: BrandKit, dir: Direction, variant: number): Palette {
  let bg: Swatch;
  let accent: Swatch = sw(brand, 'secondary');
  let surface: Swatch = sw(brand, 'surface');
  const v = variant % 2;
  switch (dir) {
    case 'A': bg = v ? sw(brand, 'primary') : sw(brand, 'background'); if (v) accent = sw(brand, 'accent'); break;
    case 'B': bg = v ? sw(brand, 'text') : sw(brand, 'surface'); surface = sw(brand, 'background'); break;
    case 'C': bg = v ? sw(brand, 'primary') : sw(brand, 'secondary'); accent = v ? sw(brand, 'secondary') : sw(brand, 'accent'); break;
    case 'D': bg = sw(brand, 'primary'); accent = sw(brand, 'accent'); break;
    case 'E': bg = v ? sw(brand, 'accent') : sw(brand, 'background'); break;
    case 'F': default: bg = v ? sw(brand, 'primary') : sw(brand, 'background'); accent = v ? sw(brand, 'accent') : sw(brand, 'secondary'); break;
  }
  if (accent.c.toLowerCase() === bg.c.toLowerCase()) accent = sw(brand, bg.r === 'primary' ? 'secondary' : 'primary');
  const fg = onColor(brand, bg.c);
  return {
    bg, fg, accent, surface,
    muted: mutedOn(brand, bg.c, fg),
    onSurface: onColor(brand, surface.c),
    onAccent: onColor(brand, accent.c),
  };
}

export function photoFilters(brand: BrandKit): ImageFilters {
  switch (brand.photoFilter) {
    case 'bw': return { ...noFilters(), grayscale: true, contrast: 10 };
    case 'warm': return { ...noFilters(), brightness: 0.03, contrast: 6 };
    case 'soft': return { ...noFilters(), brightness: 0.05, contrast: -12 };
    default: return noFilters();
  }
}

// ------------------------------------------------------------------ helpers

export type FontKind = 'heading' | 'body' | 'accent';

export interface TxtOpts {
  font: FontKind;
  role: TextRole;
  name?: string;
  color: Swatch;
  size?: number;
  maxSize?: number;
  minSize?: number;
  weight?: number;
  italic?: boolean;
  uppercase?: boolean;
  letterSpacingEm?: number;
  lineHeight?: number;
  align?: 'left' | 'center' | 'right';
  anchor?: 'top' | 'middle' | 'bottom';
  opacity?: number;
}

export function txt(c: GenCtx, text: string, box: Box, o: TxtOpts): TextElement {
  const f = o.font === 'heading' ? c.brand.headingFont : o.font === 'accent' ? c.brand.accentFont : c.brand.bodyFont;
  const weight = nearestWeight(f.family, o.weight ?? f.weight);
  const isHead = o.font === 'heading';
  const spec: TextSpec = {
    fontFamily: f.family,
    fontWeight: weight,
    italic: !!o.italic,
    uppercase: o.uppercase ?? (isHead ? c.brand.headingUppercase : false),
    letterSpacingEm: o.letterSpacingEm ?? (isHead ? c.brand.headingLetterSpacing : 0),
    lineHeight: o.lineHeight ?? (isHead ? 1.06 : 1.42),
  };
  const size = Math.round(o.size ?? fitFontSize(text, spec, box.w, box.h, o.maxSize ?? 120, o.minSize ?? 16));
  const m = measureBlock(text, spec, size, box.w);
  const anchor = o.anchor ?? 'top';
  const y = anchor === 'bottom' ? box.y + box.h - m.height : anchor === 'middle' ? box.y + (box.h - m.height) / 2 : box.y;
  return makeText({
    name: o.name ?? defaultName(o.role),
    role: o.role,
    text,
    x: Math.round(box.x), y: Math.round(y), width: Math.round(box.w), height: Math.round(m.height),
    fontFamily: f.family, fontWeight: weight, italic: !!o.italic, fontSize: size,
    fill: o.color.c, colorRole: o.color.r,
    align: o.align ?? 'left',
    lineHeight: spec.lineHeight, letterSpacing: +((spec.letterSpacingEm ?? 0) * size).toFixed(2),
    uppercase: !!spec.uppercase, opacity: o.opacity ?? 1,
  });
}

function defaultName(r: TextRole) {
  return ({ kicker: 'Chamada', heading: 'Título', subheading: 'Subtítulo', body: 'Texto', caption: 'Legenda', cta: 'CTA', number: 'Número' } as const)[r];
}

export const bottomOf = (el: { y: number; height: number }) => el.y + el.height;

export function kicker(c: GenCtx, text: string, box: Box, color: Swatch, align: 'left' | 'center' | 'right' = 'left') {
  return txt(c, text, { ...box, h: 60 }, {
    font: 'accent', role: 'kicker', color, size: Math.round(c.W * 0.024), uppercase: true, letterSpacingEm: 0.16,
    weight: 600, lineHeight: 1.2, align,
  });
}

export function photo(c: GenCtx, box: Box, extra: Partial<Parameters<typeof makeImage>[0]> = {}) {
  return makeImage({
    name: 'Fotografia', assetId: c.image, x: Math.round(box.x), y: Math.round(box.y),
    width: Math.round(box.w), height: Math.round(box.h), filters: { ...c.photoFilters }, ...extra,
  });
}

export function rect(box: Box, fill: Swatch, extra: Partial<Parameters<typeof makeShape>[0]> = {}) {
  return makeShape({
    name: 'Retângulo', shape: 'rect', x: Math.round(box.x), y: Math.round(box.y), width: Math.round(box.w), height: Math.round(box.h),
    fill: fill.c, colorRole: fill.r, ...extra,
  });
}

export function circle(box: Box, fill: Swatch, extra: Partial<Parameters<typeof makeShape>[0]> = {}) {
  return makeShape({
    name: 'Círculo', shape: 'ellipse', x: Math.round(box.x), y: Math.round(box.y), width: Math.round(box.w), height: Math.round(box.h),
    fill: fill.c, colorRole: fill.r, ...extra,
  });
}

export function rule(x: number, y: number, w: number, color: Swatch, strokeWidth = 3, extra: Partial<Parameters<typeof makeLine>[0]> = {}) {
  return makeLine({ name: 'Linha', x: Math.round(x), y: Math.round(y), width: Math.round(w), stroke: color.c, colorRole: color.r, strokeWidth, ...extra });
}

export function solidBg(s: Swatch): PageBackground {
  return makeBackground({ color: s.c, colorRole: s.r, gradient: { from: s.c, to: s.c, fromOpacity: 1, toOpacity: 1, angle: 180 } });
}

export function darkGradient(box: Box, angle = 180, strength = 0.78) {
  return makeShape({
    name: 'Gradiente', shape: 'rect', x: Math.round(box.x), y: Math.round(box.y), width: Math.round(box.w), height: Math.round(box.h),
    fillEnabled: false, gradientEnabled: true, fill: '#000000',
    gradient: { from: '#000000', to: '#000000', fromOpacity: 0, toOpacity: strength, angle },
  });
}

export function logoEl(c: GenCtx, x: number, y: number, h: number, align: 'left' | 'center' | 'right' = 'left') {
  if (!c.logo) return null;
  const w = h * c.logo.ratio;
  const lx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  return makeImage({ name: 'Logotipo', isLogo: true, assetId: c.logo.assetId, fit: 'fill', x: Math.round(lx), y: Math.round(y), width: Math.round(w), height: Math.round(h) });
}

const pad2 = (n: number) => String(n).padStart(2, '0');

export interface ChromeOpts {
  color: Swatch;
  counter?: boolean;
  handle?: 'bottom-left' | 'bottom-center' | 'top-left' | false;
  arrow?: boolean;
}

/** Elementos recorrentes que dão unidade ao carrossel (contador, @, seta) */
export function chrome(c: GenCtx, o: ChromeOpts): DesignElement[] {
  const out: DesignElement[] = [];
  const small = Math.round(c.W * 0.022);
  const top = c.safe.y - c.M * 0.35;
  const bottom = c.safe.y + c.safe.h - small * 0.4;
  if (c.slide && o.counter !== false) {
    out.push(txt(c, `${pad2(c.slide.index + 1)} / ${pad2(c.slide.total)}`, { x: c.W - c.M - 300, y: top, w: 300, h: 50 }, {
      font: 'accent', role: 'number', name: 'Contador', color: o.color, size: small, align: 'right', letterSpacingEm: 0.08, weight: 500, lineHeight: 1.2,
    }));
  }
  const handle = c.content.handle?.trim();
  if (handle && o.handle) {
    const isCenter = o.handle === 'bottom-center';
    const y = o.handle === 'top-left' ? top : bottom;
    out.push(txt(c, handle, { x: isCenter ? c.M : c.M, y, w: isCenter ? c.W - 2 * c.M : 500, h: 50 }, {
      font: 'accent', role: 'caption', name: '@ Perfil', color: o.color, size: small, align: isCenter ? 'center' : 'left', weight: 500, lineHeight: 1.2, letterSpacingEm: 0.02,
    }));
  }
  if (c.slide && o.arrow !== false && c.slide.index < c.slide.total - 1) {
    out.push(makeLine({
      name: 'Seta', x: c.W - c.M - 90, y: Math.round(bottom + small * 0.6), width: 90, stroke: o.color.c, colorRole: o.color.r,
      strokeWidth: 3, arrowEnd: true, lineCap: 'round',
    }));
  }
  return out;
}

export const slideNumber = (c: GenCtx) => (c.slide ? pad2(c.slide.index + (c.slide.role === 'cover' ? 1 : 0)) : '01');
