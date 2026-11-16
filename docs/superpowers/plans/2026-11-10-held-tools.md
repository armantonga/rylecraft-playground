# Held Tool Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hammer, pickaxe, and sword with chunky voxel models, render first-person tools in a depth-correct overlay pass, and give them a Minecraft-style downward chop.

**Architecture:** A shared `toolModel(kind)` builder creates all three tools once for third person and once as first-person clones. Each hand gets a wrist pivot so the arm and tool can pose independently. The first-person hands move into a separate `vmScene`, rendered after the world with `clearDepth()` and normal depth testing. A pure `swingPose(p)` curve drives both view models.

**Tech Stack:** Vanilla JavaScript, Three.js r128, single `js/game.js`, no build step. Verification uses Python CDP scripts against headless Chrome and the existing regression suites.

**Spec:** `docs/superpowers/specs/2026-11-10-held-tools-design.md`

## Global Constraints

- Edit only `js/game.js` and the cache-buster in `index.html`; do not add a build step, bundler, or test framework.
- Tool palette, verbatim: wood `0x8b5a2b`, `0xb8803f`, `0x6b4423`; iron `0xb8bcc2`; diamond `0x33d6cc`, `0xc9fff9`.
- Tools are built with the grip at the group origin and extend down local `-Y`.
- Project is not a git repository. Do not run `git init`; each task ends with its test/verification passing instead of a commit.
- Server: `python3 -m http.server 8000` from the project root. CDP: headless Chrome on port 9222. Always disable cache and reload with `ignoreCache: true`.
- Bump `js/game.js?v=2` to `?v=4` in `index.html` when implementation is complete; Firefox needs one hard refresh.
- Use the existing `box(w,h,d,color,x,y,z,group)` helper to add boxes. Keep material use `MeshBasicMaterial`.

## Review Focus

- **Swing while moving, flying, or riding:** the tool must return to a stable rest pose and must not keep bobbing while flying or riding. Pinned by the rest-pose and `mvg=0` checks in Tasks 3 and 4.
- **Switching tools mid-swing:** only the selected tool is visible, and it is the one that animates. Pinned by the `setMode` check in Task 4.
- **Camera tight against a wall:** the first-person tool must not be clipped by the near plane or punch through world blocks. Pinned by the near-wall screenshots in Task 5.
- **Weather, night, and underwater:** the view model must stay visible and unfogged in every scene state. Pinned by the weather/underwater screenshots in Task 5.
- **Build-mode held block:** after removing `depthTest:false`, the block must occlude its own faces correctly. Pinned by the material check in Task 2 and the build-mode screenshot in Task 5.

---

### Task 1: Shared chunky tool models and wrist pivots

**Files:**
- Modify: `js/game.js` (third-person tools around lines 249–253; first-person setup around lines 255–263)
- Test: `/tmp/opencode/tool_tests.py` (new)

**Interfaces:**
- Consumes: `box(w,h,d,c,x,y,z,g)`.
- Produces: `toolModel(kind)` where `kind` is `'sword' | 'pick' | 'hammer'`, returning a `THREE.Group` with its grip at `(0,0,0)` and the tool extending down `-Y`. Produces `me.wristR` (child of `me.armR`) and `vmWrist` (child of `vmR`), both positioned at `(0,-.62,0)`. `me[kind]` and `vm[kind]` are children of those pivots.

- [x] **Step 1: Write the failing model test**

Create `/tmp/opencode/tool_tests.py` using the CDP harness from `/tmp/opencode/game_tests.py` lines 1–46 (open the page, set the tester name, reload with cache disabled, then `goHome(); flatWorld(); enter();`). Add this check:

```python
models = await ev(r"""
(()=>{
  const localBox=g=>{const b=new THREE.Box3();g.traverse(o=>{if(o.isMesh){o.updateMatrix();
    o.geometry.computeBoundingBox();const bb=o.geometry.boundingBox.clone();bb.applyMatrix4(o.matrix);b.union(bb)}});return b};
  const out={ok:typeof toolModel==='function',tools:{}};
  for(const k of ['hammer','pick','sword']){
    const g=me[k], n={meshes:0,colors:new Set()};
    g.traverse(o=>{if(o.isMesh){n.meshes++;n.colors.add(o.material.color.getHex())}});
    const b=localBox(g), s=new THREE.Vector3();b.getSize(s);
    out.tools[k]={meshes:n.meshes,size:[+s.x.toFixed(2),+s.y.toFixed(2),+s.z.toFixed(2)],
      colors:[...n.colors],parentIsWrist:g.parent===me.wristR};
  }
  const vb=localBox(vm.sword), vs=new THREE.Vector3();vb.getSize(vs);
  out.vmSwordParent=vm.sword.parent===vmWrist;
  out.vmSwordSize=[+vs.x.toFixed(2),+vs.y.toFixed(2),+vs.z.toFixed(2)];
  return out;
})()
""")
tools = models.get("tools", {})
check("models: toolModel exists and each tool is chunky",
      models.get("ok") and all(t.get("meshes", 0) >= 10 and t.get("size", [0,0,0])[1] >= .85 for t in tools.values()),
      models)
check("models: hammer and pick are wide, sword is long",
      tools.get("hammer", {}).get("size", [0])[0] >= .45
      and tools.get("pick", {}).get("size", [0])[0] >= .45
      and tools.get("sword", {}).get("size", [0,0])[1] >= 1.0, tools)
check("models: tools use the wood/iron/diamond palette",
      0x8b5a2b in tools.get("sword", {}).get("colors", [])
      and 0x33d6cc in tools.get("sword", {}).get("colors", [])
      and 0xb8bcc2 in tools.get("pick", {}).get("colors", [])
      and 0xb8803f in tools.get("hammer", {}).get("colors", []), tools)
check("models: both hands use wrist pivots",
      all(t.get("parentIsWrist") for t in tools.values()) and models.get("vmSwordParent") is True
      and models.get("vmSwordSize", [0,0,0])[1] >= 1.0, models)
```

- [x] **Step 2: Run the test and confirm it fails**

Run: `python3 /tmp/opencode/tool_tests.py`
Expected: FAIL on the model checks because `toolModel` is not defined and `me.wristR` does not exist.

- [x] **Step 3: Implement `toolModel(kind)` and attach it through wrist pivots**

In `js/game.js`, add a `toolModel(kind)` function with one branch per tool. Build each tool from 10–16 boxes using the anatomy in the design:

- Handle: two stacked wood boxes forming a 2×2 shaft below the grip, plus a darker grip band.
- Sword: stepped diamond blade, lighter fuller, dark crossguard, short grip, blocky pommel.
- Pickaxe: wood shaft plus stepped iron head with two prongs stepping outward and down.
- Hammer: wood shaft plus a large blocky head with two dark banding rings and a lighter striking face.

Use the exact palette from Global Constraints. The grip sits at `(0,0,0)` and the head is toward `-Y`.

Then create the pivots:

```js
me.wristR = new THREE.Group();
me.wristR.position.set(0, -.62, 0);
me.armR.add(me.wristR);

const vmWrist = new THREE.Group();
vmWrist.position.set(0, -.62, 0);
vmR.add(vmWrist);
```

Assign `me.sword`, `me.pick`, and `me.hammer` from `toolModel(...)`, add them to `me.wristR`, and set initial visibility as before (hammer visible, pick and sword hidden). In the first-person block, clone each into `vm[kind]`, add the clones to `vmWrist`, and hide them. Do not keep the old four-box model definitions.

- [x] **Step 4: Run the model test and confirm it passes**

Run: `python3 /tmp/opencode/tool_tests.py`
Expected: PASS on all four model checks. If a size threshold fails, adjust the model proportions, not the test, unless the test itself contradicts the design.

---

### Task 2: Separate view-model render pass and depth-correct materials

**Files:**
- Modify: `js/game.js` (view-model setup around lines 255–266; render pass around line 633; `tmat()` around line 265)
- Test: `/tmp/opencode/tool_tests.py` (extend)

**Interfaces:**
- Consumes: `vm`, `vmR`, `vmL`, `held`, and the tool clones from Task 1.
- Produces: `vmScene` (`THREE.Scene`, no fog/background) containing `vm`. `vmFix` is removed. `tmat()` returns depth-tested materials. The loop ends with the world render followed by the view-model render.

- [x] **Step 1: Write the failing render/material test**

Append this check to `/tmp/opencode/tool_tests.py`:

```python
render = await ev(r"""
(()=>{
  let noDepth=[], ro=0;
  vm.traverse(o=>{if(o.isMesh){const m=o.material;
    if(o.renderOrder===999)ro++;
    (Array.isArray(m)?m:[m]).forEach(x=>{if(x.depthTest===false||x.depthWrite===false)noDepth.push(o.type)});
  }});
  held.material=(held.material.length?held.material:[held.material]);
  const heldOk=held.material.every(x=>x.depthTest!==false&&x.depthWrite!==false);
  return {vmParentIsScene:vm.parent===cam&&cam.parent===vmScene,sceneIsScene:!!(vmScene&&vmScene.isScene),
    fog:vmScene&&vmScene.fog,noDepth,heldOk,vmFix:typeof vmFix,renderOrder:ro};
})()
""")
check("render: hands live in a separate view-model scene",
      render.get("vmParentIsScene") is True and render.get("sceneIsScene") is True
      and render.get("fog") is None, render)
check("render: view-model materials depth-test instead of painter-ordering",
      render.get("noDepth") == [] and render.get("heldOk") is True
      and render.get("vmFix") == "undefined" and render.get("renderOrder") == 0, render)
```

- [x] **Step 2: Run the test and confirm it fails**

Run: `python3 /tmp/opencode/tool_tests.py`
Expected: FAIL because `vm` is attached to `cam`, `vmScene` is undefined, and `vmFix` sets `depthTest=false`.

- [x] **Step 3: Implement the overlay scene and material cleanup**

- Add `const vmScene=new THREE.Scene();` beside the view-model groups.
- Replace `scene.add(cam);cam.add(vm);` with `vmScene.add(cam);cam.add(vm);`. The camera is not a renderable object; keeping `vm` under it preserves the camera-relative view-model transform, and the second scene still renders the hands separately.
- Delete `vmFix()` and its calls. Do not clone view-model materials for depth.
- Remove `depthTest:false` from the `tmat()` material options.
- Remove `held.renderOrder=999`.
- At the end of `loop`, replace `R.render(scene,cam);` with:

```js
R.render(scene,cam);
R.autoClear=false;
R.clearDepth();
R.render(vmScene,cam);
R.autoClear=true;
```

- [x] **Step 4: Run the render test and confirm it passes**

Run: `python3 /tmp/opencode/tool_tests.py`
Expected: PASS on the render checks. Open the page in first person once and confirm the tool is visible and not painted behind the world.

---

### Task 3: Swing curve and first-person chop

**Files:**
- Modify: `js/game.js` (`stepVM()` around line 268; add `SWING_DUR` and `swingPose()` nearby)
- Test: `/tmp/opencode/tool_tests.py` (extend)

**Interfaces:**
- Consumes: `vmWrist`, `vmR`, and the existing `swing`, `vt`, `mvg`, and `fly` globals.
- Produces: `SWING_DUR = .3` and `swingPose(p) -> number` in `[-1, 1]`, where `0` is rest, `-1` is full wind-up, and `+1` is full strike. `stepVM(dt)` writes `vmWrist.rotation.x` and `vmR.rotation.x`.

- [x] **Step 1: Write the failing swing and first-person pose test**

Append:

```python
swing = await ev(r"""
(()=>{
  const vals=[0,.2,.4,.55,.8,1].map(p=>+swingPose(p).toFixed(3));
  const strike=vals[1]<=vals[2]&&vals[2]<=vals[3];
  const ret=vals[3]>=vals[4]&&vals[4]>=vals[5];
  third=false; vm.visible=true; me.visible=false; mvg=0; fly=false;
  swing=0; stepVM(0); const rest=+vmWrist.rotation.x.toFixed(3);
  swing=SWING_DUR*(1-.2); stepVM(0); const wind=+vmWrist.rotation.x.toFixed(3);
  swing=SWING_DUR*(1-.55); stepVM(0); const hit=+vmWrist.rotation.x.toFixed(3);
  swing=SWING_DUR; stepVM(1); const end=+vmWrist.rotation.x.toFixed(3);
  return {vals,strike,ret,rest,wind,hit,end,leftSwing:swing,curve:typeof swingPose,
    dur:SWING_DUR};
})()
""")
check("swing: pose curve winds up, strikes, and returns to rest",
      swing.get("curve") == "function" and swing.get("dur") == 0.3
      and abs(swing.get("vals", [9])[0]) < .001 and swing.get("vals", [0])[1] < -.9
      and swing.get("vals", [0,0])[3] > .9 and abs(swing.get("vals", [0,0,0,0,0,1])[5]) < .001
      and swing.get("strike") is True and swing.get("ret") is True, swing)
check("swing: first-person wrist is high on wind-up and low on strike",
      swing.get("wind", 0) > swing.get("rest", 0) > swing.get("hit", 0), swing)
check("swing: a long frame step ends at rest without a stuck pose",
      swing.get("leftSwing") == 0 and abs(swing.get("end", 9) - swing.get("rest", 0)) < .001, swing)
```

- [x] **Step 2: Run the test and confirm it fails**

Run: `python3 /tmp/opencode/tool_tests.py`
Expected: FAIL because `swingPose` and `SWING_DUR` are undefined and `vmWrist` is not animated.

- [x] **Step 3: Implement `swingPose()` and the first-person animation**

Add constants and a pure curve near the view model:

```js
const SWING_DUR=.3;
function swingPose(p){
  p=Math.max(0,Math.min(1,p));
  if(p<.2)return -(1-(1-p/.2)*(1-p/.2));
  if(p<.55){const t=(p-.2)/.35;return -1+2*t*t}
  const t=(p-.55)/.45;return 1-(1-(1-t)*(1-t));
}
```

The three branches are wind-up (`0..-1`), accelerating strike (`-1..+1`), and eased return (`+1..0`). At `p=0`, `.2`, `.55`, and `1` the values are `0`, `-1`, `+1`, `0`.

Rewrite `stepVM(dt)` so it:

- Returns early when `!vm.visible`.
- Advances `vt` as today.
- Clamps `swing` with `swing=Math.max(0,swing-dt)` and computes `const s=swingPose(1-swing/SWING_DUR)`.
- Sets `vmWrist.rotation.x` to a first-person rest angle near `2.2` minus `s*.7`, so wind-up raises the tool and the strike drops it forward/down.
- Sets `vmR.rotation.x` to a small arm follow-through angle, roughly `0.15 + s*.08`.
- Keeps a reduced bob: `vm.position.y=Math.sin(vt)*.012*mvg` and `vm.position.x=Math.cos(vt*.5)*.008*mvg`.

Tune the rest angle so the tool sits in the lower-right of the screen and no part crosses the near plane.

- [x] **Step 4: Run the swing test and confirm it passes**

Run: `python3 /tmp/opencode/tool_tests.py`
Expected: PASS on the swing checks.

---

### Task 4: Third-person chop and tool switching

**Files:**
- Modify: `js/game.js` (`stepMe()` around line 284)
- Test: `/tmp/opencode/tool_tests.py` (extend)

**Interfaces:**
- Consumes: `SWING_DUR`, `swingPose()`, `me.wristR`, `me.armR`, and the existing `swing`, `sw`, `mvg`, `third`.
- Produces: third-person arm/wrist animation using the same curve. `tools(m, force)` continues to toggle `me[kind]` and `vm[kind]` visibility.

- [x] **Step 1: Write the failing third-person and switching test**

Append:

```python
tp = await ev(r"""
(()=>{
  third=true; mvg=0; fly=false; riding=null; me.visible=true;
  swing=0; stepMe(0); const rest={arm:+me.armR.rotation.x.toFixed(3),wrist:+me.wristR.rotation.x.toFixed(3)};
  swing=SWING_DUR*(1-.2); stepMe(0); const wind={arm:+me.armR.rotation.x.toFixed(3),wrist:+me.wristR.rotation.x.toFixed(3)};
  swing=SWING_DUR*(1-.55); stepMe(0); const hit={arm:+me.armR.rotation.x.toFixed(3),wrist:+me.wristR.rotation.x.toFixed(3)};
  swing=SWING_DUR; stepMe(1); const end={arm:+me.armR.rotation.x.toFixed(3),wrist:+me.wristR.rotation.x.toFixed(3)};
  swing=.2; setMode('erase');
  const vis={hammer:me.hammer.visible,pick:me.pick.visible,sword:me.sword.visible,
    vHammer:vm.hammer.visible,vPick:vm.pick.visible};
  setMode('build'); setMode('sword');
  const vis2={hammer:me.hammer.visible,pick:me.pick.visible,sword:me.sword.visible};
  return {rest,wind,hit,end,vis,vis2};
})()
""")
check("third person: arm and wrist chop down and return to rest",
      tp.get("wind", {}).get("arm", 0) < tp.get("rest", {}).get("arm", 0)
      and tp.get("hit", {}).get("arm", 0) > tp.get("rest", {}).get("arm", 0)
      and tp.get("wind", {}).get("wrist", 0) > tp.get("rest", {}).get("wrist", 0) > tp.get("hit", {}).get("wrist", 0)
      and abs(tp.get("end", {}).get("wrist", 9) - tp.get("rest", {}).get("wrist", 0)) < .001, tp)
check("third person: switching tools mid-swing shows only the selected tool",
      tp.get("vis") == {"hammer":False,"pick":True,"sword":False,"vHammer":False,"vPick":True}
      and tp.get("vis2") == {"hammer":False,"pick":False,"sword":True}, tp)
```

- [x] **Step 2: Run the test and confirm it fails**

Run: `python3 /tmp/opencode/tool_tests.py`
Expected: FAIL because `me.wristR.rotation.x` is never animated and the old swing rotates the arm to the wrong extreme.

- [x] **Step 3: Implement the third-person animation**

In `stepMe(dt)`, keep the walking logic through `me.armL.rotation.x=-sw;` then replace the old swing block with:

```js
me.armR.rotation.x=sw;
if(swing>0)swing=Math.max(0,swing-dt);
const s=swingPose(1-swing/SWING_DUR);
me.armR.rotation.x=sw+s*.7;
me.wristR.rotation.x=2.0-s*.8;
```

Set `me.wristR.rotation.y=-.5` once at creation so the tool angles outward instead of pointing straight away from the third-person camera. With a rest wrist angle near `2.0`, wind-up (`s=-1`) raises the tool to about `2.8` and the shoulder pulls back; strike (`s=+1`) drops the wrist to about `1.2` and drives the shoulder forward. Keep the arm rest pose when `swing=0`.

- [x] **Step 4: Run the third-person test and confirm it passes**

Run: `python3 /tmp/opencode/tool_tests.py`
Expected: PASS on the third-person and switching checks.

---

### Task 5: Visual verification, cache-buster, and regressions

**Files:**
- Modify: `index.html` line 62 (`js/game.js?v=2` → `?v=4`)
- Create: `/tmp/opencode/tool_visual.py`
- Reuse: `/tmp/opencode/game_tests.py`, `/tmp/opencode/verify_shift.py`, `/tmp/opencode/test_light_queue.py`

**Interfaces:**
- Consumes: everything from Tasks 1–4, plus `swing`, `SWING_DUR`, `stepVM`, `stepMe`, `setMode`, `third`, `vm`, `me`, `cam`.
- Produces: screenshot evidence and regression results.

- [x] **Step 1: Write the visual capture script**

Create `/tmp/opencode/tool_visual.py` using the CDP harness from `tool_tests.py`. For each tool (`build`, `erase`, `sword`) and each view (`third=false`, `third=true`), capture three frames:

- Rest: `swing=0`, let one frame render.
- Wind-up: `swing=SWING_DUR*(1-.2)`, call the active pose function once with `dt=0`, then replace `stepVM` or `stepMe` with a no-op so the loop holds the pose.
- Strike: `swing=SWING_DUR*(1-.55)`, same freeze.

Freeze pattern for first person (use the equivalent for `stepMe` in third person):

```js
const orig=stepVM; stepVM=()=>{}; orig(0);
```

Restore the original function after each screenshot. Save files as `/tmp/opencode/tool-<mode>-<view>-<phase>.png`.

Add three extra first-person shots:

- Near a wall: place a solid wall one block in front of the camera, hold the hammer at strike, capture. Confirm no tool part is clipped by the wall or near plane.
- Rain and night: call `setWeather(1)` and `setWeather(2)`, capture at rest. Confirm the tool stays visible and unfogged.
- Underwater: place the camera under water, capture at rest. Confirm the tool stays visible.
- Build mode held block: `setMode('build')`, capture the left-hand block at rest. Confirm its faces occlude correctly and it does not look hollow/see-through.

- [x] **Step 2: Capture and inspect all screenshots**

Run: `python3 /tmp/opencode/tool_visual.py`
Open the PNGs. Reject and fix if any of these appear:

- A tool part showing through another part, or a piece floating away from the tool.
- The tool pointing upward at rest or jumping upward on release.
- The tool crossing the camera's near plane or disappearing into a wall.
- The view model fogged or tinted by weather/underwater color.
- The held block showing its back faces through its front faces.

- [x] **Step 3: Bump the cache-buster**

Change `index.html` line 62 to:

```html
<script src="js/game.js?v=4"></script>
```

- [x] **Step 4: Run the structural and regression suites**

Run each command and confirm the expected result:

```bash
python3 /tmp/opencode/tool_tests.py
python3 /tmp/opencode/game_tests.py
python3 /tmp/opencode/verify_shift.py
python3 /tmp/opencode/test_light_queue.py
```

Expected: `tool_tests.py` all checks pass; `game_tests.py` 8/8; `verify_shift.py` 5/5; `test_light_queue.py` exits 0 with its pass message.

- [x] **Step 5: Report**

Report the screenshot paths and the four command results. Note that Firefox needs one hard refresh to pick up `?v=4`.
