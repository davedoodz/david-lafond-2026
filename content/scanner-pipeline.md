# Portfolio scanner — pipeline plan \+ Gemini 4 Argon prompt

Goal: a handheld 3D scanner lives beside the Book / Grid pill. Click → it flies to the page, spins 360°, locks at bottom-centre with its back to the viewer, and sweeps a beam top→bottom while the skeleton-grid overlay reveals under the beam. Then it returns to the pill.

## Decision: the browser renders the scanner, Blender only models it

- No video render. The scanner is a small hard-surface object (target ≤ 15k triangles, one 1024² texture set). It ships as a `.glb` (\< 1 MB) and renders live with three.js.  
- Why: the flight path depends on live DOM geometry (book height ≠ grid height, scroll, viewport), and the beam sweep must stay frame-locked to the existing WAAPI skeleton timeline (`useDiagramTransition`). Pre-rendered video can't do either, and alpha video is heavy and Safari-fragile.  
- Consequence: the MacBook never renders animation. It only needs to run Vite. The PC is for Argon \+ Blender MCP iteration; Blender modelling itself also runs fine on Apple Silicon.

## Ownership split

| Blender (PC, Argon) | Browser (MacBook, code) |
| :---- | :---- |
| Geometry, bevels, materials, emissive visor strip | Flight path: pill → page centre (360° spin) → bottom lock → return |
| Named empties: `Emitter` (beam origin at visor), `Grip` (hand pivot), `Rest` (pill pose) | Beam cone mesh anchored at `Emitter`, length \= page height, additive gradient |
| Clips: `Idle` (4 s hover \+ slow yaw), `VisorOn` (0.4 s), `VisorPulse` (1 s loop), `VisorOff` | Scanline sweep synced to `Motion → Duration Ms`; new preset `scanner` \= reveal clip follows the beam |
| Turntable preview \+ contact sheet for review on the Mac | DialKit: size, hover tilt, flight ms, spin turns, bottom offset, beam width/opacity |

&nbsp;

## Steps

1. PC: clone repo. Install Blender 4.x \+ the Blender MCP add-on, open Antigravity with Gemini 4 Argon, connect MCP. Paste the prompt below with the draft sheet attached.  
2. Argon iterates in Blender against the sheet (scorecard in prompt). Output: `scanner.blend`, `scanner.glb`, `scanner-turntable.mp4`, `scanner-sheet.png`.  
3. Validate `scanner.glb` in the three.js glTF viewer (gltf-viewer.donmccurdy.com) and `gltf-validator`. Check: node names, 3 clips, emissive strength, size.  
4. Commit only `public/work/harvard-mit/scanner/scanner.glb` to git. `.blend`, renders, sheets → `davidos ingest` (Drive vault), per AGENTS.md.  
5. Mac: `npm i three @react-three/fiber @react-three/drei`, lazy-load a `<ScannerLayer>` on the Harvard/MIT page only. Dev-first behind DialKit like the skeleton experiment.  
6. Mac: wire click → flight → `setValue('diagram.enabled', true)` with preset `scanner`; the beam's scanline drives the reveal clip; return flight on completion. Reverse on second click. Reduced motion: skip flight, cross-fade.  
7. Cursor: canvas gets `data-surface` \+ the clickable selector so the dot reacts on hover.

## Contract the GLB must satisfy (code depends on it)

- Units metres, \+Y up (glTF), device height 0.16 m, origin at bottom-centre of the grip.  
- Node names: `Scanner` (root), `Head`, `Visor`, `VisorStrip` (emissive), `Grip`, `GripButton`, `GripLED`, empties `Emitter`, `Rest`.  
- Materials: Principled only. `Body` (base \#D9D6D0, rough 0.55, metal 0), `VisorGlass` (base \#0B0B0B, rough 0.08, metal 0), `VisorStrip` (emissive \#FFFFFF, strength 4), `Lettering` (base \#2A2A2A). Texture set ≤ 1024², Draco on.  
- Clips: `Idle`, `VisorOn`, `VisorPulse`, `VisorOff`. No location keys on `Scanner` root (the browser owns position / rotation / scale).

---

## Prompt for Gemini 4 Argon (Antigravity \+ Blender MCP)

Paste everything below. Attach: `scanner-draft-sheet.png` (your sheet) and the two page mockups (idle beside the pill; locked at the bottom with the beam).

```
You are a senior hard-surface product modeller and real-time asset artist working inside
Blender through MCP. You build a hero prop for an award-level portfolio website
(Awwwards / FWA calibre). The prop is a handheld 3D scanner. The browser will render it
live with three.js and animate its flight in code, so you deliver a clean, light,
production-grade glTF — not a render.

## Skills you must apply (act as all of these, in this order of priority)
1. Industrial-design language: Braun / Dieter Rams / Teenage Engineering restraint.
   One material family, one accent (the emissive visor strip), no decoration without function.
2. Hard-surface modelling: clean quad topology, bevel-modifier workflow with weighted
   normals, consistent 1.2 mm fillets, no shading artefacts, no n-gons on curved surfaces.
3. Real-time asset discipline: ≤ 15 000 triangles after export, one 1024² texture set,
   Principled BSDF only, no procedural nodes left unbaked, no transparency except the visor.
4. PBR material authoring for glTF: correct roughness/metal values, emissive strength
   via KHR_materials_emissive_strength, sRGB base colour, linear data maps.
5. Animation principles for product motion: ease-out arrivals, slight anticipation,
   overshoot-and-settle under 4 %, loops that are seamless at frame boundaries.
6. Technical contract keeper: exact node names, units, origins, clip names, so the
   front-end code can bind without edits.
7. Self-critic: after every milestone, render a 4-view turntable + close-ups, compare to
   the reference sheet, score, fix the worst item, repeat.

## References (attached)
- scanner-draft-sheet.png: front / side / back / top, plus states IDLE, HOVER,
  CLICK-SCAN (beam sweep), ACTIVE (grid in visor).
- page-idle.png and page-scan.png: how it sits on the site. Match that silhouette.

## Object spec
- Form: wide rounded-rectangle head (visor across the front), chamfered body, a tapered
  grip below with a round button and a short vertical LED slit. Head slightly cantilevered
  forward of the grip. Proportions from the sheet: head ≈ 70 mm wide × 36 mm tall × 34 mm
  deep; grip ≈ 22 mm wide, 80 mm long; overall height 160 mm.
- Front: deep black glossy visor inset ~2 mm, with one bright horizontal emissive strip
  near its top. Debossed word SCAN on the head's left side.
- Back: flat face with three centred lines of small caps lettering:
  SEE / WHAT'S / UNDERNEATH (tracked, 2 mm cap height, debossed 0.3 mm).
- Top: plain, with a tiny centred vertical slot.
- Materials: body warm light grey matte polymer (#D9D6D0, roughness 0.55); visor glass
  (#0B0B0B, roughness 0.08); strip emissive white, strength 4; lettering #2A2A2A.
  Subtle micro-roughness variation baked, no visible noise.

## Scene / export contract (non-negotiable)
- Units: metres. Device height exactly 0.16 m. Origin at bottom-centre of the grip.
  Apply all transforms. +Y up on export (glTF default).
- Hierarchy and names, exactly:
  Scanner (root, no animation on it)
    Head
      Visor
      VisorStrip
      Lettering_Scan
      Lettering_Back
    Grip
      GripButton
      GripLED
    Emitter   (empty at the visor strip centre, +Z pointing out of the visor)
    Rest      (empty at the origin; marks the resting pose)
- Materials named: Body, VisorGlass, VisorStrip, Lettering.
- Animations as separate actions pushed to NLA, names exactly:
  Idle      — 4.0 s seamless loop: ±2 mm vertical bob, ±4° slow yaw. Keys on Head/Grip
              parent group only, NOT on Scanner root.
  VisorOn   — 0.4 s: strip emissive 0 → 4 with a short overshoot; GripLED 0 → 1.
  VisorPulse — 1.0 s loop: strip 3.2 ↔ 4; a thin secondary line travels the visor height.
  VisorOff  — 0.4 s reverse of VisorOn.
  The browser owns all position / rotation / scale of Scanner; never animate those.
- Export: GLB, Draco level 6, textures ≤ 1024² JPEG 85 (PNG only if alpha needed),
  export_apply = True, animations on, cameras/lights off. Target file < 1 MB.

## Process (do not skip steps; show results after each)
1. Blockout from the sheet. Render a 4-view turntable (Eevee, neutral studio HDRI,
   dark #171717 backdrop) at 1024². Compare proportions to the sheet. Fix.
2. Detail pass: bevels, visor inset, lettering, button, LED, top slot. Shading check with
   MatCap; zero pinching. Render close-ups.
3. UV + bake: one atlas, no stretching > 5 %, seams hidden on the back / underside.
4. Materials per spec. Render the IDLE, HOVER, SCAN, ACTIVE states from the sheet.
5. Animations per contract. Export GLB. Open the GLB with the three.js glTF viewer or
   validate with gltf-validator and report: triangle count, file size, node list,
   clip list, extension list.
6. Scorecard (1–5 each): silhouette match, surface quality, material fidelity, visor
   read, lettering legibility, topology cleanliness, export contract, file size.
   Any item < 4 → fix and re-run. Stop when all ≥ 4 and the GLB validates.

## Deliverables
- scanner.blend (source, organised collections, no orphans)
- scanner.glb (validated)
- scanner-turntable.mp4 (6 s, 1080p, dark backdrop) and scanner-sheet.png (4 views + 4
  states on a 2-row grid) so the owner can review on another machine
- A short report: tri count, texture sizes, node/clip names, anything that deviates from
  the contract and why.
```

&nbsp;

&nbsp;