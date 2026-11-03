import { Trash2 } from 'lucide-react';
import { useApp } from '../store/appStore';
import { ACCEPTED_IMAGES } from '../lib/assets';
import { AssetImage } from './AssetImage';
import { Dropzone, confirmDialog } from './ui';

interface Props {
  selected: string[];
  onChange: (ids: string[]) => void;
  multiple?: boolean;
  max?: number;
  columns?: number;
  tags?: string[];
  allowDelete?: boolean;
  limit?: number;
}

/** Galeria de imagens do usuário com upload e seleção ordenada */
export function ImagePicker({ selected, onChange, multiple = true, max = 10, columns = 4, tags = [], allowDelete, limit = 60 }: Props) {
  const assets = useApp((s) => s.assets).filter((a) => a.kind === 'image');
  const upload = useApp((s) => s.uploadImages);
  const del = useApp((s) => s.deleteAsset);

  const toggle = (id: string) => {
    if (!multiple) return onChange(selected[0] === id ? [] : [id]);
    if (selected.includes(id)) onChange(selected.filter((x) => x !== id));
    else if (selected.length < max) onChange([...selected, id]);
  };

  return (
    <div className="stack" style={{ gap: 10 }}>
      <Dropzone accept={ACCEPTED_IMAGES} compact onFiles={async (f) => {
        const added = await upload(f, tags);
        if (added.length) onChange(multiple ? [...selected, ...added.map((a) => a.id)].slice(0, max) : [added[0].id]);
      }}>Enviar fotos (JPG, PNG, WEBP)</Dropzone>
      {assets.length > 0 && (
        <div className="img-pick-grid" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {assets.slice(0, limit).map((a) => {
            const n = selected.indexOf(a.id);
            return (
              <div key={a.id} className={`img-pick ${n >= 0 ? 'on' : ''}`} onClick={() => toggle(a.id)} title={a.name} role="button">
                <AssetImage id={a.id} alt={a.name} />
                {n >= 0 && <span className="n">{multiple ? n + 1 : '✓'}</span>}
                {allowDelete && (
                  <button className="icon-btn sm del" style={{ background: 'rgba(255,255,255,.92)' }} title="Excluir da biblioteca"
                    onClick={(e) => { e.stopPropagation(); if (confirmDialog('Excluir esta imagem da biblioteca? Designs que a usam mostrarão um espaço vazio.')) { del(a.id); onChange(selected.filter((x) => x !== a.id)); } }}>
                    <Trash2 />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
