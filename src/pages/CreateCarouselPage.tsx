import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDown, ArrowUp, ClipboardPaste, Images, PencilLine, Plus, RefreshCw, Sparkles, Trash2, X } from 'lucide-react';
import type { Direction, FormatId, Page } from '../types';
import { useApp } from '../store/appStore';
import { stripMarkup } from '../lib/richText';
import { FORMATS, DIRECTIONS } from '../lib/formats';
import { brandLogos, generateCarousel, prepareBrandFonts, type CarouselSlideInput } from '../generator';
import { renderThumbnail } from '../lib/renderer';
import { newProject, withThumbnails } from '../lib/projects';
import { MAX_SLIDES, MIN_SLIDES } from '../store/editorStore';
import { Field, Loader, Modal, Toggle } from '../components/ui';
import { ImagePicker } from '../components/ImagePicker';
import { AssetImage } from '../components/AssetImage';
import { DirectionPicker, FormatPicker } from './CreateDesignPage';

const emptySlide = (): CarouselSlideInput => ({ title: '', body: '', kicker: '', imageId: null });

const STARTER: CarouselSlideInput[] = [
  { title: 'Uma mulher que aprende a orar pela sua casa, aprende a ==se posicionar diante de Deus==', body: 'Aprenda a guerrear em oração', kicker: '', imageId: null },
  { title: '', body: 'A oração por sua casa não começa quando surge um problema, uma crise familiar ou uma situação que você não consegue resolver.\n\nEla começa quando você entende que sua família precisa de mais do que seus esforços humanos: precisa ser conduzida pelos princípios de Deus.\n\n**📌 Salve este post para voltar aqui sempre que precisar.**', kicker: '', imageId: null },
  { title: '1. Ela aprende a interceder.', body: 'Em 1 Samuel 1, encontramos Ana, uma mulher que derramou sua alma diante do Senhor em meio a uma profunda aflição.\n\nAprenda com Ana: você não precisa carregar sozinha aquilo que pode apresentar ao Pai.\n\n***Ore pelos seus filhos, pelo seu casamento, pela sua família e pelas situações que precisam da direção de Deus.***', kicker: '', imageId: null },
  { title: '2. Ela se posiciona pela Palavra.', body: 'Em Josué 24:15, Josué declarou diante do povo:\n"Eu e a minha casa serviremos ao Senhor."\n\n***Uma mulher que deseja ver sua casa firmada no Senhor precisa começar vivendo os princípios que deseja ensinar.***', kicker: '', imageId: null },
  { title: 'Salve para ==voltar aqui== sempre que precisar', body: 'Compartilhe com uma mulher que precisa ler isso hoje.', kicker: '', imageId: null },
];

/** Converte um roteiro em slides: blocos separados por linha em branco ou "---" */
export function parseScript(text: string): CarouselSlideInput[] {
  return text
    .split(/\n\s*(?:---+)?\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean)
    .slice(0, MAX_SLIDES)
    .map((block) => {
      const [first, ...rest] = block.split('\n');
      return { title: first.replace(/^#+\s*|^\d+[.)]\s*/, '').trim(), body: rest.join('\n').trim(), kicker: '', imageId: null };
    });
}

export function CreateCarouselPage() {
  const nav = useNavigate();
  const { settings, brandKits, activeBrandKitId, setActiveBrandKit, assets, createProject, toast } = useApp();
  const brand = useApp((s) => s.activeBrand());
  const [format, setFormat] = useState<FormatId>(settings.defaultFormat === 'story' ? 'portrait' : settings.defaultFormat);
  const [direction, setDirection] = useState<Direction>('P');
  const [navText, setNavText] = useState('Passe');
  const [slides, setSlides] = useState<CarouselSlideInput[]>(STARTER);
  const [handle, setHandle] = useState(brand.handle);
  const [cta, setCta] = useState('Siga para mais conteúdos');
  const [lastIsCta, setLastIsCta] = useState(true);
  const [name, setName] = useState('');
  const [pages, setPages] = useState<Page[]>([]);
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [pickFor, setPickFor] = useState<number | null>(null);
  const [scriptOpen, setScriptOpen] = useState(false);
  const [script, setScript] = useState('');
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulk, setBulk] = useState<string[]>([]);

  const setSlide = (i: number, patch: Partial<CarouselSlideInput>) => setSlides((s) => s.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const move = (i: number, d: number) => setSlides((s) => { const n = [...s]; const [x] = n.splice(i, 1); n.splice(i + d, 0, x); return n; });

  const generate = async () => {
    if (slides.length < MIN_SLIDES) return toast(`O carrossel precisa de ao menos ${MIN_SLIDES} slides`, 'error');
    if (!slides[0].title.trim()) return toast('A capa precisa de um título', 'error');
    if (slides.some((s) => !s.title.trim() && !s.body.trim())) return toast('Há slides vazios — preencha título ou texto', 'error');
    setBusy(true);
    try {
      await prepareBrandFonts(brand);
      const out = generateCarousel({ brand, ...brandLogos(brand, assets), format, direction, slides, handle, cta, nav: navText, lastIsCta, seed: Date.now() });
      setPages(out);
      setThumbs([]);
      const t: string[] = [];
      for (const p of out) { t.push(await renderThumbnail(p, format, 360)); setThumbs([...t]); }
    } catch (e) {
      toast('Erro ao gerar: ' + (e as Error).message, 'error');
    } finally { setBusy(false); }
  };

  const open = async () => {
    const proj = await withThumbnails(newProject({
      name: name.trim() || stripMarkup(slides[0].title).slice(0, 60) || 'Novo carrossel', kind: 'carousel', designType: 'carousel', format, direction, pages, brandKitId: brand.id,
    }));
    await createProject(proj);
    nav(`/editor/${proj.id}`);
  };

  const f = FORMATS[format];
  const dir = DIRECTIONS.find((d) => d.id === direction)!;

  return (
    <div className="page" style={{ maxWidth: 1400 }}>
      <div className="page-head">
        <div>
          <div className="eyebrow">Sistema de carrosséis</div>
          <h1 className="page-title">Criar carrossel</h1>
          <p className="page-sub">De 3 a 10 slides, cada um com texto, imagem e composição próprios. A direção visual garante unidade — margens, tipografia, cores e elementos recorrentes — sem repetir o mesmo layout.</p>
        </div>
      </div>

      <div className="gen-layout">
        <div className="card gen-form">
          <Field label="Nome do carrossel"><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={slides[0]?.title || 'Sem título'} /></Field>
          <Field label="Formato"><FormatPicker value={format} onChange={setFormat} /></Field>
          <Field label="Direção visual"><DirectionPicker value={direction} onChange={setDirection} /></Field>
          <Field label="Brand Kit">
            <select className="select" value={activeBrandKitId ?? ''} onChange={(e) => setActiveBrandKit(e.target.value)}>
              {brandKits.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
            </select>
          </Field>
          <div className="grid-2">
            <Field label="@ / assinatura"><input className="input" value={handle} onChange={(e) => setHandle(e.target.value)} /></Field>
            <Field label="Texto do botão (CTA)"><input className="input" value={cta} onChange={(e) => setCta(e.target.value)} /></Field>
          </div>
          <Field label="Texto do botão de navegação" hint="Aparece com a seta em todos os slides, exceto o último."><input className="input" value={navText} onChange={(e) => setNavText(e.target.value)} /></Field>
          <Toggle checked={lastIsCta} onChange={setLastIsCta} label="Último slide é de encerramento (CTA)" />
          {dir.needsImage && slides.filter((s) => s.imageId).length === 0 && (
            <p className="small" style={{ margin: 0, color: '#8A6A1F' }}>A direção “{dir.label}” é fotográfica: adicione fotos aos slides. Slides sem foto recebem composição tipográfica coerente.</p>
          )}
          <button className="btn primary lg" onClick={generate} disabled={busy} data-testid="generate-carousel"><Sparkles /> {busy ? 'Gerando…' : pages.length ? 'Gerar novamente' : 'Gerar carrossel'}</button>
        </div>

        <div className="stack" style={{ gap: 22 }}>
          {(pages.length > 0 || busy) && (
            <div className="card card-pad">
              <div className="row" style={{ marginBottom: 14 }}>
                <span className="h-label">Prévia · {pages.length} slides · {f.ratio}</span>
                <div className="spacer" />
                <button className="btn sm" onClick={generate} disabled={busy}><RefreshCw /> Outra versão</button>
                <button className="btn primary sm" onClick={open} disabled={busy || !pages.length} data-testid="open-carousel"><PencilLine /> Abrir no editor</button>
              </div>
              <div className="car-preview" data-testid="carousel-preview">
                {pages.map((p, i) => (
                  <div key={p.id} className="p-thumb" style={{ aspectRatio: `${f.width}/${f.height}` }}>{thumbs[i] ? <img src={thumbs[i]} alt={`Slide ${i + 1}`} /> : <Loader />}</div>
                ))}
              </div>
            </div>
          )}

          <div className="card card-pad">
            <div className="row wrap" style={{ marginBottom: 16 }}>
              <div>
                <h2 className="section-title">Roteiro dos slides</h2>
                <p className="section-sub" style={{ margin: 0 }}>{slides.length} de {MAX_SLIDES} slides · mínimo {MIN_SLIDES}. Marcações: <code>==destaque==</code>, <code>**negrito**</code>, <code>*itálico*</code>, <code>***negrito itálico***</code>. Linha em branco separa parágrafos.</p>
              </div>
              <div className="spacer" />
              <button className="btn sm" onClick={() => setScriptOpen(true)}><ClipboardPaste /> Colar roteiro</button>
              <button className="btn sm" onClick={() => { setBulk(slides.map((s) => s.imageId).filter(Boolean) as string[]); setBulkOpen(true); }}><Images /> Distribuir fotos</button>
            </div>
            <div className="slide-rows">
              {slides.map((s, i) => (
                <div key={i} className="card slide-row" data-testid={`slide-row-${i}`}>
                  <div className="stack" style={{ gap: 4, alignItems: 'center' }}>
                    <span className="num">{String(i + 1).padStart(2, '0')}</span>
                    <button className="icon-btn sm" disabled={i === 0} onClick={() => move(i, -1)} title="Subir"><ArrowUp /></button>
                    <button className="icon-btn sm" disabled={i === slides.length - 1} onClick={() => move(i, 1)} title="Descer"><ArrowDown /></button>
                  </div>
                  <div className="stack" style={{ gap: 8 }}>
                    <span className="tag">{i === 0 ? 'Capa' : i === slides.length - 1 && lastIsCta ? 'Encerramento / CTA' : 'Conteúdo'}</span>
                    <input className="input" value={s.title} onChange={(e) => setSlide(i, { title: e.target.value })} placeholder={i === 0 ? 'Título da capa — use ==trecho== para destacar' : 'Título (opcional) — ex.: 1. Ela aprende a interceder.'} />
                    <textarea className="textarea" rows={i === 0 ? 2 : 5} value={s.body} onChange={(e) => setSlide(i, { body: e.target.value })} placeholder={i === 0 ? 'Subtítulo da capa (opcional)' : 'Texto do slide (opcional)'} />
                    <div className="row">
                      <input className="input sm" style={{ maxWidth: 220 }} value={s.kicker ?? ''} onChange={(e) => setSlide(i, { kicker: e.target.value })} placeholder="Chamada (opcional)" />
                      <div className="spacer" />
                      <button className="icon-btn sm" disabled={slides.length <= MIN_SLIDES} onClick={() => setSlides((x) => x.filter((_, j) => j !== i))} title="Remover slide"><Trash2 /></button>
                    </div>
                  </div>
                  <div className="img-slot" onClick={() => setPickFor(i)} title="Escolher imagem">
                    {s.imageId ? <AssetImage id={s.imageId} /> : <span>+ Imagem</span>}
                    {s.imageId && <button className="icon-btn sm" style={{ position: 'absolute', top: 3, right: 3, background: 'rgba(255,255,255,.9)' }} onClick={(e) => { e.stopPropagation(); setSlide(i, { imageId: null }); }}><X /></button>}
                  </div>
                </div>
              ))}
            </div>
            {slides.length < MAX_SLIDES && (
              <button className="btn block" style={{ marginTop: 12 }} onClick={() => setSlides((s) => (lastIsCta ? [...s.slice(0, -1), emptySlide(), s[s.length - 1]] : [...s, emptySlide()]))} data-testid="add-slide-row"><Plus /> Adicionar slide</button>
            )}
          </div>
        </div>
      </div>

      {pickFor !== null && (
        <Modal title={`Imagem do slide ${pickFor + 1}`} onClose={() => setPickFor(null)} wide>
          <ImagePicker multiple={false} selected={slides[pickFor].imageId ? [slides[pickFor].imageId!] : []} onChange={(ids) => { setSlide(pickFor, { imageId: ids[0] ?? null }); if (ids[0]) setPickFor(null); }} columns={6} allowDelete />
        </Modal>
      )}
      {scriptOpen && (
        <Modal title="Colar roteiro" onClose={() => setScriptOpen(false)} wide footer={
          <>
            <button className="btn" onClick={() => setScriptOpen(false)}>Cancelar</button>
            <button className="btn primary" onClick={() => {
              const parsed = parseScript(script);
              if (parsed.length < MIN_SLIDES) return toast(`Encontrados ${parsed.length} blocos — são necessários ao menos ${MIN_SLIDES}`, 'error');
              setSlides(parsed.map((p, i) => ({ ...p, imageId: slides[i]?.imageId ?? null })));
              setScriptOpen(false);
              toast(`${parsed.length} slides criados a partir do roteiro`);
            }}>Criar slides</button>
          </>
        }>
          <p className="muted small" style={{ marginTop: 0 }}>Separe os slides com uma linha em branco (ou “---”). A primeira linha de cada bloco vira o título; as demais, o texto. Máximo de {MAX_SLIDES} slides.</p>
          <textarea className="textarea" rows={14} value={script} onChange={(e) => setScript(e.target.value)} placeholder={'Título da capa\nSubtítulo\n\nPrimeiro ponto\nExplicação do ponto\n\nSegundo ponto\nItem A\nItem B\nItem C\n\nSalve este post'} />
        </Modal>
      )}
      {bulkOpen && (
        <Modal title="Distribuir fotos entre os slides" onClose={() => setBulkOpen(false)} wide footer={
          <>
            <button className="btn" onClick={() => setBulkOpen(false)}>Cancelar</button>
            <button className="btn primary" onClick={() => {
              setSlides((s) => s.map((x, i) => ({ ...x, imageId: bulk[i] ?? null })));
              setBulkOpen(false);
            }}>Aplicar na ordem</button>
          </>
        }>
          <p className="muted small" style={{ marginTop: 0 }}>Selecione as fotos na ordem dos slides (1ª foto → slide 1). Slides sem foto ficam tipográficos.</p>
          <ImagePicker selected={bulk} onChange={setBulk} max={slides.length} columns={6} allowDelete />
        </Modal>
      )}
    </div>
  );
}
