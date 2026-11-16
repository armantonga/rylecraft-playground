# Held tool redesign — design

Date: 2026-11-10
Status: awaiting approval

## Intent

The hammer, pickaxe, and sword are the player's main verbs, but they currently look
thin and generic next to the game's chunky voxel world. Their first-person rendering
is also see-through, and the swing flicks upward instead of chopping down. Redesign
all three tools so they look and move like they belong in this world.

## Why the current tools fail

- **See-through first person:** `vmFix()` clones every view-model material with
  `depthTest=false` and `renderOrder=999`. Boxes paint over each other in creation
  order, so far parts show through near parts and pieces appear to float. The held
  block has the same problem through `tmat()`.
- **Upward flick:** the view-model rest rotation (`1.35` on `vmR`) points the tool
  up from the hand, and the swing only lowers it toward forward. The arm and tool
  are one rigid group, so the wrist cannot stay put while the tool swings.

## Goals

- Chunky voxel models for hammer, pickaxe, and sword that read clearly in first and
  third person and match the world's block scale.
- Correct self-occlusion: near tool parts hide far tool parts, and the tool stays in
  front of world geometry.
- A Minecraft-inspired swing: wind-up, accelerating downward chop, eased return,
  plus subtle walking bob and idle sway. No upward flick at rest or on release.
- Keep the existing wood / iron / diamond palette and the game's compact vanilla
  Three.js style. No build step or test framework.

## Non-goals

- New tools, tool tiers, durability, or gameplay changes.
- Redesigning the player character, hands, or block palette.
- Inventory icons; this is only the held 3D model.

## Anti-goals

- A flat sprite billboard, which would not match the world.
- Fixing the visuals by simply hiding the tool behind the camera or shrinking it.
- Per-frame allocations or heavy mesh counts that risk the mobile frame rate.

## Constraints

- `js/game.js` is a single compact file; models are built with the `box()` helper
  and attached to `me.armR` (third person) and the camera (first person).
- The first-person view model must stay in front of the world while still
  self-occluding, with camera `near = 0.1`.
- Existing toggle logic in `tools(m, force)` and `stepMe` / `stepVM` must keep
  working for build, erase, sword, fly, ride, and swim states.

## Approaches considered

### Model detail

- **A. Hand-built chunky voxel models (selected).** Roughly 10–16 boxes per tool:
  a thick two-box handle, stepped sword blade and tip, layered hammer head with dark
  bands, and stepped pick prongs. Cheap to render, consistent with world scale.
- **B. Extrude a 16×16 pixel mask into cubes.** Closest to Minecraft, but 50–80
  meshes per tool and a new generator, with real mobile performance risk.
- **C. Keep the current four-box models.** Fastest, but leaves the thin, generic
  silhouettes the redesign is meant to fix.

### Rendering

- **A. Separate view-model scene with a cleared depth buffer (selected).** Render the
  world normally, then `clearDepth()` and render hands/tools in their own scene with
  depth testing on. Correct self-occlusion and always in front of the world.
- **B. One scene, toggle layers/visibility between two passes.** Same depth result,
  but couples view-model state into the main scene.
- **C. Keep painter-order `depthTest=false` and assign render order per part.**
  Fragile and camera-angle dependent.

### Animation

- **A. Minecraft-style articulated swing (selected).** Wind-up, fast downward chop,
  eased return, with a separate wrist pivot so the tool never flips up. Subtle bob
  and sway in first person; shoulder/wrist blend in third person.
- **B. Simple downswing only.** Cheap, but lifeless.
- **C. Per-tool motion (overhead hammer/pick, horizontal sword slash).** Most
  characterful, but more tuning and more failure modes.

## Selected design

### Models

Add a single `toolModel(kind)` builder returning a group, used for both the
third-person `me[kind]` and the first-person clone. The grip sits at the group
origin and the tool extends down local `-Y`.

- **Handle:** two stacked wood boxes for a 2×2 chunky shaft, plus a darker grip band.
- **Sword:** stepped diamond blade (wide near the guard, narrower at the tip),
  lighter central fuller, dark crossguard, short grip, blocky pommel.
- **Pickaxe:** wood shaft and a stepped iron head; two prongs step outward and down
  instead of a flat crossbar.
- **Hammer:** wood shaft and a large blocky head with two dark banding rings and a
  slightly lighter striking face.

All models keep the current palette: wood `0x8b5a2b` / `0xb8803f` / `0x6b4423`,
iron `0xb8bcc2`, diamond `0x33d6cc` / `0xc9fff9`.

Attach each model through a wrist pivot group at the hand so the arm and tool can
pose independently. Third-person tools stay on `me.armR`; first-person tools stay
on the right `vm` hand.

### Rendering

- Create `vmScene` (no fog, no background). Move the `vm` group into it instead of
  parenting it to `cam`.
- In the loop: render `scene` normally, then set `R.autoClear=false`,
  `R.clearDepth()`, render `vmScene` with `cam`, and restore `R.autoClear=true`.
- Delete `vmFix()`. View-model materials use normal `depthTest` and `depthWrite`.
- Remove `depthTest:false` from `tmat()` so the held block occludes itself correctly.
- Tune rest/wind-up/strike poses so no part crosses the near plane.

### Animation

- Keep the existing `swing` timer (about 0.3 s) but treat it as normalized progress.
- Phases: 0–20% wind-up, 20–55% accelerating chop, 55–100% eased return.
- First person: wrist pivot rotates from rest (tool up-forward) through a slightly
  higher wind-up into a forward/down strike, then eases back. The arm follows
  subtly; the tool never points backward over the shoulder.
- Third person: blend `me.armR` from its walking swing into a compact shoulder raise
  and chop, with the wrist pivot adding the final forward/down angle.
- Keep a reduced walking bob and slow idle sway on the whole view model; zero it
  while flying or riding as today.

## Verification

- Capture first- and third-person frames at rest, wind-up, and strike for all three
  tools; confirm no see-through parts, no floating pieces, and no upward flick.
- Check the held block self-occludes in build mode.
- Re-run `game_tests.py`, `verify_shift.py`, and `test_light_queue.py`.
- Spot-check in Firefox after a hard refresh.

## Decisions left to the builder

- Exact box counts, proportions, and wrist angles; tune by screenshot.
- Whether the sword gets a slight diagonal twist during its chop.
- Final swing duration and bob amplitude within the ranges above.
