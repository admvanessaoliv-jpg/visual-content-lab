import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Arrow, Ellipse, Image as KImage, Line, Rect, Shape, Text } from 'react-konva';
import type Konva from 'konva';
import type { DesignElement } from '../types';
import { elementSpec } from '../lib/konvaAttrs';
import { useAssetImage } from '../lib/assets';
import { ensureFonts } from '../lib/fonts';
import { collectFonts } from '../lib/konvaAttrs';
import { clearRichCache } from '../lib/richText';
import { useEditor } from '../store/editorStore';

const COMPONENTS = { Text, Image: KImage, Rect, Ellipse, Line, Arrow, Shape } as const;

interface Props {
  el: DesignElement;
  hiddenForEditing: boolean;
  onSelect: (id: string, e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onDblClick: (el: DesignElement) => void;
  onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
}

/**
 * Cada elemento do documento vira um nó Konva independente,
 * selecionável, arrastável e transformável.
 */
export function ElementNode({ el, hiddenForEditing, onSelect, onDblClick, onDragMove, onDragEnd }: Props) {
  const ref = useRef<Konva.Shape>(null);
  const img = useAssetImage(el.type === 'image' ? el.assetId : null);
  const [fontTick, setFontTick] = useState(0);
  const spec = elementSpec(el, img);
  void fontTick;
  const silentUpdate = useEditor((s) => s.silentUpdate);

  // fontes: redesenha quando a face real termina de carregar
  const fontKey = el.type === 'text'
    ? JSON.stringify(collectFonts([{ id: '', name: '', background: null as any, elements: [el] }]))
    : '';
  useEffect(() => {
    if (el.type !== 'text') return;
    let alive = true;
    ensureFonts(JSON.parse(fontKey)).then(() => {
      const node = ref.current as any;
      if (!alive || !node) return;
      if (node.fontFamily) {
        const fam = node.fontFamily();
        node.fontFamily(fam + ' ');
        node.fontFamily(fam);
      } else {
        clearRichCache();
        setFontTick((t) => t + 1);
      }
      node.getLayer()?.batchDraw();
      syncHeight();
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fontKey]);

  // filtros de imagem exigem cache do nó
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (spec.needsCache) node.cache({ pixelRatio: 1 });
    else node.clearCache();
    node.getLayer()?.batchDraw();
  });

  // altura automática do texto -> modelo (sem histórico)
  const syncHeight = () => {
    if (el.type !== 'text' || !el.autoHeight) return;
    const node = ref.current as Konva.Text | null;
    if (!node) return;
    const h = Math.round(node.height());
    if (Math.abs(h - el.height) > 0.5) silentUpdate(el.id, { height: h });
  };
  useLayoutEffect(syncHeight);

  const C = COMPONENTS[spec.kind] as any;
  return (
    <C
      ref={ref}
      {...spec.attrs}
      visible={!el.hidden && !hiddenForEditing}
      draggable={!el.locked}
      onMouseDown={(e: any) => onSelect(el.id, e)}
      onTap={(e: any) => onSelect(el.id, e)}
      onDblClick={() => onDblClick(el)}
      onDblTap={() => onDblClick(el)}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      perfectDrawEnabled={false}
    />
  );
}
