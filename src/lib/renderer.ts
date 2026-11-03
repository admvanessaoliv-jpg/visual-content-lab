import Konva from 'konva';
import type { Page, PageBackground } from '../types';
import { FORMATS } from './formats';
import type { FormatId } from '../types';
import { loadAssetImage } from './assets';
import { ensureFonts } from './fonts';
import { collectFonts, coverCrop, elementSpec, filterAttrs, gradientAttrs, grainSpec, type NodeSpec } from './konvaAttrs';
import { clearRichCache } from './richText';

export function backgroundSpecs(bg: PageBackground, W: number, H: number, img?: HTMLImageElement | null): NodeSpec[] {
  const specs: NodeSpec[] = [
    {
      kind: 'Rect',
      attrs: {
        name: 'background', x: 0, y: 0, width: W, height: H, fill: bg.color,
        ...(bg.gradientEnabled ? gradientAttrs(bg.gradient, W, H) : {}),
      },
      needsCache: false,
    },
  ];
  if (bg.assetId && img) {
    const f = filterAttrs(bg.imageFilters);
    specs.push({
      kind: 'Image',
      attrs: {
        name: 'background', x: 0, y: 0, width: W, height: H, image: img, opacity: bg.imageOpacity,
        crop: coverCrop(img.naturalWidth, img.naturalHeight, W, H),
        filters: f.filters, brightness: f.brightness, contrast: f.contrast, blurRadius: f.blurRadius,
      },
      needsCache: f.active,
    });
  }
  if (bg.overlayOpacity > 0) {
    specs.push({
      kind: 'Rect',
      attrs: { name: 'background', x: 0, y: 0, width: W, height: H, fill: bg.overlayColor, opacity: bg.overlayOpacity },
      needsCache: false,
    });
  }
  return specs;
}

function create(spec: NodeSpec) {
  const Ctor = (Konva as any)[spec.kind] as new (a: any) => Konva.Shape;
  const node = new Ctor(spec.attrs);
  if (spec.needsCache) node.cache({ pixelRatio: 2 });
  return node;
}

async function pageImages(page: Page) {
  const ids = new Set<string>();
  if (page.background.assetId) ids.add(page.background.assetId);
  for (const el of page.elements) if (el.type === 'image' && el.assetId) ids.add(el.assetId);
  const map = new Map<string, HTMLImageElement>();
  await Promise.all([...ids].map(async (id) => {
    try { map.set(id, await loadAssetImage(id)); } catch { /* asset removido: placeholder */ }
  }));
  return map;
}

/**
 * Renderiza uma página em um Stage Konva fora da tela, na resolução
 * nativa do formato × pixelRatio. Usado para exportação e miniaturas.
 */
export async function renderPage(page: Page, formatId: FormatId, pixelRatio = 1): Promise<HTMLCanvasElement> {
  const { width: W, height: H } = FORMATS[formatId];
  await ensureFonts(collectFonts([page]));
  clearRichCache();
  const images = await pageImages(page);

  const container = document.createElement('div');
  const stage = new Konva.Stage({ container, width: W, height: H });
  const layer = new Konva.Layer();
  stage.add(layer);
  try {
    const bgImg = page.background.assetId ? images.get(page.background.assetId) : null;
    for (const spec of backgroundSpecs(page.background, W, H, bgImg)) layer.add(create(spec));
    for (const el of page.elements) {
      if (el.hidden) continue;
      const img = el.type === 'image' && el.assetId ? images.get(el.assetId) : null;
      layer.add(create(elementSpec(el, img)));
    }
    const grain = grainSpec(page.background, W, H);
    if (grain) layer.add(create(grain));
    layer.draw();
    return stage.toCanvas({ pixelRatio });
  } finally {
    stage.destroy();
  }
}

export async function renderPageBlob(page: Page, formatId: FormatId, pixelRatio = 1, type: 'image/png' | 'image/jpeg' = 'image/png', quality = 0.92) {
  const canvas = await renderPage(page, formatId, pixelRatio);
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Falha ao gerar imagem'))), type, quality),
  );
}

export async function renderThumbnail(page: Page, formatId: FormatId, width = 360) {
  const ratio = width / FORMATS[formatId].width;
  const canvas = await renderPage(page, formatId, ratio);
  return canvas.toDataURL('image/jpeg', 0.82);
}
