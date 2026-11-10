# Exercise artwork

One illustration per seeded exercise. Black figures, ivory contours, red working muscles match the existing `../dumbbell_curl.png` style reference.

- `KEY.webp`: 16 articulated poses, 200 ms each, 3.2-second infinite loop, maximum 240 px.
- `KEY-poster.webp`: transparent static fallback and reduced-motion view.
- Plank has a poster only because its position is held.

Artwork was generated with the built-in imagegen tool. The prompt definitions and packaging code are in `../../../scripts/exercise-visuals/`; the behavior and original coverage audit are documented in `../../../docs/exercise-visuals.md`.

Keep all asset references in `../../src/exercise-visual-assets.ts` static so Metro bundles the images for offline use. Run `mobile/test/exercise-visuals.test.cjs` when changing the catalog or assets.
