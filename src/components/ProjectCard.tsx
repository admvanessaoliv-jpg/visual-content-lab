import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2, Copy, Download, FolderInput, GalleryHorizontalEnd, LayoutTemplate, MoreHorizontal, PencilLine, Star, Trash2, Undo2,
} from 'lucide-react';
import type { ProjectMeta } from '../types';
import { useApp } from '../store/appStore';
import { FORMATS } from '../lib/formats';
import { timeAgo } from '../lib/ids';
import { TYPE_LABEL } from '../lib/projects';
import { projectsDB } from '../lib/db';
import { exportPage, exportZip } from '../lib/exporter';
import { Modal, useClickOutside, confirmDialog } from './ui';

export function ProjectCard({ p }: { p: ProjectMeta }) {
  const nav = useNavigate();
  const [menu, setMenu] = useState(false);
  const [moving, setMoving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setMenu(false), menu);
  const { patchProject, duplicateProject, deleteProject, toast, folders, settings } = useApp();
  const f = FORMATS[p.format];
  const folder = folders.find((x) => x.id === p.folderId);

  const run = async (fn: () => Promise<unknown>, msg?: string) => {
    setMenu(false);
    try { await fn(); if (msg) toast(msg); } catch (e) { toast((e as Error).message, 'error'); }
  };

  const exportIt = () => run(async () => {
    const full = await projectsDB.get(p.id);
    if (!full) return;
    const o = { scale: settings.exportScale, format: settings.exportFormat, quality: settings.jpegQuality };
    if (full.pages.length > 1) await exportZip(full, o); else await exportPage(full, 0, o);
  }, 'Exportação concluída');

  return (
    <div className="p-card" ref={ref}>
      <div className="p-thumb" style={{ aspectRatio: `${f.width} / ${f.height}` }} onClick={() => nav(`/editor/${p.id}`)} title="Abrir no editor">
        {p.thumbnail ? <img src={p.thumbnail} alt={p.name} /> : <span className="muted small">Sem prévia</span>}
        {p.kind === 'carousel' && <span className="chip dark stack-hint"><GalleryHorizontalEnd size={12} /> {p.pageCount}</span>}
        {p.favorite && <span className="icon-btn sm fav"><Star fill="#111" /></span>}
      </div>
      <div className="p-meta">
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="name" title={p.name}>{p.name}</div>
          <div className="sub">
            {TYPE_LABEL[p.designType]} · {f.ratio} · {timeAgo(p.updatedAt)}
          </div>
          <div className="row" style={{ gap: 5, marginTop: 6, flexWrap: 'wrap' }}>
            {p.status === 'final' ? <span className="chip ok"><span className="badge-dot" /> Finalizado</span> : <span className="chip"><span className="badge-dot" style={{ color: '#C99A2E' }} /> Em andamento</span>}
            {p.isTemplate && <span className="chip">Modelo</span>}
            {folder && <span className="chip" style={{ borderColor: folder.color, color: folder.color }}>{folder.name}</span>}
          </div>
        </div>
        <button className="icon-btn sm" onClick={() => setMenu((m) => !m)} aria-label="Ações"><MoreHorizontal /></button>
      </div>
      {menu && (
        <div className="menu" style={{ right: 0, top: '62%' }}>
          <button onClick={() => nav(`/editor/${p.id}`)}><PencilLine /> Abrir e editar</button>
          <button onClick={() => run(async () => {
            const name = prompt('Novo nome', p.name);
            if (name?.trim()) await patchProject(p.id, { name: name.trim() });
          })}><PencilLine /> Renomear</button>
          <button onClick={() => run(() => duplicateProject(p.id), 'Design duplicado')}><Copy /> Duplicar</button>
          <button onClick={() => run(() => patchProject(p.id, { favorite: !p.favorite }))}><Star /> {p.favorite ? 'Remover dos favoritos' : 'Favoritar'}</button>
          <button onClick={() => run(() => patchProject(p.id, { status: p.status === 'final' ? 'draft' : 'final' }))}>
            {p.status === 'final' ? <><Undo2 /> Voltar para em andamento</> : <><CheckCircle2 /> Marcar como finalizado</>}
          </button>
          {p.isTemplate
            ? <button onClick={() => run(() => patchProject(p.id, { isTemplate: false }), 'Removido dos modelos')}><LayoutTemplate /> Remover dos modelos</button>
            : <button onClick={() => run(() => patchProject(p.id, { isTemplate: true, favorite: true }), 'Salvo como modelo favorito')}><LayoutTemplate /> Salvar como modelo</button>}
          {p.isTemplate && (
            <button onClick={() => run(async () => {
              const c = await duplicateProject(p.id, { name: p.name.replace(/\s*\(modelo\)$/i, '') + ' — novo' });
              if (c) nav(`/editor/${c.id}`);
            })}><Copy /> Criar a partir do modelo</button>
          )}
          <button onClick={() => { setMenu(false); setMoving(true); }}><FolderInput /> Mover para projeto…</button>
          <button onClick={exportIt}><Download /> Exportar {p.pageCount > 1 ? 'ZIP' : settings.exportFormat.toUpperCase()}</button>
          <hr />
          <button className="danger" onClick={() => run(async () => { if (confirmDialog(`Excluir "${p.name}"? Esta ação não pode ser desfeita.`)) await deleteProject(p.id); }, undefined)}><Trash2 /> Excluir</button>
        </div>
      )}
      {moving && (
        <Modal title="Mover para projeto" onClose={() => setMoving(false)}>
          <div className="stack" style={{ gap: 6 }}>
            <button className={`opt ${!p.folderId ? 'on' : ''}`} onClick={() => run(async () => { await patchProject(p.id, { folderId: null }); setMoving(false); })}><b>Sem projeto</b></button>
            {folders.map((fd) => (
              <button key={fd.id} className={`opt ${p.folderId === fd.id ? 'on' : ''}`} onClick={() => run(async () => { await patchProject(p.id, { folderId: fd.id }); setMoving(false); }, `Movido para ${fd.name}`)}>
                <b><span className="badge-dot" style={{ color: fd.color }} /> {fd.name}</b>
                {fd.description && <span>{fd.description}</span>}
              </button>
            ))}
            {!folders.length && <p className="muted small">Nenhum projeto criado. Crie projetos na seção “Projetos”.</p>}
          </div>
        </Modal>
      )}
    </div>
  );
}
