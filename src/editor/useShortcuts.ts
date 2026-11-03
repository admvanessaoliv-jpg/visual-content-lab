import { useEffect } from 'react';
import { useEditor } from '../store/editorStore';
import { saveNow } from './useAutosave';
import { useEditorUI } from './uiStore';

const isTyping = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
};

export function useShortcuts() {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const ed = useEditor.getState();
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); saveNow(); return; }
      if (isTyping(e.target)) return;
      const k = e.key.toLowerCase();
      if (mod && k === 'z') { e.preventDefault(); e.shiftKey ? ed.redo() : ed.undo(); return; }
      if (mod && k === 'y') { e.preventDefault(); ed.redo(); return; }
      if (mod && k === 'd') { e.preventDefault(); ed.duplicateSelected(); return; }
      if (mod && k === 'c') { ed.copy(); return; }
      if (mod && k === 'v') { e.preventDefault(); ed.paste(); return; }
      if (mod && k === 'a') { e.preventDefault(); ed.select(ed.page()?.elements.filter((x) => !x.locked && !x.hidden).map((x) => x.id) ?? []); return; }
      if (mod && (k === '=' || k === '+')) { e.preventDefault(); const u = useEditorUI.getState(); u.setZoom(u.zoom * 1.2); return; }
      if (mod && k === '-') { e.preventDefault(); const u = useEditorUI.getState(); u.setZoom(u.zoom / 1.2); return; }
      if (mod && k === '0') { e.preventDefault(); useEditorUI.getState().setZoom(1); return; }
      if (k === 'delete' || k === 'backspace') { if (ed.selectedIds.length) { e.preventDefault(); ed.deleteSelected(); } return; }
      if (k === 'escape') { ed.select([]); ed.setEditingText(null); return; }
      if (k === 'enter' && ed.selectedIds.length === 1) {
        const el = ed.selected()[0];
        if (el?.type === 'text' && !el.locked) { e.preventDefault(); ed.setEditingText(el.id); }
        return;
      }
      const step = e.shiftKey ? 10 : 1;
      const moves: Record<string, [number, number]> = { arrowleft: [-step, 0], arrowright: [step, 0], arrowup: [0, -step], arrowdown: [0, step] };
      if (moves[k] && ed.selectedIds.length) { e.preventDefault(); ed.nudge(...moves[k]); return; }
      if (!mod && ed.project && ed.project.pages.length > 1 && !ed.selectedIds.length) {
        if (k === 'pagedown' || k === ']') ed.setPageIndex(Math.min(ed.project.pages.length - 1, ed.pageIndex + 1));
        if (k === 'pageup' || k === '[') ed.setPageIndex(Math.max(0, ed.pageIndex - 1));
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);
}
