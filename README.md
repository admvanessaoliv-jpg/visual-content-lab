# Visual Content Lab

Laboratório independente para criar e editar posts estáticos, capas de Reels e carrosséis (3 a 10 slides) para Instagram. Tem Brand Kit, Design Generator, editor nativo por objetos e Design Library próprios.

## Como rodar

```bash
npm install
npm run dev        # desenvolvimento → http://localhost:5173
npm run build      # build de produção em dist/ (site estático, hospedável em qualquer CDN)
npm test           # testes unitários (gerador + store do editor)
npm run preview & npm run e2e   # validação ponta a ponta no Chromium (Playwright)
```

## Arquitetura

| Camada | Escolha | Por quê |
|---|---|---|
| UI | React 19 + TypeScript + Vite | componentes reutilizáveis, tipagem do modelo de documento |
| Editor | Konva / react-konva (canvas por objetos) | cada elemento é um nó independente: selecionar, mover, redimensionar, girar, editar, excluir |
| Estado | Zustand (`appStore`, `editorStore`) | histórico de desfazer/refazer com agrupamento, seleção, clipboard |
| Persistência | IndexedDB (`idb`) | projetos, Brand Kits, pastas e imagens/fontes como Blob, sem servidor |
| Fontes | @fontsource (27 famílias, locais) | exportação consistente, sem CDN; upload de fontes da marca (FontFace) |
| Exportação | renderizador Konva fora da tela + JSZip | PNG/JPG em 1x/2x/3x, slide atual, slide a slide ou ZIP |

**Princípio central:** um design é um documento JSON (`Project → Page[] → DesignElement[]`). Ele nunca é salvo como imagem achatada. `src/lib/konvaAttrs.ts` traduz o modelo para Konva, e o editor e o exportador usam essa mesma função, por isso o PNG sai idêntico à tela.

```
src/
  types.ts                 modelo de dados (elementos, páginas, projetos, Brand Kit)
  lib/
    db.ts                  IndexedDB (trocável por adaptador remoto)
    assets.ts              upload/normalização de imagens, cache, hooks
    fonts.ts, fontImports  catálogo tipográfico local + fontes personalizadas
    konvaAttrs.ts          modelo → atributos Konva (compartilhado)
    renderer.ts            renderização offscreen (exportação e miniaturas)
    exporter.ts            PNG/JPG/ZIP, backup/importação
    measure.ts             medição de texto para ajuste automático de tamanho
    extractPalette.ts      extração de cores de logotipo/referências
  generator/
    kit.ts                 paletas por direção (A–F), helpers de composição
    layouts.ts             18 layouts paramétricos (tipográficos, editoriais, fotográficos, sólidos, gráficos, CTA)
    index.ts               generateDesign, generateCarousel, applyBrandToPages
  store/                   appStore (acervo) e editorStore (documento + histórico)
  editor/                  CanvasStage, ElementNode, PropertiesPanel, LeftPanel, SlideStrip, autosave, atalhos
  pages/                   Dashboard, Brand Kit, Criar Design, Criar Carrossel, Library, Projetos, Configurações
```

## Funcionalidades

- **Brand Kit:** vários kits com um kit ativo; nome e @; logotipo principal e versão clara (usada automaticamente sobre fundos escuros); 7 cores por papel e paleta estendida (com extração automática de cores); fontes para títulos, textos e destaques, com peso, caixa alta e espaçamento; upload de fontes próprias; estilo e tratamento fotográfico (P&B, quente, suave); estilo de composição e arredondamento; moodboard de referências com notas; prévia gerada ao vivo; salvamento automático.
- **Design Generator:** 6 tipos de peça × 3 formatos × 6 direções. Gera até 6 variações reais, com títulos ajustados à caixa disponível. Capas de Reels respeitam a área segura 3:4.
- **Carrosséis:** 3 a 10 slides com texto, imagem e composição independentes. Mantêm a unidade visual (paleta, margens, contador `01 / 07`, assinatura, seta) e alternam layouts. Corpo com 3 ou mais linhas vira lista. Também é possível colar um roteiro e distribuir fotos entre os slides.
- **Editor nativo:**
  - Seleção simples, múltipla (Shift) e por área, com mover, redimensionar e girar (com snap de ângulo).
  - Guias magnéticas.
  - Edição de texto inline (duplo clique) e no painel: fonte, peso, tamanho, cor, alinhamento, entrelinha, espaçamento, caixa alta e contorno.
  - Imagens com recorte, zoom, enquadramento, cantos, borda e filtros.
  - Formas com sólido ou gradiente, contorno e cantos; linhas e setas; sombras.
  - Fundo com cor, gradiente, imagem e película.
  - Camadas (reordenar, bloquear, ocultar), alinhamento, desfazer/refazer, copiar/colar e atalhos.
  - Trocar composição da página e reaplicar o Brand Kit por papel.
  - Salvamento automático.
- **Design Library e Projetos:** filtros (designs, carrosséis, favoritos, modelos, em andamento, finalizados, imagens), busca e ordenação. Cada peça pode ser duplicada, salva como modelo, finalizada, movida para um projeto (pasta) ou exportada. Qualquer peça reabre no editor.
- **Configurações:** formato padrão, exportação, autosave, guias, áreas seguras, uso de armazenamento, backup e importação JSON, limpeza de dados.

## Dependências externas (não implementadas, por exigirem serviços de terceiros)

O app funciona 100% no navegador, sem nenhuma API externa. Recursos que exigiriam integração:

1. **Sincronização entre dispositivos/equipe:** precisa de backend (Supabase, Firebase ou S3 + API). Basta reimplementar `src/lib/db.ts` com as mesmas assinaturas e enviar os Blobs para um storage de objetos.
2. **Textos gerados por IA:** precisa de chave de API de um LLM, chamada por um backend (a chave nunca vai para o navegador). O resultado preencheria o `GenContent` / roteiro do carrossel.
3. **Imagens geradas por IA ou banco de fotos:** precisa de API de geração de imagens ou de um acervo (ex.: Unsplash). O retorno seria importado com `importImageFile`. Hoje a direção “Fotografia autoral” usa só fotos enviadas pelo usuário.
4. **Publicação no Instagram:** precisa da Instagram Graph API, conta profissional, app Meta aprovado e servidor para OAuth.

Limitação conhecida: os dados ficam no IndexedDB do navegador usado. Use o backup em Configurações para migrar.
