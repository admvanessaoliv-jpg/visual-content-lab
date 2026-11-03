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
    ...BRAND_PRESETS[0].kit,
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

type PresetKit = Pick<BrandKit, 'colors' | 'palette' | 'headingFont' | 'bodyFont' | 'accentFont' | 'scriptFont' | 'useDropCap' | 'headingUppercase' | 'headingLetterSpacing'>;

/** Presets de identidade prontos para começar com qualidade editorial */
export const BRAND_PRESETS: { id: string; name: string; description: string; kit: PresetKit }[] = [
  {
    id: 'verde-editorial', name: 'Verde editorial', description: 'Verde profundo, off-white e destaque verde-limão. Serifa condensada + grotesca.',
    kit: {
      colors: { primary: '#2B3830', secondary: '#45564B', accent: '#C9F27E', background: '#EDEDE9', surface: '#F7F7F4', text: '#27312B', muted: '#6E7871' },
      palette: ['#2B3830', '#45564B', '#C9F27E', '#EDEDE9', '#27312B', '#F7F7F4'],
      headingFont: { family: 'Instrument Serif', weight: 400 }, bodyFont: { family: 'Inter Tight', weight: 400 }, accentFont: { family: 'Inter Tight', weight: 500 },
      scriptFont: { family: 'Pinyon Script', weight: 400 }, useDropCap: true, headingUppercase: false, headingLetterSpacing: -0.035,
    },
  },
  {
    id: 'areia-noite', name: 'Areia & noite', description: 'Azul-noite, areia e dourado suave. Elegante e silencioso.',
    kit: {
      colors: { primary: '#1E2433', secondary: '#3A4257', accent: '#E3C48F', background: '#F1ECE4', surface: '#FBF8F3', text: '#1F2330', muted: '#7B7769' },
      palette: ['#1E2433', '#3A4257', '#E3C48F', '#F1ECE4', '#1F2330', '#FBF8F3'],
      headingFont: { family: 'Instrument Serif', weight: 400 }, bodyFont: { family: 'Inter Tight', weight: 400 }, accentFont: { family: 'Inter Tight', weight: 500 },
      scriptFont: { family: 'Great Vibes', weight: 400 }, useDropCap: true, headingUppercase: false, headingLetterSpacing: -0.03,
    },
  },
  {
    id: 'vinho-rosa', name: 'Vinho & blush', description: 'Vinho profundo, blush e rosa vivo no destaque.',
    kit: {
      colors: { primary: '#3B1F26', secondary: '#5C3540', accent: '#F4A7B9', background: '#F3ECEA', surface: '#FBF7F6', text: '#2E1B20', muted: '#80676D' },
      palette: ['#3B1F26', '#5C3540', '#F4A7B9', '#F3ECEA', '#2E1B20', '#FBF7F6'],
      headingFont: { family: 'Bodoni Moda', weight: 400 }, bodyFont: { family: 'Inter Tight', weight: 400 }, accentFont: { family: 'Inter Tight', weight: 500 },
      scriptFont: { family: 'Pinyon Script', weight: 400 }, useDropCap: true, headingUppercase: false, headingLetterSpacing: -0.03,
    },
  },
  {
    id: 'grafite', name: 'Grafite minimal', description: 'Preto, cinza quente e branco. Sem capitular, puro grid.',
    kit: {
      colors: { primary: '#141414', secondary: '#3A3A38', accent: '#E8E4DA', background: '#F2F1ED', surface: '#FFFFFF', text: '#161616', muted: '#7A7872' },
      palette: ['#141414', '#3A3A38', '#E8E4DA', '#F2F1ED', '#161616', '#FFFFFF'],
      headingFont: { family: 'Fraunces', weight: 400 }, bodyFont: { family: 'Inter Tight', weight: 400 }, accentFont: { family: 'Inter Tight', weight: 500 },
      scriptFont: { family: 'Pinyon Script', weight: 400 }, useDropCap: false, headingUppercase: false, headingLetterSpacing: -0.03,
    },
  },
];

export const PHOTO_STYLES = [
  'Luz natural, tons quentes', 'Alto contraste, preto e branco', 'Editorial de moda', 'Lifestyle espontâneo',
  'Still / produto em fundo neutro', 'Retrato íntimo', 'Arquitetura e linhas', 'Analógico / granulado',
];

export const COMPOSITION_STYLES = [
  'Minimalista com muito respiro', 'Editorial de revista', 'Grid modular', 'Tipografia expressiva',
  'Assimétrico e dinâmico', 'Centralizado e simétrico', 'Colagem / sobreposições',
];
