import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { RefreshCw, Save, Sparkles, PencilLine, ImageOff } from 'lucide-react';
import type { DesignType, Direction, FormatId } from '../types';
import { useApp } from '../store/appStore';
import { DESIGN_TYPES, DIRECTIONS, FORMATS } from '../lib/formats';
import { brandLogos, generateDesign, type Variation } from '../generator';
import { ensureFonts } from '../lib/fonts';
import { renderThumbnail } from '../lib/renderer';
import { newProject, withThumbnails } from '../lib/projects';
import { Field, Loader } from '../components/ui';
import { ImagePicker } from '../components/ImagePicker';

export function FormatPicker({ value, onChange, disabled }: { value: FormatId; onChange: (f: FormatId) => void; disabled?: FormatId[] }) {
  return (
    <div className="opt-grid three">
      {(Object.values(FORMATS)).map((f) => (
        <button key={f.id} type="button" className={`opt ${value === f.id ? 'on' : ''}`} disabled={disabled?.includes(f.id)} style={disabled?.includes(f.id) ? { opacity: 0.4 } : undefined} onClick={() => onChange(f.id)}>
          <b><span className="fmt-shape" style={{ width: 12, height: 12 * (f.height / f.width) }} /> {f.ratio}</b>
          <span>{f.width}×{f.height}</span>
        </button>
      ))}
    </div>
  );
}

export function DirectionPicker({ value, onChange }: { value: Direction; onChange: (d: Direction) => void }) {
  return (
    <div className="opt-grid">
      {DIRECTIONS.map((d) => (
        <button key={d.id} type="button" className={`opt ${value === d.id ? 'on' : ''}`} onClick={() => onChange(d.id)} data-testid={`dir-${d.id}`}>
          <b><span className="letter">{d.id}</span>{d.label}</b>
          <span>{d.description}</span>
        </button>
      ))}
    </div>
  );
}

export function CreateDesignPage() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { settings, brandKits, activeBrandKitId, setActiveBrandKit, assets, createProject, toast } = useApp();
  const brand = useApp((s) => s.activeBrand());
  const [type, setType] = useState<DesignType>((params.get('type') as DesignType) || 'static');
  const [format, setFormat] = useState<FormatId>(settings.defaultFormat);
  const [direction, setDirection] = useState<Direction>('A');
  const [kicker, setKicker] = useState('');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [body, setBody] = useState('');
  const [handle, setHandle] = useState(brand.handle);
  const [images, setImages] = useState<string[]>([]);
  const [variations, setVariations] = useState<(Variation & { thumb?: string })[]>([]);
  const [busy, setBusy] = useState(false);
  const [seed, setSeed] = useState(() => Date.now());

  useEffect(() => setHandle(brand.handle), [brand.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (type === 'reels') setFormat('story'); if (type === 'carousel') nav('/carousel'); }, [type, nav]);
  useEffect(() => { if ((type === 'photo' || type === 'editorial') && !['B', 'D', 'E'].includes(direction)) setDirection(type === 'photo' ? 'D' : 'B'); }, [type]); // eslint-disable-line react-hooks/exhaustive-deps

  const needsImage = DIRECTIONS.find((d) => d.id === direction)!.needsImage || type === 'photo' || type === 'editorial';

  const generate = async (newSeed = seed) => {
    if (!title.trim()) { toast('Escreva ao menos o título da peça', 'error'); return; }
    setBusy(true);
    try {
      await ensureFonts([brand.headingFont, brand.bodyFont, brand.accentFont].flatMap((f) => [{ family: f.family, weight: f.weight }, { family: f.family, weight: 600 }, { family: f.family, weight: f.weight, italic: true }]));
      const vars = generateDesign({
        brand, ...brandLogos(brand, assets), format, type, direction, images, seed: newSeed,
        content: { kicker: kicker.trim() || undefined, title: title.trim(), subtitle: subtitle.trim() || undefined, body: body.trim() || undefined, handle: handle.trim() || undefined },
      }, 6);
      setVariations(vars);
      const withThumbs = [];
      for (const v of vars) withThumbs.push({ ...v, thumb: await renderThumbnail(v.page, format, 420) });
      setVariations(withThumbs);
    } catch (e) {
      toast('Erro ao gerar: ' + (e as Error).message, 'error');
    } finally { setBusy(false); }
  };

  const save = async (v: Variation, open: boolean) => {
    const proj = await withThumbnails(newProject({
      name: title.trim().slice(0, 60) || 'Novo design', kind: 'design', designType: type, format, direction,
      pages: [{ ...v.page, name: 'Página 1' }], brandKitId: brand.id,
    }));
    await createProject(proj);
    if (open) nav(`/editor/${proj.id}`);
    else toast('Salvo na Design Library');
  };

  const f = FORMATS[format];

  return (
    <div className="page" style={{ maxWidth: 1400 }}>
      <div className="page-head">
        <div>
          <div className="eyebrow">Design Generator</div>
          <h1 className="page-title">Criar design</h1>
          <p className="page-sub">Escolha o tipo de peça, o formato e a direção visual. O gerador compõe variações com o seu Brand Kit — todas totalmente editáveis, camada por camada.</p>
        </div>
      </div>

      <div className="gen-layout">
        <form className="card gen-form" onSubmit={(e) => { e.preventDefault(); generate(); }}>
          <Field label="Tipo de peça">
            <div className="opt-grid">
              {DESIGN_TYPES.map((t) => (
                <button key={t.id} type="button" className={`opt ${type === t.id ? 'on' : ''}`} onClick={() => setType(t.id)} data-testid={`type-${t.id}`}>
                  <b>{t.label}</b><span>{t.description}</span>
                </button>
              ))}
            </div>
          </Field>
          <Field label="Formato" hint={type === 'reels' ? 'Capas de Reels usam 9:16 com área segura 3:4 para o grid do perfil.' : undefined}>
            <FormatPicker value={format} onChange={setFormat} disabled={type === 'reels' ? ['portrait', 'square'] : undefined} />
          </Field>
          <Field label="Direção visual"><DirectionPicker value={direction} onChange={setDirection} /></Field>
          <Field label="Brand Kit">
            <select className="select" value={activeBrandKitId ?? ''} onChange={(e) => setActiveBrandKit(e.target.value)}>
              {brandKits.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
            </select>
          </Field>
          <hr className="divider" style={{ margin: 0 }} />
          <Field label="Título *"><textarea className="textarea" rows={2} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="A mensagem principal da peça" data-testid="input-title" /></Field>
          <div className="grid-2">
            <Field label="Chamada (opcional)"><input className="input" value={kicker} onChange={(e) => setKicker(e.target.value)} placeholder="Ex.: Guia rápido" /></Field>
            <Field label="@ / assinatura"><input className="input" value={handle} onChange={(e) => setHandle(e.target.value)} /></Field>
          </div>
          <Field label="Subtítulo (opcional)"><input className="input" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} /></Field>
          <Field label="Texto de apoio (opcional)" hint="Uma linha por item gera layout de lista em composições compatíveis."><textarea className="textarea" rows={3} value={body} onChange={(e) => setBody(e.target.value)} /></Field>
          <Field label={`Imagens ${needsImage ? '(recomendado para esta direção)' : '(opcional)'}`} hint="Selecione na ordem de preferência. As fotos são distribuídas entre as variações.">
            <ImagePicker selected={images} onChange={setImages} max={6} limit={24} />
          </Field>
          {needsImage && !images.length && (
            <p className="small" style={{ margin: 0, color: '#8A6A1F', display: 'flex', gap: 6 }}><ImageOff size={14} /> Sem foto, as composições fotográficas terão um espaço reservado para você preencher no editor.</p>
          )}
          <button className="btn primary lg" type="submit" disabled={busy} data-testid="generate"><Sparkles /> {busy ? 'Gerando…' : 'Gerar composições'}</button>
        </form>

        <div>
          {!variations.length && !busy && (
            <div className="card empty">
              <h3>Suas composições aparecem aqui</h3>
              <p>Preencha o título e clique em “Gerar composições”. Cada variação é um documento de camadas editáveis, não uma imagem.</p>
            </div>
          )}
          {(variations.length > 0 || busy) && (
            <>
              <div className="row" style={{ marginBottom: 16 }}>
                <span className="h-label">{variations.length} variações · {f.width}×{f.height}</span>
                <div className="spacer" />
                <button className="btn sm" disabled={busy} onClick={() => { const s = Date.now(); setSeed(s); generate(s); }}><RefreshCw /> Novas variações</button>
              </div>
              <div className="var-grid" data-testid="variations">
                {variations.map((v) => (
                  <div key={v.key} className="var-card">
                    <div className="p-thumb" style={{ aspectRatio: `${f.width}/${f.height}` }}>
                      {v.thumb ? <img src={v.thumb} alt={v.layoutLabel} /> : <Loader />}
                      <div className="var-actions">
                        <button className="btn primary sm" style={{ flex: 1 }} onClick={() => save(v, true)} data-testid="edit-variation"><PencilLine /> Editar</button>
                        <button className="btn sm" onClick={() => save(v, false)} title="Salvar na biblioteca"><Save /></button>
                      </div>
                    </div>
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 500 }}>{v.layoutLabel}</span>
                      <span className="muted small">{v.paletteVariant ? 'Paleta alternativa' : 'Paleta principal'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
