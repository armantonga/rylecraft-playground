# Per-tool swing animations — design

Date: 2026-11-11
Status: approved 2026-11-11

## Intent

Give each tool its own Minecraft-inspired swing: pickaxe and hammer overhead chops, sword
a diagonal slash. The block or animal effect lands on the animation's impact frame, not the
moment the player taps. All three tools rest in the same pose: right hand beside the hip,
elbow bent, forearm angled up and forward, hand on the lower/middle handle, tool head or
blade above the hand and tilted outward.

## Why the current swing falls short

- All three tools share one `swingPose()` curve and `SWING_DUR = .3`; a pickaxe, hammer,
  and sword move identically.
- `tap()` and the sword button apply build/break/damage immediately, so effects land before
  the tool reaches the block or animal.
- The right arm is one rigid shoulder-to-hand group, so it cannot bend at the elbow to match
  the approved rest pose.
- Each tool is pivoted at the top of its handle, so the hand grips the butt rather than the
  lower/middle of the handle.

## Goals

- Shared rest pose matching the reference: right hand beside the right hip, upper arm
  hanging, elbow bent, forearm up and forward, tool head/blade above the hand and angled
  outward. Hand grips the lower third of the handle.
- Pickaxe: raise back and up, chop down, crack the block and spawn particles at impact,
  ease back to idle. About 450–500 ms.
- Hammer: same overhead chop, applying the build or break action at impact. About 450–500 ms.
- Sword: pull back slightly, slash diagonally across the character, apply damage and hit
  particles at impact, ease back. About 350–400 ms.
- Animate arm and tool together around shoulder, elbow, and wrist pivots — never the model
  center.
- Fire each action exactly once, on the impact frame, in both first and third person.
- Accept repeated touch input without overlapping swings.
- Keep the compact vanilla Three.js style and mobile frame rate.
- Preserve the character models, tool models, and all build/erase/sword behavior.

## Non-goals

- New tools, tiers, durability, damage values, or build rules.
- A general animation system or `THREE.AnimationMixer`.
- Redesigning the character, hands, backpack, or left arm.
- New particle types or sounds.

## Anti-goals

- Firing effects on tap and letting the animation catch up.
- Restarting or stacking swings mid-animation.
- Rotating the whole tool around its model center.
- Per-frame allocations, per-swing meshes, or extra draw calls.

## Constraints

- `js/game.js` stays a single compact file, vanilla Three.js, no build step or test framework.
- Existing entry points must keep working: `tap()`, `hitAt()`, `pick()`, `tools()`,
  `stepVM()`, `stepMe()`, `swimPose()`, `setMode()`, and the sword button.
- Third person renders `me` in the world; first person renders clones in `vmScene` with a
  cleared depth buffer.
- The loop clamps `dt` to .05 s, so impact checks must survive a single large step.
- Mobile is the primary target; the animator must do only a handful of rotation writes per
  frame.

## Approaches considered

- **A. Per-tool timeline spec with one animator (selected).** Each tool owns a duration,
  impact fraction, and pose curves for shoulder, elbow, and wrist in each view. One animator
  advances the active timeline, writes both rigs, and fires the stored action once when it
  crosses the impact frame. Effects stay frame-synced under frame drops, and each tool is
  tuned independently. Cost: poses are hand-tuned from screenshots.
- **B. Extend the shared `swingPose()` with per-tool offsets and a `setTimeout` for impact.**
  Smallest diff, but effect timing can drift from the visuals under frame drops or tab
  throttling, and one curve cannot express both an overhead chop and a diagonal slash.
- **C. Keyframe clip tables or `THREE.AnimationMixer`.** Readable and extensible, but more
  machinery and per-frame allocation than three tools need in this compact game.

A was chosen because it directly satisfies impact synchronization while staying small and
keeping all three swings tunable in one place.

## Selected design

### Rig and rest pose

Split the third-person right arm into an upper arm and a forearm with a new elbow pivot,
keeping the existing sleeve and hand boxes, colors, and total length. The chain becomes
shoulder (`me.armR`) → elbow (`me.elbowR`) → hand/wrist (`me.wristR`) → tool.

First person keeps `vmR` and `vmWrist`; there is no visible upper arm, so `vmR` acts as the
bent forearm anchor and `vmWrist` carries the tool.

Re-pivot each tool inside its group so the hand sits on the lower third of the handle while
the head/blade still extends along local -Y. Then set the rest pose: shoulder slightly
forward, elbow bent about 90–120°, wrist angled outward, so the hand rests beside the hip and
the tool head/blade sits above and outside the hand. The same rest angles apply to all three
tools; exact values are tuned from screenshots.

### Animation timelines

One animator owns at most one active swing. A small per-tool spec holds:

| Tool | Duration | Impact at | Motion |
|------|----------|-----------|--------|
| Pickaxe | 480 ms | 55% | Raise arm back/up, chop down and inward |
| Hammer | 500 ms | 55% | Raise arm back/up, chop down |
| Sword | 380 ms | 50% | Pull back slightly, slash diagonally across, recover |

Each timeline has three phases: eased wind-up, accelerating strike into the impact frame, and
a smooth eased return. Pose functions return shoulder, elbow, and wrist angles for the active
view; first person uses `vmR` position/rotation plus `vmWrist`, third person uses shoulder,
elbow, and wrist. The sword adds a slight wrist twist so the blade crosses the body
diagonally.

The animator advances by `dt`, computes normalized progress, and compares it with the impact
fraction. If the impact frame was crossed and the action has not fired, it fires exactly once.
When progress reaches 1, the pose returns to rest and one queued swing may start.

### Starting, queueing, and overlap

`startSwing(action)` starts immediately when idle. While a swing is active, one follow-up
action is remembered and started when the current swing returns; any further taps are
ignored. The ad-hoc 180 ms / 300 ms button throttles are removed so the queue owns pacing.

Changing mode cancels the active swing and clears the queue, then resets the pose to rest, so
a hidden tool never finishes a stale action. Toggling first/third person does not reset
progress; both rigs are driven from the same timeline. The mount check stays immediate and
does not start a swing.

### Impact actions

Input is split into capture and application:

- On tap or sword-button press, capture the intent: mode, clicked coordinates, and the target
  block or animal after the existing range, occlusion, and distance checks.
- At impact, apply the captured action once: flash and burst plus set/erase for build/erase,
  or `hitA()` for the sword. Re-validate that the target block or animal still exists before
  applying; otherwise the action fizzles without spawning effects.
- The sword button's temporary tool-show timer starts with the swing, and damage lands at the
  impact frame like the tap path.
- `setMode()` cancels any pending action, so switching tools cannot apply a build or hit with
  the wrong tool.

### Swimming and other states

`swimPose()` keeps priority over the third-person arm while swimming; the timeline still
advances and fires its action, but the swim stroke wins the arm pose. First person can animate
normally. Riding and flying keep the existing leg and bob rules; only the arm and tool swing.

### Mobile performance

The animator writes only rotations and a few positions per frame, with no allocations, no
mixers, and no new meshes. Pose math uses scalar functions and reused state. The single
one-deep queue caps work under rapid touch input.

## Verification

- Structural checks: shoulder → elbow → wrist chain exists in third person; each tool's grip
  is offset to the lower handle; each tool has a distinct duration and impact fraction.
- Behavioral checks: effects do not fire before impact, fire once on impact, never fire twice,
  and a queued swing starts only after the current one ends. Mode change cancels pending work.
  A single large `dt` still crosses impact exactly once.
- Visual checks: capture rest, wind-up, impact, and recovery frames for all three tools in
  first and third person, including the held block. Compare the rest silhouette against the
  approved reference.
- Re-run `tool_tests.py`, `game_tests.py`, `verify_shift.py`, and `test_light_queue.py` after
  updating tool expectations.
- Spot-check in Firefox after a hard refresh and bump the `index.html` cache-buster.

## Decisions left to the builder

- Exact rest angles, grip offset, and per-tool pose values within the stated ranges.
- Exact easing constants and the sword's wrist twist.
- Whether the sword's diagonal starts above or below the shoulder line.
- Final impact fractions within a few percent of the table.
