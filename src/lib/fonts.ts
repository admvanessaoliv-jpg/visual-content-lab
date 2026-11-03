import './fontImports';

export interface FontDef {
  family: string;
  category: 'serif' | 'sans' | 'display' | 'mono' | 'custom';
  weights: number[];
  italic: boolean;
}

/**
 * Catálogo de fontes empacotadas localmente via @fontsource (sem CDN).
 * Os arquivos .woff2 só são baixados pelo navegador quando usados.
 */
export const FONT_CATALOG: FontDef[] = [
  { family: 'Playfair Display', category: 'serif', weights: [400, 500, 600, 700, 800, 900], italic: true },
  { family: 'Cormorant Garamond', category: 'serif', weights: [300, 400, 500, 600, 700], italic: true },
  { family: 'DM Serif Display', category: 'serif', weights: [400], italic: true },
  { family: 'Fraunces', category: 'serif', weights: [300, 400, 500, 600, 700, 800, 900], italic: true },
  { family: 'Instrument Serif', category: 'serif', weights: [400], italic: true },
  { family: 'Bodoni Moda', category: 'serif', weights: [400, 500, 600, 700, 800], italic: true },
  { family: 'EB Garamond', category: 'serif', weights: [400, 500, 600, 700], italic: true },
  { family: 'Lora', category: 'serif', weights: [400, 500, 600, 700], italic: true },
  { family: 'Italiana', category: 'serif', weights: [400], italic: false },
  { family: 'Inter', category: 'sans', weights: [300, 400, 500, 600, 700, 800, 900], italic: false },
  { family: 'Inter Tight', category: 'sans', weights: [300, 400, 500, 600, 700, 800], italic: false },
  { family: 'Manrope', category: 'sans', weights: [300, 400, 500, 600, 700, 800], italic: false },
  { family: 'DM Sans', category: 'sans', weights: [300, 400, 500, 600, 700, 800], italic: false },
  { family: 'Space Grotesk', category: 'sans', weights: [300, 400, 500, 600, 700], italic: false },
  { family: 'Syne', category: 'sans', weights: [400, 500, 600, 700, 800], italic: false },
  { family: 'Archivo', category: 'sans', weights: [300, 400, 500, 600, 700, 800, 900], italic: false },
  { family: 'Montserrat', category: 'sans', weights: [300, 400, 500, 600, 700, 800, 900], italic: true },
  { family: 'Poppins', category: 'sans', weights: [300, 400, 500, 600, 700, 800, 900], italic: true },
  { family: 'Work Sans', category: 'sans', weights: [300, 400, 500, 600, 700, 800], italic: false },
  { family: 'Outfit', category: 'sans', weights: [300, 400, 500, 600, 700, 800, 900], italic: false },
  { family: 'Unbounded', category: 'display', weights: [300, 400, 500, 600, 700, 800, 900], italic: false },
  { family: 'Bebas Neue', category: 'display', weights: [400], italic: false },
  { family: 'Anton', category: 'display', weights: [400], italic: false },
  { family: 'Archivo Black', category: 'display', weights: [400], italic: false },
  { family: 'Abril Fatface', category: 'display', weights: [400], italic: false },
  { family: 'JetBrains Mono', category: 'mono', weights: [400, 500, 700], italic: false },
  { family: 'Space Mono', category: 'mono', weights: [400, 700], italic: true },
];

const customFonts = new Map<string, FontDef>();

export function allFonts(): FontDef[] {
  return [...FONT_CATALOG, ...customFonts.values()];
}

export function getFontDef(family: string): FontDef | undefined {
  return FONT_CATALOG.find((f) => f.family === family) ?? customFonts.get(family);
}

/** Ajusta o peso para o mais próximo disponível na família */
export function nearestWeight(family: string, weight: number) {
  const def = getFontDef(family);
  if (!def) return weight;
  return def.weights.reduce((best, w) => (Math.abs(w - weight) < Math.abs(best - weight) ? w : best), def.weights[0]);
}

export const fontStack = (family: string) => `"${family}", "Inter", sans-serif`;

const SAMPLE = 'AaBbÇçÃãÉéÍíÓóÚú0123456789';
const loaded = new Set<string>();

/** Garante que a face da fonte esteja carregada antes de desenhar no canvas */
export async function ensureFont(family: string, weight = 400, italic = false) {
  const key = `${family}|${weight}|${italic}`;
  if (loaded.has(key)) return;
  try {
    await document.fonts.load(`${italic ? 'italic ' : ''}${weight} 48px "${family}"`, SAMPLE);
    loaded.add(key);
  } catch {
    /* fonte indisponível: o navegador usa fallback */
  }
}

export async function ensureFonts(specs: { family: string; weight: number; italic?: boolean }[]) {
  await Promise.all(specs.map((s) => ensureFont(s.family, s.weight, !!s.italic)));
}

/** Registra uma fonte enviada pelo usuário (TTF/OTF/WOFF/WOFF2) */
export async function registerCustomFont(family: string, blob: Blob) {
  if (customFonts.has(family)) return;
  const buf = await blob.arrayBuffer();
  const face = new FontFace(family, buf);
  await face.load();
  document.fonts.add(face);
  customFonts.set(family, { family, category: 'custom', weights: [400], italic: false });
}

export const isCustomFont = (family: string) => customFonts.has(family);
