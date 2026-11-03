import Konva from 'konva';
import type { DesignElement, Gradient, ImageElement, ImageFilters, Page, Shadow, ShapeElement, TextElement } from '../types';
import { rgba } from './color';
import { fontStack } from './fonts';

/**
 * Tradução ÚNICA do modelo de dados para atributos Konva.
 * Usada tanto pelo editor (react-konva) quanto pelo renderizador
 * de exportação — garante que o PNG exportado seja idêntico à tela.
 */
export type NodeKind = 'Text' | 'Image' | 'Rect' | 'Ellipse' | 'Line' | 'Arrow';

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
    if (el.type === 'text') out.set(`${el.fontFamily}|${el.fontWeight}|${el.italic}`, { family: el.fontFamily, weight: el.fontWeight, italic: el.italic });
  }
  return [...out.values()];
}

export function isImageEl(el: DesignElement): el is ImageElement { return el.type === 'image'; }
