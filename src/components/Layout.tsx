import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { FolderOpen, GalleryHorizontalEnd, LayoutDashboard, Library, Menu, Palette, Settings, Sparkles } from 'lucide-react';
import { useApp } from '../store/appStore';
import { Toasts } from './ui';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/brand', label: 'Brand Kit', icon: Palette },
  { to: '/create', label: 'Criar Design', icon: Sparkles },
  { to: '/carousel', label: 'Criar Carrossel', icon: GalleryHorizontalEnd },
  { to: '/library', label: 'Design Library', icon: Library },
  { to: '/projects', label: 'Projetos', icon: FolderOpen },
  { to: '/settings', label: 'Configurações', icon: Settings },
];

export function Layout() {
  const loc = useLocation();
  const editorMode = loc.pathname.startsWith('/editor');
  const [open, setOpen] = useState(false);
  const brand = useApp((s) => s.activeBrand());

  return (
    <div className={`shell ${editorMode ? 'editor-mode' : ''}`}>
      <aside className={`sidebar ${open ? 'open' : ''}`} onClick={() => setOpen(false)}>
        <NavLink to="/" className="brandmark" title="Visual Content Lab">
          <div className="brandmark-logo"><span /></div>
          <div className="brandmark-text"><b>Visual Content</b><small>Lab</small></div>
        </NavLink>
        <div className="nav-label">Estúdio</div>
        {NAV.slice(0, 4).map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className="nav-link" title={n.label}><n.icon /><span>{n.label}</span></NavLink>
        ))}
        <div className="nav-label">Acervo</div>
        {NAV.slice(4).map((n) => (
          <NavLink key={n.to} to={n.to} className="nav-link" title={n.label}><n.icon /><span>{n.label}</span></NavLink>
        ))}
        <div className="sidebar-foot">
          <NavLink to="/brand" className="brand-chip">
            <div className="dots">
              {[brand.colors.primary, brand.colors.secondary, brand.colors.accent, brand.colors.background].map((c, i) => <i key={i} style={{ background: c }} />)}
            </div>
            <div><b style={{ fontWeight: 550, fontSize: 13 }}>{brand.name}</b><small>Brand Kit ativo</small></div>
          </NavLink>
        </div>
      </aside>
      <main className="main">
        {!editorMode && (
          <div className="mobile-bar">
            <button className="icon-btn" onClick={() => setOpen(true)} aria-label="Menu"><Menu /></button>
            <b>Visual Content Lab</b>
          </div>
        )}
        <Outlet />
      </main>
      <Toasts />
    </div>
  );
}
