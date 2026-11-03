import type {
  BrandKit, ImageElement, ImageFilters, LineElement, Page, PageBackground, Settings, Shadow, ShapeElement, TextElement,
} from '../types';
import { uid } from './ids';

export const DEFAULT_SETTINGS: Settings = {
  defaultFormat: 'portrait',
  exportScale: 1,
  exportFormat: 'png',
  jpegQuality: 0.92,
  autosave: true,
  showSafeZones: true,
  snapping: true,
};

export const noFilters = (): ImageFilters => ({ grayscale: false, brightness: 0, contrast: 0, blur: 0 });

export const softShadow = (color = '#000000', blur = 40, y = 18, opacity = 0.18): Shadow => ({
  enabled: true, color, blur, offsetX: 0, offsetY: y, opacity,
});

export function makeText(p: Partial<TextElement> = {}): TextElement {
  return {
    id: uid('el_'), type: 'text', name: 'Texto',
    x: 80, y: 80, width: 600, height: 80, rotation: 0, opacity: 1, locked: false, hidden: false,
    text: 'Seu texto aqui', fontFamily: 'Inter Tight', fontSize: 56, fontWeight: 500, italic: false,
    fill: '#111111', align: 'left', verticalAlign: 'top', lineHeight: 1.15, letterSpacing: 0,
    uppercase: false, underline: false, autoHeight: true,
    ...p,
  };
}

export function makeImage(p: Partial<ImageElement> = {}): ImageElement {
  return {
    id: uid('el_'), type: 'image', name: 'Imagem',
    x: 0, y: 0, width: 600, height: 600, rotation: 0, opacity: 1, locked: false, hidden: false,
    assetId: null, fit: 'cover', focusX: 0.5, focusY: 0.5, zoom: 1, cornerRadius: 0,
    strokeColor: '#FFFFFF', strokeWidth: 0, filters: noFilters(),
    ...p,
  };
}

export function makeShape(p: Partial<ShapeElement> = {}): ShapeElement {
  return {
    id: uid('el_'), type: 'shape', name: 'Forma', shape: 'rect',
    x: 100, y: 100, width: 300, height: 300, rotation: 0, opacity: 1, locked: false, hidden: false,
    fill: '#111111', fillEnabled: true, strokeColor: '#111111', strokeWidth: 0, cornerRadius: 0,
    gradientEnabled: false,
    gradient: { from: '#000000', to: '#000000', fromOpacity: 0, toOpacity: 0.7, angle: 180 },
    ...p,
  };
}

export function makeLine(p: Partial<LineElement> = {}): LineElement {
  return {
    id: uid('el_'), type: 'line', name: 'Linha',
    x: 100, y: 100, width: 400, height: 4, rotation: 0, opacity: 1, locked: false, hidden: false,
    stroke: '#111111', strokeWidth: 3, dash: [], arrowEnd: false, lineCap: 'butt',
    ...p,
  };
}

export function makeBackground(p: Partial<PageBackground> = {}): PageBackground {
  return {
    color: '#F4F1EC', gradientEnabled: false,
    gradient: { from: '#F4F1EC', to: '#E6E0D6', fromOpacity: 1, toOpacity: 1, angle: 180 },
    assetId: null, imageOpacity: 1, imageFilters: noFilters(), overlayColor: '#000000', overlayOpacity: 0,
    ...p,
  };
}

export function makePage(p: Partial<Page> = {}): Page {
  return { id: uid('pg_'), name: 'Página', background: makeBackground(), elements: [], ...p };
}

export function makeBrandKit(p: Partial<BrandKit> = {}): BrandKit {
  const now = Date.now();
  return {
    id: uid('bk_'),
    name: 'Minha marca',
    handle: '@minhamarca',
    logoAssetId: null,
    logoLightAssetId: null,
    colors: {
      primary: '#1A1A1A',
      secondary: '#B8603E',
      accent: '#D9C3A5',
      background: '#F4F1EC',
      surface: '#FFFFFF',
      text: '#161616',
      muted: '#7A746C',
    },
    palette: ['#1A1A1A', '#B8603E', '#D9C3A5', '#F4F1EC', '#FFFFFF', '#7A746C'],
    headingFont: { family: 'Playfair Display', weight: 500 },
    bodyFont: { family: 'Inter Tight', weight: 400 },
    accentFont: { family: 'Inter Tight', weight: 600 },
    headingUppercase: false,
    headingLetterSpacing: -0.02,
    photoStyle: 'Luz natural, tons quentes',
    photoNotes: '',
    photoFilter: 'none',
    compositionStyle: 'Minimalista com muito respiro',
    compositionNotes: '',
    cornerRadius: 0,
    references: [],
    customFonts: [],
    createdAt: now,
    updatedAt: now,
    ...p,
  };
}

export const PHOTO_STYLES = [
  'Luz natural, tons quentes', 'Alto contraste, preto e branco', 'Editorial de moda', 'Lifestyle espontâneo',
  'Still / produto em fundo neutro', 'Retrato íntimo', 'Arquitetura e linhas', 'Analógico / granulado',
];

export const COMPOSITION_STYLES = [
  'Minimalista com muito respiro', 'Editorial de revista', 'Grid modular', 'Tipografia expressiva',
  'Assimétrico e dinâmico', 'Centralizado e simétrico', 'Colagem / sobreposições',
];
