import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle2, Download, Minus, PanelLeft, Plus, Redo2, Save, Scan, SlidersHorizontal, Star, Undo2,
} from 'lucide-react';
import { useEditor } from '../store/editorStore';
import { useApp } from '../store/appStore';
import { projectsDB } from '../lib/db';
import { FORMATS } from '../lib/formats';
import { timeAgo } from '../lib/ids';
import { exportAllSeparately, exportPage, exportZip } from '../lib/exporter';
import { TYPE_LABEL } from '../lib/projects';
import { Loader, Segmented, useClickOutside } from '../components/ui';
import { CanvasStage } from './CanvasStage';
import { LeftPanel } from './LeftPanel';
import { PropertiesPanel } from './PropertiesPanel';
import { SlideStrip } from './SlideStrip';
import { saveNow, useAutosave } from './useAutosave';
import { useEditorUI } from './uiStore';
import { useShortcuts } from './useShortcuts';

export function EditorPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const project = useEditor((s) => s.project);
  const load = useEditor((s) => s.load);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let alive = true;
    useEditorUI.getState().reset();
    projectsDB.get(id!).then((p) => {
      if (!alive) return;
      if (!p) setMissing(true); else load(p);
    });
    return () => {
      alive = false;
      const st = useEditor.getState().saveState;
      if (st === 'dirty') saveNow().finally(() => useEditor.getState().close());
      else useEditor.getState().close();
    };
  }, [id, load]);

  if (missing) {
    return (
      <div className="empty" style={{ paddingTop: 120 }}>
        <h3>Design não encontrado</h3>
        <p>Ele pode ter sido excluído.</p>
        <button className="btn" onClick={() => nav('/library')}>Ir para a Design Library</button>
      </div>
    );
  }
  if (!project || project.id !== id) return <div className="boot"><Loader /></div>;
  return <EditorShell />;
}

function EditorShell() {
  useAutosave();
  useShortcuts();
  const mobilePanel = useEditorUI((s) => s.mobilePanel);
  const setMobilePanel = useEditorUI((s) => s.setMobilePanel);
  const project = useEditor((s) => s.project)!;
  return (
    <div className="editor" data-testid="editor">
      <TopBar />
      <div className="ed-body">
        <aside className={`ed-left ${mobilePanel === 'left' ? 'mobile-open' : ''}`}><LeftPanel /></aside>
        <CanvasStage />
        <aside className={`ed-right ${mobilePanel === 'right' ? 'mobile-open' : ''}`}><PropertiesPanel /></aside>
      </div>
      {(project.kind === 'carousel' || project.pages.length > 1) && <SlideStrip />}
      {project.kind === 'design' && project.pages.length === 1 && <div className="hide-mobile" />}
      {mobilePanel && <div className="mobile-only" style={{ position: 'fixed', inset: 0, zIndex: 35, background: 'rgba(0,0,0,.15)' }} onClick={() => setMobilePanel(null)} />}
    </div>
  );
}

function TopBar() {
  const nav = useNavigate();
  const project = useEditor((s) => s.project)!;
  const saveState = useEditor((s) => s.saveState);
  const lastSavedAt = useEditor((s) => s.lastSavedAt);
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);
  const { undo, redo, setProjectMeta } = useEditor.getState();
  const zoom = useEditorUI((s) => s.zoom);
  const setZoom = useEditorUI((s) => s.setZoom);
  const ui = useEditorUI();
  const autosave = useApp((s) => s.settings.autosave);
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 15000); return () => clearInterval(t); }, []);
  const f = FORMATS[project.format];

  const stateLabel = saveState === 'saving' ? 'Salvando…' : saveState === 'dirty' ? (autosave ? 'Alterações pendentes' : 'Não salvo') : saveState === 'error' ? 'Erro ao salvar' : `Salvo ${lastSavedAt ? timeAgo(lastSavedAt) : ''}`;

  return (
    <div className="ed-top">
      <button className="icon-btn" onClick={() => nav(-1)} title="Voltar"><ArrowLeft /></button>
      <input className="ed-title" value={project.name} onChange={(e) => setProjectMeta({ name: e.target.value })} aria-label="Nome do design" data-testid="project-name" />
      <span className="chip hide-mobile">{TYPE_LABEL[project.designType]} · {f.width}×{f.height}</span>
      <span className={`save-state ${saveState}`} data-testid="save-state"><span className="badge-dot" />{stateLabel}</span>
      {!autosave && <button className="btn sm" onClick={saveNow}><Save /> Salvar</button>}
      <div className="spacer" />
      <button className="icon-btn mobile-only" onClick={() => ui.setMobilePanel(ui.mobilePanel === 'left' ? null : 'left')} title="Inserir"><PanelLeft /></button>
      <button className="icon-btn mobile-only" onClick={() => ui.setMobilePanel(ui.mobilePanel === 'right' ? null : 'right')} title="Propriedades"><SlidersHorizontal /></button>
      <button className="icon-btn" onClick={undo} disabled={!canUndo} title="Desfazer (Ctrl+Z)" data-testid="undo"><Undo2 /></button>
      <button className="icon-btn" onClick={redo} disabled={!canRedo} title="Refazer (Ctrl+Shift+Z)"><Redo2 /></button>
      <div className="row hide-mobile" style={{ gap: 0, border: '1px solid var(--line)', borderRadius: 9 }}>
        <button className="icon-btn" onClick={() => setZoom(zoom / 1.2)} title="Diminuir zoom"><Minus /></button>
        <button className="btn ghost sm" onClick={() => setZoom(1)} title="Ajustar à tela" style={{ minWidth: 58 }}>{zoom === 1 ? <><Scan size={14} /> Ajustar</> : `${Math.round(zoom * 100)}%`}</button>
        <button className="icon-btn" onClick={() => setZoom(zoom * 1.2)} title="Aumentar zoom"><Plus /></button>
      </div>
      <button className={`icon-btn ${project.favorite ? 'active' : ''}`} title="Favoritar" onClick={() => setProjectMeta({ favorite: !project.favorite })}><Star /></button>
      <button className={`btn sm ${project.status === 'final' ? '' : ''}`} onClick={() => setProjectMeta({ status: project.status === 'final' ? 'draft' : 'final' })} title="Status do design" data-testid="status-toggle">
        <CheckCircle2 style={{ color: project.status === 'final' ? 'var(--ok)' : undefined }} /> <span className="hide-mobile">{project.status === 'final' ? 'Finalizado' : 'Finalizar'}</span>
      </button>
      <ExportMenu />
    </div>
  );
}

function ExportMenu() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false), open);
  const settings = useApp((s) => s.settings);
  const updateSettings = useApp((s) => s.updateSettings);
  const toast = useApp((s) => s.toast);
  const project = useEditor((s) => s.project)!;
  const pageIndex = useEditor((s) => s.pageIndex);
  const f = FORMATS[project.format];
  const o = { scale: settings.exportScale, format: settings.exportFormat, quality: settings.jpegQuality };
  const multi = project.pages.length > 1;

  const run = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(label);
    setOpen(false);
    try {
      useEditor.getState().setEditingText(null);
      await fn();
      toast('Exportação concluída');
    } catch (e) {
      toast('Falha na exportação: ' + (e as Error).message, 'error');
    } finally { setBusy(null); }
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="btn primary sm" onClick={() => setOpen((v) => !v)} data-testid="export-btn">
        {busy ? <Loader /> : <Download />} <span className="hide-mobile">{busy ?? 'Exportar'}</span>
      </button>
      {open && (
        <div className="menu" style={{ right: 0, top: 40, width: 290, padding: 12 }}>
          <div className="stack" style={{ gap: 10 }}>
            <div className="field"><span className="field-label">Formato</span>
              <Segmented full value={settings.exportFormat} onChange={(v) => updateSettings({ exportFormat: v })} options={[{ value: 'png', label: 'PNG' }, { value: 'jpeg', label: 'JPG' }]} />
            </div>
            <div className="field"><span className="field-label">Resolução</span>
              <Segmented full value={settings.exportScale} onChange={(v) => updateSettings({ exportScale: v })} options={[1, 2, 3].map((s) => ({ value: s as 1 | 2 | 3, label: `${s}x` }))} />
              <span className="hint">{f.width * settings.exportScale} × {f.height * settings.exportScale} px</span>
            </div>
            <hr className="divider" style={{ margin: '2px 0' }} />
            <button onClick={() => run('Exportando…', () => exportPage(project, pageIndex, o))} data-testid="export-current"><Download /> {multi ? `Slide atual (${pageIndex + 1})` : 'Baixar imagem'}</button>
            {multi && (
              <>
                <button onClick={() => run('Exportando…', () => exportAllSeparately(project, o, (i) => setBusy(`Slide ${i + 1}/${project.pages.length}`)))} data-testid="export-all"><Download /> Todos os slides (arquivos separados)</button>
                <button onClick={() => run('Compactando…', () => exportZip(project, o, (i) => setBusy(`Slide ${i + 1}/${project.pages.length}`)))} data-testid="export-zip"><Download /> Todos os slides (.zip)</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
