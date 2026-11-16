# Rylecraft Playground

Open `index.html` in a browser to play. For the most reliable saving, serve the folder:

    python3 -m http.server 8000      # then open http://localhost:8000

## Folder
- `index.html`            page structure: home menu, game HUD
- `css/style.css`         all styling (HUD scales from one unit `--u`)
- `js/game.js`            the whole game (Three.js)
- `js/audio.js`           original procedural music, ambience and sound effects (Web Audio, no files)
- `assets/logo.webp`      logo used on the home menu
- `assets/hero.webp`      hero character on the home menu (transparent background)
- `assets/favicon.svg`    browser tab icon (grass block)
- `assets/reference/`     original art and mockups you supplied (logo, hero, menu designs, phone screenshot)
- `vendor/`               optional offline copy of Three.js r128 (see the note inside)
- `docs/original-project-brief.md`   the first project brief

## Finding things in `js/game.js`
- `endless procedural world`   terrain, biomes, rivers, mountains, trees, houses (seeded, 128x128 window follows the player)
- `function build(`            chunk meshes: face culling, ambient occlusion, torch light
- `procedural animals (V1)`    animal parts, palettes, species table `SP`, biome spawn tables, behaviour
- `weather: automatic clear, rain, thunder; night is manual`
- `function aboutModal()`       home "About the Game" card + picture-book modal (hero from `assets/`, tree/house/dog drawn as inline SVG)
- `function releasesModal()`    "What's New" release notes in the same picture-book frame (version, date, feature cards)
- `function howToPlayModal()`   "How to Play" controls card in the same picture-book frame
- `function stepMove`          walking, jumping, swimming, diving, flying
- `function save()` / `load()` save format: seed + your edits + animals + weather (localStorage `littleBuilderWorld.v6`, name in `rylecraft.name`)
- `js/audio.js`               `RyleAudio` engine: seven generative moods, material-aware block/tool/step sounds, animal voices, ambience beds, spatial panners, voice budget and settings (`rylecraft.audio.v1`)

## Controls
Touch: left side drag = move, right side drag = look, pinch = zoom, tap = build / mine / hit.
Desktop: WASD or arrows move, Q E turn, Space jump or up, Shift down or dive, mouse wheel zoom.

## Deploying to Vercel
This is a plain static site — no build step. `vercel.json` adds clean URLs and
long-lived cache headers for `js/`, `css/`, `vendor/` and `assets/` (scripts and
styles are already versioned with `?v=` cache-busters, so bump one when you edit
them). `.vercelignore` keeps `docs/` and `assets/reference/` out of the deploy.

```bash
npx vercel          # preview deployment
npx vercel --prod   # production deployment
```

The game saves to `localStorage`, so each visitor keeps their own world; there
is no backend or database to configure.

## Next steps
Move to Vite + ES modules (split `game.js` by system), PWA install + offline, multiple world slots, more block shapes.
