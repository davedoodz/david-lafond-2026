# Asset findings

## Recommended: Gobkit Free Assets
- Repository: https://github.com/Ariescar/gobkit-free-assets
- Direct animal files include `animal/Corgi.glb`, `animal/Bat.glb`, `animal/Duck.glb`, `animal/Platypus.glb`, and others.
- Format: standalone GLB, rigged and animated.
- License: CC0 1.0 according to the repository README and LICENSE; no attribution required.
- Animation gotcha: each model has one baked track; the README documents frame ranges for idle, attack, dead, and walk. Corgi is documented as idle 0–29, attack 30–59, dead 60–89, walk 90–119 at 24fps.
- Best fit: a clean, legally safer replacement for a Pokémon-like grass surprise. Use a generic creature and style it as an original hidden grass creature.
- Sources: https://github.com/Ariescar/gobkit-free-assets and https://gobkit.com/api/free

## Recommended: Quaternius Ultimate Animated Animal Pack
- Official pack page: https://quaternius.com/packs/ultimateanimatedanimals.html
- Format: glTF plus FBX, OBJ, and Blender; export/use the glTF/GLB version for Three.js.
- License: CC0.
- Contents: 12 animals, each with 12+ animations including walk, jump, attack, death, and gallop.
- Commercial and personal use are allowed; attribution is not required.
- Best fit: larger choice of animal silhouettes and motion clips, but more asset preparation than Gobkit.

## Khronos glTF sample assets
- Repository: https://github.com/KhronosGroup/glTF-Sample-Assets
- Useful as a loader/test reference and includes per-model license metadata, but it is not primarily a creature-animation library. Licenses vary by model (CC0, CC-BY, CC-BY-NC, and other references), so inspect each model README before shipping.
- Source: https://github.com/KhronosGroup/glTF-Sample-Assets

## Pokémon-specific risk
- A downloadable fan-made Pikachu or other Pokémon model is not a safe open-source website asset merely because the uploader attaches MIT/CC0. The model may be an unauthorized derivative of Pokémon IP; the uploader cannot grant rights they do not own.
- Pokémon official guidance: https://support.pokemon.com/hc/en-us/articles/360000634094-Can-I-use-Pok%C3%A9mon-images-or-materials
- Pokémon terms: https://www.pokemon.com/uk/legal/terms-of-use
- Copyright/derivative work background: https://www.copyright.gov/what-is-copyright/ and https://www.copyright.gov/eco/help-limitation.html
- Recommendation: make an original creature with a Pokémon-adjacent emotional beat, not a recognizable Pokémon name, silhouette, markings, or copied model.

## Conclusion
Use Gobkit Corgi, Bat, Duck, or Platypus first. They are compact GLBs with documented animation ranges and CC0 terms. If the user requires an actual Pokémon, treat that as a separate rights-cleared asset request, not as an open-source integration.
