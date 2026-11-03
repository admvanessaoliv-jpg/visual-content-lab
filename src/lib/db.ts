import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Asset, BrandKit, Folder, Project, Settings } from '../types';

/**
 * Persistência local em IndexedDB.
 * - projects: documentos completos (páginas + elementos)
 * - assets: binários (imagens, fontes) como Blob
 * - brandKits, folders, kv (configurações)
 * Para sincronizar entre dispositivos, substitua este módulo por um
 * adaptador remoto mantendo as mesmas assinaturas (ver README).
 */
interface LabDB extends DBSchema {
  projects: { key: string; value: Project; indexes: { updatedAt: number } };
  assets: { key: string; value: Asset; indexes: { createdAt: number } };
  brandKits: { key: string; value: BrandKit };
  folders: { key: string; value: Folder };
  kv: { key: string; value: unknown };
}

let dbp: Promise<IDBPDatabase<LabDB>> | null = null;

export function db() {
  if (!dbp) {
    dbp = openDB<LabDB>('visual-content-lab', 1, {
      upgrade(d) {
        const p = d.createObjectStore('projects', { keyPath: 'id' });
        p.createIndex('updatedAt', 'updatedAt');
        const a = d.createObjectStore('assets', { keyPath: 'id' });
        a.createIndex('createdAt', 'createdAt');
        d.createObjectStore('brandKits', { keyPath: 'id' });
        d.createObjectStore('folders', { keyPath: 'id' });
        d.createObjectStore('kv');
      },
    });
  }
  return dbp;
}

export const projectsDB = {
  all: async () => (await db()).getAll('projects'),
  get: async (id: string) => (await db()).get('projects', id),
  put: async (p: Project) => { await (await db()).put('projects', p); },
  delete: async (id: string) => { await (await db()).delete('projects', id); },
};

export const assetsDB = {
  all: async () => (await db()).getAll('assets'),
  get: async (id: string) => (await db()).get('assets', id),
  put: async (a: Asset) => { await (await db()).put('assets', a); },
  delete: async (id: string) => { await (await db()).delete('assets', id); },
};

export const brandKitsDB = {
  all: async () => (await db()).getAll('brandKits'),
  put: async (b: BrandKit) => { await (await db()).put('brandKits', b); },
  delete: async (id: string) => { await (await db()).delete('brandKits', id); },
};

export const foldersDB = {
  all: async () => (await db()).getAll('folders'),
  put: async (f: Folder) => { await (await db()).put('folders', f); },
  delete: async (id: string) => { await (await db()).delete('folders', id); },
};

export const kvDB = {
  get: async <T,>(k: string) => (await db()).get('kv', k) as Promise<T | undefined>,
  set: async (k: string, v: unknown) => { await (await db()).put('kv', v, k); },
};

export async function clearAll() {
  const d = await db();
  await Promise.all((['projects', 'assets', 'brandKits', 'folders', 'kv'] as const).map((s) => d.clear(s)));
}

export type { Settings };
