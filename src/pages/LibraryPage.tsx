import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Sparkles } from 'lucide-react';
import type { ProjectMeta } from '../types';
import { useApp } from '../store/appStore';
import { ProjectCard } from '../components/ProjectCard';
import { Segmented } from '../components/ui';
import { ImagePicker } from '../components/ImagePicker';
import { formatBytes } from '../lib/ids';

type Filter = 'all' | 'design' | 'carousel' | 'favorite' | 'template' | 'draft' | 'final' | 'media';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'design', label: 'Designs' },
  { value: 'carousel', label: 'Carrosséis' },
  { value: 'favorite', label: 'Favoritos' },
  { value: 'template', label: 'Modelos' },
  { value: 'draft', label: 'Em andamento' },
  { value: 'final', label: 'Finalizados' },
  { value: 'media', label: 'Imagens' },
];

export function applyFilter(list: ProjectMeta[], f: Filter) {
  switch (f) {
    case 'design': return list.filter((p) => p.kind === 'design');
    case 'carousel': return list.filter((p) => p.kind === 'carousel');
    case 'favorite': return list.filter((p) => p.favorite);
    case 'template': return list.filter((p) => p.isTemplate);
    case 'draft': return list.filter((p) => p.status === 'draft');
    case 'final': return list.filter((p) => p.status === 'final');
    default: return list;
  }
}

export function LibraryPage() {
  const [params, setParams] = useSearchParams();
  const filter = (params.get('f') as Filter) || 'all';
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'updated' | 'created' | 'name'>('updated');
  const [fmt, setFmt] = useState<'all' | 'portrait' | 'square' | 'story'>('all');
  const projects = useApp((s) => s.projects);
  const assets = useApp((s) => s.assets);

  const list = useMemo(() => {
    let l = applyFilter(projects, filter);
    if (fmt !== 'all') l = l.filter((p) => p.format === fmt);
    if (q.trim()) { const s = q.toLowerCase(); l = l.filter((p) => p.name.toLowerCase().includes(s)); }
    return [...l].sort((a, b) => (sort === 'name' ? a.name.localeCompare(b.name) : sort === 'created' ? b.createdAt - a.createdAt : b.updatedAt - a.updatedAt));
  }, [projects, filter, q, sort, fmt]);

  const counts = Object.fromEntries(FILTERS.map((f) => [f.value, f.value === 'media' ? assets.filter((a) => a.kind === 'image').length : applyFilter(projects, f.value).length]));
  const imgBytes = assets.reduce((s, a) => s + a.size, 0);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">Acervo</div>
          <h1 className="page-title">Design Library</h1>
          <p className="page-sub">Todos os seus designs, carrosséis e modelos. Abra qualquer peça para continuar editando de onde parou.</p>
        </div>
        <Link to="/create" className="btn primary"><Sparkles /> Novo design</Link>
      </div>

      <div className="toolbar-row">
        <Segmented value={filter} onChange={(v) => setParams(v === 'all' ? {} : { f: v })} options={FILTERS.map((f) => ({ value: f.value, label: <>{f.label} <span style={{ opacity: 0.5 }}>{counts[f.value]}</span></> }))} />
      </div>
      {filter !== 'media' ? (
        <>
          <div className="toolbar-row">
            <div className="search"><Search /><input className="input" placeholder="Buscar por nome" value={q} onChange={(e) => setQ(e.target.value)} /></div>
            <select className="select" style={{ width: 170 }} value={fmt} onChange={(e) => setFmt(e.target.value as typeof fmt)}>
              <option value="all">Todos os formatos</option><option value="portrait">4:5 Retrato</option><option value="square">1:1 Quadrado</option><option value="story">9:16 Story</option>
            </select>
            <select className="select" style={{ width: 190 }} value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
              <option value="updated">Editados recentemente</option><option value="created">Criados recentemente</option><option value="name">Nome (A–Z)</option>
            </select>
          </div>
          {list.length ? (
            <div className="lib-grid" data-testid="library-grid">{list.map((p) => <ProjectCard key={p.id} p={p} />)}</div>
          ) : (
            <div className="card empty">
              <h3>Nada por aqui</h3>
              <p>{filter === 'template' ? 'Salve um design como modelo pelo menu “…” de qualquer card.' : 'Nenhum design corresponde aos filtros.'}</p>
            </div>
          )}
        </>
      ) : (
        <div className="card card-pad">
          <p className="muted small" style={{ marginTop: 0 }}>{counts.media} imagens · {formatBytes(imgBytes)} armazenados neste navegador. Passe o mouse para excluir.</p>
          <ImagePicker selected={[]} onChange={() => {}} columns={8} allowDelete limit={1000} />
        </div>
      )}
    </div>
  );
}
