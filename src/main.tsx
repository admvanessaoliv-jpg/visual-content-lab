import { createRoot } from 'react-dom/client';
import './lib/fonts';
import './styles/app.css';
import { App } from './App';
import { useApp } from './store/appStore';
import { useEditor } from './store/editorStore';

// Acesso de inspeção para testes automatizados e depuração
(window as any).__VCL__ = { app: useApp, editor: useEditor };

createRoot(document.getElementById('root')!).render(<App />);
