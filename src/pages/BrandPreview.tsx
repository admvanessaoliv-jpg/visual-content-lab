import { useEffect, useState } from 'react';
import type { BrandKit } from '../types';
import { brandLogos, generateWithLayout } from '../generator';
import { ensureFonts } from '../lib/fonts';
import { renderThumbnail } from '../lib/renderer';
import { useApp } from '../store/appStore';
import { Loader } from '../components/ui';

/** Renderiza peças reais do gerador com o Brand Kit em edição */
export function BrandPreview({ brand }: { brand: BrandKit }) {
  const assets = useApp((s) => s.assets);
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    let alive = true;
    const t = window.setTimeout(async () => {
      await ensureFonts([brand.headingFont, brand.bodyFont, brand.accentFont].map((f) => ({ family: f.family, weight: f.weight })));
      const refImage = brand.references[0]?.assetId ?? null;
      const base = {
        brand, ...brandLogos(brand, assets), format: 'portrait' as const, type: 'static' as const, images: refImage ? [refImage] : [], variant: 0,
        content: { kicker: 'Brand Kit', title: brand.name || 'Sua marca', body: 'Uma prévia gerada com as suas cores, fontes e estilo.', handle: brand.handle },
      };
      const pages = [
        generateWithLayout({ ...base, direction: 'A', layoutId: 'typo-hero', image: null }),
        generateWithLayout({ ...base, direction: 'C', layoutId: 'solid-card', image: null }),
        refImage
          ? generateWithLayout({ ...base, direction: 'E', layoutId: 'frame-inset', image: refImage })
          : generateWithLayout({ ...base, direction: 'F', layoutId: 'geo-circle', image: null, variant: 1 }),
      ];
      const out = await Promise.all(pages.map((p) => renderThumbnail(p, 'portrait', 300)));
      if (alive) setUrls(out);
    }, 450);
    return () => { alive = false; window.clearTimeout(t); };
  }, [brand, assets]);

  if (!urls.length) return <div style={{ aspectRatio: '4/5', display: 'grid', placeItems: 'center' }}><Loader /></div>;
  return (
    <div className="stack" style={{ gap: 10 }}>
      <img src={urls[0]} alt="Prévia" style={{ width: '100%', borderRadius: 10, border: '1px solid var(--line)' }} />
      <div className="grid-2" style={{ gap: 10 }}>
        {urls.slice(1).map((u, i) => <img key={i} src={u} alt="Prévia" style={{ width: '100%', borderRadius: 8, border: '1px solid var(--line)' }} />)}
      </div>
    </div>
  );
}
