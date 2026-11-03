import { describe, expect, it } from 'vitest';
import { useEditor } from '../src/store/editorStore';
import { makePage, makeText } from '../src/lib/defaults';
import type { Project } from '../src/types';

const project = (n: number): Project => ({
  id: 'p', name: 't', kind: 'carousel', designType: 'carousel', format: 'portrait', pages: Array.from({ length: n }, () => makePage()),
  brandKitId: null, folderId: null, status: 'draft', favorite: false, isTemplate: false, createdAt: 0, updatedAt: 0,
});

describe('editor store', () => {
  it('adiciona, edita, desfaz e refaz', () => {
    const s = useEditor.getState();
    s.load(project(3));
    const t = makeText({ text: 'a' });
    s.addElement(t);
    s.updateElement(t.id, { text: 'b' });
    expect(useEditor.getState().page()!.elements[0]).toMatchObject({ text: 'b' });
    useEditor.getState().undo();
    expect(useEditor.getState().page()!.elements[0]).toMatchObject({ text: 'a' });
    useEditor.getState().redo();
    expect(useEditor.getState().page()!.elements[0]).toMatchObject({ text: 'b' });
  });
  it('respeita limites de 3 a 10 slides', () => {
    useEditor.getState().load(project(3));
    useEditor.getState().deletePage(0);
    expect(useEditor.getState().project!.pages).toHaveLength(3);
    for (let i = 0; i < 10; i++) useEditor.getState().addPage();
    expect(useEditor.getState().project!.pages).toHaveLength(10);
  });
  it('duplica e exclui seleção', () => {
    useEditor.getState().load(project(3));
    const t = makeText();
    useEditor.getState().addElement(t);
    useEditor.getState().duplicateSelected();
    expect(useEditor.getState().page()!.elements).toHaveLength(2);
    useEditor.getState().deleteSelected();
    expect(useEditor.getState().page()!.elements).toHaveLength(1);
  });
});
