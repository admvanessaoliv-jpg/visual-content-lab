import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Group, Image as KImage, Layer, Line, Rect, Stage, Text, Transformer } from 'react-konva';
import Konva from 'konva';
import type { DesignElement, TextElement } from '../types';
import { useEditor } from '../store/editorStore';
import { useApp } from '../store/appStore';
import { FORMATS, reelsSafeZone } from '../lib/formats';
import { backgroundSpecs } from '../lib/renderer';
import { grainSpec } from '../lib/konvaAttrs';
import { useAssetImage } from '../lib/assets';
import { ElementNode } from './ElementNode';
import { TextEditOverlay } from './TextEditOverlay';
import { useEditorUI } from './uiStore';

const PAD = 48;
const SNAP = 6;

interface Guide { orientation: 'V' | 'H'; pos: number }

export function CanvasStage() {
  const project = useEditor((s) => s.project)!;
  const pageIndex = useEditor((s) => s.pageIndex);
  const selectedIds = useEditor((s) => s.selectedIds);
  const editingTextId = useEditor((s) => s.editingTextId);
  const { select, commit, setEditingText } = useEditor.getState();
  const settings = useApp((s) => s.settings);
  const zoom = useEditorUI((s) => s.zoom);
  const setZoom = useEditorUI((s) => s.setZoom);

  const page = project.pages[pageIndex];
  const { width: W, height: H } = FORMATS[project.format];

  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const contentRef = useRef<Konva.Group>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [guides, setGuides] = useState<Guide[]>([]);
  const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const marqueeStart = useRef<{ x: number; y: number } | null>(null);

  // ----- dimensionamento -----
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);
  useEffect(() => setPan({ x: 0, y: 0 }), [zoom === 1, project.format]); // eslint-disable-line react-hooks/exhaustive-deps

  const fit = Math.min((size.w - PAD * 2) / W, (size.h - PAD * 2 - 40) / H);
  const scale = Math.max(0.05, fit * zoom);
  const offX = (size.w - W * scale) / 2 + pan.x;
  const offY = (size.h - H * scale) / 2 - 10 + pan.y;

  // ----- fundo -----
  const bgImg = useAssetImage(page.background.assetId);
  const bgSpecs = useMemo(() => backgroundSpecs(page.background, W, H, bgImg), [page.background, W, H, bgImg]);
  const bgRefs = useRef<(Konva.Shape | null)[]>([]);
  useEffect(() => {
    bgSpecs.forEach((s, i) => {
      const n = bgRefs.current[i];
      if (!n) return;
      if (s.needsCache) n.cache({ pixelRatio: 1 }); else n.clearCache();
    });
    contentRef.current?.getLayer()?.batchDraw();
  }, [bgSpecs]);

  // ----- transformer -----
  const selectedEls = page.elements.filter((e) => selectedIds.includes(e.id));
  const onlyLines = selectedEls.length > 0 && selectedEls.every((e) => e.type === 'line');
  const onlyText = selectedEls.length === 1 && selectedEls[0].type === 'text';
  const anyLocked = selectedEls.some((e) => e.locked);
  useEffect(() => {
    const tr = trRef.current;
    const stage = stageRef.current;
    if (!tr || !stage) return;
    const nodes = selectedIds
      .filter((id) => id !== editingTextId)
      .map((id) => stage.findOne(`#${id}`))
      .filter((n): n is Konva.Node => !!n && n.visible());
    tr.nodes(nodes);
    tr.getLayer()?.batchDraw();
  }, [selectedIds, editingTextId, page, pageIndex]);

  // ----- seleção -----
  const onSelect = useCallback((id: string, e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    e.cancelBubble = true;
    const additive = e.evt.shiftKey || e.evt.metaKey || e.evt.ctrlKey;
    const cur = useEditor.getState().selectedIds;
    if (additive) select([id], true);
    else if (!cur.includes(id)) select([id]);
  }, [select]);

  const onDblClick = useCallback((el: DesignElement) => {
    if (el.locked) return;
    if (el.type === 'text') { select([el.id]); setEditingText(el.id); }
    if (el.type === 'image') {
      useEditorUI.getState().setImageTarget(el.id);
      useEditorUI.getState().setLeftTab('media');
      useEditorUI.getState().setMobilePanel('left');
    }
  }, [select, setEditingText]);

  // ----- snapping -----
  const onDragMove = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    if (!settings.snapping || useEditor.getState().selectedIds.length > 1) { setGuides([]); return; }
    const node = e.target;
    const group = contentRef.current!;
    const box = node.getClientRect({ relativeTo: group, skipShadow: true });
    const vTargets = [0, W / 2, W];
    const hTargets = [0, H / 2, H];
    const margin = Math.round(W * 0.075);
    vTargets.push(margin, W - margin);
    hTargets.push(margin, H - margin);
    for (const other of group.find('.element')) {
      if (other === node || !other.visible()) continue;
      const r = other.getClientRect({ relativeTo: group, skipShadow: true });
      vTargets.push(r.x, r.x + r.width / 2, r.x + r.width);
      hTargets.push(r.y, r.y + r.height / 2, r.y + r.height);
    }
    const thr = SNAP / scale;
    const best = (edges: number[], targets: number[]) => {
      let res: { diff: number; pos: number } | null = null;
      for (const ed of edges) for (const t of targets) {
        const d = t - ed;
        if (Math.abs(d) < thr && (!res || Math.abs(d) < Math.abs(res.diff))) res = { diff: d, pos: t };
      }
      return res;
    };
    const v = best([box.x, box.x + box.width / 2, box.x + box.width], vTargets);
    const h = best([box.y, box.y + box.height / 2, box.y + box.height], hTargets);
    const g: Guide[] = [];
    if (v) { node.x(node.x() + v.diff); g.push({ orientation: 'V', pos: v.pos }); }
    if (h) { node.y(node.y() + h.diff); g.push({ orientation: 'H', pos: h.pos }); }
    setGuides(g);
  }, [settings.snapping, W, H, scale]);

  const onDragEnd = useCallback(() => {
    setGuides([]);
    const stage = stageRef.current;
    if (!stage) return;
    const ids = new Set(useEditor.getState().selectedIds);
    const pos = new Map<string, { x: number; y: number }>();
    for (const n of trRef.current?.nodes() ?? []) pos.set(n.id(), { x: n.x(), y: n.y() });
    // elemento arrastado sem estar selecionado
    stage.find('.element').forEach((n) => { if (!ids.has(n.id()) && n.isDragging?.()) pos.set(n.id(), { x: n.x(), y: n.y() }); });
    if (!pos.size) return;
    commit((pages, i) => pages.map((p, idx) => idx !== i ? p : {
      ...p,
      elements: p.elements.map((el) => {
        const np = pos.get(el.id);
        return np ? { ...el, x: Math.round(np.x * 10) / 10, y: Math.round(np.y * 10) / 10 } : el;
      }),
    }), `drag:${[...pos.keys()].join()}`);
  }, [commit]);

  const onTransformEnd = useCallback(() => {
    const tr = trRef.current;
    if (!tr) return;
    const anchor = tr.getActiveAnchor() ?? '';
    const patches = new Map<string, Partial<DesignElement>>();
    const els = useEditor.getState().page()?.elements ?? [];
    for (const node of tr.nodes()) {
      const el = els.find((e) => e.id === node.id());
      if (!el) continue;
      const sx = node.scaleX(), sy = node.scaleY();
      node.scaleX(1); node.scaleY(1);
      const base = { x: Math.round(node.x() * 10) / 10, y: Math.round(node.y() * 10) / 10, rotation: Math.round(node.rotation() * 100) / 100 };
      if (el.type === 'text') {
        const sideOnly = anchor === 'middle-left' || anchor === 'middle-right';
        const p: Partial<TextElement> = { ...base, width: Math.max(20, Math.round(el.width * sx)) };
        if (!sideOnly && Math.abs(sy - 1) > 0.001) {
          p.fontSize = Math.max(6, Math.round(el.fontSize * sy * 10) / 10);
          p.letterSpacing = Math.round(el.letterSpacing * sy * 100) / 100;
          if (!el.autoHeight) p.height = Math.round(el.height * sy);
        }
        patches.set(el.id, p);
      } else if (el.type === 'line') {
        patches.set(el.id, { ...base, width: Math.max(4, Math.round(el.width * sx)) });
      } else {
        patches.set(el.id, { ...base, width: Math.max(4, Math.round(el.width * sx)), height: Math.max(4, Math.round(el.height * sy)) });
      }
    }
    commit((pages, i) => pages.map((p, idx) => idx !== i ? p : {
      ...p, elements: p.elements.map((el) => (patches.has(el.id) ? ({ ...el, ...patches.get(el.id) } as DesignElement) : el)),
    }));
  }, [commit]);

  // ----- marquee / clique no vazio -----
  const designPoint = () => {
    const p = stageRef.current?.getPointerPosition();
    return p ? { x: (p.x - offX) / scale, y: (p.y - offY) / scale } : null;
  };
  const onStageDown = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const t = e.target;
    const isEmpty = t === stageRef.current || t.name() === 'background' || t.name() === 'page-shadow';
    if (!isEmpty) return;
    if (editingTextId) setEditingText(null);
    if (!(e.evt as MouseEvent).shiftKey) select([]);
    const p = designPoint();
    if (p) { marqueeStart.current = p; setMarquee({ x: p.x, y: p.y, w: 0, h: 0 }); }
  };
  const onStageMove = () => {
    if (!marqueeStart.current) return;
    const p = designPoint();
    if (!p) return;
    const s = marqueeStart.current;
    setMarquee({ x: Math.min(s.x, p.x), y: Math.min(s.y, p.y), w: Math.abs(p.x - s.x), h: Math.abs(p.y - s.y) });
  };
  const onStageUp = () => {
    if (marquee && marquee.w > 4 && marquee.h > 4 && contentRef.current) {
      const hits = contentRef.current.find('.element').filter((n) => {
        if (!n.visible()) return false;
        const r = n.getClientRect({ relativeTo: contentRef.current!, skipShadow: true });
        return Konva.Util.haveIntersection(r, { x: marquee.x, y: marquee.y, width: marquee.w, height: marquee.h });
      }).map((n) => n.id());
      const lockedIds = new Set(page.elements.filter((e) => e.locked).map((e) => e.id));
      select(hits.filter((id) => !lockedIds.has(id)), true);
    }
    marqueeStart.current = null;
    setMarquee(null);
  };

  // ----- zoom e pan pela roda -----
  const onWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    if (e.evt.ctrlKey || e.evt.metaKey) {
      const factor = Math.exp(-e.evt.deltaY * 0.01);
      setZoom(zoom * factor);
    } else if (zoom > 1) {
      setPan((p) => ({ x: p.x - e.evt.deltaX, y: p.y - e.evt.deltaY }));
    }
  };

  const editingEl = page.elements.find((e) => e.id === editingTextId) as TextElement | undefined;
  const safe = project.format === 'story'
    ? project.designType === 'reels' ? reelsSafeZone(W, H) : { x: 0, y: 250, width: W, height: H - 250 - 330 }
    : null;

  return (
    <div className="ed-canvas-wrap" ref={wrapRef} data-testid="canvas">
      <Stage
        ref={stageRef}
        width={size.w}
        height={size.h}
        onMouseDown={onStageDown}
        onTouchStart={onStageDown}
        onMouseMove={onStageMove}
        onMouseUp={onStageUp}
        onTouchEnd={onStageUp}
        onWheel={onWheel}
      >
        <Layer>
          <Rect name="page-shadow" x={offX} y={offY} width={W * scale} height={H * scale} fill="#fff" shadowColor="#000" shadowBlur={30} shadowOpacity={0.12} shadowOffsetY={10} />
          <Group ref={contentRef} x={offX} y={offY} scaleX={scale} scaleY={scale} clipX={0} clipY={0} clipWidth={W} clipHeight={H}>
            {bgSpecs.map((s, i) => {
              const C = (s.kind === 'Image' ? KImage : Rect) as any;
              return <C key={i} ref={(n: Konva.Shape | null) => { bgRefs.current[i] = n; }} {...s.attrs} />;
            })}
            {page.elements.map((el) => (
              <ElementNode
                key={el.id}
                el={el}
                hiddenForEditing={el.id === editingTextId}
                onSelect={onSelect}
                onDblClick={onDblClick}
                onDragMove={onDragMove}
                onDragEnd={onDragEnd}
              />
            ))}
            {(() => { const g = grainSpec(page.background, W, H); return g ? <Rect {...g.attrs} /> : null; })()}
            {page.elements.filter((el) => el.type === 'image' && !el.assetId && !el.hidden).map((el) => (
              <Text key={`ph-${el.id}`} listening={false} x={el.x} y={el.y + el.height / 2 - 24} width={el.width} align="center" text={'Imagem\nclique duas vezes para escolher'} fontSize={Math.max(14, Math.min(28, el.width / 14))} fill="#8F8A80" fontFamily="Inter Tight" lineHeight={1.4} />
            ))}
            {safe && settings.showSafeZones && (
              <Rect listening={false} x={safe.x + 2} y={safe.y} width={safe.width - 4} height={safe.height} stroke="#4A7CF7" strokeWidth={2 / scale} dash={[10 / scale, 8 / scale]} opacity={0.6} />
            )}
            {guides.map((g, i) => (
              <Line key={i} listening={false} points={g.orientation === 'V' ? [g.pos, -2000, g.pos, H + 2000] : [-2000, g.pos, W + 2000, g.pos]} stroke="#E5484D" strokeWidth={1 / scale} dash={[4 / scale, 4 / scale]} />
            ))}
            {marquee && <Rect listening={false} x={marquee.x} y={marquee.y} width={marquee.w} height={marquee.h} fill="rgba(74,124,247,0.08)" stroke="#4A7CF7" strokeWidth={1 / scale} />}
          </Group>
          <Transformer
            ref={trRef}
            rotateEnabled={!anyLocked}
            resizeEnabled={!anyLocked}
            enabledAnchors={onlyLines ? ['middle-left', 'middle-right'] : onlyText ? ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right'] : undefined}
            keepRatio={onlyText}
            rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
            rotationSnapTolerance={4}
            anchorSize={9}
            anchorCornerRadius={2}
            anchorStroke="#4A7CF7"
            borderStroke="#4A7CF7"
            padding={onlyLines ? 6 : 0}
            ignoreStroke
            flipEnabled={false}
            boundBoxFunc={(oldB, newB) => (newB.width < 5 || newB.height < 2 ? oldB : newB)}
            onTransformEnd={onTransformEnd}
          />
        </Layer>
      </Stage>
      {editingEl && (
        <TextEditOverlay el={editingEl} scale={scale} offX={offX} offY={offY} />
      )}
    </div>
  );
}
