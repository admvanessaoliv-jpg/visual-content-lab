import type { AssetMeta, BrandKit, Direction, Page, Project, TextElement } from '../types';
import { brandLogos, generateWithLayout, type GenContent } from '../generator';

/** Extrai o conteúdo semântico de uma página (textos por papel + imagem) */
export function extractContent(page: Page): { content: GenContent; image: string | null } {
  const texts = page.elements.filter((e): e is TextElement => e.type === 'text');
  const byRole = (r: TextElement['role']) => texts.find((t) => t.role === r)?.text;
  const sorted = [...texts].sort((a, b) => b.fontSize - a.fontSize);
  const title = byRole('heading') ?? sorted[0]?.text ?? 'Título';
  const listItems = texts.filter((t) => t.role === 'body' && /^Item \d+$/.test(t.name)).map((t) => t.text);
  const body = listItems.length ? listItems.join('\n') : byRole('body') ?? (sorted.length > 1 ? sorted[sorted.length - 1].text : undefined);
  const img = page.elements.find((e) => e.type === 'image' && !e.isLogo && e.assetId);
  return {
    content: {
      title,
      kicker: byRole('kicker'),
      subtitle: byRole('subheading'),
      body: body !== title ? body : undefined,
      cta: byRole('cta'),
      handle: texts.find((t) => t.name === '@ Perfil')?.text,
    },
    image: (img && img.type === 'image' ? img.assetId : null) ?? page.background.assetId,
  };
}

export function generateFromLayout(project: Project, pageIndex: number, layoutId: string, direction: Direction, variant: number, brand: BrandKit, assets: AssetMeta[]): Page {
  const { content, image } = extractContent(project.pages[pageIndex]);
  const total = project.pages.length;
  return generateWithLayout({
    brand,
    ...brandLogos(brand, assets),
    format: project.format,
    type: project.designType,
    direction,
    content,
    images: image ? [image] : [],
    layoutId,
    variant,
    image,
    slide: total > 1 ? { index: pageIndex, total, role: pageIndex === 0 ? 'cover' : layoutId === 'cta' ? 'cta' : 'content' } : undefined,
  });
}
