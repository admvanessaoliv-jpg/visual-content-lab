import type { AssetMeta, BrandKit, DesignElement, DesignType, Direction, FormatId, Page } from '../types';
import { FORMATS, reelsSafeZone } from '../lib/formats';
import { makePage } from '../lib/defaults';
import { deepClone, rng, uid } from '../lib/ids';
import { nearestWeight } from '../lib/fonts';
import { isDark } from '../lib/color';
import { makePalette, photoFilters, type Box, type GenContent, type GenCtx, type SlideInfo } from './kit';
import { LAYOUTS, layoutById, type LayoutDef, type LayoutTag } from './layouts';

export type { GenContent } from './kit';

export interface GeneratorInput {
  brand: BrandKit;
  logoAsset?: AssetMeta | null;
  logoLightAsset?: AssetMeta | null;
  format: FormatId;
  type: DesignType;
  direction: Direction;
  content: GenContent;
  images: string[];
  seed?: number;
}

export interface Variation {
  key: string;
  layoutId: string;
  layoutLabel: string;
  paletteVariant: number;
  page: Page;
}

function safeArea(format: FormatId, type: DesignType | 'carousel'): { M: number; safe: Box } {
  const { width: W, height: H } = FORMATS[format];
  const M = Math.round(W * 0.075);
  if (type === 'reels') {
    const z = reelsSafeZone(W, H);
    return { M, safe: { x: M, y: z.y + M * 0.8, w: W - 2 * M, h: z.height - M * 1.6 } };
  }
  if (format === 'story') return { M, safe: { x: M, y: 250, w: W - 2 * M, h: H - 250 - 330 } };
  return { M, safe: { x: M, y: M + 10, w: W - 2 * M, h: H - 2 * M - 20 } };
}

function buildCtx(i: GeneratorInput, variant: number, seed: number, image: string | null, content: GenContent, slide?: SlideInfo, typeOverride?: DesignType): GenCtx {
  const { width: W, height: H } = FORMATS[i.format];
  const { M, safe } = safeArea(i.format, typeOverride ?? i.type);
  const pal = makePalette(i.brand, i.direction, variant);
  const useLight = isDark(pal.bg.c) && i.brand.logoLightAssetId && i.logoLightAsset;
  const logoMeta = useLight ? i.logoLightAsset : i.logoAsset;
  const logoId = useLight ? i.brand.logoLightAssetId : i.brand.logoAssetId;
  return {
    W, H, M, safe,
    brand: i.brand,
    pal,
    content,
    image,
    logo: logoId && logoMeta ? { assetId: logoId, ratio: logoMeta.width / Math.max(1, logoMeta.height) } : null,
    photoFilters: photoFilters(i.brand),
    rand: rng(seed),
    slide,
    direction: i.direction,
  };
}

function runLayout(l: LayoutDef, ctx: GenCtx, name: string): Page {
  const r = l.fn(ctx);
  return makePage({ name, background: r.bg, elements: r.els });
}

const TYPE_TAG: Record<DesignType, LayoutTag> = {
  static: 'cover', reels: 'cover', carousel: 'cover', editorial: 'editorial', photo: 'photo', typographic: 'typographic',
};

/** Seleciona layouts compatíveis com o tipo de peça e a direção visual */
export function candidateLayouts(type: DesignType, direction: Direction, hasImage: boolean): LayoutDef[] {
  const tag = TYPE_TAG[type];
  const usable = LAYOUTS.filter((l) => l.id !== 'cta' && l.tags.includes(tag));
  const primary = usable.filter((l) => l.directions.includes(direction));
  const secondary = usable.filter((l) => !l.directions.includes(direction));
  let list = [...primary, ...secondary];
  // direções fotográficas sem foto: ainda geram, com espaço reservado para a imagem
  if (!hasImage && !['B', 'D', 'E'].includes(direction) && type !== 'photo' && type !== 'editorial') {
    list = list.filter((l) => !l.needsImage);
  }
  return list;
}

/** Gera variações de composição para uma peça única */
export function generateDesign(input: GeneratorInput, max = 6): Variation[] {
  const seed = input.seed ?? Date.now();
  const hasImage = input.images.length > 0;
  const layouts = candidateLayouts(input.type, input.direction, hasImage);
  const out: Variation[] = [];
  const variants = layouts.length >= max ? [0] : [0, 1];
  for (const variant of variants) {
    for (const [li, l] of layouts.entries()) {
      if (out.length >= max) break;
      const image = hasImage ? input.images[(li + variant) % input.images.length] : null;
      const ctx = buildCtx(input, variant, seed + li * 31 + variant * 7, image, input.content);
      out.push({ key: `${l.id}-${variant}`, layoutId: l.id, layoutLabel: l.label, paletteVariant: variant, page: runLayout(l, ctx, 'Página 1') });
    }
  }
  return out;
}

// ======================================================== carrossel

export interface CarouselSlideInput {
  title: string;
  body: string;
  kicker?: string;
  imageId: string | null;
}

export interface CarouselInput {
  brand: BrandKit;
  logoAsset?: AssetMeta | null;
  logoLightAsset?: AssetMeta | null;
  format: FormatId;
  direction: Direction;
  slides: CarouselSlideInput[];
  handle: string;
  cta: string;
  nav?: string;
  lastIsCta: boolean;
  seed?: number;
}

/** Repertório de layouts por direção: capa, conteúdo (com e sem foto) */
const CAROUSEL_POOLS: Record<Direction, { cover: string[]; content: string[]; contentNoImage: string[]; alternate: boolean; cta?: string; coverNoImage?: string[] }> = {
  P: { cover: ['premium-cover-photo'], coverNoImage: ['premium-cover-type'], content: ['premium-text-photo'], contentNoImage: ['premium-text'], alternate: false, cta: 'premium-cta' },
  A: { cover: ['typo-hero', 'typo-center'], content: ['typo-number', 'typo-hero', 'quote', 'list'], contentNoImage: ['typo-number', 'typo-hero', 'quote', 'list'], alternate: false },
  B: { cover: ['editorial-masthead', 'editorial-top'], content: ['editorial-top', 'split', 'frame-inset', 'photo-bottom'], contentNoImage: ['quote', 'list', 'typo-hero'], alternate: false },
  C: { cover: ['solid-bold', 'solid-stack'], content: ['solid-card', 'solid-stack', 'solid-card', 'list'], contentNoImage: ['solid-card', 'solid-stack', 'quote', 'list'], alternate: true },
  D: { cover: ['photo-bottom', 'editorial-masthead'], content: ['photo-caption', 'photo-bottom'], contentNoImage: ['typo-hero', 'quote'], alternate: false },
  E: { cover: ['frame-inset', 'split', 'arch'], content: ['split', 'frame-inset', 'arch', 'editorial-top'], contentNoImage: ['typo-hero', 'list', 'quote'], alternate: true },
  F: { cover: ['geo-circle', 'geo-grid'], content: ['geo-grid', 'typo-number', 'geo-circle', 'list'], contentNoImage: ['geo-grid', 'typo-number', 'geo-circle', 'list'], alternate: false },
};

export function generateCarousel(input: CarouselInput): Page[] {
  const seed = input.seed ?? Date.now();
  const r = rng(seed);
  const pool = CAROUSEL_POOLS[input.direction];
  const total = input.slides.length;
  const pick = (ids: string[], avoid?: string) => {
    const opts = ids.filter((id) => id !== avoid);
    return opts[Math.floor(r() * opts.length)] ?? ids[0];
  };
  const base: GeneratorInput = {
    brand: input.brand, logoAsset: input.logoAsset, logoLightAsset: input.logoLightAsset, format: input.format, type: 'carousel', direction: input.direction, content: { title: '' }, images: [],
  };
  const coverVariant = Math.floor(r() * 2);
  let prev = '';
  let contentIdx = 0;
  return input.slides.map((s, index) => {
    const isLast = index === total - 1;
    const role: SlideInfo['role'] = index === 0 ? 'cover' : isLast && input.lastIsCta ? 'cta' : 'content';
    let layoutId: string;
    if (role === 'cover') layoutId = pick(!s.imageId && pool.coverNoImage ? pool.coverNoImage : pool.cover);
    else if (role === 'cta') layoutId = pool.cta ?? 'cta';
    else {
      const ids = s.imageId ? pool.content : pool.contentNoImage;
      const hasList = input.direction !== 'P' && s.body.split('\n').filter((l) => l.trim()).length >= 3;
      // listas detectadas usam layout de lista quando a direção permite
      layoutId = hasList && ids.includes('list') ? 'list' : pick(ids.filter((x) => x !== 'list' || hasList), prev);
      contentIdx++;
    }
    prev = layoutId;
    const layout = layoutById(layoutId)!;
    const variant = role === 'content' && pool.alternate ? (coverVariant + contentIdx) % 2 : coverVariant;
    const content: GenContent = {
      kicker: s.kicker || undefined,
      title: s.title,
      body: role === 'cover' ? undefined : s.body || undefined,
      subtitle: role === 'cover' ? s.body || undefined : undefined,
      handle: input.handle,
      nav: input.nav,
      cta: role === 'cta' ? input.cta : undefined,
    };
    const ctx = buildCtx(base, variant, seed + index * 97, s.imageId, content, { index, total, role });
    return runLayout(layout, ctx, `Slide ${index + 1}`);
  });
}

/** Re-gera um único slide com outro layout mantendo o conteúdo */
export function layoutsForDirection(direction: Direction) {
  const p = CAROUSEL_POOLS[direction];
  return [...new Set([...p.cover, ...(p.coverNoImage ?? []), ...p.content, ...p.contentNoImage, p.cta ?? 'cta'])].map((id) => layoutById(id)!);
}

// ======================================================== Brand Kit

/**
 * Reaplica o Brand Kit a páginas existentes: cores por papel (colorRole)
 * e fontes por papel tipográfico (role). Mantém posições e conteúdos.
 */
export function applyBrandToPages(pages: Page[], brand: BrandKit, opts = { colors: true, fonts: true }): Page[] {
  return pages.map((p) => {
    const page = deepClone(p);
    if (opts.colors && page.background.colorRole) page.background.color = brand.colors[page.background.colorRole];
    page.elements = page.elements.map((el): DesignElement => {
      const e = { ...el } as DesignElement;
      if (opts.colors && e.colorRole) {
        const col = brand.colors[e.colorRole];
        if (e.type === 'text' || e.type === 'shape') e.fill = col;
        if (e.type === 'line') e.stroke = col;
        if (e.type === 'shape' && !e.fillEnabled) e.strokeColor = col;
      }
      if (opts.fonts && e.type === 'text' && e.role) {
        const f = e.role === 'heading' || e.role === 'number' || (e.role === 'subheading' && e.italic)
          ? brand.headingFont
          : e.role === 'kicker' || e.role === 'cta' || e.role === 'caption' ? brand.accentFont : brand.bodyFont;
        e.fontFamily = f.family;
        e.fontWeight = nearestWeight(f.family, e.role === 'heading' ? f.weight : e.fontWeight);
        if (e.role === 'heading') e.uppercase = brand.headingUppercase;
      }
      if (e.type === 'image' && e.isLogo && brand.logoAssetId) e.assetId = brand.logoAssetId;
      return e;
    });
    return page;
  });
}

export const newIdsForPage = (p: Page): Page => ({
  ...deepClone(p), id: uid('pg_'), elements: p.elements.map((e) => ({ ...deepClone(e), id: uid('el_') })),
});

/** Gera uma página com um layout específico (usado para “trocar composição”) */
export function generateWithLayout(input: GeneratorInput & { layoutId: string; variant: number; image: string | null; slide?: SlideInfo }): Page {
  const l = layoutById(input.layoutId) ?? LAYOUTS[0];
  const ctx = buildCtx(input, input.variant, input.seed ?? Date.now(), input.image, input.content, input.slide);
  return runLayout(l, ctx, 'Página');
}

/** Metadados dos logotipos do Brand Kit a partir da lista de assets */
export function brandLogos(brand: BrandKit, assets: AssetMeta[]) {
  return {
    logoAsset: assets.find((a) => a.id === brand.logoAssetId) ?? null,
    logoLightAsset: assets.find((a) => a.id === brand.logoLightAssetId) ?? null,
  };
}

/** Carrega todas as faces que o gerador pode usar antes de medir textos */
export async function prepareBrandFonts(brand: BrandKit) {
  const { ensureFonts } = await import('../lib/fonts');
  const { clearRichCache } = await import('../lib/richText');
  const specs: { family: string; weight: number; italic?: boolean }[] = [];
  const add = (family: string, weights: number[], italic = true) => weights.forEach((w) => {
    const ww = nearestWeight(family, w);
    specs.push({ family, weight: ww }, ...(italic ? [{ family, weight: ww, italic: true }] : []));
  });
  add(brand.headingFont.family, [brand.headingFont.weight, 700]);
  add(brand.bodyFont.family, [brand.bodyFont.weight, 400, 500, 700, 800]);
  add(brand.accentFont.family, [brand.accentFont.weight, 400, 500, 600], false);
  if (brand.scriptFont) specs.push({ family: brand.scriptFont.family, weight: 400 });
  await ensureFonts(specs);
  clearRichCache();
}
