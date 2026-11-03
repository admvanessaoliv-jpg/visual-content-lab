// Validação ponta a ponta no Chromium (Playwright).
// Uso: npm run build && npm run preview (em outro terminal) && npm run e2e
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
import fs from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';

const BASE = process.env.BASE_URL || 'http://localhost:4173/';
const OUT = process.env.SHOTS || 'test-results';
const FIX = path.resolve('tests/fixtures');
fs.mkdirSync(OUT, { recursive: true });

let failures = 0;
const ok = (cond, msg) => { console.log(`${cond ? '✔' : '✘'} ${msg}`); if (!cond) failures++; };
const pngSize = (buf) => ({ w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const state = (fn) => page.evaluate(fn);
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });

// ---------------------------------------------------------------- Dashboard
await page.goto(BASE);
await page.waitForSelector('.page-title');
ok(await page.locator('text=O que vamos criar').count() > 0, 'Dashboard carrega');
await shot('01-dashboard');

// ---------------------------------------------------------------- Brand Kit
await page.click('a[href="#/brand"]');
await page.fill('[data-testid=brand-name]', 'Atelier Norte');
const [logoChooser] = await Promise.all([page.waitForEvent('filechooser'), page.locator('button:has-text("Enviar")').first().click()]);
await logoChooser.setFiles(path.join(FIX, 'logo.png'));
await page.waitForTimeout(1200);
await page.waitForSelector('text=Salvo automaticamente');
const kit = await state(() => window.__VCL__.app.getState().activeBrand());
ok(kit.name === 'Atelier Norte' && !!kit.logoAssetId, 'Brand Kit salvo com nome e logotipo');
// referências
await page.setInputFiles('.dropzone input[type=file] >> nth=-1', [path.join(FIX, 'foto-1.jpg')]);
await page.waitForTimeout(800);
await page.waitForSelector('.bk-preview img');
await page.waitForTimeout(800);
await shot('02-brandkit');
await page.reload();
await page.waitForSelector('[data-testid=brand-name]');
ok(await page.inputValue('[data-testid=brand-name]') === 'Atelier Norte', 'Brand Kit persiste após recarregar');

// ---------------------------------------------------------------- Design Generator
await page.click('a[href="#/create"]');
await page.click('[data-testid=type-static]');
await page.click('[data-testid=dir-A]');
await page.fill('[data-testid=input-title]', 'Design é decisão, não decoração');
await page.click('[data-testid=generate]');
await page.waitForFunction(() => document.querySelectorAll('[data-testid=variations] img').length >= 4, null, { timeout: 20000 });
const nVar = await page.locator('[data-testid=variations] .var-card').count();
ok(nVar >= 4, `Gerador produz ${nVar} variações`);
await shot('03-generator');

// fotográfico com upload
await page.click('[data-testid=type-photo]');
await page.setInputFiles('.gen-form .dropzone input[type=file]', [path.join(FIX, 'foto-2.jpg'), path.join(FIX, 'foto-3.jpg')]);
await page.waitForTimeout(800);
await page.click('[data-testid=generate]');
await page.waitForFunction(() => document.querySelectorAll('[data-testid=variations] img').length >= 3, null, { timeout: 20000 });
await page.waitForTimeout(800);
await shot('04-generator-photo');

// abrir no editor
await page.locator('[data-testid=variations] .var-card').first().hover();
await page.locator('[data-testid=edit-variation]').first().click();
await page.waitForSelector('[data-testid=editor]');
await page.waitForTimeout(1000);
ok(await page.locator('canvas').count() > 0, 'Editor abre com canvas');
await shot('05-editor');

// ---------------------------------------------------------------- Editor nativo
const els = await state(() => window.__VCL__.editor.getState().page().elements.map((e) => ({ id: e.id, type: e.type, name: e.name })));
ok(els.length >= 3, `Página contém ${els.length} objetos independentes (${[...new Set(els.map((e) => e.type))].join(', ')})`);

// selecionar título pela lista de camadas
await page.click('[data-testid=tab-layers]');
const headingLayer = page.locator('[data-testid=layers] .layer', { hasText: 'Título' }).first();
await headingLayer.click();
await page.waitForSelector('[data-testid=props-panel]');
await page.fill('[data-testid=text-content]', 'Texto editado no painel');
let sel = await state(() => window.__VCL__.editor.getState().selected()[0]);
ok(sel?.type === 'text' && sel.text === 'Texto editado no painel', 'Edição de texto pelo painel de propriedades');
const sizeBefore = sel.fontSize;
await page.locator('.num-field:has(span:text-is("pt")) input').fill(String(sizeBefore + 20));
sel = await state(() => window.__VCL__.editor.getState().selected()[0]);
ok(sel.fontSize === sizeBefore + 20, 'Alteração de tamanho da fonte');
await page.locator('[data-testid=props-panel] select').first().selectOption('Bodoni Moda');
sel = await state(() => window.__VCL__.editor.getState().selected()[0]);
ok(sel.fontFamily === 'Bodoni Moda', 'Troca de fonte');

// arrastar o elemento no canvas
const geom = await state(() => {
  const ed = window.__VCL__.editor.getState();
  const el = ed.selected()[0];
  const stage = window.Konva.stages[0];
  const node = stage.findOne('#' + el.id);
  const r = node.getClientRect();
  const box = stage.container().getBoundingClientRect();
  return { x: box.left + r.x + r.width / 2, y: box.top + r.y + Math.min(r.height / 2, 20), elX: el.x, elY: el.y };
});
await page.mouse.move(geom.x, geom.y);
await page.mouse.down();
await page.mouse.move(geom.x + 40, geom.y + 60, { steps: 8 });
await page.mouse.up();
sel = await state(() => window.__VCL__.editor.getState().selected()[0]);
ok(Math.abs(sel.y - geom.elY) > 20, `Arrastar move o objeto (y ${geom.elY.toFixed(0)} → ${sel.y.toFixed(0)})`);

// desfazer
await page.click('[data-testid=undo]');
sel = await state(() => window.__VCL__.editor.getState().page().elements.find((e) => e.id === window.__VCL__.editor.getState().selectedIds[0]));
ok(Math.abs(sel.y - geom.elY) < 1, 'Desfazer restaura a posição');

// edição direta no canvas (duplo clique)
const g2 = await state(() => {
  const ed = window.__VCL__.editor.getState();
  const stage = window.Konva.stages[0];
  const node = stage.findOne('#' + ed.selectedIds[0]);
  const r = node.getClientRect();
  const box = stage.container().getBoundingClientRect();
  return { x: box.left + r.x + 20, y: box.top + r.y + 15 };
});
await page.mouse.dblclick(g2.x, g2.y);
await page.waitForSelector('[data-testid=text-overlay]');
await page.keyboard.press('Control+A');
await page.keyboard.type('Editado direto no canvas');
await page.keyboard.press('Escape');
sel = await state(() => window.__VCL__.editor.getState().selected()[0]);
ok(sel.text === 'Editado direto no canvas', 'Edição inline com duplo clique');

// adicionar forma, redimensionar via campos, excluir
await page.click('[data-testid=tab-add]');
const before = await state(() => window.__VCL__.editor.getState().page().elements.length);
await page.click('[data-testid="add-Círculo"]');
await page.locator('.num-field:has(span:text-is("L")) input').fill('500');
await page.locator('.num-field:has(span:text-is("L")) input').blur();
sel = await state(() => window.__VCL__.editor.getState().selected()[0]);
ok(sel.type === 'shape' && sel.width === 500, 'Inserir forma e redimensionar');
await page.keyboard.press('Delete');
const after = await state(() => window.__VCL__.editor.getState().page().elements.length);
ok(after === before, 'Excluir elemento com Delete');

// imagem: substituir via mídia
await page.click('[data-testid=tab-media]');
const mediaCount = await page.locator('[data-testid=media-grid] .img-pick').count();
await page.locator('[data-testid=media-grid] .img-pick').first().click();
sel = await state(() => window.__VCL__.editor.getState().selected()[0]);
ok(mediaCount > 0 && sel.type === 'image' && !!sel.assetId, 'Inserir imagem da biblioteca como objeto');

// fundo
await page.keyboard.press('Escape');
await page.waitForSelector('[data-testid=page-panel]');
await page.locator('[data-testid=page-panel] .color-field input.input').first().fill('#223344');
await page.locator('[data-testid=page-panel] .color-field input.input').first().blur();
const bg = await state(() => window.__VCL__.editor.getState().page().background.color);
ok(bg === '#223344', 'Editar cor de fundo');

// salvamento automático
await page.waitForFunction(() => window.__VCL__.editor.getState().saveState === 'saved', null, { timeout: 8000 });
const pid = await state(() => window.__VCL__.editor.getState().project.id);
await page.reload();
await page.waitForSelector('[data-testid=editor]');
await page.waitForTimeout(600);
const reloaded = await state(() => window.__VCL__.editor.getState().page());
ok(reloaded.background.color === '#223344' && reloaded.elements.some((e) => e.type === 'text' && e.text === 'Editado direto no canvas'), 'Salvamento automático persiste após recarregar');
await shot('06-editor-edited');

// exportação PNG
await page.click('[data-testid=export-btn]');
const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-testid=export-current]')]);
const pngPath = `${OUT}/export-single.png`;
await dl.saveAs(pngPath);
const s1 = pngSize(fs.readFileSync(pngPath));
ok(s1.w === 1080 && s1.h === 1350, `PNG exportado em ${s1.w}×${s1.h}`);

// 2x
await page.click('[data-testid=export-btn]');
await page.click('.menu .segmented button:has-text("2x")');
const [dl2] = await Promise.all([page.waitForEvent('download'), page.click('[data-testid=export-current]')]);
await dl2.saveAs(`${OUT}/export-2x.png`);
const s2 = pngSize(fs.readFileSync(`${OUT}/export-2x.png`));
ok(s2.w === 2160 && s2.h === 2700, `PNG alta resolução em ${s2.w}×${s2.h}`);
await page.click('[data-testid=export-btn]');
await page.click('.menu .segmented button:has-text("1x")');
await page.click('[data-testid=export-btn]');

// ---------------------------------------------------------------- Carrossel
await page.goto(BASE + '#/carousel');
await page.waitForSelector('[data-testid=generate-carousel]');
await page.click('[data-testid=dir-E]');
await page.click('[data-testid=add-slide-row]');
const rows = await page.locator('.slide-row').count();
ok(rows === 6, `Roteiro com ${rows} slides`);
await page.locator('.slide-row').nth(4).locator('input.input').first().fill('Slide adicionado no teste');
// distribuir fotos
await page.click('button:has-text("Distribuir fotos")');
const picks = page.locator('.modal .img-pick');
for (let i = 0; i < Math.min(3, await picks.count()); i++) await picks.nth(i).click();
await page.click('.modal button:has-text("Aplicar na ordem")');
await page.click('[data-testid=generate-carousel]');
await page.waitForFunction(() => document.querySelectorAll('[data-testid=carousel-preview] img').length === 6, null, { timeout: 30000 });
await shot('07-carousel-builder');
await page.click('[data-testid=open-carousel]');
await page.waitForSelector('[data-testid=slide-strip]');
await page.waitForTimeout(1200);
let pages = await state(() => window.__VCL__.editor.getState().project.pages.length);
ok(pages === 6, `Carrossel aberto no editor com ${pages} slides`);
const comps = await state(() => window.__VCL__.editor.getState().project.pages.map((p) => p.elements.map((e) => e.type[0]).join('')));
ok(new Set(comps).size >= 4, `Slides com composições distintas (${new Set(comps).size} estruturas diferentes)`);
await shot('08-carousel-editor');

await page.click('[data-testid=slide-2]');
const idx = await state(() => window.__VCL__.editor.getState().pageIndex);
ok(idx === 2, 'Navegar entre slides');
await page.click('[data-testid=add-slide]');
pages = await state(() => window.__VCL__.editor.getState().project.pages.length);
ok(pages === 7, 'Adicionar slide');
await page.click('[data-testid=add-slide]'); await page.click('[data-testid=add-slide]'); await page.click('[data-testid=add-slide]');
pages = await state(() => window.__VCL__.editor.getState().project.pages.length);
ok(pages === 10 && (await page.locator('[data-testid=add-slide]').count()) === 0, 'Limite máximo de 10 slides respeitado');
for (let i = 0; i < 4; i++) await state(() => { const s = window.__VCL__.editor.getState(); s.deletePage(s.project.pages.length - 1); });
pages = await state(() => window.__VCL__.editor.getState().project.pages.length);
ok(pages === 6, 'Excluir slides');

// exportar zip
await page.click('[data-testid=export-btn]');
const [dz] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.click('[data-testid=export-zip]')]);
const zipPath = `${OUT}/carrossel.zip`;
await dz.saveAs(zipPath);
const zip = await JSZip.loadAsync(fs.readFileSync(zipPath));
const files = Object.keys(zip.files).sort();
ok(files.length === 6, `ZIP com ${files.length} slides: ${files[0]} …`);
const firstBuf = Buffer.from(await zip.file(files[0]).async('uint8array'));
const sz = pngSize(firstBuf);
ok(sz.w === 1080 && sz.h === 1350, `Slide do ZIP em ${sz.w}×${sz.h}`);
for (const f of files.slice(0, 6)) fs.writeFileSync(`${OUT}/slide-${f}`, Buffer.from(await zip.file(f).async('uint8array')));

// exportar slides separados
await page.click('[data-testid=export-btn]');
const separate = [];
page.on('download', (d) => separate.push(d.suggestedFilename()));
await page.click('[data-testid=export-all]');
await page.waitForFunction(() => !document.querySelector('[data-testid=export-btn] .loader'), null, { timeout: 60000 });
await page.waitForTimeout(800);
ok(separate.length === 6, `Exportação slide a slide gerou ${separate.length} arquivos`);

// ---------------------------------------------------------------- Library & projetos
await page.waitForFunction(() => window.__VCL__.editor.getState().saveState === 'saved', null, { timeout: 8000 });
await page.goto(BASE + '#/library');
await page.waitForSelector('[data-testid=library-grid]');
const cards = await page.locator('[data-testid=library-grid] .p-card').count();
ok(cards >= 2, `Library lista ${cards} designs`);
await page.click('.segmented button:has-text("Carrosséis")');
await page.waitForTimeout(300);
await shot('09b-filter');
ok(await page.locator('[data-testid=library-grid] .p-card').count() === 1, 'Filtro de carrosséis');
await page.click('.segmented button:has-text("Todos")');
await shot('09-library');
await page.locator('.p-card .icon-btn').first().click();
await shot('09c-menu');
await page.click('.menu button:has-text("Salvar como modelo")');
await page.waitForTimeout(300);
await page.click('.segmented button:has-text("Modelos")');
await page.waitForTimeout(300);
ok(await page.locator('[data-testid=library-grid] .p-card').count() === 1, 'Salvar como modelo favorito');
await page.click('.segmented button:has-text("Todos")');
await page.locator('[data-testid=library-grid] .p-thumb').first().click();
await page.waitForSelector('[data-testid=editor]');
ok(true, 'Reabrir projeto da Library para continuar editando');

await page.goto(BASE + '#/projects');
await page.click('[data-testid=new-folder]');
await page.fill('[data-testid=folder-name]', 'Campanha Verão');
await page.click('[data-testid=create-folder]');
await page.waitForSelector('text=Campanha Verão');
ok(true, 'Criar projeto (pasta)');
await shot('10-projects');

await page.goto(BASE + '#/settings');
await page.waitForSelector('text=Armazenamento e backup');
await shot('11-settings');

// ---------------------------------------------------------------- Mobile
const m = await ctx.newPage();
await m.setViewportSize({ width: 390, height: 844 });
await m.goto(BASE);
await m.waitForSelector('.page-title');
await m.screenshot({ path: `${OUT}/12-mobile-dashboard.png` });
const hScroll = await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
ok(!hScroll, 'Mobile sem rolagem horizontal');
await m.goto(BASE + '#/editor/' + pid);
await m.waitForSelector('[data-testid=editor]');
await m.waitForTimeout(800);
await m.screenshot({ path: `${OUT}/13-mobile-editor.png` });

const relevant = errors.filter((e) => !/favicon|ResizeObserver/.test(e));
ok(relevant.length === 0, `Sem erros de console${relevant.length ? ': ' + relevant.slice(0, 3).join(' | ') : ''}`);

await browser.close();
console.log(failures ? `\n${failures} falha(s)` : '\nTodas as verificações passaram');
process.exit(failures ? 1 : 0);
