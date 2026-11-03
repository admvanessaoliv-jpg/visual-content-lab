import { useEffect, useRef } from 'react';
import { useEditor } from '../store/editorStore';
import { useApp } from '../store/appStore';
import { renderThumbnail } from '../lib/renderer';
import { useEditorUI } from './uiStore';
import type { Project } from '../types';

/** Monta o projeto persistível (com miniaturas) a partir do estado do editor */
export function snapshotProject(): Project | null {
  const p = useEditor.getState().project;
  if (!p) return null;
  const thumbs = useEditorUI.getState().thumbs;
  const pages = p.pages.map((pg) => ({ ...pg, thumbnail: thumbs[pg.id] ?? pg.thumbnail }));
  return { ...p, pages, thumbnail: pages[0]?.thumbnail, updatedAt: Date.now() };
}

export async function saveNow() {
  const snap = snapshotProject();
  if (!snap) return;
  const ed = useEditor.getState();
  ed.markSaving();
  try {
    await useApp.getState().upsertProject(snap);
    useEditor.getState().markSaved(snap.updatedAt);
  } catch (e) {
    console.error(e);
    useEditor.getState().markError();
    useApp.getState().toast('Falha ao salvar: ' + (e as Error).message, 'error');
  }
}

/**
 * Salvamento automático (debounce) + miniaturas das páginas alteradas.
 * Com autosave desligado nas configurações, apenas as miniaturas são atualizadas
 * e o salvamento é manual (Ctrl+S).
 */
export function useAutosave() {
  const revision = useEditor((s) => s.revision);
  const autosave = useApp((s) => s.settings.autosave);
  const saveTimer = useRef<number | undefined>(undefined);
  const thumbTimer = useRef<number | undefined>(undefined);
  const lastPages = useRef<Map<string, unknown>>(new Map());

  useEffect(() => {
    const p = useEditor.getState().project;
    if (!p) return;
    window.clearTimeout(thumbTimer.current);
    thumbTimer.current = window.setTimeout(async () => {
      const proj = useEditor.getState().project;
      if (!proj) return;
      for (const pg of proj.pages) {
        const known = lastPages.current.get(pg.id);
        if (known === pg && useEditorUI.getState().thumbs[pg.id]) continue;
        lastPages.current.set(pg.id, pg);
        try { useEditorUI.getState().setThumb(pg.id, await renderThumbnail(pg, proj.format, 240)); } catch { /* ignora */ }
      }
    }, revision === 0 ? 50 : 900);

    if (revision > 0 && autosave) {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(saveNow, 700);
    }
  }, [revision, autosave]);

  // salva miniaturas atualizadas logo após gerá-las (sem marcar como sujo)
  const thumbs = useEditorUI((s) => s.thumbs);
  useEffect(() => {
    if (!autosave || useEditor.getState().saveState !== 'saved') return;
    const t = window.setTimeout(saveNow, 400);
    return () => window.clearTimeout(t);
  }, [thumbs, autosave]);

  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      const st = useEditor.getState().saveState;
      if (st === 'dirty' || st === 'saving') { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', h);
    return () => { window.removeEventListener('beforeunload', h); window.clearTimeout(saveTimer.current); window.clearTimeout(thumbTimer.current); };
  }, []);
}
