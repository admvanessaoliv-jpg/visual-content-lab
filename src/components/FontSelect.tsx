import { allFonts, ensureFont } from '../lib/fonts';
import { useEffect } from 'react';

const GROUPS: Record<string, string> = { serif: 'Serifadas', sans: 'Sem serifa', display: 'Display', mono: 'Monoespaçadas', custom: 'Fontes da marca' };

export function FontSelect({ value, onChange, size }: { value: string; onChange: (family: string) => void; size?: 'sm' }) {
  const fonts = allFonts();
  useEffect(() => { ensureFont(value); }, [value]);
  const groups = Object.keys(GROUPS).map((g) => ({ g, items: fonts.filter((f) => f.category === g) })).filter((x) => x.items.length);
  return (
    <select className={`select ${size ?? ''}`} value={value} onChange={(e) => onChange(e.target.value)} style={{ fontFamily: `"${value}"` }}>
      {!fonts.some((f) => f.family === value) && <option value={value}>{value}</option>}
      {groups.map(({ g, items }) => (
        <optgroup key={g} label={GROUPS[g]}>
          {items.map((f) => <option key={f.family} value={f.family}>{f.family}</option>)}
        </optgroup>
      ))}
    </select>
  );
}

export function WeightSelect({ family, value, onChange, size }: { family: string; value: number; onChange: (w: number) => void; size?: 'sm' }) {
  const def = allFonts().find((f) => f.family === family);
  const weights = def?.weights ?? [400, 700];
  const names: Record<number, string> = { 100: 'Thin', 200: 'Extra Light', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold', 800: 'Extra Bold', 900: 'Black' };
  return (
    <select className={`select ${size ?? ''}`} value={value} onChange={(e) => onChange(+e.target.value)}>
      {!weights.includes(value) && <option value={value}>{value}</option>}
      {weights.map((w) => <option key={w} value={w}>{names[w] ?? w} · {w}</option>)}
    </select>
  );
}
