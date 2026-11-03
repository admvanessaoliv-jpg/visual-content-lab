import { create } from 'zustand';
import type { BrandKit, DesignElement, Page, PageBackground, Project } from '../types';
import { deepClone, uid } from '../lib/ids';
import { FORMATS } from '../lib/formats';
import { makePage } from '../lib/defaults';
import { applyBrandToPages } from '../generator';

export const MAX_SLIDES = 10;
export const MIN_SLIDES = 3;
const HISTORY_LIMIT = 120;

type SaveState = 'saved' | 'dirty' | 'saving' | 'error';
type Patch<T> = Partial<T> | ((el: T) => Partial<T>);
export type AlignMode = 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom';

interface EditorState {
  project: Project | null;
  pageIndex: number;
  selectedIds: string[];
  editingTextId: string | null;
  past: Page[][];
  future: Page[][];
  lastCommitKey: string | null;
  lastCommitAt: number;
  saveState: SaveState;
  lastSavedAt: number | null;
  revision: number;
  clipboard: DesignElement[];

  load: (p: Project) => void;
  close: () => void;
  page: () => Page | null;
  selected: () => DesignElement[];

  setPageIndex: (i: number) => void;
  select: (ids: string[], additive?: boolean) => void;
  setEditingText: (id: string | null) => void;

  /** Toda mutação passa por aqui: registra histórico (com agrupamento por chave) */
  commit: (fn: (pages: Page[], pageIndex: number) => Page[], key?: string) => void;
  updateElement: (id: string, patch: Patch<DesignElement>, key?: string) => void;
  updateSelected: (patch: Patch<DesignElement>, key?: string) => void;
  silentUpdate: (id: string, patch: Partial<DesignElement>) => void;
  addElement: (el: DesignElement) => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  reorder: (id: string, dir: 'up' | 'down' | 'top' | 'bottom') => void;
  moveLayer: (from: number, to: number) => void;
  alignSelected: (mode: AlignMode) => void;
  nudge: (dx: number, dy: number) => void;
  updateBackground: (patch: Partial<PageBackground>, key?: string) => void;

  addPage: (page?: Page, at?: number) => void;
  duplicatePage: (i: number) => void;
  deletePage: (i: number) => void;
  movePage: (from: number, to: number) => void;
  replacePage: (i: number, page: Page) => void;

  setProjectMeta: (patch: Partial<Project>) => void;
  applyBrand: (b: BrandKit, scope: 'page' | 'all') => void;

  undo: () => void;
  redo: () => void;
  copy: () => void;
  paste: () => void;

  markSaving: () => void;
  markSaved: (ts: number) => void;
  markError: () => void;
}

const mapPage = (pages: Page[], i: number, fn: (p: Page) => Page) => pages.map((p, idx) => (idx === i ? fn(p) : p));
const mapEls = (p: Page, fn: (el: DesignElement) => DesignElement) => ({ ...p, elements: p.elements.map(fn) });

export const useEditor = create<EditorState>((set, get) => ({
  project: null,
  pageIndex: 0,
  selectedIds: [],
  editingTextId: null,
  past: [],
  future: [],
  lastCommitKey: null,
  lastCommitAt: 0,
  saveState: 'saved',
  lastSavedAt: null,
  revision: 0,
  clipboard: [],

  load: (p) => set({
    project: deepClone(p), pageIndex: 0, selectedIds: [], editingTextId: null, past: [], future: [],
    saveState: 'saved', lastSavedAt: p.updatedAt, revision: 0, lastCommitKey: null,
  }),
  close: () => set({ project: null, selectedIds: [], past: [], future: [] }),

  page: () => {
    const { project, pageIndex } = get();
    return project?.pages[pageIndex] ?? null;
  },
  selected: () => {
    const p = get().page();
    const ids = get().selectedIds;
    return p ? p.elements.filter((e) => ids.includes(e.id)) : [];
  },

  setPageIndex: (i) => set({ pageIndex: i, selectedIds: [], editingTextId: null }),
  select: (ids, additive = false) => set((s) => {
    if (!additive) return { selectedIds: ids };
    const next = new Set(s.selectedIds);
    for (const id of ids) next.has(id) ? next.delete(id) : next.add(id);
    return { selectedIds: [...next] };
  }),
  setEditingText: (id) => set({ editingTextId: id }),

  commit: (fn, key) => {
    const s = get();
    if (!s.project) return;
    const now = Date.now();
    const coalesce = key && key === s.lastCommitKey && now - s.lastCommitAt < 800;
    const pages = fn(s.project.pages, s.pageIndex);
    if (pages === s.project.pages) return;
    set({
      project: { ...s.project, pages },
      past: coalesce ? s.past : [...s.past.slice(-HISTORY_LIMIT), s.project.pages],
      future: [],
      lastCommitKey: key ?? null,
      lastCommitAt: now,
      saveState: 'dirty',
      revision: s.revision + 1,
    });
  },

  updateElement: (id, patch, key) => get().commit((pages, i) => mapPage(pages, i, (p) => mapEls(p, (el) =>
    el.id === id ? ({ ...el, ...(typeof patch === 'function' ? patch(el) : patch) } as DesignElement) : el)), key ?? `el:${id}:${typeof patch === 'function' ? 'fn' : Object.keys(patch).join(',')}`),

  updateSelected: (patch, key) => {
    const ids = get().selectedIds;
    if (!ids.length) return;
    get().commit((pages, i) => mapPage(pages, i, (p) => mapEls(p, (el) =>
      ids.includes(el.id) ? ({ ...el, ...(typeof patch === 'function' ? patch(el) : patch) } as DesignElement) : el)), key ?? `sel:${ids.join()}:${typeof patch === 'function' ? 'fn' : Object.keys(patch).join(',')}`);
  },

  /** Atualização sem histórico (ex.: altura automática medida do texto) */
  silentUpdate: (id, patch) => set((s) => {
    if (!s.project) return {};
    const pages = mapPage(s.project.pages, s.pageIndex, (p) => mapEls(p, (el) => (el.id === id ? ({ ...el, ...patch } as DesignElement) : el)));
    return { project: { ...s.project, pages } };
  }),

  addElement: (el) => {
    get().commit((pages, i) => mapPage(pages, i, (p) => ({ ...p, elements: [...p.elements, el] })));
    set({ selectedIds: [el.id] });
  },

  deleteSelected: () => {
    const ids = get().selectedIds;
    if (!ids.length) return;
    get().commit((pages, i) => mapPage(pages, i, (p) => ({ ...p, elements: p.elements.filter((e) => !ids.includes(e.id) || e.locked) })));
    set({ selectedIds: [] });
  },

  duplicateSelected: () => {
    const sel = get().selected();
    if (!sel.length) return;
    const copies = sel.map((e) => ({ ...deepClone(e), id: uid('el_'), x: e.x + 24, y: e.y + 24, name: `${e.name} cópia`, locked: false }));
    get().commit((pages, i) => mapPage(pages, i, (p) => ({ ...p, elements: [...p.elements, ...copies] })));
    set({ selectedIds: copies.map((c) => c.id) });
  },

  reorder: (id, dir) => get().commit((pages, i) => mapPage(pages, i, (p) => {
    const els = [...p.elements];
    const idx = els.findIndex((e) => e.id === id);
    if (idx < 0) return p;
    const [el] = els.splice(idx, 1);
    const to = dir === 'up' ? Math.min(els.length, idx + 1) : dir === 'down' ? Math.max(0, idx - 1) : dir === 'top' ? els.length : 0;
    els.splice(to, 0, el);
    return { ...p, elements: els };
  })),

  moveLayer: (from, to) => get().commit((pages, i) => mapPage(pages, i, (p) => {
    const els = [...p.elements];
    const [el] = els.splice(from, 1);
    els.splice(to, 0, el);
    return { ...p, elements: els };
  })),

  alignSelected: (mode) => {
    const { project, selectedIds } = get();
    if (!project) return;
    const { width: W, height: H } = FORMATS[project.format];
    get().commit((pages, i) => mapPage(pages, i, (p) => mapEls(p, (el) => {
      if (!selectedIds.includes(el.id) || el.locked) return el;
      const h = el.type === 'line' ? 0 : el.height;
      switch (mode) {
        case 'left': return { ...el, x: 0 };
        case 'hcenter': return { ...el, x: Math.round((W - el.width) / 2) };
        case 'right': return { ...el, x: W - el.width };
        case 'top': return { ...el, y: 0 };
        case 'vcenter': return { ...el, y: Math.round((H - h) / 2) };
        case 'bottom': return { ...el, y: H - h };
      }
    })));
  },

  nudge: (dx, dy) => {
    const ids = get().selectedIds;
    if (!ids.length) return;
    get().commit((pages, i) => mapPage(pages, i, (p) => mapEls(p, (el) =>
      ids.includes(el.id) && !el.locked ? { ...el, x: el.x + dx, y: el.y + dy } : el)), `nudge:${ids.join()}`);
  },

  updateBackground: (patch, key) => get().commit((pages, i) => mapPage(pages, i, (p) => ({
    ...p, background: { ...p.background, ...patch, colorRole: 'color' in patch ? patch.colorRole : p.background.colorRole },
  })), key ?? `bg:${Object.keys(patch).join(',')}`),

  addPage: (page, at) => {
    const s = get();
    if (!s.project || s.project.pages.length >= MAX_SLIDES) return;
    const idx = at ?? s.pageIndex + 1;
    const base = page ?? makePage({ background: deepClone(s.project.pages[s.pageIndex].background) });
    get().commit((pages) => {
      const next = [...pages];
      next.splice(idx, 0, { ...base, name: `Slide ${idx + 1}` });
      return next.map((p, n) => ({ ...p, name: /^Slide \d+$|^Página/.test(p.name) ? `Slide ${n + 1}` : p.name }));
    });
    set({ pageIndex: idx, selectedIds: [] });
  },

  duplicatePage: (i) => {
    const s = get();
    if (!s.project || s.project.pages.length >= MAX_SLIDES) return;
    const src = s.project.pages[i];
    const copy: Page = { ...deepClone(src), id: uid('pg_'), elements: src.elements.map((e) => ({ ...deepClone(e), id: uid('el_') })) };
    get().addPage(copy, i + 1);
  },

  deletePage: (i) => {
    const s = get();
    if (!s.project) return;
    const min = s.project.kind === 'carousel' ? MIN_SLIDES : 1;
    if (s.project.pages.length <= min || i < 0 || i >= s.project.pages.length) return;
    get().commit((pages) => pages.filter((_, n) => n !== i));
    set({ pageIndex: Math.max(0, Math.min(i, get().project!.pages.length - 1)), selectedIds: [] });
  },

  movePage: (from, to) => {
    const s = get();
    if (!s.project || to < 0 || to >= s.project.pages.length) return;
    get().commit((pages) => {
      const next = [...pages];
      const [p] = next.splice(from, 1);
      next.splice(to, 0, p);
      return next;
    });
    set({ pageIndex: to });
  },

  replacePage: (i, page) => {
    get().commit((pages) => pages.map((p, n) => (n === i ? { ...page, id: p.id, name: p.name } : p)));
    set({ selectedIds: [] });
  },

  setProjectMeta: (patch) => set((s) => (s.project ? { project: { ...s.project, ...patch }, saveState: 'dirty', revision: s.revision + 1 } : {})),

  applyBrand: (b, scope) => {
    get().commit((pages, i) => {
      if (scope === 'all') return applyBrandToPages(pages, b);
      return pages.map((p, n) => (n === i ? applyBrandToPages([p], b)[0] : p));
    });
    set((s) => (s.project ? { project: { ...s.project, brandKitId: b.id } } : {}));
  },

  undo: () => set((s) => {
    if (!s.project || !s.past.length) return {};
    const prev = s.past[s.past.length - 1];
    return {
      project: { ...s.project, pages: prev }, past: s.past.slice(0, -1), future: [s.project.pages, ...s.future],
      pageIndex: Math.min(s.pageIndex, prev.length - 1), saveState: 'dirty', revision: s.revision + 1, lastCommitKey: null, editingTextId: null,
    };
  }),
  redo: () => set((s) => {
    if (!s.project || !s.future.length) return {};
    const [next, ...rest] = s.future;
    return {
      project: { ...s.project, pages: next }, past: [...s.past, s.project.pages], future: rest,
      pageIndex: Math.min(s.pageIndex, next.length - 1), saveState: 'dirty', revision: s.revision + 1, lastCommitKey: null,
    };
  }),

  copy: () => set({ clipboard: deepClone(get().selected()) }),
  paste: () => {
    const clip = get().clipboard;
    if (!clip.length) return;
    const copies = clip.map((e) => ({ ...deepClone(e), id: uid('el_'), x: e.x + 30, y: e.y + 30 }));
    get().commit((pages, i) => mapPage(pages, i, (p) => ({ ...p, elements: [...p.elements, ...copies] })));
    set({ selectedIds: copies.map((c) => c.id), clipboard: copies });
  },

  markSaving: () => set({ saveState: 'saving' }),
  markSaved: (ts) => set((s) => ({ saveState: s.saveState === 'saving' ? 'saved' : s.saveState, lastSavedAt: ts })),
  markError: () => set({ saveState: 'error' }),
}));
