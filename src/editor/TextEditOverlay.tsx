import { useEffect, useLayoutEffect, useRef } from 'react';
import type { TextElement } from '../types';
import { useEditor } from '../store/editorStore';

/** Edição de texto diretamente sobre o canvas (duplo clique) */
export function TextEditOverlay({ el, scale, offX, offY }: { el: TextElement; scale: number; offX: number; offY: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const updateElement = useEditor((s) => s.updateElement);
  const setEditing = useEditor((s) => s.setEditingText);

  useEffect(() => {
    const t = ref.current;
    if (!t) return;
    t.focus();
    t.setSelectionRange(t.value.length, t.value.length);
    t.select();
  }, [el.id]);

  useLayoutEffect(() => {
    const t = ref.current;
    if (!t) return;
    t.style.height = 'auto';
    t.style.height = `${t.scrollHeight}px`;
  });

  return (
    <textarea
      ref={ref}
      className="text-editor-overlay"
      data-testid="text-overlay"
      value={el.text}
      spellCheck
      onChange={(e) => updateElement(el.id, { text: e.target.value }, `text:${el.id}`)}
      onBlur={() => setEditing(null)}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Escape' || (e.key === 'Enter' && (e.metaKey || e.ctrlKey))) setEditing(null);
      }}
      style={{
        left: offX + el.x * scale,
        top: offY + el.y * scale,
        width: el.width * scale + 4,
        fontFamily: `"${el.fontFamily}", Inter, sans-serif`,
        fontSize: el.fontSize * scale,
        fontWeight: el.fontWeight,
        fontStyle: el.italic ? 'italic' : 'normal',
        lineHeight: el.lineHeight,
        letterSpacing: el.letterSpacing * scale,
        textAlign: el.align,
        color: el.fill,
        textTransform: el.uppercase ? 'uppercase' : 'none',
        textDecoration: el.underline ? 'underline' : 'none',
        transform: `rotate(${el.rotation}deg)`,
        caretColor: '#4A7CF7',
      }}
    />
  );
}
