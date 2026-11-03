import { loadAssetImage } from './assets';

/** Extrai cores dominantes de imagens (quantização por histograma 4 bits/canal) */
export async function extractPalette(assetIds: string[], count = 6): Promise<string[]> {
  const buckets = new Map<number, { r: number; g: number; b: number; n: number }>();
  for (const id of assetIds) {
    const img = await loadAssetImage(id).catch(() => null);
    if (!img) continue;
    const size = 96;
    const c = document.createElement('canvas');
    const ratio = img.naturalWidth / img.naturalHeight;
    c.width = ratio >= 1 ? size : Math.round(size * ratio);
    c.height = ratio >= 1 ? Math.round(size / ratio) : size;
    const ctx = c.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0, c.width, c.height);
    const data = ctx.getImageData(0, 0, c.width, c.height).data;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 200) continue;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
      const bk = buckets.get(key) ?? { r: 0, g: 0, b: 0, n: 0 };
      bk.r += r; bk.g += g; bk.b += b; bk.n++;
      buckets.set(key, bk);
    }
  }
  const sorted = [...buckets.values()].sort((a, b) => b.n - a.n).map((b) => [b.r / b.n, b.g / b.n, b.b / b.n]);
  const picked: number[][] = [];
  for (const c of sorted) {
    if (picked.every((p) => Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]) > 48)) picked.push(c);
    if (picked.length >= count) break;
  }
  return picked.map(([r, g, b]) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase());
}
