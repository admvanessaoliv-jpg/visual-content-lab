import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Plus, Trash2, Upload, Wand2, X } from 'lucide-react';
import type { BrandKit, ColorRole } from '../types';
import { useApp } from '../store/appStore';
import { ColorField, Dropzone, Field, Segmented, Slider, Toggle, confirmDialog } from '../components/ui';
import { FontSelect, WeightSelect } from '../components/FontSelect';
import { AssetImage } from '../components/AssetImage';
import { ACCEPTED_FONTS, ACCEPTED_IMAGES } from '../lib/assets';
import { COMPOSITION_STYLES, PHOTO_STYLES } from '../lib/defaults';
import { ensureFont, nearestWeight, registerCustomFont } from '../lib/fonts';
import { extractPalette } from '../lib/extractPalette';
import { assetsDB } from '../lib/db';
import { BrandPreview } from './BrandPreview';
import { isDark } from '../lib/color';

const ROLE_LABEL: Record<ColorRole, { label: string; hint: string }> = {
  primary: { label: 'Primária', hint: 'Cor principal da marca' },
  secondary: { label: 'Secundária', hint: 'Apoio e destaques' },
  accent: { label: 'Destaque', hint: 'Detalhes, selos, formas' },
  background: { label: 'Fundo', hint: 'Fundo claro padrão' },
  surface: { label: 'Superfície', hint: 'Cartões e caixas' },
  text: { label: 'Texto', hint: 'Cor dos textos' },
  muted: { label: 'Texto de apoio', hint: 'Legendas, notas' },
};

export function BrandKitPage() {
  const { brandKits, activeBrandKitId, setActiveBrandKit, saveBrandKit, createBrandKit, deleteBrandKit, toast } = useApp();
  const active = brandKits.find((k) => k.id === activeBrandKitId) ?? brandKits[0];
  const [draft, setDraft] = useState<BrandKit>(active);
  const [saved, setSaved] = useState(true);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => { setDraft(active); setSaved(true); }, [active?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // salvamento automático do Brand Kit
  const update = (patch: Partial<BrandKit>) => {
    setDraft((d) => {
      const next = { ...d, ...patch };
      window.clearTimeout(timer.current);
      setSaved(false);
      timer.current = window.setTimeout(async () => { await saveBrandKit(next); setSaved(true); }, 500);
      return next;
    });
  };
  const setColor = (role: ColorRole, c: string) => update({ colors: { ...draft.colors, [role]: c } });

  useEffect(() => { [draft.headingFont, draft.bodyFont, draft.accentFont].forEach((f) => ensureFont(f.family, f.weight)); }, [draft.headingFont, draft.bodyFont, draft.accentFont]);

  if (!draft) return null;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">Identidade visual</div>
          <h1 className="page-title">Brand Kit</h1>
          <p className="page-sub">Defina cores, tipografia, logotipo e referências. Tudo o que você criar no laboratório parte destas definições — e pode ser reaplicado a qualquer design.</p>
        </div>
        <span className={`save-state ${saved ? 'saved' : 'saving'}`}><span className="badge-dot" />{saved ? 'Salvo automaticamente' : 'Salvando…'}</span>
      </div>

      <div className="kit-tabs">
        {brandKits.map((k) => (
          <button key={k.id} className={`kit-tab ${k.id === draft.id ? 'on' : ''}`} onClick={() => setActiveBrandKit(k.id)}>
            <span className="row" style={{ gap: 0 }}>{[k.colors.primary, k.colors.secondary, k.colors.accent].map((c, i) => <span key={i} className="swatch sm" style={{ background: c, marginLeft: i ? -6 : 0, borderRadius: '50%', border: '2px solid #fff' }} />)}</span>
            {k.name}
            {k.id === activeBrandKitId && <Check size={14} />}
          </button>
        ))}
        <button className="btn" onClick={async () => { await createBrandKit({ name: 'Nova marca' }); toast('Brand Kit criado'); }}><Plus /> Novo</button>
        <button className="btn" onClick={async () => { const { id: _id, ...rest } = draft; await createBrandKit({ ...rest, name: `${draft.name} (cópia)` }); toast('Brand Kit duplicado'); }}><Copy /> Duplicar</button>
        {brandKits.length > 1 && (
          <button className="btn danger" onClick={async () => { if (confirmDialog(`Excluir o Brand Kit "${draft.name}"?`)) { try { await deleteBrandKit(draft.id); } catch (e) { toast((e as Error).message, 'error'); } } }}><Trash2 /> Excluir</button>
        )}
      </div>

      <div className="bk-layout">
        <div>
          <section className="card bk-section">
            <h2 className="section-title">Marca</h2>
            <p className="section-sub">Nome e assinatura usados nas composições (masthead, rodapés, CTA).</p>
            <div className="grid-2">
              <Field label="Nome da marca"><input className="input" value={draft.name} onChange={(e) => update({ name: e.target.value })} data-testid="brand-name" /></Field>
              <Field label="@ do perfil"><input className="input" value={draft.handle} onChange={(e) => update({ handle: e.target.value })} /></Field>
            </div>
          </section>

          <section className="card bk-section">
            <h2 className="section-title">Logotipo</h2>
            <p className="section-sub">PNG com transparência ou SVG. A versão clara é usada sobre fundos escuros.</p>
            <div className="grid-2">
              <LogoSlot label="Versão principal" assetId={draft.logoAssetId} onChange={(id) => update({ logoAssetId: id })} />
              <LogoSlot label="Versão para fundo escuro" dark assetId={draft.logoLightAssetId} onChange={(id) => update({ logoLightAssetId: id })} />
            </div>
          </section>

          <section className="card bk-section">
            <h2 className="section-title">Cores</h2>
            <p className="section-sub">Cada cor tem um papel. Os geradores usam os papéis — não valores fixos — para manter contraste e coerência.</p>
            <div className="color-roles">
              {(Object.keys(ROLE_LABEL) as ColorRole[]).map((role) => (
                <Field key={role} label={ROLE_LABEL[role].label} hint={ROLE_LABEL[role].hint}>
                  <ColorField value={draft.colors[role]} onChange={(c) => setColor(role, c)} />
                </Field>
              ))}
            </div>
            <hr className="divider" />
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
              <span className="field-label">Paleta estendida</span>
              <PaletteExtractor draft={draft} onPalette={(p) => update({ palette: [...new Set([...draft.palette, ...p])].slice(0, 16) })} />
            </div>
            <div className="palette-row">
              {draft.palette.map((c, i) => (
                <div key={c + i} className="pal-item">
                  <label className="swatch" style={{ background: c, display: 'block', position: 'relative', overflow: 'hidden' }} title={c}>
                    <input type="color" value={c} style={{ opacity: 0, position: 'absolute', inset: 0 }} onChange={(e) => update({ palette: draft.palette.map((x, j) => (j === i ? e.target.value.toUpperCase() : x)) })} />
                  </label>
                  <button className="x" onClick={() => update({ palette: draft.palette.filter((_, j) => j !== i) })}><X size={10} /></button>
                </div>
              ))}
              <button className="swatch" style={{ background: 'var(--bg)', display: 'grid', placeItems: 'center' }} onClick={() => update({ palette: [...draft.palette, '#888888'] })} title="Adicionar cor"><Plus size={14} /></button>
            </div>
          </section>

          <section className="card bk-section">
            <h2 className="section-title">Tipografia</h2>
            <p className="section-sub">27 famílias profissionais incluídas localmente, ou envie as fontes da sua marca.</p>
            <div className="stack">
              <FontRow label="Títulos" font={draft.headingFont} onChange={(f) => update({ headingFont: f })} sample={`${draft.name} — títulos`} upper={draft.headingUppercase} ls={draft.headingLetterSpacing} size={34} />
              <div className="grid-2">
                <Toggle checked={draft.headingUppercase} onChange={(v) => update({ headingUppercase: v })} label="Títulos em caixa alta" />
                <Field label="Espaçamento das letras nos títulos"><Slider value={draft.headingLetterSpacing} min={-0.08} max={0.2} step={0.005} onChange={(v) => update({ headingLetterSpacing: v })} suffix="em" /></Field>
              </div>
              <FontRow label="Textos" font={draft.bodyFont} onChange={(f) => update({ bodyFont: f })} sample="Texto de apoio legível, com boa entrelinha e ritmo confortável para leitura em telas." size={16} />
              <FontRow label="Chamadas e detalhes" font={draft.accentFont} onChange={(f) => update({ accentFont: f })} sample="CHAMADA · 01 / 07 · @PERFIL" size={14} />
              <CustomFonts draft={draft} update={update} />
            </div>
          </section>

          <section className="card bk-section">
            <h2 className="section-title">Estilo fotográfico</h2>
            <p className="section-sub">Orienta o tratamento aplicado às suas fotos nas composições geradas.</p>
            <div className="grid-2">
              <Field label="Estilo">
                <select className="select" value={draft.photoStyle} onChange={(e) => update({ photoStyle: e.target.value })}>
                  {[...new Set([draft.photoStyle, ...PHOTO_STYLES])].map((s) => <option key={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Tratamento automático">
                <Segmented full value={draft.photoFilter} onChange={(v) => update({ photoFilter: v })} options={[{ value: 'none', label: 'Original' }, { value: 'bw', label: 'P&B' }, { value: 'warm', label: 'Quente' }, { value: 'soft', label: 'Suave' }]} />
              </Field>
            </div>
            <Field label="Notas sobre fotografia"><textarea className="textarea" rows={2} value={draft.photoNotes} placeholder="Ex.: luz lateral, enquadramentos fechados, sem flash" onChange={(e) => update({ photoNotes: e.target.value })} /></Field>
          </section>

          <section className="card bk-section">
            <h2 className="section-title">Estilo de composição</h2>
            <p className="section-sub">Define o caráter dos layouts e o arredondamento padrão de cartões e fotos.</p>
            <div className="grid-2">
              <Field label="Estilo">
                <select className="select" value={draft.compositionStyle} onChange={(e) => update({ compositionStyle: e.target.value })}>
                  {[...new Set([draft.compositionStyle, ...COMPOSITION_STYLES])].map((s) => <option key={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Arredondamento de cantos"><Slider value={draft.cornerRadius} min={0} max={80} onChange={(v) => update({ cornerRadius: v })} suffix="px" /></Field>
            </div>
            <Field label="Notas de composição"><textarea className="textarea" rows={2} value={draft.compositionNotes} placeholder="Ex.: margens amplas, títulos sempre à esquerda" onChange={(e) => update({ compositionNotes: e.target.value })} /></Field>
          </section>

          <section className="card bk-section">
            <h2 className="section-title">Referências visuais</h2>
            <p className="section-sub">Moodboard da marca. Use “Extrair paleta” para trazer as cores das referências.</p>
            <References draft={draft} update={update} />
          </section>
        </div>

        <aside className="bk-preview">
          <div className="card card-pad">
            <div className="h-label" style={{ marginBottom: 12 }}>Pré-visualização ao vivo</div>
            <BrandPreview brand={draft} />
            <hr className="divider" />
            <div className="row" style={{ gap: 0, height: 44, borderRadius: 10, overflow: 'hidden' }}>
              {Object.values(draft.colors).map((c, i) => <div key={i} style={{ flex: 1, height: '100%', background: c }} title={c} />)}
            </div>
            <p className="muted small" style={{ marginBottom: 0 }}>{draft.compositionStyle} · {draft.photoStyle}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function LogoSlot({ label, assetId, onChange, dark }: { label: string; assetId: string | null; onChange: (id: string | null) => void; dark?: boolean }) {
  const upload = useApp((s) => s.uploadImages);
  const input = useRef<HTMLInputElement>(null);
  return (
    <Field label={label}>
      <div className={`logo-box ${dark ? 'dark' : ''}`}>
        {assetId ? <AssetImage id={assetId} alt={label} /> : <span className="muted small">{dark ? <span style={{ color: '#999' }}>Sem logotipo</span> : 'Sem logotipo'}</span>}
      </div>
      <div className="row">
        <button className="btn sm" onClick={() => input.current?.click()}><Upload /> {assetId ? 'Trocar' : 'Enviar'}</button>
        {assetId && <button className="btn sm ghost" onClick={() => onChange(null)}>Remover</button>}
      </div>
      <input ref={input} type="file" accept={ACCEPTED_IMAGES} hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) { const [a] = await upload([f], ['logo']); if (a) onChange(a.id); } e.target.value = ''; }} />
    </Field>
  );
}

function FontRow({ label, font, onChange, sample, size, upper, ls }: { label: string; font: { family: string; weight: number }; onChange: (f: { family: string; weight: number }) => void; sample: string; size: number; upper?: boolean; ls?: number }) {
  return (
    <div>
      <div className="grid-2">
        <Field label={label}><FontSelect value={font.family} onChange={(family) => onChange({ family, weight: nearestWeight(family, font.weight) })} /></Field>
        <Field label="Peso"><WeightSelect family={font.family} value={font.weight} onChange={(weight) => onChange({ ...font, weight })} /></Field>
      </div>
      <div className="font-sample" style={{ fontFamily: `"${font.family}"`, fontWeight: font.weight, fontSize: size, lineHeight: 1.15, textTransform: upper ? 'uppercase' : 'none', letterSpacing: ls ? `${ls}em` : undefined }}>{sample}</div>
    </div>
  );
}

function CustomFonts({ draft, update }: { draft: BrandKit; update: (p: Partial<BrandKit>) => void }) {
  const uploadFont = useApp((s) => s.uploadFont);
  const toast = useApp((s) => s.toast);
  const input = useRef<HTMLInputElement>(null);
  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="field-label">Fontes próprias da marca</span>
        <button className="btn sm" onClick={() => input.current?.click()}><Upload /> Enviar fonte</button>
      </div>
      <input ref={input} type="file" accept={ACCEPTED_FONTS} hidden onChange={async (e) => {
        const f = e.target.files?.[0];
        e.target.value = '';
        if (!f) return;
        try {
          const a = await uploadFont(f);
          const family = f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
          const full = await assetsDB.get(a.id);
          await registerCustomFont(family, full!.blob);
          update({ customFonts: [...draft.customFonts, { family, assetId: a.id }] });
          toast(`Fonte "${family}" adicionada — disponível em todos os seletores`);
        } catch (err) { toast('Não foi possível carregar a fonte: ' + (err as Error).message, 'error'); }
      }} />
      {draft.customFonts.length > 0 ? (
        <div className="row wrap" style={{ marginTop: 8 }}>
          {draft.customFonts.map((cf) => (
            <span key={cf.assetId} className="chip" style={{ fontFamily: `"${cf.family}"`, fontSize: 14 }}>
              {cf.family}
              <button className="icon-btn sm" onClick={() => update({ customFonts: draft.customFonts.filter((x) => x.assetId !== cf.assetId) })}><X /></button>
            </span>
          ))}
        </div>
      ) : <p className="muted small" style={{ margin: '6px 0 0' }}>TTF, OTF, WOFF ou WOFF2. Verifique se a licença da fonte permite uso em imagens.</p>}
    </div>
  );
}

function References({ draft, update }: { draft: BrandKit; update: (p: Partial<BrandKit>) => void }) {
  const upload = useApp((s) => s.uploadImages);
  return (
    <div className="stack">
      <Dropzone accept={ACCEPTED_IMAGES} onFiles={async (files) => {
        const added = await upload(files, ['referencia']);
        update({ references: [...draft.references, ...added.map((a) => ({ assetId: a.id, note: '' }))] });
      }}>Arraste referências visuais (moodboard)</Dropzone>
      {draft.references.length > 0 && (
        <div className="ref-grid">
          {draft.references.map((r, i) => (
            <div key={r.assetId} className="ref-item" style={{ position: 'relative' }}>
              <AssetImage id={r.assetId} />
              <button className="icon-btn sm" style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(255,255,255,.9)' }} onClick={() => update({ references: draft.references.filter((_, j) => j !== i) })}><X /></button>
              <input className="input" placeholder="Nota…" value={r.note} onChange={(e) => update({ references: draft.references.map((x, j) => (j === i ? { ...x, note: e.target.value } : x)) })} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PaletteExtractor({ draft, onPalette }: { draft: BrandKit; onPalette: (p: string[]) => void }) {
  const [busy, setBusy] = useState(false);
  const toast = useApp((s) => s.toast);
  const sources = [...draft.references.map((r) => r.assetId), ...(draft.logoAssetId ? [draft.logoAssetId] : [])];
  return (
    <button className="btn sm" disabled={!sources.length || busy} title={sources.length ? 'Extrair cores do logotipo e das referências' : 'Envie logotipo ou referências primeiro'}
      onClick={async () => {
        setBusy(true);
        try {
          const p = await extractPalette(sources, 6);
          onPalette(p);
          toast(`${p.length} cores extraídas e adicionadas à paleta`);
        } finally { setBusy(false); }
      }}>
      <Wand2 /> {busy ? 'Analisando…' : 'Extrair paleta'}
    </button>
  );
}

export const textOn = (bg: string) => (isDark(bg) ? '#fff' : '#111');
