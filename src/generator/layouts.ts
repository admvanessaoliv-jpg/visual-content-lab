import type { DesignElement, Direction } from '../types';
import { softShadow } from '../lib/defaults';
import {
  bottomOf, chrome, circle, darkGradient, kicker, logoEl, photo, rect, rule, slideNumber, solidBg, txt,
  type GenCtx, type LayoutResult,
} from './kit';

export type LayoutTag = 'typographic' | 'editorial' | 'photo' | 'solid' | 'graphic' | 'cover' | 'content' | 'cta' | 'quote' | 'list';

export interface LayoutDef {
  id: string;
  label: string;
  directions: Direction[];
  tags: LayoutTag[];
  needsImage: boolean;
  fn: (c: GenCtx) => LayoutResult;
}

const W_ = (c: GenCtx, f: number) => Math.round(c.W * f);
const push = (arr: DesignElement[], ...els: (DesignElement | null | undefined | false)[]) => {
  for (const e of els) if (e) arr.push(e);
};
const textOnPhoto = { c: '#FFFFFF' };

// =========================================================== tipográficos

const typoHero: LayoutDef = {
  id: 'typo-hero', label: 'Tipográfico em destaque', directions: ['A', 'C', 'F'], tags: ['typographic', 'cover', 'content'], needsImage: false,
  fn: (c) => {
    const { safe: S, pal } = c;
    const els: DesignElement[] = [];
    if (c.content.kicker) push(els, kicker(c, c.content.kicker, { x: S.x, y: S.y + 20, w: S.w * 0.7, h: 60 }, pal.accent));
    const hasBody = !!c.content.body;
    const headBox = { x: S.x, y: S.y + S.h * 0.14, w: S.w * 0.96, h: S.h * (hasBody ? 0.5 : 0.66) };
    const h = txt(c, c.content.title, headBox, { font: 'heading', role: 'heading', color: pal.fg, maxSize: W_(c, 0.15), anchor: 'bottom' });
    push(els, h);
    const ry = bottomOf(h) + W_(c, 0.045);
    push(els, rule(S.x, ry, W_(c, 0.11), pal.accent, 5));
    let y = ry + W_(c, 0.045);
    if (c.content.subtitle) {
      const s = txt(c, c.content.subtitle, { x: S.x, y, w: S.w * 0.85, h: S.h * 0.12 }, { font: 'heading', role: 'subheading', color: pal.fg, maxSize: W_(c, 0.045), italic: true, lineHeight: 1.2 });
      push(els, s); y = bottomOf(s) + 24;
    }
    if (hasBody) push(els, txt(c, c.content.body!, { x: S.x, y, w: S.w * 0.8, h: S.y + S.h - y - 70 }, { font: 'body', role: 'body', color: pal.muted, maxSize: W_(c, 0.031), minSize: 18 }));
    push(els, ...chrome(c, { color: pal.muted, handle: 'bottom-left' }));
    return { bg: solidBg(pal.bg), els };
  },
};

const typoCenter: LayoutDef = {
  id: 'typo-center', label: 'Tipográfico centralizado', directions: ['A', 'C', 'F'], tags: ['typographic', 'cover', 'quote', 'cta'], needsImage: false,
  fn: (c) => {
    const { safe: S, pal } = c;
    const els: DesignElement[] = [];
    const lineW = W_(c, 0.08);
    push(els, rule(c.W / 2 - lineW / 2, S.y + S.h * 0.16, lineW, pal.accent, 3));
    if (c.content.kicker) push(els, kicker(c, c.content.kicker, { x: S.x, y: S.y + S.h * 0.16 + 36, w: S.w, h: 60 }, pal.accent, 'center'));
    const h = txt(c, c.content.title, { x: S.x + S.w * 0.04, y: S.y + S.h * 0.26, w: S.w * 0.92, h: S.h * 0.42 }, {
      font: 'heading', role: 'heading', color: pal.fg, maxSize: W_(c, 0.13), align: 'center', anchor: 'middle',
    });
    push(els, h);
    let y = bottomOf(h) + 40;
    if (c.content.subtitle) {
      const s = txt(c, c.content.subtitle, { x: S.x + S.w * 0.1, y, w: S.w * 0.8, h: S.h * 0.14 }, { font: 'body', role: 'subheading', color: pal.muted, maxSize: W_(c, 0.034), align: 'center' });
      push(els, s); y = bottomOf(s) + 30;
    }
    if (c.content.body && !c.content.subtitle) {
      push(els, txt(c, c.content.body, { x: S.x + S.w * 0.12, y, w: S.w * 0.76, h: S.y + S.h * 0.86 - y }, { font: 'body', role: 'body', color: pal.muted, maxSize: W_(c, 0.03), align: 'center' }));
    }
    push(els, rule(c.W / 2 - lineW / 2, S.y + S.h * 0.86, lineW, pal.accent, 3));
    push(els, logoEl(c, c.W / 2, S.y + S.h * 0.9, W_(c, 0.05), 'center'));
    push(els, ...chrome(c, { color: pal.muted, handle: c.logo ? false : 'bottom-center' }));
    return { bg: solidBg(pal.bg), els };
  },
};

const typoNumber: LayoutDef = {
  id: 'typo-number', label: 'Número gigante', directions: ['A', 'F', 'C'], tags: ['typographic', 'content', 'graphic'], needsImage: false,
  fn: (c) => {
    const { safe: S, pal } = c;
    const els: DesignElement[] = [];
    const n = txt(c, c.content.kicker && /^\d{1,2}$/.test(c.content.kicker) ? c.content.kicker : slideNumber(c), { x: S.x - W_(c, 0.01), y: S.y, w: S.w, h: W_(c, 0.4) }, {
      font: 'heading', role: 'number', name: 'Número', color: pal.accent, size: W_(c, 0.34), lineHeight: 0.9, uppercase: false, letterSpacingEm: -0.04,
    });
    push(els, n);
    const h = txt(c, c.content.title, { x: S.x, y: bottomOf(n) + W_(c, 0.03), w: S.w * 0.92, h: S.h * 0.3 }, { font: 'heading', role: 'heading', color: pal.fg, maxSize: W_(c, 0.085) });
    push(els, h);
    if (c.content.body) {
      push(els, txt(c, c.content.body, { x: S.x, y: bottomOf(h) + 36, w: S.w * 0.86, h: S.y + S.h - bottomOf(h) - 110 }, { font: 'body', role: 'body', color: pal.muted, maxSize: W_(c, 0.033) }));
    }
    push(els, ...chrome(c, { color: pal.muted, handle: 'bottom-left' }));
    return { bg: solidBg(pal.bg), els };
  },
};

const quote: LayoutDef = {
  id: 'quote', label: 'Citação', directions: ['A', 'C', 'F', 'B'], tags: ['typographic', 'quote', 'content'], needsImage: false,
  fn: (c) => {
    const { safe: S, pal } = c;
    const els: DesignElement[] = [];
    const q = txt(c, '“', { x: S.x - W_(c, 0.015), y: S.y + S.h * 0.08, w: W_(c, 0.4), h: W_(c, 0.3) }, {
      font: 'heading', role: 'number', name: 'Aspas', color: pal.accent, size: W_(c, 0.32), lineHeight: 0.85, uppercase: false, letterSpacingEm: 0,
    });
    push(els, q);
    const h = txt(c, c.content.title, { x: S.x, y: S.y + S.h * 0.3, w: S.w * 0.94, h: S.h * 0.45 }, {
      font: 'heading', role: 'heading', color: pal.fg, maxSize: W_(c, 0.075), italic: true, uppercase: false, lineHeight: 1.12,
    });
    push(els, h);
    const author = c.content.subtitle || c.content.handle;
    if (author) {
      push(els, rule(S.x, bottomOf(h) + 50, 50, pal.accent, 3));
      push(els, txt(c, author, { x: S.x + 70, y: bottomOf(h) + 34, w: S.w * 0.7, h: 40 }, { font: 'accent', role: 'caption', name: 'Autor', color: pal.muted, size: W_(c, 0.024), uppercase: true, letterSpacingEm: 0.14, lineHeight: 1.3 }));
    }
    push(els, ...chrome(c, { color: pal.muted, handle: false }));
    return { bg: solidBg(pal.bg), els };
  },
};

const list: LayoutDef = {
  id: 'list', label: 'Lista numerada', directions: ['A', 'C', 'F', 'B', 'E'], tags: ['typographic', 'list', 'content'], needsImage: false,
  fn: (c) => {
    const { safe: S, pal } = c;
    const els: DesignElement[] = [];
    if (c.content.kicker) push(els, kicker(c, c.content.kicker, { x: S.x, y: S.y + 20, w: S.w, h: 60 }, pal.accent));
    const h = txt(c, c.content.title, { x: S.x, y: S.y + 90, w: S.w * 0.9, h: S.h * 0.24 }, { font: 'heading', role: 'heading', color: pal.fg, maxSize: W_(c, 0.075) });
    push(els, h);
    const items = (c.content.body || '').split('\n').map((s) => s.replace(/^[-•*\d.)\s]+/, '').trim()).filter(Boolean).slice(0, 6);
    let y = bottomOf(h) + 50;
    const avail = S.y + S.h - 80 - y;
    const rowH = items.length ? Math.min(W_(c, 0.16), avail / items.length) : 0;
    items.forEach((it, i) => {
      push(els, rule(S.x, y, S.w, pal.muted, 1.5, { opacity: 0.5 }));
      push(els, txt(c, String(i + 1).padStart(2, '0'), { x: S.x, y: y + 22, w: 90, h: 50 }, { font: 'accent', role: 'number', name: `Item ${i + 1} nº`, color: pal.accent, size: W_(c, 0.026), weight: 600, lineHeight: 1.3 }));
      push(els, txt(c, it, { x: S.x + 110, y: y + 18, w: S.w - 110, h: rowH - 30 }, { font: 'body', role: 'body', name: `Item ${i + 1}`, color: pal.fg, maxSize: W_(c, 0.036), lineHeight: 1.3 }));
      y += rowH;
    });
    push(els, ...chrome(c, { color: pal.muted, handle: 'bottom-left' }));
    return { bg: solidBg(pal.bg), els };
  },
};

// =========================================================== editoriais / fotográficos

const editorialTop: LayoutDef = {
  id: 'editorial-top', label: 'Editorial — foto superior', directions: ['B', 'E'], tags: ['editorial', 'photo', 'cover', 'content'], needsImage: true,
  fn: (c) => {
    const { safe: S, pal, M } = c;
    const els: DesignElement[] = [];
    const top = S.y - M * 0.35;
    push(els, txt(c, c.brand.name, { x: S.x, y: top, w: S.w * 0.6, h: 40 }, { font: 'accent', role: 'caption', name: 'Masthead', color: pal.fg, size: W_(c, 0.022), uppercase: true, letterSpacingEm: 0.2, weight: 600, lineHeight: 1.2 }));
    if (!c.slide) push(els, txt(c, `Nº ${slideNumber(c)}`, { x: S.x + S.w * 0.6, y: top, w: S.w * 0.4, h: 40 }, { font: 'accent', role: 'caption', name: 'Edição', color: pal.muted, size: W_(c, 0.022), align: 'right', letterSpacingEm: 0.1, lineHeight: 1.2 }));
    push(els, rule(S.x, top + 46, S.w, pal.fg, 1.5));
    const ph = c.H * (c.H > c.W * 1.5 ? 0.5 : 0.5);
    const p = photo(c, { x: S.x, y: top + 70, w: S.w, h: ph });
    push(els, p);
    let y = bottomOf(p) + 36;
    if (c.content.kicker) { const k = kicker(c, c.content.kicker, { x: S.x, y, w: S.w, h: 60 }, pal.accent); push(els, k); y = bottomOf(k) + 16; }
    const remaining = S.y + S.h - y - 60;
    const h = txt(c, c.content.title, { x: S.x, y, w: S.w * (c.content.body ? 0.58 : 0.95), h: remaining }, { font: 'heading', role: 'heading', color: pal.fg, maxSize: W_(c, 0.075) });
    push(els, h);
    if (c.content.body) push(els, txt(c, c.content.body, { x: S.x + S.w * 0.64, y: y + 6, w: S.w * 0.36, h: remaining }, { font: 'body', role: 'body', color: pal.muted, maxSize: W_(c, 0.024), minSize: 14, lineHeight: 1.45 }));
    push(els, ...chrome(c, { color: pal.muted, handle: 'bottom-left' }));
    return { bg: solidBg(pal.bg), els };
  },
};

const editorialMasthead: LayoutDef = {
  id: 'editorial-masthead', label: 'Capa de revista', directions: ['B', 'D'], tags: ['editorial', 'photo', 'cover'], needsImage: true,
  fn: (c) => {
    const { safe: S, M } = c;
    const els: DesignElement[] = [];
    push(els, photo(c, { x: 0, y: 0, w: c.W, h: c.H }));
    push(els, darkGradient({ x: 0, y: 0, w: c.W, h: c.H * 0.32 }, 0, 0.55));
    push(els, darkGradient({ x: 0, y: c.H * 0.45, w: c.W, h: c.H * 0.55 }, 180, 0.8));
    push(els, txt(c, c.brand.name, { x: M * 0.6, y: S.y - M * 0.2, w: c.W - M * 1.2, h: W_(c, 0.2) }, {
      font: 'heading', role: 'heading', name: 'Masthead', color: textOnPhoto, maxSize: W_(c, 0.17), align: 'center', uppercase: true, letterSpacingEm: 0.04, lineHeight: 1,
    }));
    const h = txt(c, c.content.title, { x: S.x, y: S.y + S.h * 0.5, w: S.w * 0.9, h: S.h * 0.36 }, { font: 'heading', role: 'heading', color: textOnPhoto, maxSize: W_(c, 0.09), anchor: 'bottom' });
    if (c.content.kicker) push(els, kicker(c, c.content.kicker, { x: S.x, y: h.y - 64, w: S.w, h: 60 }, textOnPhoto));
    push(els, h);
    if (c.content.subtitle) push(els, txt(c, c.content.subtitle, { x: S.x, y: bottomOf(h) + 22, w: S.w * 0.8, h: 90 }, { font: 'body', role: 'subheading', color: textOnPhoto, maxSize: W_(c, 0.03), opacity: 0.88 }));
    push(els, ...chrome(c, { color: textOnPhoto, handle: c.content.subtitle ? false : 'bottom-left', counter: false }));
    return { bg: solidBg(c.pal.bg), els };
  },
};

const photoBottom: LayoutDef = {
  id: 'photo-bottom', label: 'Foto em sangria + título', directions: ['D', 'B', 'E'], tags: ['photo', 'cover', 'content'], needsImage: true,
  fn: (c) => {
    const { safe: S } = c;
    const els: DesignElement[] = [];
    push(els, photo(c, { x: 0, y: 0, w: c.W, h: c.H }));
    push(els, darkGradient({ x: 0, y: c.H * 0.38, w: c.W, h: c.H * 0.62 }, 180, 0.82));
    let bottom = S.y + S.h - 60;
    let bodyEl = null;
    if (c.content.body) {
      bodyEl = txt(c, c.content.body, { x: S.x, y: bottom - S.h * 0.16, w: S.w * 0.82, h: S.h * 0.16 }, { font: 'body', role: 'body', color: textOnPhoto, maxSize: W_(c, 0.03), anchor: 'bottom', opacity: 0.9 });
      bottom = bodyEl.y - 28;
    }
    const h = txt(c, c.content.title, { x: S.x, y: S.y + S.h * 0.38, w: S.w * 0.92, h: bottom - (S.y + S.h * 0.38) }, { font: 'heading', role: 'heading', color: textOnPhoto, maxSize: W_(c, 0.105), anchor: 'bottom' });
    if (c.content.kicker) push(els, kicker(c, c.content.kicker, { x: S.x, y: h.y - 66, w: S.w, h: 60 }, textOnPhoto));
    push(els, h, bodyEl);
    push(els, ...chrome(c, { color: textOnPhoto, handle: 'bottom-left' }));
    return { bg: solidBg(c.pal.bg), els };
  },
};

const photoCaption: LayoutDef = {
  id: 'photo-caption', label: 'Fotografia autoral com legenda', directions: ['D'], tags: ['photo', 'content', 'cover'], needsImage: true,
  fn: (c) => {
    const { safe: S, pal, M } = c;
    const els: DesignElement[] = [];
    push(els, photo(c, { x: 0, y: 0, w: c.W, h: c.H }));
    const boxW = S.w * 0.62;
    const pad = W_(c, 0.035);
    const k = c.content.kicker ? kicker(c, c.content.kicker, { x: S.x + pad, y: 0, w: boxW - 2 * pad, h: 60 }, pal.accent) : null;
    const h = txt(c, c.content.title, { x: S.x + pad, y: 0, w: boxW - 2 * pad, h: S.h * 0.22 }, { font: 'heading', role: 'heading', color: pal.onSurface, maxSize: W_(c, 0.05) });
    const kh = k ? k.height + 16 : 0;
    const boxH = pad * 2 + kh + h.height;
    const by = S.y + S.h - boxH - 40;
    if (k) k.y = Math.round(by + pad);
    h.y = Math.round(by + pad + kh);
    push(els, rect({ x: S.x, y: by, w: boxW, h: boxH }, pal.surface, { name: 'Caixa de legenda', cornerRadius: c.brand.cornerRadius }), k, h);
    push(els, txt(c, c.content.handle || c.brand.name, { x: M, y: S.y - M * 0.35, w: 500, h: 40 }, { font: 'accent', role: 'caption', name: 'Assinatura', color: textOnPhoto, size: W_(c, 0.022), letterSpacingEm: 0.1, lineHeight: 1.2 }));
    push(els, ...chrome(c, { color: textOnPhoto, handle: false }));
    return { bg: solidBg(pal.bg), els };
  },
};

const frameInset: LayoutDef = {
  id: 'frame-inset', label: 'Foto emoldurada', directions: ['E', 'B', 'F'], tags: ['photo', 'editorial', 'cover', 'content'], needsImage: true,
  fn: (c) => {
    const { safe: S, pal } = c;
    const els: DesignElement[] = [];
    const frame = W_(c, 0.022);
    const top = S.y + (c.slide ? W_(c, 0.04) : 0);
    const ph = c.H * 0.52;
    push(els, rect({ x: S.x - frame, y: top - frame, w: S.w + frame * 2, h: ph + frame * 2 }, pal.surface, { name: 'Moldura', shadow: softShadow('#000000', 50, 24, 0.16), cornerRadius: c.brand.cornerRadius }));
    push(els, photo(c, { x: S.x, y: top, w: S.w, h: ph }, { cornerRadius: Math.max(0, c.brand.cornerRadius - frame / 2) }));
    let y = top + ph + frame + W_(c, 0.06);
    if (c.content.kicker) { const k = kicker(c, c.content.kicker, { x: S.x, y, w: S.w, h: 60 }, pal.accent); push(els, k); y = bottomOf(k) + 14; }
    const h = txt(c, c.content.title, { x: S.x, y, w: S.w, h: S.y + S.h - y - (c.content.body ? 150 : 70) }, { font: 'heading', role: 'heading', color: pal.fg, maxSize: W_(c, 0.08) });
    push(els, h);
    if (c.content.body) push(els, txt(c, c.content.body, { x: S.x, y: bottomOf(h) + 20, w: S.w * 0.9, h: S.y + S.h - bottomOf(h) - 80 }, { font: 'body', role: 'body', color: pal.muted, maxSize: W_(c, 0.03) }));
    push(els, ...chrome(c, { color: pal.muted, handle: 'bottom-left' }));
    return { bg: solidBg(pal.bg), els };
  },
};

const splitSide: LayoutDef = {
  id: 'split', label: 'Divisão foto / texto', directions: ['E', 'B', 'C'], tags: ['photo', 'editorial', 'content', 'cover'], needsImage: true,
  fn: (c) => {
    const { pal, M } = c;
    const els: DesignElement[] = [];
    const vertical = c.H > c.W * 1.4;
    const textBox = vertical
      ? { x: M, y: c.H * 0.5 + M, w: c.W - 2 * M, h: c.H * 0.5 - 2 * M - c.safe.y * 0.6 }
      : { x: c.W * 0.5 + M * 0.7, y: c.safe.y + 60, w: c.W * 0.5 - M * 1.4, h: c.safe.h - 140 };
    push(els, vertical ? photo(c, { x: 0, y: 0, w: c.W, h: c.H * 0.5 }) : photo(c, { x: 0, y: 0, w: c.W * 0.5, h: c.H }));
    const hasK = !!c.content.kicker;
    const h = txt(c, c.content.title, { x: textBox.x, y: textBox.y + (hasK ? 70 : 0), w: textBox.w, h: textBox.h * (c.content.body ? 0.55 : 0.9) - (hasK ? 70 : 0) }, {
      font: 'heading', role: 'heading', color: pal.fg, maxSize: W_(c, vertical ? 0.09 : 0.068),
    });
    if (hasK) push(els, kicker(c, c.content.kicker!, { x: textBox.x, y: textBox.y, w: textBox.w, h: 60 }, pal.accent));
    push(els, h);
    if (c.content.body) {
      push(els, rule(textBox.x, bottomOf(h) + 32, 60, pal.accent, 3));
      push(els, txt(c, c.content.body, { x: textBox.x, y: bottomOf(h) + 64, w: textBox.w, h: textBox.y + textBox.h - bottomOf(h) - 64 }, { font: 'body', role: 'body', color: pal.muted, maxSize: W_(c, 0.028) }));
    }
    const ch = chrome(c, { color: pal.muted, handle: false, counter: true });
    push(els, ...ch);
    return { bg: solidBg(pal.bg), els };
  },
};

const archPhoto: LayoutDef = {
  id: 'arch', label: 'Arco fotográfico + formas', directions: ['E', 'F'], tags: ['photo', 'graphic', 'cover', 'content'], needsImage: true,
  fn: (c) => {
    const { safe: S, pal } = c;
    const els: DesignElement[] = [];
    const pw = S.w * 0.5;
    const ph = Math.min(S.h * 0.78, pw * 1.6);
    const px = S.x + S.w - pw;
    const py = S.y + (S.h - ph) / 2 - 20;
    push(els, circle({ x: px - pw * 0.32, y: py + ph * 0.62, w: pw * 0.56, h: pw * 0.56 }, pal.accent, { name: 'Círculo de destaque' }));
    push(els, photo(c, { x: px, y: py, w: pw, h: ph }, { cornerRadius: pw / 2 }));
    const h = txt(c, c.content.title, { x: S.x, y: S.y + S.h * 0.1, w: S.w * 0.46, h: S.h * 0.48 }, { font: 'heading', role: 'heading', color: pal.fg, maxSize: W_(c, 0.08), anchor: 'bottom' });
    if (c.content.kicker) push(els, kicker(c, c.content.kicker, { x: S.x, y: h.y - 70, w: S.w * 0.46, h: 60 }, pal.accent));
    push(els, h);
    if (c.content.body) push(els, txt(c, c.content.body, { x: S.x, y: bottomOf(h) + 30, w: S.w * 0.42, h: S.h * 0.26 }, { font: 'body', role: 'body', color: pal.muted, maxSize: W_(c, 0.027) }));
    push(els, ...chrome(c, { color: pal.muted, handle: 'bottom-left' }));
    return { bg: solidBg(pal.bg), els };
  },
};

// =========================================================== sólidos com sombra

const solidCard: LayoutDef = {
  id: 'solid-card', label: 'Cartão com sombra', directions: ['C'], tags: ['solid', 'cover', 'content', 'quote'], needsImage: false,
  fn: (c) => {
    const { safe: S, pal } = c;
    const els: DesignElement[] = [];
    const radius = c.brand.cornerRadius || W_(c, 0.03);
    const card = { x: S.x, y: S.y + S.h * 0.1, w: S.w, h: S.h * 0.76 };
    const pad = W_(c, 0.065);
    push(els, rect(card, pal.surface, { name: 'Cartão', cornerRadius: radius, shadow: softShadow('#000000', 70, 34, 0.22) }));
    push(els, circle({ x: card.x + card.w - W_(c, 0.09), y: card.y - W_(c, 0.05), w: W_(c, 0.14), h: W_(c, 0.14) }, pal.accent, { name: 'Selo', shadow: softShadow('#000000', 30, 12, 0.2) }));
    let y = card.y + pad;
    if (c.content.kicker) { const k = kicker(c, c.content.kicker, { x: card.x + pad, y, w: card.w - 2 * pad, h: 60 }, { c: c.brand.colors.secondary, r: 'secondary' }); push(els, k); y = bottomOf(k) + 24; }
    const h = txt(c, c.content.title, { x: card.x + pad, y, w: card.w - 2 * pad, h: card.h * (c.content.body ? 0.5 : 0.75) }, { font: 'heading', role: 'heading', color: pal.onSurface, maxSize: W_(c, 0.09) });
    push(els, h);
    if (c.content.body) push(els, txt(c, c.content.body, { x: card.x + pad, y: bottomOf(h) + 30, w: card.w - 2 * pad, h: card.y + card.h - pad - bottomOf(h) - 30 }, { font: 'body', role: 'body', color: { c: c.brand.colors.muted, r: 'muted' }, maxSize: W_(c, 0.032) }));
    push(els, ...chrome(c, { color: pal.fg, handle: 'bottom-left' }));
    return { bg: solidBg(pal.bg), els };
  },
};

const solidStack: LayoutDef = {
  id: 'solid-stack', label: 'Cartões empilhados', directions: ['C', 'F'], tags: ['solid', 'cover', 'content', 'graphic'], needsImage: false,
  fn: (c) => {
    const { safe: S, pal } = c;
    const els: DesignElement[] = [];
    const radius = c.brand.cornerRadius || W_(c, 0.025);
    const off = W_(c, 0.035);
    const card = { x: S.x + off, y: S.y + S.h * 0.16, w: S.w - off * 2, h: S.h * 0.6 };
    push(els, rect({ ...card, x: card.x + off * 2, y: card.y - off * 2 }, pal.accent, { name: 'Cartão 3', cornerRadius: radius, shadow: softShadow('#000000', 40, 16, 0.15) }));
    push(els, rect({ ...card, x: card.x + off, y: card.y - off }, { c: c.brand.colors.background, r: 'background' }, { name: 'Cartão 2', cornerRadius: radius, shadow: softShadow('#000000', 40, 16, 0.15) }));
    push(els, rect(card, pal.surface, { name: 'Cartão 1', cornerRadius: radius, shadow: softShadow('#000000', 60, 28, 0.22) }));
    const pad = W_(c, 0.06);
    const h = txt(c, c.content.title, { x: card.x + pad, y: card.y + pad, w: card.w - 2 * pad, h: card.h - 2 * pad }, { font: 'heading', role: 'heading', color: pal.onSurface, maxSize: W_(c, 0.1), anchor: 'middle' });
    push(els, h);
    const by = card.y + card.h + W_(c, 0.06);
    if (c.content.body || c.content.subtitle) push(els, txt(c, (c.content.subtitle || c.content.body)!, { x: S.x, y: by, w: S.w, h: S.y + S.h - by - 70 }, { font: 'body', role: 'body', color: pal.fg, maxSize: W_(c, 0.032) }));
    if (c.content.kicker) push(els, kicker(c, c.content.kicker, { x: S.x, y: S.y + 10, w: S.w * 0.7, h: 60 }, pal.fg));
    push(els, ...chrome(c, { color: pal.fg, handle: 'bottom-left' }));
    return { bg: solidBg(pal.bg), els };
  },
};

const solidBold: LayoutDef = {
  id: 'solid-bold', label: 'Título com sombra projetada', directions: ['C'], tags: ['solid', 'typographic', 'cover'], needsImage: false,
  fn: (c) => {
    const { safe: S, pal } = c;
    const els: DesignElement[] = [];
    if (c.content.kicker) {
      const k = kicker(c, c.content.kicker, { x: S.x + 30, y: S.y + S.h * 0.16 + 18, w: S.w * 0.8, h: 60 }, pal.onAccent);
      const pillW = Math.min(S.w, k.text.length * k.fontSize * 0.82 + 60);
      k.width = Math.round(pillW - 60);
      push(els, rect({ x: S.x, y: S.y + S.h * 0.16, w: pillW, h: k.height + 36 }, pal.accent, { name: 'Etiqueta', cornerRadius: 999, shadow: softShadow('#000000', 24, 10, 0.2) }), k);
    }
    const h = txt(c, c.content.title, { x: S.x, y: S.y + S.h * 0.26, w: S.w, h: S.h * 0.48 }, { font: 'heading', role: 'heading', color: pal.fg, maxSize: W_(c, 0.15), anchor: 'middle' });
    h.shadow = softShadow('#000000', 30, 14, 0.28);
    push(els, h);
    if (c.content.body || c.content.subtitle) push(els, txt(c, (c.content.subtitle || c.content.body)!, { x: S.x, y: bottomOf(h) + 40, w: S.w * 0.8, h: S.h * 0.16 }, { font: 'body', role: 'body', color: pal.fg, maxSize: W_(c, 0.034), opacity: 0.9 }));
    push(els, ...chrome(c, { color: pal.fg, handle: 'bottom-left' }));
    return { bg: solidBg(pal.bg), els };
  },
};

// =========================================================== gráficos minimalistas

const geoCircle: LayoutDef = {
  id: 'geo-circle', label: 'Círculo + linha', directions: ['F', 'A'], tags: ['graphic', 'cover', 'content', 'typographic'], needsImage: false,
  fn: (c) => {
    const { safe: S, pal } = c;
    const els: DesignElement[] = [];
    const d = W_(c, 0.78);
    const flip = c.rand() > 0.5;
    push(els, circle({ x: flip ? -d * 0.3 : c.W - d * 0.7, y: S.y - d * 0.32, w: d, h: d }, pal.accent, { name: 'Círculo' }));
    push(els, circle({ x: flip ? c.W - S.x - W_(c, 0.05) : S.x, y: S.y + S.h * 0.5, w: W_(c, 0.035), h: W_(c, 0.035) }, pal.fg, { name: 'Ponto' }));
    push(els, rule(S.x, S.y + S.h * 0.56, S.w, pal.fg, 2));
    const h = txt(c, c.content.title, { x: S.x, y: S.y + S.h * 0.6, w: S.w * 0.95, h: S.h * (c.content.body ? 0.24 : 0.34) }, { font: 'heading', role: 'heading', color: pal.fg, maxSize: W_(c, 0.1) });
    push(els, h);
    if (c.content.kicker) push(els, kicker(c, c.content.kicker, { x: S.x, y: S.y + S.h * 0.56 - 70, w: S.w * 0.6, h: 60 }, pal.fg));
    if (c.content.body) push(els, txt(c, c.content.body, { x: S.x, y: bottomOf(h) + 24, w: S.w * 0.85, h: S.y + S.h - bottomOf(h) - 90 }, { font: 'body', role: 'body', color: pal.muted, maxSize: W_(c, 0.03) }));
    push(els, ...chrome(c, { color: pal.muted, handle: 'bottom-left' }));
    return { bg: solidBg(pal.bg), els };
  },
};

const geoGrid: LayoutDef = {
  id: 'geo-grid', label: 'Moldura geométrica', directions: ['F', 'A'], tags: ['graphic', 'cover', 'content'], needsImage: false,
  fn: (c) => {
    const { safe: S, pal, M } = c;
    const els: DesignElement[] = [];
    const inset = M * 0.45;
    push(els, rect({ x: inset, y: inset, w: c.W - inset * 2, h: c.H - inset * 2 }, pal.fg, { name: 'Moldura', fillEnabled: false, strokeColor: pal.fg.c, strokeWidth: 2 }));
    const sq = W_(c, 0.028);
    for (const [x, y] of [[inset - sq / 2, inset - sq / 2], [c.W - inset - sq / 2, c.H - inset - sq / 2]]) {
      push(els, rect({ x, y, w: sq, h: sq }, pal.accent, { name: 'Marcador' }));
    }
    push(els, rule(S.x, S.y + S.h * 0.25, S.w * 0.35, pal.accent, 6));
    if (c.content.kicker) push(els, kicker(c, c.content.kicker, { x: S.x, y: S.y + S.h * 0.25 + 30, w: S.w, h: 60 }, pal.muted));
    const h = txt(c, c.content.title, { x: S.x, y: S.y + S.h * 0.25 + 100, w: S.w * 0.95, h: S.h * 0.42 }, { font: 'heading', role: 'heading', color: pal.fg, maxSize: W_(c, 0.11) });
    push(els, h);
    if (c.content.body) push(els, txt(c, c.content.body, { x: S.x, y: bottomOf(h) + 30, w: S.w * 0.75, h: S.y + S.h - bottomOf(h) - 80 }, { font: 'body', role: 'body', color: pal.muted, maxSize: W_(c, 0.03) }));
    push(els, ...chrome(c, { color: pal.muted, handle: 'bottom-left' }));
    return { bg: solidBg(pal.bg), els };
  },
};

// =========================================================== CTA

const ctaEnd: LayoutDef = {
  id: 'cta', label: 'Encerramento / CTA', directions: ['A', 'B', 'C', 'D', 'E', 'F'], tags: ['cta'], needsImage: false,
  fn: (c) => {
    const { safe: S, pal } = c;
    const els: DesignElement[] = [];
    const useInverse = c.direction === 'D' || c.direction === 'B';
    const bg = useInverse ? { c: c.brand.colors.primary, r: 'primary' as const } : pal.bg;
    const fg = useInverse ? { c: c.brand.colors.background, r: 'background' as const } : pal.fg;
    const lg = logoEl(c, c.W / 2, S.y + S.h * 0.12, W_(c, 0.09), 'center');
    push(els, lg);
    const h = txt(c, c.content.title || 'Salve para consultar depois', { x: S.x + S.w * 0.05, y: S.y + S.h * 0.28, w: S.w * 0.9, h: S.h * 0.32 }, { font: 'heading', role: 'heading', color: fg, maxSize: W_(c, 0.1), align: 'center', anchor: 'middle' });
    push(els, h);
    let y = bottomOf(h) + 40;
    if (c.content.body) {
      const b = txt(c, c.content.body, { x: S.x + S.w * 0.12, y, w: S.w * 0.76, h: S.h * 0.14 }, { font: 'body', role: 'body', color: fg, maxSize: W_(c, 0.032), align: 'center', opacity: 0.8 });
      push(els, b); y = bottomOf(b) + 50;
    }
    const cta = c.content.cta || c.content.handle;
    if (cta) {
      const t = txt(c, cta, { x: S.x, y: y + 26, w: S.w, h: 60 }, { font: 'accent', role: 'cta', color: pal.onAccent, size: W_(c, 0.03), align: 'center', weight: 600, letterSpacingEm: 0.04, lineHeight: 1.2 });
      const pw = Math.min(S.w, cta.length * t.fontSize * 0.62 + W_(c, 0.12));
      const pill = rect({ x: c.W / 2 - pw / 2, y, w: pw, h: t.height + 52 }, pal.accent, { name: 'Botão', cornerRadius: 999 });
      t.x = Math.round(pill.x); t.width = Math.round(pw);
      push(els, pill, t);
    }
    const icons = ['Curtir', 'Comentar', 'Compartilhar', 'Salvar'];
    const iw = W_(c, 0.018), gap = W_(c, 0.05);
    const startX = c.W / 2 - ((icons.length - 1) * gap) / 2 - iw / 2;
    icons.forEach((n, i) => push(els, circle({ x: startX + i * gap, y: S.y + S.h * 0.9, w: iw, h: iw }, fg, { name: n, opacity: i === 3 ? 1 : 0.35 })));
    return { bg: solidBg(bg), els };
  },
};

export const LAYOUTS: LayoutDef[] = [
  typoHero, typoCenter, typoNumber, quote, list,
  editorialTop, editorialMasthead, photoBottom, photoCaption, frameInset, splitSide, archPhoto,
  solidCard, solidStack, solidBold, geoCircle, geoGrid, ctaEnd,
];

export const layoutById = (id: string) => LAYOUTS.find((l) => l.id === id);

