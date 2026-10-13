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

Seven hero moments: Today, Technical File, Supplier Comparison, NFC Sample Arrival, Voice Evidence Capture, Contextual Warning, Scale Review. All fifteen flows remain accessible in the interactive walkthrough. The physical context and accumulated evidence are the core story.

Problem / Opportunity / Solution presets mean **different complete diagram design approaches**: distinct composition, layout, connectors and visual storytelling, not just swapped icons. Use the installed lucide-react library for icons. Maintain the existing portfolio typography and Filo moss palette unless the Paper reference calls for a specific treatment.
