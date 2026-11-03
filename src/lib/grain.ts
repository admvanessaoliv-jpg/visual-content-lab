/** Textura granulada (ruído de filme) gerada proceduralmente e reutilizada */
let tile: HTMLCanvasElement | null = null;

export function grainTile(): HTMLCanvasElement {
  if (tile) return tile;
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  let seed = 1337;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < img.data.length; i += 4) {
    const r = rnd();
    const v = r > 0.5 ? 255 : 0;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = Math.round(Math.pow(rnd(), 2.2) * 110);
  }
  ctx.putImageData(img, 0, 0);
  tile = c;
  return c;
}
