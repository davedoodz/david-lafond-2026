# Filo — material-centric product context

User-supplied product direction, 12 October 2026. Canonical visual reference: [FILO / Page 2](https://app.paper.design/file/01M3Z8CGB6VSSQRE9Y6YW7VVH9/p-2-0), artboards 1–15 and complete lifecycle. These are concept scenarios, not verified commercial supplier specifications or an operating procurement service.

## Product thesis

The material is the anchor. Filo is the thread. The tag is the interface.

The Technical File is one persistent material record from supplier contact through sampling, physical tests, garment development and production feasibility. Filo prepares work for approval rather than requiring generic chat prompts. Main navigation: Home, Materials, Development, Activity. A contextual agent layer knows the current material; no primary Chat tab.

Core loop: Filo prepares → human approves → Filo executes → evidence returns → Technical File evolves. Meaningful state changes, spending, supplier communications and production decisions require human approval. Unknown information stays unknown. Every autonomous action is traceable.

## Precedent and differentiation

Connected physical samples are an established pattern, not Filo’s invention. Swatchbox’s [Tap-to-Order](https://newsroom.swatchbox.com/press-release/u-s-patent-awarded-to-anguleris-for-swatchbox-nfc-sampling-technology) embeds NFC identifiers in material samples and displays so a tap can open product information or initiate a sample request. swatchbook connects physical swatches to digital material records through QR codes, including [material information, visualization and colour ranges](https://www.swatchbook.co.jp/swatchbook-library). Material Bank also operates an [MTag NFC scan experience](https://qa.mtag.materia.com/), although its public page does not document the workflow beyond scanning.

Filo must not claim novelty in NFC tagging. Its contribution starts after the tap:

1. The swatch opens an active Technical File, not a product page or static database record.
2. The record develops with the material from initial sample through bench testing, factory specification and scale feasibility.
3. Supplier claims, internal observations and verified results remain distinct and sourced.
4. Filo reasons across evidence and production context: a 60°C material limit becomes actionable beside a 130°C fusing process.
5. The warning appears at the point of work, not later in a PLM dashboard.
6. The agent handles follow-through—supplier requests, lab bookings, file assembly and scale checks—while a human approves consequential actions.

Portfolio positioning: **The tap is infrastructure. The file is the product.** NFC-connected samples already exist; Filo asks what happens when the swatch becomes an active interface throughout material development.

The regulatory wedge is adjacent, not yet settled. The European Commission [plans textile-specific Digital Product Passport rules for Q4 2027](https://single-market-economy.ec.europa.eu/single-market/digital-product-passport/textile-apparel_en); final required fields and compliance dates will depend on the delegated act. Filo’s Technical File could become the upstream evidence layer for that passport.

## The fifteen flows

1. **Add a new material.** Upload a spec, scan a document, forward supplier email or enter manually. Extract Bacterial Cellulose, Modern Synthesis, width 145 cm, MOQ 500 m, lead time 6–8 weeks. Heat tolerance, shrinkage, wash performance and pilling remain unknown. Cite supplier specification PDF, received Oct 12. Propose a supplier request; review → edit → send.
2. **Supplier sourcing.** Request bacterial cellulose for 2,000 overshirts, delivery March 2027. Compare 12 reviewed / 7 construction-capable / 4 capacity-fit / 3 recommended. Compare Modern Synthesis, Pyratex and Supplier C: samples €72/€64/€78, MOQ 500/300/1,000 m, lead time 7/9/5 weeks. Capacity and certifications have explicit unknowns. Modern Synthesis is provisionally strongest; heat tolerance remains unverified. Request samples from three.
3. **Morning approval.** Today is an operational inbox, not chat. “Run samples — 3 suppliers, €214, ~9 days.” Review the spending and supplier requests. Approval authorizes sending requirements, asking for missing data and tracking replies. “I'll take it from here.” Portfolio interactions must identify themselves as demos; no real requests or purchases are implied.
4. **Sample arrives.** Physical fabric plus NFC Filo tag. Tap → BC-001, Bacterial Cellulose, Overshirt / Sample R2, In development, Modern Synthesis. Match the existing Technical File without search. Heat tolerance, pilling and seam performance require verification; start testing.
5. **Technical File.** Hero interface combining tech pack, material passport, evidence log and production record. Tabs: Overview, Tests, Construction, Sourcing, Scale, Activity. Example readiness 68%, 12 verified / 3 observed / 4 unknown / 1 conflict; readiness is an illustrative score, not a computed percentage of those counts. Physical data: 210 gsm, 145 cm, 0.72 mm, no stretch. Heat limit 60°C supplier-claimed; pilling grade 2 observed; shrinkage not tested. Needle 80/12, seam 301, fusing conflict. Every property has provenance.
6. **Evidence capture.** Add observation by voice/photo at the bench. “Pilling after 20 rubs.” Extract rub test, 20 cycles, visible pilling, attached photo if actually supplied. Review/edit/save. Retain original note, author, date and physical-test source. A demo must not fabricate a photo or microphone recording.
7. **Evidence hierarchy.** Claimed = supplier information; Observed = internal physical evidence; Verified = accepted result; Unknown = no evidence. Heat claim 60°C, Sep 28 specification; observed deformation ~67°C, Oct 14 bench test. Surface disagreement, do not silently overwrite or verify it.
8. **Contextual warning.** At fusing station, tapping BC-001 surfaces 60°C material limit versus Overshirt process 130°C / 12 sec. Potential damage. Review evidence or adjust process. Options: lower-temperature adhesive 95°C / 15 sec (still above documented 60°C, controlled test required, NOT approved or safe), or remove fused construction with pattern revision.
9. **Create test.** Plan low-temp fusing at 95°C / 15 sec, medium pressure; evaluate bond strength and surface deformation. Capture photo, voice and measurements. Example observations: no visible deformation, bond formed, long-term adhesion unknown. Propose wash × 5 cycles. Saving an observation does not automatically verify safe production or change the documented material limit.
10. **Technical File evolves.** Fusing becomes “Low-temp process — testing”, 95°C / 15 sec; surface integrity observed, wash durability unknown. Retain the original 60°C claim and unresolved process-limit conflict until reviewed. The file accumulates project state rather than becoming a periodically edited static document.
11. **Supplier response.** Email proposes heat tolerance unknown → 60°C and MOQ 500 → 750 m. Highlight changed commercial terms, show Oct 16 email provenance, accept only after review.
12. **Scale feasibility.** Scenarios 500 / 2,000 / 10,000 units preserve the material identity. At 10,000, need 18,400 m, confirmed allocation 12,000 m, gap 6,400 m. Not yet feasible. Do not substitute estimates for confirmed supply.
13. **Resolve production constraint.** Option A: split Modern Synthesis 12,000 m + Supplier B 6,400 m; material-variation risk. Option B: delay 3 weeks to source 18,400 m; launch Apr 4 → Apr 25. Human chooses a direction for Filo to prepare; neither is automatically confirmed supply.
14. **Activity / audit trail.** Chronological supplier updates, pending extraction approvals, conflict warnings, saved evidence, human verification and authorized sample requests. Distinguish actor, action, timestamp and pending/approved state. No fabricated autonomous execution.
15. **Contextual agent.** “Can we use this for 10,000 overshirts?” understands BC-001. Not with confirmed capacity: 18,400 m required / 12,000 m confirmed / 6,400 m gap. Actions: check other suppliers, ask Modern Synthesis, model a smaller run. AI is contextual, not a chatbot bolted onto a PLM.

## Complete lifecycle

Discover → introduce material → build Technical File → Source → compare suppliers → approve samples → Sample → receive material → tap tag → Test → voice/photo evidence → update file → Develop → surface conflicts → test/resolve → Scale → 500 / 2,000 / 10,000 → Production ready (only after evidence and supply constraints are resolved).

## Portfolio priorities

Seven hero moments: Today, Technical File, Supplier Comparison, NFC Sample Arrival, Voice Evidence Capture, Contextual Warning, Scale Review. The physical context and accumulated evidence are the core story. The case study now uses noninteractive looped videos rendered from the separate studio.

The story now progresses through **Market gap → Opportunity → Solution**: tagged swatches open data but leave work fragmented; the swatch becomes an active material record; Filo demonstrates tap, capture, context and action. Keep the physical bacterial-cellulose swatch, paper NFC tag and lime thread as the anchor. Retire the symmetrical node diagrams. Maintain the existing portfolio typography and Filo moss palette.

## Implemented reference mapping

`src/studio/filo/data.ts` follows the actual Paper Page 2 board order: intake, sourcing, approval, arrival, capture, contextual warning, scale, conflict resolution, testing, insights, sharing, next phase, decisions, export, learning. This differs from the numbered narrative above. Technical File, evidence hierarchy, supplier update, audit trail and contextual agent scenes appear within those films.

The former interactive journey, lifecycle, welcome phone and tag-to-phone demonstrations have been removed. The case study does not accept app input, send supplier requests, purchase samples, record microphones or imply live AI/NFC integrations. The standalone studio remains the editing surface.

The three-part story is owned by `src/pages/filoStoryArt.tsx` and `filoStoryArt.css`. Each section now has its label, headline, body and one borderless film beneath the copy. All divider lines, metadata rails, small captions, generic cards, CSS-drawn swatches and click-through controls are removed. **Filo case study → Story → Animation preset** offers Quiet dissolve, Material drift (default) and Exploded assembly, plus Loop seconds and Playback speed. Comparison links use `/work/filo?filoAnimation=quiet-dissolve#filo-story`, `?filoAnimation=material-drift#filo-story` and `?filoAnimation=exploded-assembly#filo-story`.

The previous interactive-walkthrough checks are superseded by film playback verification. The film narratives retain the 60°C supplier claim and unresolved durability/capacity constraints rather than implying approval through animation.

Story verification, 13 October 2026 (minimal automatic-loop revision): all three films completed a full automatic loop headlessly; offscreen films stopped and restarted at time zero on reentry. All five solution phone scenes were checked. Presets rendered at 1440, 768, 390 and 320px; reduced motion produced a static Technical File with no active animations. DialKit exposed the preset, loop duration and speed controls. The Vite production bundle passed. Project-wide typecheck was blocked by concurrent, out-of-scope `FiloTagScene.tsx` imports of `DeviceScene` and `DeviceSceneStep`, which were no longer exported by `DeviceInsights.tsx`. Visual acceptance remains David's; this is built locally, not shipped.

Story assets reuse the optimized Desktop `filo-image-assets` derivatives in `public/work/filo/studio/` and [Futurefabric's transparent 36-frame product renders](https://github.com/davedoodz/futurefabric/tree/main/public/spritesheets-36) already in `public/work/filo/sprites/`. The 3D garments are illustrative examples, not claims that those products use BC-001. No GLBs or new rendering dependency load at runtime. The five real product-screen frames in `public/work/filo/story/` come from the Filo studio renderer and silver iPhone frame; regenerate with `node scripts/render-filo-story.mjs http://127.0.0.1:5391` against Vite. The story film is a noninteractive scenario, not a live NFC, microphone or procurement integration.

## Prototype film studio — current direction

Canonical entry: `studio/filo-prototypes.html`, served by Vite at `/studio/filo-prototypes.html`. Source is in `src/studio/filo/`. The studio remains independent; its canonical flow data also supplies the case-study videos.

- Fifteen storyboard flows plus a complete-lifecycle reel. Sequences follow the supplied Desktop `filo-flows` screenshots, not the numbering of the written narrative above.
- Silent, automatic films in the same realistic silver iPhone frame used by Momo. No beige presentation panel, title block or explanatory text is baked around the phone. The canvas and exported video are transparent outside the device.
- Desktop `filo-image-assets` supplied fourteen material/tag/illustration images. Optimized runtime derivatives and the studio’s reference previews live in `public/work/filo/studio/`; the originals remain untouched on Desktop.
- DialKit controls reading time, transition duration/style, playback speed, loop pause, easing, tap indicator, phone position/scale/rotation and screen style. Five motion presets: Native, Quiet, Fluid, Sheet and Quick cut.
- Visual edit selects text and content blocks directly on the phone, supports block/phone dragging, replaces material artwork, edits labels/values, positions taps, sets per-scene holds and reorders scenes. These controls edit the film; the depicted app does not receive user clicks.
- Each flow saves independently in browser storage (`filo-prototype-studio:v1:<flow-id>`). **Save project** downloads a portable JSON copy; **Load project** restores it. Browser-local edits are not automatically written to Git.
- **Render transparent video** uses the local Vite-only endpoint in `dev/filoExportPlugin.ts`, windowless Playwright Chromium and FFmpeg. Output is VP9 WebM with alpha, no audio, 24 fps, at 540×780 or 720×1040. A full cycle includes the return transition. Downloads expire after one hour; keep approved renders in the media vault. PNG frame export also preserves alpha.
- Renderer prerequisites on another machine: `npm install`, `npx playwright install chromium`, and `ffmpeg` on PATH. Run the Vite dev server for video export; a static deployment can edit/preview but does not host the local encoder.
- The supplied GraphicalUI command was executed. Its registry item is `graphical-hello` with `files: []`; no graphical editor component was installed. The studio’s direct editor is custom, not GraphicalUI. Connecting GraphicalUI requires an actual exported component registry URL.

Proof: all sixteen reels exercised through each scene and transition boundary; exact loop endpoints matched and outside-device pixels retained alpha. Headless smoke covered title/timing edits, phone drag, image/tap changes, reload persistence and per-flow isolation. A complete contextual-warning WebM was rendered and decoded: 24 fps, alpha present, no audio. Desktop and narrow-screen surfaces reviewed; reduced-motion preference starts playback paused.

## Case-study film assembly

`src/features/filoCase/filoFilmPlan.ts` maps all fifteen studio flows into five showcases, including the hero:

| Showcase | Studio flows | Presentation |
| --- | --- | --- |
| Material → record (hero) | 04, 01 | Arrival phone + frameless intake detail |
| Source → approve | 02, 03, 12 | Supplier phone + approval and update details |
| Observe → resolve | 05, 06, 09, 08, 10 | Warning phone surrounded by evidence, test and insight crops |
| Scale → decide | 07, 13 | Feasibility phone + decision detail |
| Share → reuse | 11, 14, 15 | Export phone + sharing and learning details |

The complete-lifecycle reel is deliberately reserved for the future concise introduction. Research and the three-part concept story remain separate from these five prototype showcases.

Regenerate the release assets with `node scripts/render-filo-films.mjs` while Vite runs at `http://127.0.0.1:4177` (override with `FILO_STUDIO_ORIGIN`). Optional flow IDs render a subset. The renderer uses canonical studio data and defaults—not inaccessible browser-local edits. Approved studio edits must be transferred into the canonical data before regeneration.

`public/work/filo/films/` contains each loop as transparent VP9 WebM and HEVC-alpha MOV, plus a meaningful WebP poster. Films run at 30 fps with no audio; full phones, frameless details and upper-screen crops share one crop plan. Runtime build assets belong in the repository. Each loop includes the return transition rather than jumping from its final frame.

`FiloFilms.tsx` starts playback only near the viewport, pauses offscreen or when the document is hidden, and provides a group pause control. Reduced-motion visitors see the posters. No beige panel or explanatory UI surrounds the recordings; mobile stacks the supporting films vertically.

Film proof: all fifteen recordings advance in headless Chromium and WebKit; Chromium chooses VP9 and WebKit chooses HEVC. Both engines preserve transparent pixels outside the full iPhone frames. All thirty video files have one video stream and no audio. Chromium checks also covered all fifteen loop seams, pause/resume, offscreen pause, reduced-motion posters, and 390px/320px containment. Desktop and mobile compositions were visually inspected; shared Momo devices still render. `npm run typecheck` and the Vite production build pass, resolving the earlier obsolete `FiloTagScene` typecheck blocker.

Final review corrections: mobile evidence items explicitly override desktop grid spans so all supporting films remain a readable single column; viewport-sized screenshots and computed-grid checks passed at 390px and 320px. Warning and resolution sequences occupy different rows to avoid near-duplicate adjacent screens. Research videos now respond to live Reduce Motion changes, and obsolete Filo `system`/`dynamic` settings were removed.

Commit-boundary verification: the exact staged source snapshot passed typecheck and production build in an isolated temporary directory. The shared checkout's later typecheck was blocked by concurrent, excluded book-layout edits (`LayoutEditor.tsx`, `useDiagramTransition.ts`, `BookViewer.tsx`); those were not changed or included in this Filo commit.

Next owner: David reviews the assembled case study and decides the future intro direction. Built locally does not imply visual acceptance or deployment.
