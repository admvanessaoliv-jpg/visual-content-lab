import type { DesignType, Direction, FormatId, Page, Project } from '../types';
import { uid } from './ids';
import { renderThumbnail } from './renderer';

export function newProject(p: { name: string; kind: Project['kind']; designType: DesignType; format: FormatId; pages: Page[]; brandKitId: string | null; direction?: Direction; folderId?: string | null }): Project {
  const now = Date.now();
  return {
    id: uid('pr_'), name: p.name, kind: p.kind, designType: p.designType, direction: p.direction, format: p.format,
    pages: p.pages, brandKitId: p.brandKitId, folderId: p.folderId ?? null, status: 'draft', favorite: false, isTemplate: false,
    createdAt: now, updatedAt: now,
  };
}

/** Gera miniatura do projeto (1ª página) e das páginas para a biblioteca */
export async function withThumbnails(p: Project): Promise<Project> {
  const pages = await Promise.all(p.pages.map(async (pg) => ({ ...pg, thumbnail: await renderThumbnail(pg, p.format, 240).catch(() => pg.thumbnail) })));
  return { ...p, pages, thumbnail: pages[0]?.thumbnail };
}

export const TYPE_LABEL: Record<DesignType, string> = {
  static: 'Post estático', reels: 'Capa de Reels', carousel: 'Carrossel', editorial: 'Editorial', photo: 'Fotografia', typographic: 'Tipográfico',
};
