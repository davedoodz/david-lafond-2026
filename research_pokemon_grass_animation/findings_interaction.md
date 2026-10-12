# Interaction findings

## Raycast/picking
- Three.js Raycaster docs: https://threejs.org/docs/pages/Raycaster.html
- Three.js picking manual: https://threejs.org/manual/pages/picking.html
- Convert pointer coordinates relative to the renderer canvas, call `raycaster.setFromCamera(pointer, camera)`, and use `intersectObjects(grassCells, true)`. Intersections are nearest-first.
- If the contribution graph already has per-cell meshes or hit targets, raycast those instead of every grass blade. Use one invisible, low-resolution hit plane/cell mesh per contribution cell for stable interaction and low cost.

## Minimal state machine
Use a single active encounter object:
- `hidden`: no creature visible.
- `startled`: pointer enters a grass cell; reveal at the hit cell, scale/position pop, and play a short startled cue.
- `moving`: after a short delay, blend to walk/run and move through nearby grass cells or a small local path.
- `fading`: reduce opacity/scale or sink into the grass; then return to `hidden`.
- Ignore new triggers while active, or queue only the latest cell. Add a cooldown to prevent rapid repeated spawns.

## Animation timing
Use `AnimationAction.reset()`, `setLoop(THREE.LoopOnce)`, `clampWhenFinished` for the startled one-shot, then listen for the mixer `finished` event to start movement. Crossfade to a looping walk action, then fade out the group and stop actions when the encounter completes. `AnimationMixer.update(delta)` belongs in the graph's existing animation frame.

## Accessibility and input
- Hover-only content is not sufficient for keyboard/touch. Provide the same encounter on focus or click/tap of a cell, or treat the graph as decorative and expose a separate accessible “surprise creature” control.
- W3C WCAG 2.2 SC 1.4.13 requires hover-triggered additional content to be dismissible, hoverable, and persistent where applicable: https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html
- For this transient decorative creature, respect `prefers-reduced-motion`, avoid sound by default, and ensure the graph remains usable if WebGL or model loading fails.

## Recommendation
Trigger from the grass cell hit target on pointerenter/pointermove with a small movement threshold, not from every frame. On desktop use raycast hover; on keyboard/focus and touch use explicit activation. Keep the encounter under roughly 1–2 seconds so it reads as a surprise, not a blocking interaction.
