import JSZip from 'jszip';
import type { Asset, BrandKit, Folder, Project, Settings } from '../types';
import { renderPageBlob } from './renderer';
import { assetsDB, brandKitsDB, foldersDB, projectsDB, kvDB } from './db';
import { blobToDataUrl, dataUrlToBlob } from './assets';

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export const slug = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'design';

interface ExportOpts { scale: number; format: 'png' | 'jpeg'; quality: number }

const mimeOf = (f: 'png' | 'jpeg') => (f === 'png' ? 'image/png' : 'image/jpeg') as 'image/png' | 'image/jpeg';
const ext = (f: 'png' | 'jpeg') => (f === 'png' ? 'png' : 'jpg');

export async function exportPage(project: Project, index: number, o: ExportOpts) {
  const blob = await renderPageBlob(project.pages[index], project.format, o.scale, mimeOf(o.format), o.quality);
  const suffix = project.pages.length > 1 ? `-slide-${String(index + 1).padStart(2, '0')}` : '';
  downloadBlob(blob, `${slug(project.name)}${suffix}.${ext(o.format)}`);
  return blob;
}

/** Exporta cada slide como arquivo separado (download sequencial) */
export async function exportAllSeparately(project: Project, o: ExportOpts, onProgress?: (i: number) => void) {
  for (let i = 0; i < project.pages.length; i++) {
    onProgress?.(i);
    await exportPage(project, i, o);
    await new Promise((r) => setTimeout(r, 350)); // evita bloqueio de múltiplos downloads
  }
}

export async function exportZip(project: Project, o: ExportOpts, onProgress?: (i: number) => void) {
  const zip = new JSZip();
  for (let i = 0; i < project.pages.length; i++) {
    onProgress?.(i);
    const blob = await renderPageBlob(project.pages[i], project.format, o.scale, mimeOf(o.format), o.quality);
    zip.file(`${String(i + 1).padStart(2, '0')}-${slug(project.name)}.${ext(o.format)}`, blob);
  }
  const out = await zip.generateAsync({ type: 'blob' });
  downloadBlob(out, `${slug(project.name)}-carrossel.zip`);
}

// ---------- Backup completo (portabilidade entre navegadores) ----------

interface Backup {
  app: 'visual-content-lab';
  version: 1;
  exportedAt: number;
  projects: Project[];
  brandKits: BrandKit[];
  folders: Folder[];
  settings?: Settings;
  activeBrandKitId?: string;
  assets: (Omit<Asset, 'blob'> & { data: string })[];
}

export async function exportBackup() {
  const [projects, brandKits, folders, assets, settings, activeBrandKitId] = await Promise.all([
    projectsDB.all(), brandKitsDB.all(), foldersDB.all(), assetsDB.all(),
    kvDB.get<Settings>('settings'), kvDB.get<string>('activeBrandKitId'),
  ]);
  const enc = await Promise.all(assets.map(async ({ blob, ...rest }) => ({ ...rest, data: await blobToDataUrl(blob) })));
  const backup: Backup = { app: 'visual-content-lab', version: 1, exportedAt: Date.now(), projects, brandKits, folders, settings, activeBrandKitId, assets: enc };
  downloadBlob(new Blob([JSON.stringify(backup)], { type: 'application/json' }), `visual-content-lab-backup-${new Date().toISOString().slice(0, 10)}.json`);
}

export async function importBackup(file: File) {
  const data = JSON.parse(await file.text()) as Backup;
  if (data.app !== 'visual-content-lab') throw new Error('Arquivo não é um backup do Visual Content Lab.');
  for (const a of data.assets) {
    const { data: d, ...rest } = a;
    await assetsDB.put({ ...rest, blob: await dataUrlToBlob(d) });
  }
  for (const b of data.brandKits) await brandKitsDB.put(b);
  for (const f of data.folders) await foldersDB.put(f);
  for (const p of data.projects) await projectsDB.put(p);
  if (data.settings) await kvDB.set('settings', data.settings);
  if (data.activeBrandKitId) await kvDB.set('activeBrandKitId', data.activeBrandKitId);
  return { projects: data.projects.length, assets: data.assets.length, brandKits: data.brandKits.length };
}
