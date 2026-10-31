<div align="center">

**David Lafond's portfolio.** Hand-built, scroll-driven, slightly haunted.

[davidlafond.xyz](https://davidlafond.xyz) · [Work](https://davidlafond.xyz) · [About](https://davidlafond.xyz/about)

</div>

---

## What's inside

This is the whole site: three case studies, an About page that behaves like a desk, and **Davebot**, the little ghost in the corner who scrolls you home and answers questions about the work.

| Page | What it does |
| --- | --- |
| **Work** | Hero with live sticker pills you can re-roll, then the project sheet that rises in as a dome and flattens as you scroll. |
| **Momo** | A multimodal reflection system across Apple Watch and iPhone. Opens with a short phone film; the device demos are real, interactive prototypes. |
| **Filo** | Agentic commerce for biomaterial adoption in fashion, told with story art and research. |
| **Harvard / MIT** | The architecture portfolio that got me into both, as a page-flipping book. |
| **About** | A photo stack you can shuffle, a story, and a dark playground sheet. |

## Built with

```
React 19 ─┬─ Vite ─── TypeScript
          ├─ motion ............ springs and scroll choreography
          ├─ @paper-design/shaders  grain, glow and gradients
          ├─ page-flip ......... the Harvard / MIT book
          ├─ perfect-freehand .. the signature
          └─ dialkit ........... live tuning dials (dev only)
```

Hosted on Vercel. Every merge to `main` ships to production.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build
```

`npm run build` also refreshes the GitHub contribution grid via `scripts/fetch-contributions.mjs`.

## Map

```
src/
├── pages/        Work, About, case studies, Harvard / MIT
├── features/     one folder per interaction: ghost (Davebot), momoIntro,
│                 book, workStickers, photoStack, signature, cursor, …
├── components/   nav, footer, selected works, selection highlight
├── data/         copy and tuning.json (every dial's saved value)
└── styles/       tokens and site-wide CSS
public/           images, videos, the résumé
studio/           standalone labs where interactions get prototyped
```

## Little things worth finding

- Highlight any text. The selection is drawn by hand, not by the browser.
- Click Davebot while scrolled. Click him again at the top.
- Re-roll the sticker pills on the Work page.
- Drag through the Momo device demos; they're the real prototypes, not videos.

---

<div align="center">
<sub>Designed and built by David Lafond. Code is here to read and learn from; the writing, images and case studies are mine.</sub>
</div>
