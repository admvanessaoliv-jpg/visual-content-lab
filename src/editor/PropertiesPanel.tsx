import {
  AlignCenter, AlignCenterHorizontal, AlignCenterVertical, AlignEndHorizontal, AlignEndVertical, AlignLeft, AlignRight,
  AlignStartHorizontal, AlignStartVertical, ArrowDownToLine, ArrowUpToLine, Bold, Copy, Italic, Lock, Trash2, Underline, Unlock,
  CaseUpper, ImagePlus, Maximize2,
} from 'lucide-react';
import type { DesignElement, ImageElement, LineElement, PageBackground, Shadow, ShapeElement, TextElement } from '../types';
import { useShallow } from 'zustand/react/shallow';
import { useEditor } from '../store/editorStore';
import { useApp } from '../store/appStore';
import { ColorField, Field, NumField, Segmented, Slider, Toggle } from '../components/ui';
import { FontSelect, WeightSelect } from '../components/FontSelect';
import { nearestWeight, getFontDef } from '../lib/fonts';
import { softShadow } from '../lib/defaults';
import { useEditorUI } from './uiStore';
import { loadAssetImage } from '../lib/assets';

function useSwatches() {
  const brand = useApp((s) => s.activeBrand());
  return [...new Set([...Object.values(brand.colors), ...brand.palette, '#FFFFFF', '#000000'])];
}

export function PropertiesPanel() {
  const sel = useEditor(useShallow((s) => s.selected()));
  if (sel.length === 0) return <PagePanel />;
  if (sel.length > 1) return <MultiPanel count={sel.length} />;
  return <ElementPanel el={sel[0]} />;
}

function ArrangeGroup() {
  const align = useEditor((s) => s.alignSelected);
  return (
    <div className="prop-group">
      <div className="panel-title">Alinhar à página</div>
      <div className="row" style={{ gap: 2, justifyContent: 'space-between' }}>
        <button className="icon-btn" title="Esquerda" onClick={() => align('left')}><AlignStartVertical /></button>
        <button className="icon-btn" title="Centro horizontal" onClick={() => align('hcenter')}><AlignCenterVertical /></button>
        <button className="icon-btn" title="Direita" onClick={() => align('right')}><AlignEndVertical /></button>
        <button className="icon-btn" title="Topo" onClick={() => align('top')}><AlignStartHorizontal /></button>
        <button className="icon-btn" title="Centro vertical" onClick={() => align('vcenter')}><AlignCenterHorizontal /></button>
        <button className="icon-btn" title="Base" onClick={() => align('bottom')}><AlignEndHorizontal /></button>
      </div>
    </div>
  );
}

function MultiPanel({ count }: { count: number }) {
  const { duplicateSelected, deleteSelected, updateSelected } = useEditor.getState();
  return (
    <div className="panel">
      <div className="panel-title">{count} elementos selecionados</div>
      <ArrangeGroup />
      <div className="prop-group">
        <Field label="Opacidade"><Slider value={1} min={0} max={1} step={0.01} onChange={(v) => updateSelected({ opacity: v })} /></Field>
        <div className="row">
          <button className="btn sm" onClick={duplicateSelected}><Copy /> Duplicar</button>
          <button className="btn sm danger" onClick={deleteSelected}><Trash2 /> Excluir</button>
        </div>
      </div>
    </div>
  );
}

function ElementPanel({ el }: { el: DesignElement }) {
  const { updateElement, duplicateSelected, deleteSelected, reorder } = useEditor.getState();
  const up = (patch: Partial<DesignElement>, key?: string) => updateElement(el.id, patch, key);
  const typeLabel = { text: 'Texto', image: 'Imagem', shape: 'Forma', line: 'Linha' }[el.type];

  return (
    <div className="panel" data-testid="props-panel">
      <div className="panel-title">
        <span>{typeLabel}</span>
        <div className="row" style={{ gap: 0 }}>
          <button className="icon-btn sm" title={el.locked ? 'Desbloquear' : 'Bloquear'} onClick={() => up({ locked: !el.locked })}>{el.locked ? <Lock /> : <Unlock />}</button>
          <button className="icon-btn sm" title="Trazer para frente" onClick={() => reorder(el.id, 'top')}><ArrowUpToLine /></button>
          <button className="icon-btn sm" title="Enviar para trás" onClick={() => reorder(el.id, 'bottom')}><ArrowDownToLine /></button>
          <button className="icon-btn sm" title="Duplicar (Ctrl+D)" onClick={duplicateSelected}><Copy /></button>
          <button className="icon-btn sm" title="Excluir (Del)" onClick={deleteSelected}><Trash2 /></button>
        </div>
      </div>
      <input className="input sm" value={el.name} onChange={(e) => up({ name: e.target.value }, `name:${el.id}`)} aria-label="Nome da camada" />

      {el.type === 'text' && <TextProps el={el} />}
      {el.type === 'image' && <ImageProps el={el} />}
      {el.type === 'shape' && <ShapeProps el={el} />}
      {el.type === 'line' && <LineProps el={el} />}

      <div className="prop-group">
        <div className="panel-title">Posição e tamanho</div>
        <div className="prop-row">
          <NumField label="X" value={el.x} onChange={(v) => up({ x: v })} />
          <NumField label="Y" value={el.y} onChange={(v) => up({ y: v })} />
        </div>
        <div className="prop-row">
          <NumField label="L" title="Largura" value={el.width} min={4} onChange={(v) => up({ width: v })} />
          {el.type !== 'line' && <NumField label="A" title="Altura" value={el.height} min={4} onChange={(v) => up(el.type === 'text' ? { height: v, autoHeight: false } as Partial<TextElement> : { height: v })} />}
          {el.type === 'line' && <NumField label="°" title="Rotação" value={el.rotation} onChange={(v) => up({ rotation: v })} />}
        </div>
        {el.type !== 'line' && <div className="prop-row"><NumField label="°" title="Rotação" value={el.rotation} onChange={(v) => up({ rotation: v })} /><div /></div>}
        <Field label="Opacidade"><Slider value={el.opacity} min={0} max={1} step={0.01} onChange={(v) => up({ opacity: v })} /></Field>
      </div>

      <ArrangeGroup />
      <ShadowProps el={el} />
    </div>
  );
}

function TextProps({ el }: { el: TextElement }) {
  const up = (patch: Partial<TextElement>, key?: string) => useEditor.getState().updateElement(el.id, patch as Partial<DesignElement>, key);
  const swatches = useSwatches();
  const brand = useApp((s) => s.activeBrand());
  const canItalic = getFontDef(el.fontFamily)?.italic !== false;
  return (
    <>
      <div className="prop-group">
        <div className="panel-title">Conteúdo</div>
        <textarea className="textarea" rows={3} value={el.text} onChange={(e) => up({ text: e.target.value }, `text:${el.id}`)} data-testid="text-content" />
      </div>
      <div className="prop-group">
        <div className="panel-title">Tipografia</div>
        <FontSelect value={el.fontFamily} onChange={(f) => up({ fontFamily: f, fontWeight: nearestWeight(f, el.fontWeight), italic: getFontDef(f)?.italic === false ? false : el.italic })} />
        <div className="row" style={{ gap: 4 }}>
          {[brand.headingFont, brand.bodyFont, brand.accentFont].filter((f, i, a) => a.findIndex((x) => x.family === f.family) === i).map((f) => (
            <button key={f.family} className="chip" style={{ cursor: 'pointer', fontFamily: `"${f.family}"` }} onClick={() => up({ fontFamily: f.family, fontWeight: nearestWeight(f.family, el.fontWeight) })}>{f.family}</button>
          ))}
        </div>
        <div className="prop-row">
          <WeightSelect size="sm" family={el.fontFamily} value={el.fontWeight} onChange={(w) => up({ fontWeight: w })} />
          <NumField label="pt" title="Tamanho" value={el.fontSize} min={4} max={800} onChange={(v) => up({ fontSize: v })} />
        </div>
        <div className="row" style={{ gap: 2, justifyContent: 'space-between' }}>
          <Segmented value={el.align} onChange={(v) => up({ align: v })} options={[
            { value: 'left', label: <AlignLeft />, title: 'Esquerda' }, { value: 'center', label: <AlignCenter />, title: 'Centro' }, { value: 'right', label: <AlignRight />, title: 'Direita' },
          ]} />
          <div className="row" style={{ gap: 0 }}>
            <button className={`icon-btn sm ${el.fontWeight >= 700 ? 'active' : ''}`} title="Negrito" onClick={() => up({ fontWeight: nearestWeight(el.fontFamily, el.fontWeight >= 700 ? 400 : 700) })}><Bold /></button>
            <button className={`icon-btn sm ${el.italic ? 'active' : ''}`} title={canItalic ? 'Itálico' : 'Itálico sintético'} onClick={() => up({ italic: !el.italic })}><Italic /></button>
            <button className={`icon-btn sm ${el.underline ? 'active' : ''}`} title="Sublinhado" onClick={() => up({ underline: !el.underline })}><Underline /></button>
            <button className={`icon-btn sm ${el.uppercase ? 'active' : ''}`} title="Caixa alta" onClick={() => up({ uppercase: !el.uppercase })}><CaseUpper /></button>
          </div>
        </div>
        <Field label="Entrelinha"><Slider value={el.lineHeight} min={0.7} max={2.5} step={0.01} onChange={(v) => up({ lineHeight: v })} /></Field>
        <Field label="Espaçamento entre letras"><Slider value={el.letterSpacing} min={-10} max={40} step={0.1} onChange={(v) => up({ letterSpacing: v })} suffix="px" /></Field>
        <Toggle checked={el.autoHeight} onChange={(v) => up({ autoHeight: v })} label="Altura automática" />
        {!el.autoHeight && (
          <Segmented value={el.verticalAlign} onChange={(v) => up({ verticalAlign: v })} full options={[{ value: 'top', label: 'Topo' }, { value: 'middle', label: 'Meio' }, { value: 'bottom', label: 'Base' }]} />
        )}
      </div>
      <div className="prop-group">
        <div className="panel-title">Texto rico</div>
        <Toggle checked={!!el.rich} onChange={(v) => up({ rich: v, highlightColor: el.highlightColor ?? brand.colors.accent, highlightFamily: el.highlightFamily ?? el.fontFamily, highlightItalic: el.highlightItalic ?? true })} label="Interpretar marcações" />
        {el.rich && (
          <>
            <p className="muted small" style={{ margin: 0 }}><code>==destaque==</code> · <code>**negrito**</code> · <code>*itálico*</code> · linha em branco = novo parágrafo</p>
            <Field label="Cor do destaque"><ColorField size="sm" value={el.highlightColor ?? el.fill} swatches={swatches} onChange={(c) => up({ highlightColor: c, highlightColorRole: undefined })} /></Field>
            <Field label="Fonte do destaque"><FontSelect size="sm" value={el.highlightFamily ?? el.fontFamily} onChange={(f) => up({ highlightFamily: f, highlightWeight: nearestWeight(f, el.highlightWeight ?? el.fontWeight) })} /></Field>
            <div className="prop-row">
              <Toggle checked={el.highlightItalic ?? true} onChange={(v) => up({ highlightItalic: v })} label="Destaque itálico" />
              <WeightSelect size="sm" family={el.fontFamily} value={el.boldWeight ?? 700} onChange={(w) => up({ boldWeight: w })} />
            </div>
            <Field label="Espaço entre parágrafos"><Slider value={el.paragraphSpacing ?? 0} min={0} max={2} step={0.05} onChange={(v) => up({ paragraphSpacing: v })} suffix="em" /></Field>
          </>
        )}
        <Toggle checked={!!el.dropCap} onChange={(v) => up({ dropCap: v ? { family: brand.scriptFont?.family ?? 'Pinyon Script', scale: 1.7 } : null })} label="Letra capitular decorativa" />
        {el.dropCap && (
          <>
            <FontSelect size="sm" value={el.dropCap.family} onChange={(f) => up({ dropCap: { ...el.dropCap!, family: f } })} />
            <Field label="Escala da capitular"><Slider value={el.dropCap.scale} min={1} max={3} step={0.05} onChange={(v) => up({ dropCap: { ...el.dropCap!, scale: v } })} suffix="×" /></Field>
          </>
        )}
      </div>
      <div className="prop-group">
        <div className="panel-title">Cor</div>
        <ColorField size="sm" value={el.fill} swatches={swatches} onChange={(c) => up({ fill: c, colorRole: undefined })} />
        <Field label="Contorno">
          <div className="prop-row">
            <ColorField size="sm" value={el.strokeColor ?? '#000000'} onChange={(c) => up({ strokeColor: c })} />
            <NumField label="px" value={el.strokeWidth ?? 0} min={0} max={40} onChange={(v) => up({ strokeWidth: v })} />
          </div>
        </Field>
      </div>
    </>
  );
}

function ImageProps({ el }: { el: ImageElement }) {
  const up = (patch: Partial<ImageElement>, key?: string) => useEditor.getState().updateElement(el.id, patch as Partial<DesignElement>, key);
  const swatches = useSwatches();
  const ui = useEditorUI();
  const f = el.filters;
  const resetRatio = async () => {
    if (!el.assetId) return;
    const img = await loadAssetImage(el.assetId);
    up({ height: Math.round(el.width * (img.naturalHeight / img.naturalWidth)) });
  };
  return (
    <>
      <div className="prop-group">
        <div className="panel-title">Imagem</div>
        <div className="row">
          <button className="btn sm" onClick={() => { ui.setImageTarget(el.id); ui.setLeftTab('media'); ui.setMobilePanel('left'); }}><ImagePlus /> {el.assetId ? 'Substituir' : 'Escolher'}</button>
          <button className="btn sm" onClick={resetRatio} title="Ajustar caixa à proporção original" disabled={!el.assetId}><Maximize2 /> Proporção</button>
        </div>
        <Segmented full value={el.fit} onChange={(v) => up({ fit: v })} options={[{ value: 'cover', label: 'Preencher (recorte)' }, { value: 'fill', label: 'Esticar' }]} />
        {el.fit === 'cover' && (
          <>
            <Field label="Zoom"><Slider value={el.zoom} min={1} max={4} step={0.01} onChange={(v) => up({ zoom: v })} /></Field>
            <Field label="Enquadramento horizontal"><Slider value={el.focusX} min={0} max={1} step={0.01} onChange={(v) => up({ focusX: v })} /></Field>
            <Field label="Enquadramento vertical"><Slider value={el.focusY} min={0} max={1} step={0.01} onChange={(v) => up({ focusY: v })} /></Field>
          </>
        )}
        <Field label="Arredondamento"><Slider value={el.cornerRadius} min={0} max={Math.round(Math.min(el.width, el.height) / 2)} onChange={(v) => up({ cornerRadius: v })} /></Field>
        <Field label="Borda">
          <div className="prop-row">
            <ColorField size="sm" value={el.strokeColor} swatches={swatches.slice(0, 6)} onChange={(c) => up({ strokeColor: c })} />
            <NumField label="px" value={el.strokeWidth} min={0} max={80} onChange={(v) => up({ strokeWidth: v })} />
          </div>
        </Field>
      </div>
      <div className="prop-group">
        <div className="panel-title">Ajustes</div>
        <Toggle checked={f.grayscale} onChange={(v) => up({ filters: { ...f, grayscale: v } })} label="Preto e branco" />
        <Field label="Brilho"><Slider value={f.brightness} min={-0.5} max={0.5} step={0.01} onChange={(v) => up({ filters: { ...f, brightness: v } }, `flt-b:${el.id}`)} /></Field>
        <Field label="Contraste"><Slider value={f.contrast} min={-60} max={60} step={1} onChange={(v) => up({ filters: { ...f, contrast: v } }, `flt-c:${el.id}`)} /></Field>
        <Field label="Desfoque"><Slider value={f.blur} min={0} max={30} step={1} onChange={(v) => up({ filters: { ...f, blur: v } }, `flt-bl:${el.id}`)} /></Field>
      </div>
    </>
  );
}

function ShapeProps({ el }: { el: ShapeElement }) {
  const up = (patch: Partial<ShapeElement>, key?: string) => useEditor.getState().updateElement(el.id, patch as Partial<DesignElement>, key);
  const swatches = useSwatches();
  const g = el.gradient ?? { from: el.fill, to: '#000000', fromOpacity: 1, toOpacity: 1, angle: 180 };
  return (
    <>
      <div className="prop-group">
        <div className="panel-title">Preenchimento</div>
        <Segmented full value={el.gradientEnabled ? 'grad' : el.fillEnabled ? 'solid' : 'none'} onChange={(v) => up({ fillEnabled: v === 'solid', gradientEnabled: v === 'grad', gradient: g })}
          options={[{ value: 'solid', label: 'Sólido' }, { value: 'grad', label: 'Gradiente' }, { value: 'none', label: 'Nenhum' }]} />
        {el.fillEnabled && !el.gradientEnabled && <ColorField size="sm" value={el.fill} swatches={swatches} onChange={(c) => up({ fill: c, colorRole: undefined })} />}
        {el.gradientEnabled && (
          <>
            <div className="prop-row">
              <ColorField size="sm" value={g.from} onChange={(c) => up({ gradient: { ...g, from: c } })} />
              <ColorField size="sm" value={g.to} onChange={(c) => up({ gradient: { ...g, to: c } })} />
            </div>
            <Field label="Opacidade inicial"><Slider value={g.fromOpacity} min={0} max={1} step={0.01} onChange={(v) => up({ gradient: { ...g, fromOpacity: v } })} /></Field>
            <Field label="Opacidade final"><Slider value={g.toOpacity} min={0} max={1} step={0.01} onChange={(v) => up({ gradient: { ...g, toOpacity: v } })} /></Field>
            <Field label="Ângulo"><Slider value={g.angle} min={0} max={360} onChange={(v) => up({ gradient: { ...g, angle: v } })} suffix="°" /></Field>
          </>
        )}
      </div>
      <div className="prop-group">
        <div className="panel-title">Contorno e cantos</div>
        <div className="prop-row">
          <ColorField size="sm" value={el.strokeColor} onChange={(c) => up({ strokeColor: c })} />
          <NumField label="px" value={el.strokeWidth} min={0} max={80} onChange={(v) => up({ strokeWidth: v })} />
        </div>
        {el.shape === 'rect' && <Field label="Arredondamento"><Slider value={Math.min(el.cornerRadius, Math.round(Math.min(el.width, el.height) / 2))} min={0} max={Math.round(Math.min(el.width, el.height) / 2)} onChange={(v) => up({ cornerRadius: v })} /></Field>}
        {(el.shape === 'polygon' || el.shape === 'star') && <Field label={el.shape === 'star' ? 'Pontas' : 'Lados'}><Slider value={el.sides ?? 5} min={3} max={12} onChange={(v) => up({ sides: v })} /></Field>}
      </div>
    </>
  );
}

function LineProps({ el }: { el: LineElement }) {
  const up = (patch: Partial<LineElement>) => useEditor.getState().updateElement(el.id, patch as Partial<DesignElement>);
  const swatches = useSwatches();
  return (
    <div className="prop-group">
      <div className="panel-title">Linha</div>
      <ColorField size="sm" value={el.stroke} swatches={swatches} onChange={(c) => up({ stroke: c, colorRole: undefined })} />
      <Field label="Espessura"><Slider value={el.strokeWidth} min={1} max={60} onChange={(v) => up({ strokeWidth: v })} /></Field>
      <Segmented full value={el.dash.length ? 'dash' : 'solid'} onChange={(v) => up({ dash: v === 'dash' ? [el.strokeWidth * 3, el.strokeWidth * 2] : [] })} options={[{ value: 'solid', label: 'Contínua' }, { value: 'dash', label: 'Tracejada' }]} />
      <div className="row">
        <Toggle checked={el.arrowEnd} onChange={(v) => up({ arrowEnd: v })} label="Seta" />
        {el.arrowEnd && <Toggle checked={el.arrowStyle === 'open'} onChange={(v) => up({ arrowStyle: v ? 'open' : 'filled' })} label="Vazada" />}
        <Toggle checked={el.lineCap === 'round'} onChange={(v) => up({ lineCap: v ? 'round' : 'butt' })} label="Pontas arredondadas" />
      </div>
    </div>
  );
}

function ShadowProps({ el }: { el: DesignElement }) {
  const up = (patch: Partial<Shadow>) => useEditor.getState().updateElement(el.id, { shadow: { ...(el.shadow ?? { ...softShadow(), enabled: false }), ...patch } });
  const s = el.shadow ?? { ...softShadow(), enabled: false };
  return (
    <div className="prop-group">
      <div className="panel-title">Sombra</div>
      <Toggle checked={s.enabled} onChange={(v) => up({ enabled: v })} label="Sombra projetada" />
      {s.enabled && (
        <>
          <ColorField size="sm" value={s.color} onChange={(c) => up({ color: c })} />
          <Field label="Desfoque"><Slider value={s.blur} min={0} max={150} onChange={(v) => up({ blur: v })} /></Field>
          <div className="prop-row">
            <NumField label="X" value={s.offsetX} onChange={(v) => up({ offsetX: v })} />
            <NumField label="Y" value={s.offsetY} onChange={(v) => up({ offsetY: v })} />
          </div>
          <Field label="Intensidade"><Slider value={s.opacity} min={0} max={1} step={0.01} onChange={(v) => up({ opacity: v })} /></Field>
        </>
      )}
    </div>
  );
}

function PagePanel() {
  const page = useEditor((s) => s.page())!;
  const update = useEditor((s) => s.updateBackground);
  const swatches = useSwatches();
  const ui = useEditorUI();
  const bg = page.background;
  const up = (p: Partial<PageBackground>, key?: string) => update(p, key);
  return (
    <div className="panel" data-testid="page-panel">
      <div className="panel-title">Fundo da página</div>
      <div className="prop-group">
        <Field label="Cor de fundo"><ColorField size="sm" value={bg.color} swatches={swatches} onChange={(c) => up({ color: c, colorRole: undefined })} /></Field>
        <Toggle checked={bg.gradientEnabled} onChange={(v) => up({ gradientEnabled: v, gradient: { ...bg.gradient, from: bg.color } })} label="Gradiente" />
        {bg.gradientEnabled && (
          <>
            <div className="prop-row">
              <ColorField size="sm" value={bg.gradient.from} onChange={(c) => up({ gradient: { ...bg.gradient, from: c } })} />
              <ColorField size="sm" value={bg.gradient.to} onChange={(c) => up({ gradient: { ...bg.gradient, to: c } })} />
            </div>
            <Field label="Ângulo"><Slider value={bg.gradient.angle} min={0} max={360} onChange={(v) => up({ gradient: { ...bg.gradient, angle: v } })} suffix="°" /></Field>
          </>
        )}
      </div>
      <div className="prop-group">
        <div className="panel-title">Imagem de fundo</div>
        <div className="row">
          <button className="btn sm" onClick={() => { ui.setImageTarget('__background__'); ui.setLeftTab('media'); ui.setMobilePanel('left'); }}><ImagePlus /> {bg.assetId ? 'Trocar' : 'Escolher'}</button>
          {bg.assetId && <button className="btn sm danger" onClick={() => up({ assetId: null })}>Remover</button>}
        </div>
        {bg.assetId && (
          <>
            <Field label="Opacidade da imagem"><Slider value={bg.imageOpacity} min={0} max={1} step={0.01} onChange={(v) => up({ imageOpacity: v })} /></Field>
            <Toggle checked={bg.imageFilters.grayscale} onChange={(v) => up({ imageFilters: { ...bg.imageFilters, grayscale: v } })} label="Preto e branco" />
            <Field label="Desfoque"><Slider value={bg.imageFilters.blur} min={0} max={30} onChange={(v) => up({ imageFilters: { ...bg.imageFilters, blur: v } })} /></Field>
          </>
        )}
      </div>
      <div className="prop-group">
        <div className="panel-title">Textura</div>
        <Field label="Granulado (filme)"><Slider value={bg.grain ?? 0} min={0} max={1} step={0.01} onChange={(v) => up({ grain: v })} /></Field>
      </div>
      <div className="prop-group">
        <div className="panel-title">Película (overlay)</div>
        <ColorField size="sm" value={bg.overlayColor} swatches={swatches.slice(0, 8)} onChange={(c) => up({ overlayColor: c })} />
        <Field label="Intensidade"><Slider value={bg.overlayOpacity} min={0} max={1} step={0.01} onChange={(v) => up({ overlayOpacity: v })} /></Field>
      </div>
      <p className="muted small">Dica: clique em um elemento para editar. Shift + clique ou arraste no vazio para seleção múltipla. Duplo clique em texto edita direto no canvas.</p>
    </div>
  );
}
