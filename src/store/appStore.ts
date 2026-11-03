import { create } from 'zustand';
import type { AssetMeta, BrandKit, Folder, Project, ProjectMeta, Settings } from '../types';
import { assetsDB, brandKitsDB, foldersDB, kvDB, projectsDB } from '../lib/db';
import { DEFAULT_SETTINGS, makeBrandKit } from '../lib/defaults';
import { forgetAsset, importFontFile, importImageFile } from '../lib/assets';
import { registerCustomFont } from '../lib/fonts';
import { deepClone, uid } from '../lib/ids';

const toMeta = ({ pages, ...rest }: Project): ProjectMeta => ({ ...rest, pageCount: pages.length });
const assetMeta = ({ blob: _b, ...rest }: { blob: Blob } & AssetMeta): AssetMeta => rest;

interface Toast { id: string; message: string; tone: 'ok' | 'error' | 'info' }

interface AppState {
  ready: boolean;
  projects: ProjectMeta[];
  brandKits: BrandKit[];
  activeBrandKitId: string | null;
  folders: Folder[];
  assets: AssetMeta[];
  settings: Settings;
  toasts: Toast[];

  init: () => Promise<void>;
  toast: (message: string, tone?: Toast['tone']) => void;
  dismissToast: (id: string) => void;

  // brand kits
  activeBrand: () => BrandKit;
  saveBrandKit: (b: BrandKit) => Promise<void>;
  createBrandKit: (base?: Partial<BrandKit>) => Promise<BrandKit>;
  deleteBrandKit: (id: string) => Promise<void>;
  setActiveBrandKit: (id: string) => Promise<void>;

  // projetos
  upsertProject: (p: Project) => Promise<void>;
  createProject: (p: Project) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  duplicateProject: (id: string, patch?: Partial<Project>) => Promise<Project | null>;
  patchProject: (id: string, patch: Partial<Project>) => Promise<void>;

  // pastas
  saveFolder: (f: Folder) => Promise<void>;
  createFolder: (name: string, description?: string) => Promise<Folder>;
  deleteFolder: (id: string) => Promise<void>;

  // assets
  uploadImages: (files: FileList | File[], tags?: string[]) => Promise<AssetMeta[]>;
  uploadFont: (file: File) => Promise<AssetMeta>;
  deleteAsset: (id: string) => Promise<void>;

  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  reload: () => Promise<void>;
}

export const useApp = create<AppState>((set, get) => ({
  ready: false,
  projects: [],
  brandKits: [],
  activeBrandKitId: null,
  folders: [],
  assets: [],
  settings: DEFAULT_SETTINGS,
  toasts: [],

  init: async () => {
    if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});
    await get().reload();
    set({ ready: true });
  },

  reload: async () => {
    const [projects, brandKits, folders, assets, settings, activeId] = await Promise.all([
      projectsDB.all(), brandKitsDB.all(), foldersDB.all(), assetsDB.all(),
      kvDB.get<Settings>('settings'), kvDB.get<string>('activeBrandKitId'),
    ]);
    let kits = brandKits.sort((a, b) => a.createdAt - b.createdAt);
    if (!kits.length) {
      const k = makeBrandKit();
      await brandKitsDB.put(k);
      kits = [k];
    }
    const active = kits.find((k) => k.id === activeId)?.id ?? kits[0].id;
    // registra fontes personalizadas enviadas pelo usuário
    for (const k of kits) for (const cf of k.customFonts) {
      const a = assets.find((x) => x.id === cf.assetId);
      if (a) await registerCustomFont(cf.family, a.blob).catch(() => {});
    }
    set({
      projects: projects.map(toMeta).sort((a, b) => b.updatedAt - a.updatedAt),
      brandKits: kits,
      activeBrandKitId: active,
      folders: folders.sort((a, b) => a.createdAt - b.createdAt),
      assets: assets.map(assetMeta).sort((a, b) => b.createdAt - a.createdAt),
      settings: { ...DEFAULT_SETTINGS, ...(settings ?? {}) },
    });
  },

  toast: (message, tone = 'ok') => {
    const id = uid('t');
    set((s) => ({ toasts: [...s.toasts, { id, message, tone }] }));
    setTimeout(() => get().dismissToast(id), tone === 'error' ? 6000 : 3200);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  activeBrand: () => {
    const { brandKits, activeBrandKitId } = get();
    return brandKits.find((b) => b.id === activeBrandKitId) ?? brandKits[0] ?? makeBrandKit();
  },
  saveBrandKit: async (b) => {
    const kit = { ...b, updatedAt: Date.now() };
    await brandKitsDB.put(kit);
    set((s) => ({ brandKits: s.brandKits.some((k) => k.id === kit.id) ? s.brandKits.map((k) => (k.id === kit.id ? kit : k)) : [...s.brandKits, kit] }));
  },
  createBrandKit: async (base) => {
    const k = makeBrandKit({ ...base, id: uid('bk_'), createdAt: Date.now(), updatedAt: Date.now() });
    await get().saveBrandKit(k);
    await get().setActiveBrandKit(k.id);
    return k;
  },
  deleteBrandKit: async (id) => {
    if (get().brandKits.length <= 1) throw new Error('É necessário manter ao menos um Brand Kit.');
    await brandKitsDB.delete(id);
    const kits = get().brandKits.filter((k) => k.id !== id);
    set({ brandKits: kits });
    if (get().activeBrandKitId === id) await get().setActiveBrandKit(kits[0].id);
  },
  setActiveBrandKit: async (id) => {
    await kvDB.set('activeBrandKitId', id);
    set({ activeBrandKitId: id });
  },

  upsertProject: async (p) => {
    await projectsDB.put(p);
    const meta = toMeta(p);
    set((s) => ({ projects: [meta, ...s.projects.filter((x) => x.id !== p.id)].sort((a, b) => b.updatedAt - a.updatedAt) }));
  },
  createProject: async (p) => {
    await get().upsertProject(p);
    return p;
  },
  deleteProject: async (id) => {
    await projectsDB.delete(id);
    set((s) => ({ projects: s.projects.filter((p) => p.id !== id) }));
  },
  duplicateProject: async (id, patch = {}) => {
    const src = await projectsDB.get(id);
    if (!src) return null;
    const now = Date.now();
    const copy: Project = {
      ...deepClone(src), id: uid('pr_'), name: `${src.name} (cópia)`, createdAt: now, updatedAt: now,
      status: 'draft', isTemplate: false, favorite: false, ...patch,
    };
    copy.pages = copy.pages.map((pg) => ({ ...pg, id: uid('pg_'), elements: pg.elements.map((e) => ({ ...e, id: uid('el_') })) }));
    await get().upsertProject(copy);
    return copy;
  },
  patchProject: async (id, patch) => {
    const p = await projectsDB.get(id);
    if (!p) return;
    await get().upsertProject({ ...p, ...patch, updatedAt: Date.now() });
  },

  saveFolder: async (f) => {
    await foldersDB.put(f);
    set((s) => ({ folders: s.folders.some((x) => x.id === f.id) ? s.folders.map((x) => (x.id === f.id ? f : x)) : [...s.folders, f] }));
  },
  createFolder: async (name, description = '') => {
    const palette = ['#1A1A1A', '#B8603E', '#6B7F6A', '#3E5C76', '#A68A64', '#7D5A80'];
    const f: Folder = { id: uid('fd_'), name, description, color: palette[get().folders.length % palette.length], createdAt: Date.now() };
    await get().saveFolder(f);
    return f;
  },
  deleteFolder: async (id) => {
    await foldersDB.delete(id);
    for (const p of get().projects.filter((x) => x.folderId === id)) await get().patchProject(p.id, { folderId: null });
    set((s) => ({ folders: s.folders.filter((f) => f.id !== id) }));
  },

  uploadImages: async (files, tags = []) => {
    const out: AssetMeta[] = [];
    for (const f of Array.from(files)) {
      try {
        const a = await importImageFile(f, tags);
        out.push(assetMeta(a));
      } catch (e) {
        get().toast((e as Error).message, 'error');
      }
    }
    if (out.length) set((s) => ({ assets: [...out, ...s.assets] }));
    return out;
  },
  uploadFont: async (file) => {
    const a = await importFontFile(file);
    const meta = assetMeta(a);
    set((s) => ({ assets: [meta, ...s.assets] }));
    return meta;
  },
  deleteAsset: async (id) => {
    await assetsDB.delete(id);
    forgetAsset(id);
    set((s) => ({ assets: s.assets.filter((a) => a.id !== id) }));
  },

  updateSettings: async (patch) => {
    const settings = { ...get().settings, ...patch };
    await kvDB.set('settings', settings);
    set({ settings });
  },
}));
