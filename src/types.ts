// ============================================================
// Modelo de dados do Visual Content Lab
// Todo design é um documento de objetos independentes (nunca uma
// imagem achatada). O PNG só é gerado no momento da exportação.
// ============================================================

export type FormatId = 'portrait' | 'square' | 'story';

export interface Format {
  id: FormatId;
  label: string;
  width: number;
  height: number;
  ratio: string;
}

export type DesignType = 'static' | 'reels' | 'carousel' | 'editorial' | 'photo' | 'typographic';

/** Direções visuais (A–F) */
export type Direction = 'P' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export type TextRole = 'kicker' | 'heading' | 'subheading' | 'body' | 'caption' | 'cta' | 'number';
export type ColorRole = 'primary' | 'secondary' | 'accent' | 'background' | 'surface' | 'text' | 'muted';

export interface Shadow {
  enabled: boolean;
  color: string;
  blur: number;
  offsetX: number;
  offsetY: number;
  opacity: number;
}

export interface Gradient {
  from: string;
  to: string;
  fromOpacity: number;
  toOpacity: number;
  angle: number; // graus
}

interface BaseElement {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  locked: boolean;
  hidden: boolean;
  shadow?: Shadow;
  /** Papel de cor da marca — permite reaplicar o Brand Kit */
  colorRole?: ColorRole;
}

export interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  italic: boolean;
  fill: string;
  align: 'left' | 'center' | 'right';
  verticalAlign: 'top' | 'middle' | 'bottom';
  lineHeight: number;
  letterSpacing: number;
  uppercase: boolean;
  underline: boolean;
  strokeColor?: string;
  strokeWidth?: number;
  role?: TextRole;
  /** Altura automática conforme o conteúdo */
  autoHeight: boolean;
  /**
   * Texto rico: interpreta marcações no próprio texto
   * ==destaque==  **negrito**  *itálico*
   */
  rich?: boolean;
  highlightColor?: string;
  highlightColorRole?: ColorRole;
  highlightFamily?: string;
  highlightItalic?: boolean;
  highlightWeight?: number;
  boldWeight?: number;
  /** Letra capitular decorativa (primeira letra em outra fonte e escala) */
  dropCap?: { family: string; scale: number; color?: string } | null;
  /** Espaço extra entre parágrafos, em em */
  paragraphSpacing?: number;
}

export interface ImageFilters {
  grayscale: boolean;
  brightness: number; // -1..1
  contrast: number; // -100..100
  blur: number; // 0..40
}

export interface ImageElement extends BaseElement {
  type: 'image';
  assetId: string | null;
  fit: 'cover' | 'fill';
  focusX: number; // 0..1
  focusY: number; // 0..1
  zoom: number; // >=1
  cornerRadius: number;
  strokeColor: string;
  strokeWidth: number;
  filters: ImageFilters;
  /** Marca o elemento como logotipo da marca */
  isLogo?: boolean;
}

export interface ShapeElement extends BaseElement {
  type: 'shape';
  shape: 'rect' | 'ellipse' | 'triangle' | 'star' | 'polygon';
  fill: string;
  fillEnabled: boolean;
  gradient?: Gradient;
  gradientEnabled?: boolean;
  strokeColor: string;
  strokeWidth: number;
  cornerRadius: number;
  sides?: number;
  dash?: number[];
}

export interface LineElement extends BaseElement {
  type: 'line';
  stroke: string;
  strokeWidth: number;
  dash: number[];
  arrowEnd: boolean;
  /** 'open' = seta vazada (chevron), 'filled' = ponta sólida */
  arrowStyle?: 'filled' | 'open';
  lineCap: 'butt' | 'round';
}

export type DesignElement = TextElement | ImageElement | ShapeElement | LineElement;
export type ElementType = DesignElement['type'];

export interface PageBackground {
  color: string;
  colorRole?: ColorRole;
  gradientEnabled: boolean;
  gradient: Gradient;
  assetId: string | null;
  imageOpacity: number;
  imageFilters: ImageFilters;
  overlayColor: string;
  overlayOpacity: number;
  /** Textura granulada sobre a página (0–1) */
  grain?: number;
}

export interface Page {
  id: string;
  name: string;
  background: PageBackground;
  elements: DesignElement[];
  thumbnail?: string;
}

export type ProjectStatus = 'draft' | 'final';

export interface Project {
  id: string;
  name: string;
  kind: 'design' | 'carousel';
  designType: DesignType;
  direction?: Direction;
  format: FormatId;
  pages: Page[];
  brandKitId: string | null;
  folderId: string | null;
  status: ProjectStatus;
  favorite: boolean;
  isTemplate: boolean;
  thumbnail?: string;
  createdAt: number;
  updatedAt: number;
}

export type ProjectMeta = Omit<Project, 'pages'> & { pageCount: number };

export interface BrandFont {
  family: string;
  weight: number;
}

export interface BrandKit {
  id: string;
  name: string;
  handle: string;
  logoAssetId: string | null;
  logoLightAssetId: string | null;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    muted: string;
  };
  palette: string[];
  headingFont: BrandFont;
  bodyFont: BrandFont;
  accentFont: BrandFont;
  /** Fonte caligráfica para letras capitulares */
  scriptFont?: BrandFont;
  useDropCap?: boolean;
  headingUppercase: boolean;
  headingLetterSpacing: number;
  photoStyle: string;
  photoNotes: string;
  photoFilter: 'none' | 'bw' | 'warm' | 'soft';
  compositionStyle: string;
  compositionNotes: string;
  cornerRadius: number;
  references: { assetId: string; note: string }[];
  customFonts: { family: string; assetId: string }[];
  createdAt: number;
  updatedAt: number;
}

export interface Asset {
  id: string;
  name: string;
  mime: string;
  kind: 'image' | 'font';
  width: number;
  height: number;
  size: number;
  blob: Blob;
  createdAt: number;
  tags: string[];
}

export type AssetMeta = Omit<Asset, 'blob'>;

export interface Folder {
  id: string;
  name: string;
  description: string;
  color: string;
  createdAt: number;
}

export interface Settings {
  defaultFormat: FormatId;
  exportScale: 1 | 2 | 3;
  exportFormat: 'png' | 'jpeg';
  jpegQuality: number;
  autosave: boolean;
  showSafeZones: boolean;
  snapping: boolean;
}
