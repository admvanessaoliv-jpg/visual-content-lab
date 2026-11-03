import type { DesignType, Direction, Format, FormatId } from '../types';

export const FORMATS: Record<FormatId, Format> = {
  portrait: { id: 'portrait', label: 'Instagram Retrato', width: 1080, height: 1350, ratio: '4:5' },
  square: { id: 'square', label: 'Instagram Quadrado', width: 1080, height: 1080, ratio: '1:1' },
  story: { id: 'story', label: 'Story / Reels', width: 1080, height: 1920, ratio: '9:16' },
};

export const DESIGN_TYPES: { id: DesignType; label: string; description: string }[] = [
  { id: 'static', label: 'Post estático', description: 'Peça única equilibrada entre texto e elementos.' },
  { id: 'reels', label: 'Capa de Reels', description: 'Título forte dentro da área segura do grid 3:4.' },
  { id: 'carousel', label: 'Carrossel', description: 'Sequência de 3 a 10 slides com unidade visual.' },
  { id: 'editorial', label: 'Post editorial', description: 'Linguagem de revista: serifa, grid e legenda.' },
  { id: 'photo', label: 'Post com fotografia', description: 'A fotografia como protagonista da composição.' },
  { id: 'typographic', label: 'Post tipográfico', description: 'Somente tipografia, escala e espaço.' },
];

export const DIRECTIONS: { id: Direction; label: string; description: string; needsImage: boolean }[] = [
  { id: 'P', label: 'Editorial premium', description: 'Foto em degradê, serifa com capitular, granulado e texto editorial.', needsImage: false },
  { id: 'A', label: 'Minimalista tipográfico', description: 'Fundo neutro, tipografia como elemento principal.', needsImage: false },
  { id: 'B', label: 'Editorial fotográfico', description: 'Fotografia + serifa, grid de revista.', needsImage: true },
  { id: 'C', label: 'Fundo sólido com sombras', description: 'Cor da marca com cartões e sombras suaves.', needsImage: false },
  { id: 'D', label: 'Fotografia autoral', description: 'Sua fotografia em sangria total, intervenção mínima.', needsImage: true },
  { id: 'E', label: 'Fotografia enviada', description: 'Fotos enviadas integradas a molduras e blocos de texto.', needsImage: true },
  { id: 'F', label: 'Minimalista com elementos gráficos', description: 'Formas geométricas, linhas e respiro.', needsImage: false },
];

/** Área segura da capa de Reels no grid do perfil (recorte 3:4 central) */
export function reelsSafeZone(w: number, h: number) {
  const safeH = Math.round(w * (4 / 3));
  return { x: 0, y: Math.round((h - safeH) / 2), width: w, height: safeH };
}
