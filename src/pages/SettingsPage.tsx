import { useEffect, useRef, useState } from 'react';
import { Database, Download, HardDrive, Trash2, Upload } from 'lucide-react';
import { useApp } from '../store/appStore';
import { Field, Segmented, Slider, Toggle, confirmDialog } from '../components/ui';
import { exportBackup, importBackup } from '../lib/exporter';
import { clearAll } from '../lib/db';
import { formatBytes } from '../lib/ids';
import { FormatPicker } from './CreateDesignPage';

export function SettingsPage() {
  const { settings, updateSettings, toast, reload, projects, assets } = useApp();
  const [usage, setUsage] = useState<{ usage: number; quota: number } | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    navigator.storage?.estimate?.().then((e) => setUsage({ usage: e.usage ?? 0, quota: e.quota ?? 0 }));
    navigator.storage?.persisted?.().then(setPersisted);
  }, [projects.length, assets.length]);

  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <div className="page-head">
        <div>
          <div className="eyebrow">Preferências</div>
          <h1 className="page-title">Configurações</h1>
        </div>
      </div>

      <section className="card bk-section">
        <h2 className="section-title">Criação</h2>
        <p className="section-sub">Padrões aplicados a novos designs e ao editor.</p>
        <div className="stack">
          <Field label="Formato padrão"><FormatPicker value={settings.defaultFormat} onChange={(v) => updateSettings({ defaultFormat: v })} /></Field>
          <Toggle checked={settings.autosave} onChange={(v) => updateSettings({ autosave: v })} label="Salvamento automático no editor (recomendado)" />
          <Toggle checked={settings.snapping} onChange={(v) => updateSettings({ snapping: v })} label="Guias magnéticas (alinhar a bordas, centros e margens)" />
          <Toggle checked={settings.showSafeZones} onChange={(v) => updateSettings({ showSafeZones: v })} label="Mostrar áreas seguras em Stories e capas de Reels" />
        </div>
      </section>

      <section className="card bk-section">
        <h2 className="section-title">Exportação</h2>
        <p className="section-sub">As imagens são renderizadas a partir dos objetos editáveis, na resolução escolhida.</p>
        <div className="grid-2">
          <Field label="Formato de arquivo"><Segmented full value={settings.exportFormat} onChange={(v) => updateSettings({ exportFormat: v })} options={[{ value: 'png', label: 'PNG' }, { value: 'jpeg', label: 'JPG' }]} /></Field>
          <Field label="Resolução" hint={`Retrato 4:5 → ${1080 * settings.exportScale} × ${1350 * settings.exportScale} px`}>
            <Segmented full value={settings.exportScale} onChange={(v) => updateSettings({ exportScale: v })} options={[{ value: 1, label: '1x (Instagram)' }, { value: 2, label: '2x' }, { value: 3, label: '3x' }]} />
          </Field>
        </div>
        {settings.exportFormat === 'jpeg' && <Field label="Qualidade JPG"><Slider value={settings.jpegQuality} min={0.6} max={1} step={0.01} onChange={(v) => updateSettings({ jpegQuality: v })} /></Field>}
      </section>

      <section className="card bk-section">
        <h2 className="section-title">Armazenamento e backup</h2>
        <p className="section-sub">Seus projetos, Brand Kits e imagens ficam salvos localmente neste navegador (IndexedDB). Faça backups para levar seu trabalho a outro computador.</p>
        <div className="stack">
          <div className="row wrap" style={{ gap: 16 }}>
            <span className="chip"><HardDrive size={13} /> {usage ? `${formatBytes(usage.usage)} usados de ${formatBytes(usage.quota)}` : 'Calculando…'}</span>
            <span className="chip"><Database size={13} /> {projects.length} designs · {assets.length} arquivos</span>
            {persisted !== null && <span className={`chip ${persisted ? 'ok' : ''}`}>{persisted ? 'Armazenamento persistente ativo' : 'Armazenamento pode ser limpo pelo navegador sob pouco espaço'}</span>}
          </div>
          <div className="row wrap">
            <button className="btn" onClick={async () => { await exportBackup(); toast('Backup gerado'); }}><Download /> Exportar backup (.json)</button>
            <button className="btn" onClick={() => input.current?.click()}><Upload /> Importar backup</button>
            <input ref={input} type="file" accept="application/json,.json" hidden onChange={async (e) => {
              const f = e.target.files?.[0]; e.target.value = '';
              if (!f) return;
              try { const r = await importBackup(f); await reload(); toast(`Importados: ${r.projects} designs, ${r.assets} arquivos, ${r.brandKits} Brand Kits`); }
              catch (err) { toast((err as Error).message, 'error'); }
            }} />
            <div className="spacer" />
            <button className="btn danger" onClick={async () => {
              if (!confirmDialog('Apagar TODOS os designs, Brand Kits e imagens deste navegador? Esta ação não pode ser desfeita.')) return;
              await clearAll(); await reload(); toast('Dados apagados');
            }}><Trash2 /> Apagar todos os dados</button>
          </div>
        </div>
      </section>

      <section className="card bk-section">
        <h2 className="section-title">Integrações e dependências</h2>
        <p className="section-sub">O que funciona localmente e o que exigiria serviços externos.</p>
        <div className="stack small" style={{ gap: 10, lineHeight: 1.55 }}>
          <div><b>Sem dependências externas hoje.</b> Edição, geração de composições, fontes (empacotadas), armazenamento e exportação PNG/JPG/ZIP rodam inteiramente no navegador.</div>
          <div><b>Sincronização entre dispositivos / equipe</b> — requer backend de armazenamento (ex.: Supabase, Firebase ou S3 + API). A camada <code>src/lib/db.ts</code> concentra a persistência e pode ser trocada por um adaptador remoto.</div>
          <div><b>Geração de textos com IA</b> — requer chave de API de um modelo de linguagem, chamada a partir de um backend (nunca expor a chave no navegador).</div>
          <div><b>Geração de imagens com IA / banco de fotos</b> — requer API de geração de imagens ou de acervo (ex.: Unsplash API). Hoje a direção “Fotografia autoral” usa exclusivamente fotos enviadas por você.</div>
          <div><b>Publicação direta no Instagram</b> — requer a Instagram Graph API com conta profissional, app Meta aprovado e um servidor para OAuth.</div>
        </div>
      </section>
    </div>
  );
}
