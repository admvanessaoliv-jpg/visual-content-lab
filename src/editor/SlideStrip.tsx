import { ChevronLeft, ChevronRight, Copy, Plus, Trash2 } from 'lucide-react';
import { useEditor, MAX_SLIDES, MIN_SLIDES } from '../store/editorStore';
import { FORMATS } from '../lib/formats';
import { useEditorUI } from './uiStore';

/** Navegação e gestão de slides do carrossel (3 a 10) */
export function SlideStrip() {
  const project = useEditor((s) => s.project)!;
  const pageIndex = useEditor((s) => s.pageIndex);
  const { setPageIndex, addPage, duplicatePage, deletePage, movePage } = useEditor.getState();
  const thumbs = useEditorUI((s) => s.thumbs);
  const f = FORMATS[project.format];
  const h = 92;
  const w = Math.round((h * f.width) / f.height);
  const total = project.pages.length;
  const isCarousel = project.kind === 'carousel';
  const min = isCarousel ? MIN_SLIDES : 1;

  return (
    <div className="slide-strip" data-testid="slide-strip">
      {project.pages.map((p, i) => (
        <div key={p.id} className={`slide-thumb ${i === pageIndex ? 'on' : ''}`} style={{ width: w, height: h }} onClick={() => setPageIndex(i)} data-testid={`slide-${i}`}>
          {thumbs[p.id] || p.thumbnail ? <img src={thumbs[p.id] || p.thumbnail} alt={`Slide ${i + 1}`} /> : <span className="muted small">{i + 1}</span>}
          <span className="idx">{i + 1}</span>
          <div className="thumb-actions" onClick={(e) => e.stopPropagation()}>
            {i > 0 && <button title="Mover para a esquerda" onClick={() => movePage(i, i - 1)}><ChevronLeft /></button>}
            {i < total - 1 && <button title="Mover para a direita" onClick={() => movePage(i, i + 1)}><ChevronRight /></button>}
            {total < MAX_SLIDES && <button title="Duplicar slide" onClick={() => duplicatePage(i)}><Copy /></button>}
            {total > min && <button title="Excluir slide" onClick={() => { if (confirm(`Excluir o slide ${i + 1}?`)) deletePage(i); }}><Trash2 /></button>}
          </div>
        </div>
      ))}
      {total < MAX_SLIDES && (
        <button className="slide-add" style={{ width: w, height: h }} onClick={() => addPage(undefined, total)} title="Adicionar slide" data-testid="add-slide"><Plus /></button>
      )}
      <span className="muted small" style={{ marginLeft: 6, whiteSpace: 'nowrap' }}>
        {total} {isCarousel ? `de ${MAX_SLIDES} slides (mín. ${MIN_SLIDES})` : total > 1 ? 'páginas' : 'página'}
      </span>
    </div>
  );
}
