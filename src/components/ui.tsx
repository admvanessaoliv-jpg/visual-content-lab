import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Upload, X } from 'lucide-react';
import { normalizeHex } from '../lib/color';
import { useApp } from '../store/appStore';

export function Modal({ title, onClose, children, footer, wide }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return createPortal(
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-label={title}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar"><X /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function Toasts() {
  const toasts = useApp((s) => s.toasts);
  const dismiss = useApp((s) => s.dismissToast);
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.tone}`} onClick={() => dismiss(t.id)}>{t.message}</div>
      ))}
    </div>
  );
}

export function Field({ label, hint, children }: { label?: string; hint?: string; children: ReactNode }) {
  return (
    <div className="field">
      {label && <label>{label}</label>}
      {children}
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

export function Segmented<T extends string | number>({ value, options, onChange, full }: { value: T; options: { value: T; label: ReactNode; title?: string }[]; onChange: (v: T) => void; full?: boolean }) {
  return (
    <div className={`segmented ${full ? 'full' : ''}`}>
      {options.map((o) => (
        <button key={String(o.value)} type="button" title={o.title} className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: ReactNode }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="track" />
      {label}
    </label>
  );
}

export function ColorField({ value, onChange, swatches, size }: { value: string; onChange: (v: string) => void; swatches?: string[]; size?: 'sm' }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className={`color-field ${size ?? ''}`}>
        <div className="color-well" style={{ background: value }}>
          <input type="color" value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#000000'} onChange={(e) => onChange(e.target.value.toUpperCase())} aria-label="Selecionar cor" />
        </div>
        <input
          className={`input ${size ?? ''}`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => { const h = normalizeHex(text); h ? onChange(h) : setText(value); }}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          maxLength={7}
        />
      </div>
      {swatches && swatches.length > 0 && (
        <div className="row wrap" style={{ gap: 5 }}>
          {swatches.map((s, i) => (
            <button key={s + i} type="button" className={`swatch sm ${s.toLowerCase() === value.toLowerCase() ? 'on' : ''}`} style={{ background: s }} title={s} onClick={() => onChange(s)} />
          ))}
        </div>
      )}
    </div>
  );
}

export function Slider({ value, min, max, step = 1, onChange, suffix }: { value: number; min: number; max: number; step?: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <div className="slider">
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} />
      <div className="num-field"><input type="number" value={+value.toFixed(2)} step={step} onChange={(e) => e.target.value !== '' && onChange(+e.target.value)} />{suffix && <span style={{ paddingRight: 6 }}>{suffix}</span>}</div>
    </div>
  );
}

/** Campo numérico com rótulo arrastável (scrub) como em ferramentas de design */
export function NumField({ label, value, onChange, step = 1, min, max, title }: { label: string; value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; title?: string }) {
  const [text, setText] = useState(String(Math.round(value * 100) / 100));
  useEffect(() => setText(String(Math.round(value * 100) / 100)), [value]);
  const clampV = (v: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, v));
  const startRef = useRef<{ x: number; v: number } | null>(null);
  return (
    <div className="num-field" title={title}>
      <span
        onPointerDown={(e) => { startRef.current = { x: e.clientX, v: value }; (e.target as HTMLElement).setPointerCapture(e.pointerId); }}
        onPointerMove={(e) => { if (startRef.current) onChange(clampV(+(startRef.current.v + Math.round((e.clientX - startRef.current.x) / 2) * step).toFixed(2))); }}
        onPointerUp={() => { startRef.current = null; }}
      >{label}</span>
      <input
        type="number" value={text} step={step}
        onChange={(e) => { setText(e.target.value); if (e.target.value !== '' && !Number.isNaN(+e.target.value)) onChange(clampV(+e.target.value)); }}
        onBlur={() => setText(String(Math.round(value * 100) / 100))}
      />
    </div>
  );
}

export function Dropzone({ onFiles, accept, multiple = true, children, compact }: { onFiles: (f: File[]) => void; accept: string; multiple?: boolean; children?: ReactNode; compact?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <div
      className={`dropzone ${over ? 'over' : ''}`}
      style={compact ? { padding: 14 } : undefined}
      onClick={() => input.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); if (e.dataTransfer.files.length) onFiles(Array.from(e.dataTransfer.files)); }}
      role="button" tabIndex={0}
    >
      <Upload />
      <div>{children ?? 'Arraste imagens ou clique para enviar'}</div>
      <input ref={input} type="file" accept={accept} multiple={multiple} hidden onChange={(e) => { if (e.target.files?.length) onFiles(Array.from(e.target.files)); e.target.value = ''; }} />
    </div>
  );
}

export function useClickOutside(ref: React.RefObject<HTMLElement | null>, cb: () => void, active = true) {
  useEffect(() => {
    if (!active) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) cb(); };
    setTimeout(() => window.addEventListener('mousedown', h));
    return () => window.removeEventListener('mousedown', h);
  }, [ref, cb, active]);
}

export function Loader() { return <span className="loader" />; }

export function confirmDialog(msg: string) { return window.confirm(msg); }
