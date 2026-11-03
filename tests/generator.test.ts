import { describe, expect, it, beforeAll } from 'vitest';
import { setMeasurer, fitFontSize, wrapLines } from '../src/lib/measure';
import { makeBrandKit } from '../src/lib/defaults';
import { FORMATS } from '../src/lib/formats';
import type { Direction, FormatId } from '../src/types';

// medidor aproximado (0.55em por caractere) — o navegador usa canvas real
beforeAll(() => setMeasurer((t, font) => t.length * parseFloat(font.match(/(\d+(?:\.\d+)?)px/)![1]) * 0.55));

describe('measure', () => {
  it('quebra linhas respeitando a largura', () => {
    const lines = wrapLines('um dois três quatro cinco seis', { fontFamily: 'X', fontWeight: 400, lineHeight: 1.2 }, 20, 100);
    expect(lines.length).toBeGreaterThan(1);
  });
  it('ajusta o tamanho para caber na caixa', () => {
    const spec = { fontFamily: 'X', fontWeight: 400, lineHeight: 1.1 };
    const size = fitFontSize('Título bastante longo para testar ajuste', spec, 400, 200, 200);
    expect(size).toBeLessThan(200);
    expect(size).toBeGreaterThan(14);
  });
});

describe('gerador', async () => {
  const { generateDesign, generateCarousel, applyBrandToPages } = await import('../src/generator');
  const brand = makeBrandKit();
  const dirs: Direction[] = ['A', 'B', 'C', 'D', 'E', 'F'];
  const formats: FormatId[] = ['portrait', 'square', 'story'];

  it('gera variações editáveis para todos os tipos, direções e formatos', () => {
    for (const format of formats) for (const direction of dirs) for (const type of ['static', 'reels', 'editorial', 'photo', 'typographic'] as const) {
      const v = generateDesign({ brand, format, type, direction, images: [], content: { title: 'Um título de teste', body: 'Texto', kicker: 'Chamada', handle: '@x' }, seed: 1 });
      expect(v.length).toBeGreaterThan(0);
      for (const { page } of v) {
        expect(page.elements.length).toBeGreaterThan(0);
        for (const el of page.elements) {
          expect(Number.isFinite(el.x) && Number.isFinite(el.y) && el.width > 0).toBe(true);
        }
        const texts = page.elements.filter((e) => e.type === 'text' && e.name !== 'Textura de fundo');
        // título dentro da página
        const W = FORMATS[format].width;
        for (const t of texts) expect(t.x + t.width).toBeLessThanOrEqual(W + 1);
      }
    }
  });

  it('carrossel mantém quantidade de slides, capa e CTA, com composições variadas', () => {
    for (const direction of dirs) {
      const slides = Array.from({ length: 7 }, (_, i) => ({ title: `Slide ${i + 1}`, body: i === 3 ? 'a\nb\nc' : 'texto', imageId: i % 2 ? 'img' : null }));
      const pages = generateCarousel({ brand, format: 'portrait', direction, slides, handle: '@x', cta: 'Siga', lastIsCta: true, seed: 42 });
      expect(pages).toHaveLength(7);
      const sig = new Set(pages.map((p) => p.elements.map((e) => e.type).join()));
      expect(sig.size).toBeGreaterThan(2);
      expect(pages[6].elements.some((e) => e.name === 'Botão')).toBe(true);
    }
  });

  it('texto rico: marcações, capitular e ajuste à caixa', async () => {
    const { layoutRich, stripMarkup } = await import('../src/lib/richText');
    const style = { fontFamily: 'X', fontWeight: 400, italic: false, fontSize: 40, lineHeight: 1, letterSpacing: 0, align: 'left' as const, uppercase: false, fill: '#000',
      highlightColor: '#0f0', highlightFamily: 'Y', highlightItalic: true, highlightWeight: 400, boldWeight: 700, dropCap: { family: 'Z', scale: 2 }, paragraphSpacing: 1 };
    const L = layoutRich('Uma frase com ==destaque== e **negrito**\n\nNovo parágrafo', style, 500);
    expect(L.segs.some((s) => s.color === '#0f0' && s.font.includes('italic') && s.text === 'destaque')).toBe(true);
    expect(L.segs.some((s) => s.text === 'negrito' && s.font.startsWith('700'))).toBe(true);
    expect(L.segs[0].text).toBe('U');
    expect(L.segs[0].font).toContain('"Z"');
    expect(stripMarkup('a ==b== **c**')).toBe('a b c');
  });

  it('carrossel premium segue a estrutura das referências', () => {
    const slides = [
      { title: 'Uma mulher que ora ==se posiciona==', body: 'Subtítulo', imageId: 'img' },
      { title: '', body: 'Parágrafo um.\n\nParágrafo dois.', imageId: null },
      { title: '1. Ela intercede.', body: 'Texto.\n\n***Ênfase.***', imageId: null },
      { title: 'Salve', body: 'Compartilhe', imageId: null },
    ];
    const pages = generateCarousel({ brand, format: 'portrait', direction: 'P', slides, handle: '@x', cta: 'Siga', nav: 'Passe', lastIsCta: true, seed: 1 });
    expect(pages[0].elements.some((e) => e.type === 'text' && e.rich && e.dropCap)).toBe(true);
    expect(pages[0].background.grain).toBeGreaterThan(0);
    expect(pages[1].elements.some((e) => e.name === 'Navegação · pílula')).toBe(true);
    expect(pages[3].elements.some((e) => e.name === 'Navegação · pílula')).toBe(false);
  });

  it('reaplica Brand Kit por papel de cor e tipografia', () => {
    const [v] = generateDesign({ brand, format: 'portrait', type: 'typographic', direction: 'A', images: [], content: { title: 'Olá' }, seed: 3 });
    const other = makeBrandKit({ colors: { ...brand.colors, text: '#FF0000', background: '#00FF00' }, headingFont: { family: 'Anton', weight: 400 } });
    const [p] = applyBrandToPages([v.page], other);
    const heading = p.elements.find((e) => e.type === 'text' && e.role === 'heading');
    expect(heading && heading.type === 'text' && heading.fontFamily).toBe('Anton');
    expect(p.background.color).toBe(other.colors[p.background.colorRole!]);
  });
});
