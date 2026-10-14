# Portfolio scanner — Blender web pipeline and Astra prompt

Goal: a handheld 3D scanner lives beside the Book / Grid pill. Click → it flies to the page, spins 360°, locks at bottom-center with its back to the viewer, and sweeps a beam from top to bottom while the skeleton-grid overlay reveals under the beam. It then returns to the pill.

## Decision: Blender makes the asset; the browser runs the interaction

- No pre-rendered animation. The scanner is a compact hard-surface asset: target ≤15,000 triangles, one texture set at 1024² maximum, and a `.glb` under 1 MB.
- The browser owns position, rotation, scale, hover state, lighting state, beam geometry, and scan timing. These depend on live Book/Grid dimensions, scroll position, and viewport size.
- Blender owns geometry, pivots, materials, named attachment points, and review renders. It may include a subtle `Idle` clip, but it must not animate the `Scanner` root.
- The PC runs Astra with Blender MCP for asset production. The MacBook runs Vite and integrates the validated GLB with three.js.

## Authoritative references

Use these repository files, in this priority order:

1. `content/scanner-references/scanner-model-sheet.png` — authoritative geometry, proportions, dimensions, materials, and finish.
2. `content/scanner-references/scanner-hover-on.png` — authoritative ON state: visor strip, visor grid, and grip indicator illuminated.
3. `content/scanner-references/scanner-default-off.png` — authoritative OFF state: visor and grip indicator dark.

If an older written description conflicts with these images, follow the images.

## Ownership split

| Blender / Astra | Browser / portfolio code |
| --- | --- |
| Body, visor cavity, grid surface, button, and grip indicator geometry | Resting position beside Book/Grid pill |
| PBR materials and separate emissive surfaces | Cursor tilt, hover enter/leave, interruption, and easing |
| Named empties `Emitter` and `Rest` | 360° flight, center lock, bottom scan pose, and return |
| Optional `Idle` clip only | `VisorStrip`, `VisorGrid`, and `GripLED` emissive intensity |
| Turntable, contact sheet, `.blend`, and optimized `.glb` | Beam cone and scanline synchronized to `useDiagramTransition` |

### Hover lights

Hover lighting is controlled in browser code, not baked as `VisorOn` / `VisorOff` clips. The GLB provides independently addressable meshes and materials:

- `VisorStrip` / `Mat_VisorStrip`
- `VisorGrid` / `Mat_VisorGrid`
- `GripLED` / `Mat_GripLED`

Their exported emissive intensity starts at 0. Browser code animates the intensity to the tuned ON values, reverses from the current value on pointer leave, and can interrupt the transition without restarting it. This matches the two state references and keeps DialKit in control of timing and brightness.

## Codex MCP setup on the PC

Codex—not Antigravity—is the MCP client. The Antigravity `mcp_config.json` is not used. Codex reads `%USERPROFILE%\.codex\config.toml`.

With Blender open and its MCP add-on running on port `9876`, register the bridge from PowerShell:

```powershell
codex mcp add blender-mcp --env BLENDER_HOST=127.0.0.1 --env BLENDER_PORT=9876 -- node "C:/Users/David/blender-mcp-20261013-234105/src/mcp-server/dist/index.js"
```

Verify:

```powershell
codex mcp list
```

If the Codex CLI is unavailable, add this directly to `%USERPROFILE%\.codex\config.toml`:

```toml
[mcp_servers.blender-mcp]
command = "node"
args = ["C:/Users/David/blender-mcp-20261013-234105/src/mcp-server/dist/index.js"]

[mcp_servers.blender-mcp.env]
BLENDER_HOST = "127.0.0.1"
BLENDER_PORT = "9876"
```

Restart Codex after changing MCP configuration. Test with: `Use blender-mcp to report Blender's connection status. Do not modify the scene.`

## Workflow

1. On the PC, clone the portfolio branch and open it in Codex.
2. Keep Blender open with Blender MCP running on `ws://127.0.0.1:9876`.
3. Select Astra in Codex and confirm it can call `blender-mcp`.
4. Paste the prompt below.
5. Astra creates only a blockout first, renders the required views, and waits for approval.
6. After approval: details → materials → optional idle clip → validation → GLB export.
7. Validate the GLB in a three.js glTF viewer and with `gltf-validator`.
8. Commit only `public/work/harvard-mit/scanner/scanner.glb` to the portfolio repository. Store `.blend`, turntable, and full-resolution review media in the DavidOS Drive vault.
9. On the Mac, integrate the GLB with lazy-loaded three.js / React Three Fiber and synchronize the scanner beam with the existing skeleton reveal.

## GLB contract

- Units: metres.
- Overall height: 0.120 m.
- Head: 0.100 m wide × 0.056 m high × 0.056 m deep.
- Grip width: 0.028 m. Derive remaining grip dimensions from the orthographic sheet.
- Origin: bottom-center of the grip.
- Apply transforms before export.
- The `Scanner` root must have no location, rotation, or scale animation.

### Required hierarchy and exact names

```text
Scanner
├── Head
│   ├── BodyShell
│   ├── VisorCavity
│   ├── VisorStrip
│   └── VisorGrid
├── Grip
│   ├── GripBody
│   ├── GripButton
│   └── GripLED
├── Emitter
└── Rest
```

- `Emitter`: empty at the center of the visor opening. Its forward axis points out of the visor and anchors the browser beam.
- `Rest`: empty at the root/origin representing the neutral asset pose.

### Required materials and exact names

- `Mat_Body`: warm off-white matte plastic based on the model sheet.
- `Mat_VisorCavity`: near-black matte cavity.
- `Mat_Button`: slightly rubberized mid-grey.
- `Mat_VisorStrip`: soft-white emissive surface, exported OFF.
- `Mat_VisorGrid`: soft-white emissive grid, exported OFF.
- `Mat_GripLED`: soft-white emissive indicator, exported OFF.

Use Principled BSDF and glTF-supported inputs only. Avoid procedural nodes unless baked. Do not use transparent materials for the beam; the browser creates the beam.

### Optional animation

- `Idle`: 4-second seamless loop with a maximum ±2 mm local vertical float and ±4° local yaw on an internal parent beneath `Scanner`.
- No `VisorOn`, `VisorOff`, beam, flight, 360° spin, or scan-sweep clips.
- The browser owns all those states and transitions.

---

## Prompt for Astra — Codex + Blender MCP

Attach or explicitly reference all three files under `content/scanner-references/`, then paste everything below.

```text
You are Astra, operating Blender through Blender MCP as a senior hard-surface product
modeler and real-time asset artist. Build a hero handheld scanner for an award-caliber
portfolio website. The browser will render the GLB live with three.js and will own all
interactive motion, hover lighting, and beam behavior. Your deliverable is a clean,
lightweight, validated real-time asset—not a pre-rendered animation.

Before changing the Blender scene:
1. Read this entire file: content/scanner-pipeline.md.
2. Inspect these authoritative references:
   - content/scanner-references/scanner-model-sheet.png
   - content/scanner-references/scanner-hover-on.png
   - content/scanner-references/scanner-default-off.png
3. Confirm Blender MCP is connected.
4. Report your inferred dimensions, scene hierarchy, material plan, and blockout plan.
5. Wait for approval. Do not begin detailed modeling before approval.

REFERENCE PRIORITY
The three current images are authoritative. If older text or concepts conflict with them,
follow the current images. The model sheet controls geometry and dimensions. Hover-on and
default-off control the emissive states.

SKILLS TO APPLY
1. Restrained industrial design: Braun / Dieter Rams / Teenage Engineering discipline;
   functional details only and consistent edge language.
2. Hard-surface modeling: clean quad topology, stable bevels, weighted normals, consistent
   fillets, no pinching, no accidental n-gons on curved or beveled surfaces.
3. Orthographic reconstruction: use the front, back, left, right, top, bottom, perspective,
   exploded, wireframe, and detail views together rather than tracing one perspective image.
4. Real-time asset production: ≤15,000 triangles after export, ≤1 MB target GLB, ≤1024²
   texture set, low draw-call count, glTF-safe PBR materials.
5. Product visualization: neutral lighting, correct scale cues, crisp silhouette, controlled
   reflections, and readable black cavity without crushed detail.
6. Technical contract discipline: preserve every required node and material name exactly.
7. Self-critique: compare milestone renders to the references, score each category, and fix
   the lowest category before proceeding.

AUTHORITATIVE DIMENSIONS
- Overall scanner height: 120 mm.
- Head: 100 mm wide × 56 mm high × 56 mm deep.
- Grip width: 28 mm.
- Infer the remaining grip dimensions and lean from the orthographic views.
- Blender units: metres. Overall height must be exactly 0.120 m.
- Origin: bottom-center of the grip. Apply transforms before export.

FORM AND SURFACES
- Wide chamfered rectangular head with softened bevels and a slightly faceted product form.
- Deep inset visor cavity with a dark inner shell and a shallow floor receding into the head.
- Separate bright strip across the visor's upper interior.
- Separate thin grid surface matching the hover-on reference.
- Tapered grip with a circular rubberized button and a short vertical indicator near the base.
- Plain rear shell as shown in the current model sheet. Do not add old concept lettering.
- Match the exploded-view separation and the wireframe references when organizing parts.

EXACT HIERARCHY
Scanner                 (root; never animate location, rotation, or scale)
  Head
    BodyShell
    VisorCavity
    VisorStrip
    VisorGrid
  Grip
    GripBody
    GripButton
    GripLED
  Emitter                (empty at visor center, forward axis points out of visor)
  Rest                   (empty at root/origin, neutral asset pose)

EXACT MATERIAL NAMES
- Mat_Body: warm off-white matte plastic, roughness approximately 0.55, metallic 0.
- Mat_VisorCavity: near-black matte material, enough roughness to preserve cavity depth.
- Mat_Button: slightly rubberized mid-grey.
- Mat_VisorStrip: soft-white emissive surface, emission strength exported at 0.
- Mat_VisorGrid: soft-white emissive grid, emission strength exported at 0.
- Mat_GripLED: soft-white emissive indicator, emission strength exported at 0.

The browser controls hover ON/OFF. Do not bake VisorOn or VisorOff actions. Do not bake
beam or scan animations. Keep VisorStrip, VisorGrid, and GripLED independently addressable
so browser code can animate emissive intensity continuously and reverse it mid-transition.

OPTIONAL ANIMATION
You may create one action only:
- Idle: 4.0-second seamless loop, maximum ±2 mm local vertical float and ±4° local yaw on
  an internal parent below Scanner. Never keyframe Scanner itself.

PROCESS — STOP FOR APPROVAL AT EACH MILESTONE
1. BLOCKOUT
   Build the complete silhouette and primary cavity using the model-sheet dimensions.
   Render front, back, left, right, top, bottom, and one front perspective with a neutral
   orthographic/product camera setup. Report the measured bounding box. Stop for approval.
2. DETAIL
   Add final bevels, inset geometry, visor floor, grid, button, LED, and clean topology.
   Show MatCap/wireframe close-ups and report triangle count. Stop for approval.
3. MATERIALS
   Build glTF-safe Principled materials. Render the exact default-off and hover-on states,
   matching the supplied state references. Stop for approval.
4. OPTIONAL IDLE
   Add only the Idle action if approved. Prove it loops without a frame-boundary jump.
5. EXPORT AND VALIDATION
   Export GLB with applied modifiers, animations enabled only if Idle exists, cameras and
   lights excluded, textures embedded, and Draco level 6 if supported. Validate the GLB and
   report file size, dimensions, triangle count, node names, material names, animation names,
   texture sizes, and glTF extensions.

QUALITY GATES
Score 1–5 after each milestone:
- silhouette and proportions
- orthographic agreement
- bevel and shading quality
- cavity depth and readability
- default-off state match
- hover-on state match
- topology cleanliness
- hierarchy/material contract
- real-time performance

Any score below 4 requires another correction pass. Do not claim completion until every
score is at least 4 and the exported GLB validates.

DELIVERABLES
- blender/scanner/source/scanner.blend
- blender/scanner/exports/scanner.glb
- blender/scanner/renders/scanner-turntable.mp4
- blender/scanner/renders/scanner-sheet.png
- blender/scanner/EXPORT_REPORT.md

Do not edit React, TypeScript, CSS, package files, or the portfolio website. Work only in
Blender and the blender/scanner asset folders. Begin by returning the connection check,
reference analysis, hierarchy, material plan, and blockout plan. Then wait for approval.
```
