import Konva from 'konva';
import type { DesignElement, Gradient, ImageElement, ImageFilters, Page, Shadow, ShapeElement, TextElement } from '../types';
import { rgba } from './color';
import { fontStack } from './fonts';
import { drawRich, layoutRich, type RichStyle } from './richText';
import { grainTile } from './grain';
import type { PageBackground } from '../types';

/**
 * Tradução ÚNICA do modelo de dados para atributos Konva.
 * Usada tanto pelo editor (react-konva) quanto pelo renderizador
 * de exportação — garante que o PNG exportado seja idêntico à tela.
 */
export type NodeKind = 'Text' | 'Image' | 'Rect' | 'Ellipse' | 'Line' | 'Arrow' | 'Shape';

export interface NodeSpec {
  kind: NodeKind;
  attrs: Record<string, any>;
  needsCache: boolean;
}

function shadowAttrs(s?: Shadow) {
  if (!s || !s.enabled) return { shadowEnabled: false };
  return {
    shadowEnabled: true,
    shadowColor: s.color,
    shadowBlur: s.blur,
    shadowOffsetX: s.offsetX,
    shadowOffsetY: s.offsetY,
    shadowOpacity: s.opacity,
  };
}

export function gradientAttrs(g: Gradient, w: number, h: number) {
  const a = ((g.angle - 90) * Math.PI) / 180;
  const cx = w / 2, cy = h / 2;
  const len = (Math.abs(w * Math.cos(a)) + Math.abs(h * Math.sin(a))) / 2;
  return {
    fillPriority: 'linear-gradient',
    fillLinearGradientStartPoint: { x: cx - Math.cos(a) * len, y: cy - Math.sin(a) * len },
    fillLinearGradientEndPoint: { x: cx + Math.cos(a) * len, y: cy + Math.sin(a) * len },
    fillLinearGradientColorStops: [0, rgba(g.from, g.fromOpacity), 1, rgba(g.to, g.toOpacity)],
  };
}

export function coverCrop(iw: number, ih: number, w: number, h: number, fx = 0.5, fy = 0.5, zoom = 1) {
  const boxRatio = w / Math.max(1, h);
  const z = Math.max(1, zoom);
  let cw: number, ch: number;
  if (iw / ih > boxRatio) { ch = ih / z; cw = ch * boxRatio; } else { cw = iw / z; ch = cw / boxRatio; }
  return { x: (iw - cw) * fx, y: (ih - ch) * fy, width: cw, height: ch };
}

export function filterAttrs(f?: ImageFilters) {
  if (!f) return { filters: [] as any[], active: false };
  const filters: any[] = [];
  if (f.grayscale) filters.push(Konva.Filters.Grayscale);
  if (f.brightness) filters.push(Konva.Filters.Brighten);
  if (f.contrast) filters.push(Konva.Filters.Contrast);
  if (f.blur) filters.push(Konva.Filters.Blur);
  return {
    filters,
    active: filters.length > 0,
    brightness: f.brightness,
    contrast: f.contrast,
    blurRadius: f.blur,
  };
}

export function polygonPoints(el: ShapeElement): number[] {
  const { width: w, height: h } = el;
  if (el.shape === 'triangle') return [w / 2, 0, w, h, 0, h];
  const pts: number[] = [];
  if (el.shape === 'star') {
    const n = el.sides ?? 5;
    for (let i = 0; i < n * 2; i++) {
      const r = i % 2 === 0 ? 0.5 : 0.21;
      const a = (Math.PI * i) / n - Math.PI / 2;
      pts.push(w / 2 + Math.cos(a) * r * w, h / 2 + Math.sin(a) * r * h);
    }
    return pts;
  }
  const n = el.sides ?? 6;
  for (let i = 0; i < n; i++) {
    const a = (2 * Math.PI * i) / n - Math.PI / 2;
    pts.push(w / 2 + (Math.cos(a) * w) / 2, h / 2 + (Math.sin(a) * h) / 2);
  }
  return pts;
}

export const textContent = (el: TextElement) => (el.uppercase ? el.text.toLocaleUpperCase('pt-BR') : el.text);

export function textAttrs(el: TextElement) {
  return {
    text: textContent(el),
    width: el.width,
    ...(el.autoHeight ? {} : { height: el.height }),
    fontFamily: fontStack(el.fontFamily),
    fontSize: el.fontSize,
    fontStyle: `${el.italic ? 'italic ' : ''}${el.fontWeight}`,
    fill: el.fill,
    align: el.align,
    verticalAlign: el.verticalAlign,
    lineHeight: el.lineHeight,
    letterSpacing: el.letterSpacing,
    textDecoration: el.underline ? 'underline' : '',
    stroke: el.strokeWidth ? el.strokeColor : undefined,
    strokeWidth: el.strokeWidth || 0,
    fillAfterStrokeEnabled: true,
    wrap: 'word',
  };
}

export function elementSpec(el: DesignElement, img?: HTMLImageElement | null): NodeSpec {
  const base = {
    id: el.id,
    name: 'element',
    x: el.x,
    y: el.y,
    rotation: el.rotation,
    opacity: el.opacity,
    visible: !el.hidden,
    ...shadowAttrs(el.shadow),
  };

  switch (el.type) {
    case 'text':
      if (el.rich || el.dropCap) return richSpec(el, base);
      return { kind: 'Text', attrs: { ...base, ...textAttrs(el) }, needsCache: false };

    case 'image': {
      if (!img) {
        return {
          kind: 'Rect',
          attrs: {
            ...base, width: el.width, height: el.height, fill: '#E4E1DA',
            cornerRadius: el.cornerRadius, stroke: el.strokeWidth ? el.strokeColor : undefined, strokeWidth: el.strokeWidth,
          },
          needsCache: false,
        };
      }
      const f = filterAttrs(el.filters);
      const crop = el.fit === 'cover'
        ? coverCrop(img.naturalWidth, img.naturalHeight, el.width, el.height, el.focusX, el.focusY, el.zoom)
        : undefined;
      return {
        kind: 'Image',
        attrs: {
          ...base, image: img, width: el.width, height: el.height, crop,
          cornerRadius: el.cornerRadius,
          stroke: el.strokeWidth ? el.strokeColor : undefined, strokeWidth: el.strokeWidth,
          filters: f.filters, brightness: f.brightness, contrast: f.contrast, blurRadius: f.blurRadius,
        },
        needsCache: f.active,
      };
    }

    case 'shape': {
      const fill = el.fillEnabled ? el.fill : undefined;
      const grad = el.gradientEnabled && el.gradient ? gradientAttrs(el.gradient, el.width, el.height) : {};
      const stroke = el.strokeWidth ? { stroke: el.strokeColor, strokeWidth: el.strokeWidth, dash: el.dash } : { strokeWidth: 0 };
      const common = { ...base, fill, ...grad, ...stroke, fillEnabled: el.fillEnabled || !!el.gradientEnabled };
      if (el.shape === 'rect') {
        return { kind: 'Rect', attrs: { ...common, width: el.width, height: el.height, cornerRadius: el.cornerRadius }, needsCache: false };
      }
      if (el.shape === 'ellipse') {
        return {
          kind: 'Ellipse',
          attrs: {
            ...common, radiusX: el.width / 2, radiusY: el.height / 2, offsetX: -el.width / 2, offsetY: -el.height / 2,
            ...(el.gradientEnabled && el.gradient ? shiftGradient(gradientAttrs(el.gradient, el.width, el.height), el.width, el.height) : {}),
          },
          needsCache: false,
        };
      }
      return { kind: 'Line', attrs: { ...common, points: polygonPoints(el), closed: true, lineJoin: 'round' }, needsCache: false };
    }

    case 'line': {
      if (el.arrowEnd && el.arrowStyle === 'open') {
        const h = Math.max(6, el.strokeWidth * 3.2 + 4);
        return {
          kind: 'Line',
          attrs: {
            ...base, points: [0, 0, el.width, 0, el.width - h, -h, el.width, 0, el.width - h, h],
            stroke: el.stroke, strokeWidth: el.strokeWidth, lineCap: 'round', lineJoin: 'round',
            dash: el.dash.length ? el.dash : undefined, hitStrokeWidth: Math.max(24, el.strokeWidth + 16),
          },
          needsCache: false,
        };
      }
      return {
        kind: el.arrowEnd ? 'Arrow' : 'Line',
        attrs: {
          ...base,
          points: [0, 0, el.width, 0],
          stroke: el.stroke,
          fill: el.stroke,
          strokeWidth: el.strokeWidth,
          dash: el.dash.length ? el.dash : undefined,
          lineCap: el.lineCap,
          hitStrokeWidth: Math.max(24, el.strokeWidth + 16),
          pointerLength: el.strokeWidth * 4 + 6,
          pointerWidth: el.strokeWidth * 4 + 6,
        },
        needsCache: false,
      };
    }
  }
}

/** Ellipse desenha a partir do centro — compensa os pontos do gradiente */
function shiftGradient(g: ReturnType<typeof gradientAttrs>, w: number, h: number) {
  const s = g.fillLinearGradientStartPoint, e = g.fillLinearGradientEndPoint;
  return {
    ...g,
    fillLinearGradientStartPoint: { x: s.x - w / 2, y: s.y - h / 2 },
    fillLinearGradientEndPoint: { x: e.x - w / 2, y: e.y - h / 2 },
  };
}

export function collectFonts(pages: Page[]) {
  const out = new Map<string, { family: string; weight: number; italic: boolean }>();
  for (const p of pages) for (const el of p.elements) {
    if (el.type !== 'text') continue;
    const add = (family: string, weight: number, italic: boolean) => out.set(`${family}|${weight}|${italic}`, { family, weight, italic });
    add(el.fontFamily, el.fontWeight, el.italic);
    if (el.rich) {
      add(el.fontFamily, el.boldWeight ?? 700, el.italic);
      add(el.fontFamily, el.fontWeight, true);
      add(el.fontFamily, el.boldWeight ?? 700, true);
      add(el.highlightFamily ?? el.fontFamily, el.highlightWeight ?? el.fontWeight, el.highlightItalic ?? true);
    }
    if (el.dropCap) add(el.dropCap.family, 400, false);
  }
  return [...out.values()];
}

export function isImageEl(el: DesignElement): el is ImageElement { return el.type === 'image'; }

export function richStyleOf(el: TextElement): RichStyle {
  return {
    fontFamily: el.fontFamily,
    fontWeight: el.fontWeight,
    italic: el.italic,
    fontSize: el.fontSize,
    lineHeight: el.lineHeight,
    letterSpacing: el.letterSpacing,
    align: el.align,
    uppercase: el.uppercase,
    fill: el.fill,
    highlightColor: el.highlightColor ?? el.fill,
    highlightFamily: el.highlightFamily ?? el.fontFamily,
    highlightItalic: el.highlightItalic ?? true,
    highlightWeight: el.highlightWeight ?? el.fontWeight,
    boldWeight: el.boldWeight ?? 700,
    dropCap: el.dropCap ?? null,
    paragraphSpacing: el.paragraphSpacing ?? 0,
  };
}

function richSpec(el: TextElement, base: Record<string, any>): NodeSpec {
  const layout = layoutRich(el.text, richStyleOf(el), el.width);
  const height = el.autoHeight ? layout.height : el.height;
  const dy = el.autoHeight ? 0 : el.verticalAlign === 'middle' ? (el.height - layout.height) / 2 : el.verticalAlign === 'bottom' ? el.height - layout.height : 0;
  return {
    kind: 'Shape',
    attrs: {
      ...base,
      width: el.width,
      height,
      sceneFunc: (kctx: any, shape: any) => {
        const ctx: CanvasRenderingContext2D = kctx._context;
        ctx.save();
        if (shape.hasShadow && shape.hasShadow() && el.shadow?.enabled) {
          const sc = shape.getAbsoluteScale().x * (kctx.canvas?.getPixelRatio?.() ?? 1);
          const { r, g, b } = hexRgb(el.shadow.color);
          ctx.shadowColor = `rgba(${r},${g},${b},${el.shadow.opacity})`;
          ctx.shadowBlur = el.shadow.blur * sc;
          ctx.shadowOffsetX = el.shadow.offsetX * sc;
          ctx.shadowOffsetY = el.shadow.offsetY * sc;
        }
        if (dy) ctx.translate(0, dy);
        drawRich(ctx, layout, el.letterSpacing);
        ctx.restore();
      },
      hitFunc: (kctx: any, shape: any) => {
        kctx.beginPath();
        kctx.rect(0, 0, el.width, height);
        kctx.closePath();
        kctx.fillStrokeShape(shape);
      },
    },
    needsCache: false,
  };
}

function hexRgb(hex: string) {
  const n = parseInt(hex.replace('#', '').slice(0, 6), 16) || 0;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** Camada de granulado, desenhada acima de todos os elementos */
export function grainSpec(bg: PageBackground, W: number, H: number): NodeSpec | null {
  if (!bg.grain || bg.grain <= 0) return null;
  return {
    kind: 'Rect',
    attrs: { name: 'grain', x: 0, y: 0, width: W, height: H, fillPatternImage: grainTile(), fillPatternRepeat: 'repeat', opacity: Math.min(1, bg.grain), listening: false },
    needsCache: false,
  };
}
