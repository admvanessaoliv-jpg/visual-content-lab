import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  ArrowRight, Circle, Eye, EyeOff, Hexagon, Image as ImageIcon, Layers, LayoutTemplate, Lock, Minus, Palette, Plus, Shapes, Square,
  Star, Triangle, Type, Unlock, RectangleHorizontal,
} from 'lucide-react';
import type { DesignElement, Direction, ImageElement, TextElement } from '../types';
import { useEditor } from '../store/editorStore';
import { useApp } from '../store/appStore';
import { FORMATS, DIRECTIONS } from '../lib/formats';
import { makeImage, makeLine, makeShape, makeText } from '../lib/defaults';
import { ACCEPTED_IMAGES } from '../lib/assets';
import { nearestWeight } from '../lib/fonts';
import { AssetImage } from '../components/AssetImage';
import { Dropzone, Segmented } from '../components/ui';
import { useEditorUI, type LeftTab } from './uiStore';
import { LAYOUTS } from '../generator/layouts';
import { generateFromLayout } from './regenerate';

const TABS: { id: LeftTab; label: string; icon: typeof Type }[] = [
  { id: 'add', label: 'Inserir', icon: Plus },
  { id: 'media', label: 'Mídia', icon: ImageIcon },
  { id: 'brand', label: 'Marca', icon: Palette },
  { id: 'layers', label: 'Camadas', icon: Layers },
  { id: 'layouts', label: 'Layouts', icon: LayoutTemplate },
];

export function LeftPanel() {
  const tab = useEditorUI((s) => s.leftTab);
  const setTab = useEditorUI((s) => s.setLeftTab);
  return (
    <>
      <div className="ed-rail">
        {TABS.map((t) => (
          <button key={t.id} className={`rail-btn ${tab === t.id ? 'on' : ''}`} onClick={() => setTab(t.id)} data-testid={`tab-${t.id}`}>
            <t.icon /> {t.label}
          </button>
        ))}
      </div>
      <div className="panel">
        {tab === 'add' && <AddTab />}
        {tab === 'media' && <MediaTab />}
        {tab === 'brand' && <BrandTab />}
        {tab === 'layers' && <LayersTab />}
        {tab === 'layouts' && <LayoutsTab />}
      </div>
    </>
  );
}

function useCanvas() {
  const project = useEditor((s) => s.project)!;
  return FORMATS[project.format];
}

function AddTab() {
  const { width: W, height: H } = useCanvas();
  const add = useEditor((s) => s.addElement);
  const brand = useApp((s) => s.activeBrand());
  const assets = useApp((s) => s.assets);

  const addText = (kind: 'heading' | 'subheading' | 'body' | 'kicker') => {
    const f = kind === 'heading' || kind === 'subheading' ? brand.headingFont : kind === 'kicker' ? brand.accentFont : brand.bodyFont;
    const presets = {
      heading: { text: 'Título de impacto', fontSize: Math.round(W * 0.09), name: 'Título', role: 'heading' as const, lineHeight: 1.05 },
      subheading: { text: 'Subtítulo complementar', fontSize: Math.round(W * 0.045), name: 'Subtítulo', role: 'subheading' as const, lineHeight: 1.2 },
      body: { text: 'Texto de apoio com a mensagem principal do post, claro e direto.', fontSize: Math.round(W * 0.03), name: 'Texto', role: 'body' as const, lineHeight: 1.45 },
      kicker: { text: 'CHAMADA', fontSize: Math.round(W * 0.024), name: 'Chamada', role: 'kicker' as const, lineHeight: 1.2 },
    }[kind];
    const width = Math.round(W * 0.8);
    add(makeText({
      ...presets, fontFamily: f.family, fontWeight: nearestWeight(f.family, kind === 'kicker' ? 600 : f.weight),
      x: Math.round((W - width) / 2), y: Math.round(H * 0.4), width, fill: brand.colors.text, colorRole: 'text',
      uppercase: kind === 'kicker' || (kind === 'heading' && brand.headingUppercase),
      letterSpacing: kind === 'kicker' ? Math.round(presets.fontSize * 0.16) : kind === 'heading' ? +(presets.fontSize * brand.headingLetterSpacing).toFixed(1) : 0,
    }));
  };

  const s = Math.round(W * 0.3);
  const cx = Math.round((W - s) / 2), cy = Math.round((H - s) / 2);
  const shapes = [
    { icon: Square, label: 'Retângulo', make: () => makeShape({ name: 'Retângulo', x: cx, y: cy, width: s, height: s, fill: brand.colors.secondary, colorRole: 'secondary' }) },
    { icon: RectangleHorizontal, label: 'Cartão', make: () => makeShape({ name: 'Cartão', x: cx - s / 2, y: cy, width: s * 2, height: s, fill: brand.colors.surface, colorRole: 'surface', cornerRadius: 28, shadow: { enabled: true, color: '#000000', blur: 50, offsetX: 0, offsetY: 20, opacity: 0.18 } }) },
    { icon: Circle, label: 'Círculo', make: () => makeShape({ name: 'Círculo', shape: 'ellipse', x: cx, y: cy, width: s, height: s, fill: brand.colors.accent, colorRole: 'accent' }) },
    { icon: Triangle, label: 'Triângulo', make: () => makeShape({ name: 'Triângulo', shape: 'triangle', x: cx, y: cy, width: s, height: s, fill: brand.colors.primary, colorRole: 'primary' }) },
    { icon: Star, label: 'Estrela', make: () => makeShape({ name: 'Estrela', shape: 'star', sides: 5, x: cx, y: cy, width: s, height: s, fill: brand.colors.secondary, colorRole: 'secondary' }) },
    { icon: Hexagon, label: 'Polígono', make: () => makeShape({ name: 'Polígono', shape: 'polygon', sides: 6, x: cx, y: cy, width: s, height: s, fill: brand.colors.primary, colorRole: 'primary' }) },
    { icon: Minus, label: 'Linha', make: () => makeLine({ x: cx, y: Math.round(H / 2), width: s, stroke: brand.colors.text, colorRole: 'text' }) },
    { icon: ArrowRight, label: 'Seta', make: () => makeLine({ name: 'Seta', x: cx, y: Math.round(H / 2), width: s, stroke: brand.colors.text, colorRole: 'text', arrowEnd: true, strokeWidth: 4, lineCap: 'round' }) },
  ];

  const logo = assets.find((a) => a.id === brand.logoAssetId);
  return (
    <>
      <div className="panel-title">Texto</div>
      <div className="stack" style={{ gap: 6 }}>
        <button className="add-tile" onClick={() => addText('heading')} data-testid="add-heading"><span style={{ fontFamily: `"${brand.headingFont.family}"`, fontSize: 24, lineHeight: 1.1 }}>Adicionar título</span></button>
        <button className="add-tile" onClick={() => addText('subheading')}><span style={{ fontFamily: `"${brand.headingFont.family}"`, fontSize: 17 }}>Adicionar subtítulo</span></button>
        <button className="add-tile" onClick={() => addText('body')}><span style={{ fontFamily: `"${brand.bodyFont.family}"`, fontSize: 13 }}>Adicionar corpo de texto</span></button>
        <button className="add-tile" onClick={() => addText('kicker')}><span style={{ fontFamily: `"${brand.accentFont.family}"`, fontSize: 11, letterSpacing: '0.16em', fontWeight: 600 }}>ADICIONAR CHAMADA</span></button>
      </div>
      <div className="panel-title"><span>Formas e linhas</span><Shapes size={14} /></div>
      <div className="shape-grid">
        {shapes.map((sh) => <button key={sh.label} title={sh.label} onClick={() => add(sh.make())} data-testid={`add-${sh.label}`}><sh.icon /></button>)}
      </div>
      <div className="panel-title">Imagem</div>
      <button className="btn sm" onClick={() => add(makeImage({ x: cx - s / 2, y: cy - s / 2, width: s * 2, height: s * 2 }))}><ImageIcon /> Espaço para imagem</button>
      {logo && (
        <>
          <div className="panel-title">Logotipo</div>
          <button className="add-tile" style={{ display: 'grid', placeItems: 'center', height: 80 }}
            onClick={() => { const h = Math.round(W * 0.08); const w = Math.round(h * (logo.width / logo.height)); add(makeImage({ name: 'Logotipo', isLogo: true, assetId: logo.id, fit: 'fill', x: Math.round((W - w) / 2), y: Math.round(H * 0.08), width: w, height: h })); }}>
            <AssetImage id={logo.id} style={{ maxHeight: 54, maxWidth: '80%' }} />
          </button>
        </>
      )}
    </>
  );
}

function MediaTab() {
  const { width: W, height: H } = useCanvas();
  const assets = useApp((s) => s.assets).filter((a) => a.kind === 'image');
  const upload = useApp((s) => s.uploadImages);
  const { addElement, updateElement, updateBackground } = useEditor.getState();
  const target = useEditorUI((s) => s.imageTargetId);
  const setTarget = useEditorUI((s) => s.setImageTarget);
  const page = useEditor((s) => s.page());
  const targetEl = page?.elements.find((e) => e.id === target);

  const use = (id: string) => {
    const a = assets.find((x) => x.id === id)!;
    if (target === '__background__') { updateBackground({ assetId: id }); setTarget(null); return; }
    if (targetEl && targetEl.type === 'image') { updateElement(targetEl.id, { assetId: id } as Partial<ImageElement>); setTarget(null); return; }
    const w = Math.round(W * 0.6);
    const h = Math.round(w * (a.height / a.width));
    addElement(makeImage({ assetId: id, name: a.name.replace(/\.[^.]+$/, '').slice(0, 40), x: Math.round((W - w) / 2), y: Math.round((H - h) / 2), width: w, height: h }));
  };

  return (
    <>
      <div className="panel-title">Suas imagens</div>
      {target && (
        <div className="chip dark" style={{ justifyContent: 'space-between', borderRadius: 8, padding: '6px 10px' }}>
          {target === '__background__' ? 'Escolha a imagem de fundo' : 'Escolha a imagem para substituir'}
          <button className="icon-btn sm" style={{ color: '#fff' }} onClick={() => setTarget(null)}>✕</button>
        </div>
      )}
      <Dropzone accept={ACCEPTED_IMAGES} compact onFiles={async (f) => { const added = await upload(f); if (added.length === 1 && target) use(added[0].id); }}>Enviar imagens</Dropzone>
      <div className="media-grid" data-testid="media-grid">
        {assets.map((a) => (
          <button key={a.id} className="img-pick" onClick={() => use(a.id)} title={a.name}><AssetImage id={a.id} alt={a.name} /></button>
        ))}
      </div>
      {!assets.length && <p className="muted small">Nenhuma imagem ainda. Envie fotos próprias — elas ficam salvas no seu navegador e podem ser reutilizadas em todos os designs.</p>}
      {!target && assets.length > 0 && (
        <p className="muted small">Clique para inserir. Para usar como fundo, desmarque a seleção e use “Imagem de fundo” no painel direito.</p>
      )}
    </>
  );
}

function BrandTab() {
  const { brandKits, activeBrandKitId, setActiveBrandKit } = useApp();
  const brand = useApp((s) => s.activeBrand());
  const { updateSelected, applyBrand } = useEditor.getState();
  const sel = useEditor(useShallow((s) => s.selected()));
  const isCarousel = useEditor((s) => (s.project?.pages.length ?? 1) > 1);
  const toast = useApp((s) => s.toast);

  const paint = (c: string, role?: string) => {
    if (!sel.length) return toast('Selecione um elemento para aplicar a cor', 'info');
    updateSelected((el) => {
      if (el.type === 'line') return { stroke: c, colorRole: role } as Partial<DesignElement>;
      if (el.type === 'image') return { strokeColor: c } as Partial<DesignElement>;
      return { fill: c, colorRole: role, ...(el.type === 'shape' ? { fillEnabled: true, gradientEnabled: false } : {}) } as Partial<DesignElement>;
    });
  };
  const font = (f: { family: string; weight: number }) => {
    if (!sel.some((e) => e.type === 'text')) return toast('Selecione um texto', 'info');
    updateSelected((el) => (el.type === 'text' ? { fontFamily: f.family, fontWeight: nearestWeight(f.family, f.weight) } as Partial<TextElement> : {}) as Partial<DesignElement>);
  };

  return (
    <>
      <div className="panel-title">Brand Kit</div>
      <select className="select sm" value={activeBrandKitId ?? ''} onChange={(e) => setActiveBrandKit(e.target.value)}>
        {brandKits.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
      </select>
      <div className="panel-title">Cores da marca</div>
      <div className="stack" style={{ gap: 4 }}>
        {(Object.entries(brand.colors) as [string, string][]).map(([role, c]) => (
          <button key={role} className="layer" onClick={() => paint(c, role)} style={{ background: 'transparent' }}>
            <span className="swatch sm" style={{ background: c }} />
            <span className="lname">{({ primary: 'Primária', secondary: 'Secundária', accent: 'Destaque', background: 'Fundo', surface: 'Superfície', text: 'Texto', muted: 'Apoio' } as Record<string, string>)[role]}</span>
            <span className="muted small" style={{ fontFamily: 'JetBrains Mono' }}>{c}</span>
          </button>
        ))}
      </div>
      <div className="row wrap" style={{ gap: 5 }}>
        {brand.palette.map((c, i) => <button key={c + i} className="swatch sm" style={{ background: c }} onClick={() => paint(c)} title={c} />)}
      </div>
      <div className="panel-title">Tipografia</div>
      {[['Títulos', brand.headingFont], ['Textos', brand.bodyFont], ['Destaques', brand.accentFont]].map(([label, f]) => {
        const ff = f as { family: string; weight: number };
        return (
          <button key={label as string} className="add-tile" onClick={() => font(ff)}>
            <div className="muted small">{label as string}</div>
            <div style={{ fontFamily: `"${ff.family}"`, fontWeight: ff.weight, fontSize: 19 }}>{ff.family}</div>
          </button>
        );
      })}
      <div className="panel-title">Reaplicar identidade</div>
      <p className="muted small" style={{ margin: 0 }}>Atualiza cores e fontes de cada elemento conforme seu papel (título, texto, cor primária…) mantendo posições e conteúdo.</p>
      <div className="row wrap">
        <button className="btn sm" onClick={() => { applyBrand(brand, 'page'); toast('Brand Kit aplicado à página'); }}>Nesta página</button>
        {isCarousel && <button className="btn sm" onClick={() => { applyBrand(brand, 'all'); toast('Brand Kit aplicado a todos os slides'); }}>Em todos os slides</button>}
      </div>
    </>
  );
}

const TYPE_ICON = { text: Type, image: ImageIcon, shape: Square, line: Minus };

function LayersTab() {
  const page = useEditor((s) => s.page())!;
  const selectedIds = useEditor((s) => s.selectedIds);
  const { select, updateElement, moveLayer } = useEditor.getState();
  const [drag, setDrag] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const els = page.elements.map((el, idx) => ({ el, idx })).reverse();
  return (
    <>
      <div className="panel-title">Camadas · {page.elements.length}</div>
      <div className="layer-list" data-testid="layers">
        {els.map(({ el, idx }) => {
          const Icon = TYPE_ICON[el.type];
          return (
            <div
              key={el.id}
              className={`layer ${selectedIds.includes(el.id) ? 'on' : ''} ${el.hidden ? 'hidden-el' : ''} ${over === idx ? 'drag-over' : ''}`}
              draggable
              onDragStart={() => setDrag(idx)}
              onDragOver={(e) => { e.preventDefault(); setOver(idx); }}
              onDragLeave={() => setOver(null)}
              onDrop={() => { if (drag !== null && drag !== idx) moveLayer(drag, idx); setDrag(null); setOver(null); }}
              onClick={(e) => select([el.id], e.shiftKey)}
            >
              <span className="ltype"><Icon /></span>
              <span className="lname" title={el.type === 'text' ? el.text : el.name}>{el.type === 'text' ? `${el.name}: ${el.text}` : el.name}</span>
              <button className="icon-btn sm" title={el.locked ? 'Desbloquear' : 'Bloquear'} onClick={(e) => { e.stopPropagation(); updateElement(el.id, { locked: !el.locked }); }}>{el.locked ? <Lock /> : <Unlock style={{ opacity: 0.35 }} />}</button>
              <button className="icon-btn sm" title={el.hidden ? 'Mostrar' : 'Ocultar'} onClick={(e) => { e.stopPropagation(); updateElement(el.id, { hidden: !el.hidden }); }}>{el.hidden ? <EyeOff /> : <Eye style={{ opacity: 0.5 }} />}</button>
            </div>
          );
        })}
        {!page.elements.length && <p className="muted small">Página vazia. Use “Inserir” para adicionar elementos.</p>}
      </div>
      <p className="muted small">Arraste para reordenar. A camada do topo da lista fica à frente.</p>
    </>
  );
}

function LayoutsTab() {
  const project = useEditor((s) => s.project)!;
  const pageIndex = useEditor((s) => s.pageIndex);
  const replacePage = useEditor((s) => s.replacePage);
  const brand = useApp((s) => s.activeBrand());
  const assets = useApp((s) => s.assets);
  const toast = useApp((s) => s.toast);
  const [dir, setDir] = useState<Direction>(project.direction ?? 'A');
  const [variant, setVariant] = useState(0);
  const list = LAYOUTS.filter((l) => l.directions.includes(dir) || l.id === 'cta');
  return (
    <>
      <div className="panel-title">Trocar composição</div>
      <p className="muted small" style={{ margin: 0 }}>Recompõe a página atual com outro layout, reaproveitando os textos (por papel) e a primeira imagem. Pode ser desfeito com Ctrl+Z.</p>
      <select className="select sm" value={dir} onChange={(e) => setDir(e.target.value as Direction)}>
        {DIRECTIONS.map((d) => <option key={d.id} value={d.id}>{d.id} · {d.label}</option>)}
      </select>
      <Segmented full value={variant} onChange={setVariant} options={[{ value: 0, label: 'Paleta clara' }, { value: 1, label: 'Paleta alternativa' }]} />
      <div className="stack" style={{ gap: 6 }}>
        {list.map((l) => (
          <button key={l.id} className="opt" onClick={() => {
            const page = generateFromLayout(project, pageIndex, l.id, dir, variant, brand, assets);
            replacePage(pageIndex, page);
            toast(`Composição “${l.label}” aplicada`);
          }}>
            <b>{l.label}</b>
            <span>{l.needsImage ? 'Com fotografia' : 'Sem fotografia'} · {l.tags.filter((t) => !['cover', 'content'].includes(t)).join(', ')}</span>
          </button>
        ))}
      </div>
    </>
  );
}
