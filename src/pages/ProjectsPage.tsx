import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FolderPlus, PencilLine, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../store/appStore';
import { ProjectCard } from '../components/ProjectCard';
import { Field, Modal, confirmDialog } from '../components/ui';
import { timeAgo } from '../lib/ids';

export function ProjectsPage() {
  const { folders, projects, createFolder, toast } = useApp();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const loose = projects.filter((p) => !p.folderId && !p.isTemplate);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">Organização</div>
          <h1 className="page-title">Projetos</h1>
          <p className="page-sub">Agrupe designs e carrosséis por campanha, cliente ou tema.</p>
        </div>
        <button className="btn primary" onClick={() => setCreating(true)} data-testid="new-folder"><FolderPlus /> Novo projeto</button>
      </div>

      {folders.length ? (
        <div className="lib-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', marginBottom: 44 }}>
          {folders.map((f) => {
            const items = projects.filter((p) => p.folderId === f.id);
            const last = items[0];
            return (
              <Link key={f.id} to={`/projects/${f.id}`} className="card card-pad action-card" style={{ gap: 18 }}>
                <div className="row" style={{ gap: 6 }}>
                  {items.slice(0, 4).map((p) => (
                    <div key={p.id} style={{ width: 52, aspectRatio: '4/5', borderRadius: 6, overflow: 'hidden', background: 'var(--bg-2)', border: '1px solid var(--line)' }}>
                      {p.thumbnail && <img src={p.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    </div>
                  ))}
                  {!items.length && <div style={{ height: 65, display: 'grid', placeItems: 'center' }} className="muted small">Vazio</div>}
                </div>
                <div>
                  <h4><span className="badge-dot" style={{ color: f.color, width: 9, height: 9, marginRight: 8, verticalAlign: 'middle' }} />{f.name}</h4>
                  <p>{items.length} {items.length === 1 ? 'item' : 'itens'}{last ? ` · atualizado ${timeAgo(last.updatedAt)}` : ''}</p>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="card empty" style={{ marginBottom: 44 }}>
          <h3>Nenhum projeto ainda</h3>
          <p>Crie um projeto para organizar suas peças por campanha ou cliente.</p>
        </div>
      )}

      {loose.length > 0 && (
        <>
          <h2 className="section-title" style={{ marginBottom: 16 }}>Sem projeto</h2>
          <div className="lib-grid">{loose.map((p) => <ProjectCard key={p.id} p={p} />)}</div>
        </>
      )}

      {creating && (
        <Modal title="Novo projeto" onClose={() => setCreating(false)} footer={
          <>
            <button className="btn" onClick={() => setCreating(false)}>Cancelar</button>
            <button className="btn primary" disabled={!name.trim()} onClick={async () => { await createFolder(name.trim(), desc.trim()); setCreating(false); setName(''); setDesc(''); toast('Projeto criado'); }} data-testid="create-folder">Criar</button>
          </>
        }>
          <div className="stack">
            <Field label="Nome"><input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Campanha de lançamento" data-testid="folder-name" /></Field>
            <Field label="Descrição (opcional)"><textarea className="textarea" rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} /></Field>
          </div>
        </Modal>
      )}
    </div>
  );
}

export function FolderPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { folders, projects, saveFolder, deleteFolder, patchProject, toast } = useApp();
  const folder = folders.find((f) => f.id === id);
  const [adding, setAdding] = useState(false);
  if (!folder) return <div className="page"><div className="empty"><h3>Projeto não encontrado</h3><Link to="/projects" className="btn">Voltar</Link></div></div>;
  const items = projects.filter((p) => p.folderId === folder.id);
  const others = projects.filter((p) => p.folderId !== folder.id);

  return (
    <div className="page">
      <Link to="/projects" className="btn ghost sm" style={{ marginBottom: 16 }}><ArrowLeft /> Projetos</Link>
      <div className="page-head">
        <div>
          <div className="eyebrow"><span className="badge-dot" style={{ color: folder.color, marginRight: 6 }} />Projeto</div>
          <h1 className="page-title">{folder.name}</h1>
          {folder.description && <p className="page-sub">{folder.description}</p>}
        </div>
        <div className="row">
          <button className="btn" onClick={() => setAdding(true)}><Plus /> Adicionar designs</button>
          <button className="btn" onClick={async () => { const n = prompt('Nome do projeto', folder.name); if (n?.trim()) await saveFolder({ ...folder, name: n.trim() }); }}><PencilLine /> Renomear</button>
          <button className="btn danger" onClick={async () => { if (confirmDialog('Excluir o projeto? Os designs continuam na Design Library.')) { await deleteFolder(folder.id); nav('/projects'); } }}><Trash2 /></button>
        </div>
      </div>
      {items.length ? <div className="lib-grid">{items.map((p) => <ProjectCard key={p.id} p={p} />)}</div> : (
        <div className="card empty"><h3>Projeto vazio</h3><p>Adicione designs existentes ou mova-os pelo menu “…” de cada card.</p></div>
      )}
      {adding && (
        <Modal title="Adicionar designs ao projeto" wide onClose={() => setAdding(false)}>
          {others.length ? (
            <div className="lib-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
              {others.map((p) => (
                <button key={p.id} className="opt" onClick={async () => { await patchProject(p.id, { folderId: folder.id }); toast(`“${p.name}” adicionado`); }}>
                  {p.thumbnail && <img src={p.thumbnail} alt="" style={{ width: '100%', borderRadius: 6, marginBottom: 6 }} />}
                  <b style={{ fontSize: 12 }}>{p.name}</b>
                </button>
              ))}
            </div>
          ) : <p className="muted">Todos os designs já estão neste projeto.</p>}
        </Modal>
      )}
    </div>
  );
}
