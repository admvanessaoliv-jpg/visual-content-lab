import { useEffect, useState } from 'react';
import { assetsDB } from './db';
import { uid } from './ids';
import type { Asset } from '../types';

const MAX_SIDE = 3240; // 3× a largura do Instagram — suficiente para exportar a 3x
const urlCache = new Map<string, string>();
const imgCache = new Map<string, Promise<HTMLImageElement>>();

function loadImageFromUrl(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Falha ao decodificar imagem'));
    img.src = url;
  });
}

/** Reduz imagens gigantes preservando qualidade para impressão em 3x */
async function normalizeImage(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImageFromUrl(url);
    const { naturalWidth: w, naturalHeight: h } = img;
    const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
    if (scale === 1 || file.type === 'image/svg+xml' || file.type === 'image/gif') {
      return { blob: file, width: w, height: h };
    }
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const type = file.type === 'image/png' || file.type === 'image/webp' ? 'image/png' : 'image/jpeg';
    const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('toBlob'))), type, 0.93));
    return { blob, width: canvas.width, height: canvas.height };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export const ACCEPTED_IMAGES = 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/avif';
export const ACCEPTED_FONTS = '.ttf,.otf,.woff,.woff2';

export async function importImageFile(file: File, tags: string[] = []): Promise<Asset> {
  if (!file.type.startsWith('image/')) throw new Error(`"${file.name}" não é uma imagem suportada.`);
  const { blob, width, height } = await normalizeImage(file);
  const asset: Asset = {
    id: uid('as_'), name: file.name, mime: blob.type || file.type, kind: 'image',
    width, height, size: blob.size, blob, createdAt: Date.now(), tags,
  };
  await assetsDB.put(asset);
  return asset;
}

export async function importFontFile(file: File): Promise<Asset> {
  if (!/\.(ttf|otf|woff2?)$/i.test(file.name)) throw new Error('Formato de fonte não suportado (use TTF, OTF, WOFF ou WOFF2).');
  const asset: Asset = {
    id: uid('as_'), name: file.name, mime: file.type || 'font/ttf', kind: 'font',
    width: 0, height: 0, size: file.size, blob: file, createdAt: Date.now(), tags: ['font'],
  };
  await assetsDB.put(asset);
  return asset;
}

export async function getAssetUrl(id: string): Promise<string | null> {
  const cached = urlCache.get(id);
  if (cached) return cached;
  const a = await assetsDB.get(id);
  if (!a) return null;
  const url = URL.createObjectURL(a.blob);
  urlCache.set(id, url);
  return url;
}

export function loadAssetImage(id: string): Promise<HTMLImageElement> {
  let p = imgCache.get(id);
  if (!p) {
    p = getAssetUrl(id).then((url) => {
      if (!url) throw new Error('Asset não encontrado');
      return loadImageFromUrl(url);
    });
    p.catch(() => imgCache.delete(id));
    imgCache.set(id, p);
  }
  return p;
}

export function forgetAsset(id: string) {
  const url = urlCache.get(id);
  if (url) URL.revokeObjectURL(url);
  urlCache.delete(id);
  imgCache.delete(id);
}

/** Hook: imagem decodificada de um asset (para o editor Konva) */
export function useAssetImage(id: string | null | undefined) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    let alive = true;
    if (!id) { setImg(null); return; }
    loadAssetImage(id).then((i) => alive && setImg(i)).catch(() => alive && setImg(null));
    return () => { alive = false; };
  }, [id]);
  return img;
}

/** Hook: URL de objeto para <img> na interface */
export function useAssetUrl(id: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(id ? urlCache.get(id) ?? null : null);
  useEffect(() => {
    let alive = true;
    if (!id) { setUrl(null); return; }
    getAssetUrl(id).then((u) => alive && setUrl(u));
    return () => { alive = false; };
  }, [id]);
  return url;
}

export function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

export async function dataUrlToBlob(dataUrl: string) {
  return (await fetch(dataUrl)).blob();
}
