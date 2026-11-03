import { useEffect } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { useApp } from './store/appStore';
import { Layout } from './components/Layout';
import { Loader } from './components/ui';
import { DashboardPage } from './pages/DashboardPage';
import { BrandKitPage } from './pages/BrandKitPage';
import { CreateDesignPage } from './pages/CreateDesignPage';
import { CreateCarouselPage } from './pages/CreateCarouselPage';
import { LibraryPage } from './pages/LibraryPage';
import { FolderPage, ProjectsPage } from './pages/ProjectsPage';
import { SettingsPage } from './pages/SettingsPage';
import { EditorPage } from './editor/Editor';

export function App() {
  const ready = useApp((s) => s.ready);
  const init = useApp((s) => s.init);
  useEffect(() => { init().catch((e) => { console.error(e); alert('Não foi possível abrir o armazenamento local (IndexedDB). Verifique se o navegador não está em modo privado restrito.'); }); }, [init]);
  if (!ready) return <div className="boot"><Loader /></div>;
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="brand" element={<BrandKitPage />} />
          <Route path="create" element={<CreateDesignPage />} />
          <Route path="carousel" element={<CreateCarouselPage />} />
          <Route path="library" element={<LibraryPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="projects/:id" element={<FolderPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="editor/:id" element={<EditorPage />} />
          <Route path="*" element={<DashboardPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
