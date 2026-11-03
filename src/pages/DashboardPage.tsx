import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, FilePlus2, GalleryHorizontalEnd, Palette, Sparkles } from 'lucide-react';
import { useApp } from '../store/appStore';
import { ProjectCard } from '../components/ProjectCard';
import { AssetImage } from '../components/AssetImage';
import { makePage } from '../lib/defaults';
import { newProject } from '../lib/projects';
import { FORMATS } from '../lib/formats';
import type { FormatId } from '../types';

export function DashboardPage() {
  const nav = useNavigate();
  const { projects, assets, folders, settings, createProject } = useApp();
  const brand = useApp((s) => s.activeBrand());
  const recent = projects.filter((p) => !p.isTemplate).slice(0, 8);
  const templates = projects.filter((p) => p.isTemplate).slice(0, 4);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  const blank = async (format: FormatId) => {
    const p = newProject({
      name: 'Design em branco', kind: 'design', designType: 'static', format, brandKitId: brand.id,
      pages: [makePage({ name: 'Página 1', background: { ...makePage().background, color: brand.colors.background, colorRole: 'background' } })],
    });
    await createProject(p);
    nav(`/editor/${p.id}`);
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          <h1 className="page-title">{greeting}. O que vamos criar?</h1>
          <p className="page-sub">Posts, capas e carrosséis com a identidade de <b>{brand.name}</b>. Tudo editável, camada por camada.</p>
        </div>
      </div>

      <div className="hero-actions">
        <Link to="/create" className="card action-card dark">
          <div className="ac-icon"><Sparkles /></div>
          <div><h4>Criar design</h4><p>Post estático, capa de Reels, editorial, fotográfico ou tipográfico.</p></div>
        </Link>
        <Link to="/carousel" className="card action-card">
          <div className="ac-icon"><GalleryHorizontalEnd /></div>
          <div><h4>Criar carrossel</h4><p>3 a 10 slides com unidade visual e composições variadas.</p></div>
        </Link>
        <Link to="/brand" className="card action-card">
          <div className="ac-icon"><Palette /></div>
          <div><h4>Brand Kit</h4><p>Cores, tipografia, logotipo e referências da marca.</p></div>
        </Link>
      </div>

      <div className="stats">
        <div className="stat"><b>{projects.filter((p) => p.kind === 'design').length}</b><span>Designs</span></div>
        <div className="stat"><b>{projects.filter((p) => p.kind === 'carousel').length}</b><span>Carrosséis</span></div>
        <div className="stat"><b>{projects.filter((p) => p.status === 'final').length}</b><span>Finalizados</span></div>
        <div className="stat"><b>{assets.filter((a) => a.kind === 'image').length}</b><span>Imagens na biblioteca</span></div>
      </div>

      <div className="split-2">
        <div>
          <div className="row" style={{ marginBottom: 18 }}>
            <h2 className="section-title">Recentes</h2>
            <div className="spacer" />
            <Link to="/library" className="btn ghost sm">Ver tudo <ArrowRight /></Link>
          </div>
          {recent.length ? (
            <div className="lib-grid">{recent.map((p) => <ProjectCard key={p.id} p={p} />)}</div>
          ) : (
            <div className="card empty">
              <h3>Nenhum design ainda</h3>
              <p>Comece configurando seu Brand Kit e depois gere sua primeira peça.</p>
              <Link to="/create" className="btn primary"><Sparkles /> Criar primeiro design</Link>
            </div>
          )}
        </div>

        <div className="stack" style={{ gap: 18 }}>
          <div className="card card-pad">
            <div className="h-label" style={{ marginBottom: 12 }}>Brand Kit ativo</div>
            <div className="row" style={{ marginBottom: 12 }}>
              {brand.logoAssetId ? <AssetImage id={brand.logoAssetId} style={{ height: 36, maxWidth: 120, objectFit: 'contain' }} /> : null}
              <div>
                <div style={{ fontFamily: `"${brand.headingFont.family}"`, fontSize: 24, lineHeight: 1.1 }}>{brand.name}</div>
                <div className="muted small">{brand.headingFont.family} · {brand.bodyFont.family}</div>
              </div>
            </div>
            <div className="row" style={{ gap: 0, height: 34, borderRadius: 8, overflow: 'hidden', marginBottom: 14 }}>
              {Object.values(brand.colors).map((c, i) => <div key={i} style={{ flex: 1, height: '100%', background: c }} />)}
            </div>
            <Link to="/brand" className="btn sm block">Editar Brand Kit</Link>
          </div>

          <div className="card card-pad">
            <div className="h-label" style={{ marginBottom: 12 }}>Começar em branco</div>
            <div className="stack" style={{ gap: 6 }}>
              {(Object.values(FORMATS)).map((f) => (
                <button key={f.id} className="opt" onClick={() => blank(f.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <span className="fmt-shape" style={{ width: 16, height: 16 * (f.height / f.width) }} />
                  <span style={{ flex: 1 }}><b>{f.label}</b><span style={{ display: 'block' }}>{f.width} × {f.height}</span></span>
                  <FilePlus2 size={16} />
                </button>
              ))}
            </div>
            {settings.defaultFormat && null}
          </div>

          {templates.length > 0 && (
            <div className="card card-pad">
              <div className="h-label" style={{ marginBottom: 12 }}>Modelos favoritos</div>
              <div className="lib-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>{templates.map((p) => <ProjectCard key={p.id} p={p} />)}</div>
            </div>
          )}
          {folders.length > 0 && (
            <div className="card card-pad">
              <div className="h-label" style={{ marginBottom: 10 }}>Projetos</div>
              {folders.slice(0, 5).map((f) => (
                <Link key={f.id} to={`/projects/${f.id}`} className="nav-link"><span className="badge-dot" style={{ color: f.color }} /><span style={{ flex: 1 }}>{f.name}</span><span className="muted small">{projects.filter((p) => p.folderId === f.id).length}</span></Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
