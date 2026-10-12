# Pipeline findings

## Recommended stack
1. Keep the existing Three.js grass scene and render the creature in the same scene/camera.
2. Load a `.glb` with `GLTFLoader` from `three/addons/loaders/GLTFLoader.js`.
3. Add `gltf.scene` to a dedicated creature `Group` positioned at the raycast hit point.
4. Create `new THREE.AnimationMixer(gltf.scene)` and use the model's `gltf.animations` clips.
5. Advance `mixer.update(deltaSeconds)` in the existing render loop.
6. Use named clips where available; Gobkit's animal files use one baked track with documented frame ranges, so use `AnimationUtils.subclip` only if needed and validate loop boundaries. Gobkit specifically recommends scrubbing the full track with `mixer.setTime` because subclip can introduce a loop jump.

## Official references
- GLTFLoader: https://threejs.org/docs/pages/GLTFLoader.html
  - Returns `scene`, `scenes`, and `animations`.
  - Supports Draco, Meshopt, WebP/KTX2 and other glTF extensions through the appropriate decoders/loaders.
- Three.js animation system: https://threejs.org/manual/pages/animation-system.html
  - AnimationClips contain keyframe tracks; AnimationMixer controls playback; AnimationActions support looping, fades, crossfades, and time scaling.
- AnimationMixer API: https://threejs.org/docs/pages/AnimationMixer.html
- Official glTF loading example: https://github.com/mrdoob/three.js/blob/dev/examples/webgl_loader_gltf.html
- Official animation blending example: https://github.com/mrdoob/three.js/blob/dev/examples/webgl_animation_skinning_blending.html
- glTF format and sample assets: https://github.com/KhronosGroup/glTF-Sample-Assets

## Compression
- Use GLB for a single-file asset.
- If the model is large, add Draco or Meshopt only after baseline integration; the current contribution graph is a small interaction and should avoid a heavy decoder unless needed.
- GLTFLoader docs explicitly require registering DRACOLoader/MeshoptDecoder when the asset uses those extensions.

## Recommendation for this scene
Preload one creature at page/graph mount, keep it hidden (`visible = false`) and reuse the object. On trigger, reset its mixer/action, position it at the hovered grass cell, play a short startled clip or a procedural jump/scale cue, then transition to walk/run and fade the group out. Dispose only on unmount, not between hover events.
