# Per-tool Swing Animations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the pickaxe, hammer, and sword distinct Minecraft-inspired swings, with the build/break/damage action landing exactly on each swing's impact frame.

**Architecture:** A third-person elbow pivot splits the right arm into upper arm → forearm → wrist so the tools can rest beside the hip and chop around the shoulder and elbow. A single animator drives one active per-tool timeline, writes a shared pose into both the first- and third-person rigs, and fires one stored action once when the timeline crosses the impact fraction. A one-deep queue absorbs repeat taps; changing mode cancels pending work.

**Tech Stack:** Vanilla JavaScript, Three.js r128, single `js/game.js`, no build step. Verification uses Python CDP scripts against headless Chrome plus the existing regression suites.

**Spec:** `docs/superpowers/specs/2026-11-11-tool-swings-design.md`

## Global Constraints

- Edit only `js/game.js` and the cache-buster in `index.html`; test scripts live in `/tmp/opencode`. Do not add a build step, bundler, or test framework.
- Timeline values, verbatim: pickaxe `dur: .48, impact: .55`; hammer `dur: .50, impact: .55`; sword `dur: .38, impact: .50`.
- Rest pose: right hand beside the right hip, elbow bent, forearm up/forward, hand on the lower third of the handle, tool head/blade above the hand and angled outward. The same rest angles apply to all three tools.
- One follow-up tap is queued; further taps are ignored. Changing mode cancels the active swing, the queue, and any pending action.
- The hand grips lower on the handle: `toolModel()` shifts every box up by `GRIP_LIFT = .18` and records `g.userData.grip = .18`.
- No per-frame allocations, no `THREE.AnimationMixer`, no new meshes or draw calls.
- Project is not a git repository. Do not run `git init`; each task ends with its test/verification passing instead of a commit.
- Server: `python3 -m http.server 8000` from the project root. CDP: headless Chrome on port 9222. Always disable cache and reload with `ignoreCache: true`.
- Bump `js/game.js?v=4` to `?v=5` in `index.html` when implementation is complete; Firefox needs one hard refresh.
- Use the existing `box(w,h,d,color,x,y,z,group)` helper and `MeshBasicMaterial`.

## Review Focus

- **Repeat taps during a swing:** exactly one follow-up is queued, extra taps do nothing, and each action fires once. Pinned by the queue and impact-once checks in Task 2.
- **A long frame step:** returning from a background tab can cross impact and the end in one step; the action must fire once, the queue may start, and the pose must not stick. Pinned by the long-step check in Task 2.
- **Switching tool mid-swing:** the pending action must be dropped and the hidden tool must not finish a stale build or hit. Pinned by the `setMode` cancel check in Task 3.
- **Tapping empty space:** the swing still plays, no action runs, and nothing throws. Pinned by the empty-target check in Task 3.
- **View toggle and swimming mid-swing:** first/third person stay on the same progress, and the swim stroke keeps the third-person arm. Pinned by the combined-view and swim checks in Task 2.

---

### Task 1: Third-person elbow rig, grip re-pivot, and rest pose

**Files:**
- Modify: `js/game.js:244-275` (arm builder, tool models, wrist attach)
- Modify: `/tmp/opencode/tool_tests.py:47-87` (model checks)
- Create: `/tmp/opencode/swing_tests.py`

**Interfaces:**
- Consumes: `box(w,h,d,c,x,y,z,g)`, `limb2(...)`, `me`, `toolModel(kind)`.
- Produces: `me.armR` (upper-arm group), `me.elbowR` (child of `me.armR`), `me.wristR` (child of `me.elbowR`), `GRIP_LIFT` local to `toolModel()`, and `me[kind].userData.grip === .18`. Rest values: elbow `1.9`, wrist x `0`, wrist y `-.5`.

- [ ] **Step 1: Write the failing rig and rest-pose tests**

Create `/tmp/opencode/swing_tests.py` with the shared harness from `/tmp/opencode/game_tests.py` (`from cdp import Page, check`, `await p.boot()`), then add:

```python
rig = await p.ev(r"""
(()=>{
  third=true; mvg=0; fly=false; riding=null; swimming=false; sw=0;
  me.visible=true; stepMe(0); me.rotation.y=0; me.updateMatrixWorld(true);
  const hand=new THREE.Vector3(); me.wristR.getWorldPosition(hand);
  me.pick.updateMatrixWorld(true);
  const head=new THREE.Vector3(0,-.6,0).applyMatrix4(me.pick.matrixWorld);
  const lb=new THREE.Box3();
  me.pick.traverse(o=>{if(o.isMesh){o.updateMatrix();
    o.geometry.computeBoundingBox();
    lb.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrix))}});
  return {
    elbow: !!me.elbowR && me.elbowR.parent===me.armR,
    wrist: me.wristR.parent===me.elbowR,
    pickParent: me.pick.parent===me.wristR,
    hand:[+hand.x.toFixed(3),+hand.y.toFixed(3),+hand.z.toFixed(3)],
    head:[+head.x.toFixed(3),+head.y.toFixed(3),+head.z.toFixed(3)],
    localTop:+lb.max.y.toFixed(3), localBottom:+lb.min.y.toFixed(3),
    grip: me.pick.userData.grip
  };
})()
""")
results.append(check("rig: right arm is shoulder -> elbow -> wrist",
    rig.get("elbow") is True and rig.get("wrist") is True
    and rig.get("pickParent") is True, rig))
results.append(check("rest: pick head sits above and outward of the hand",
    rig.get("head", [0, 0])[1] > rig.get("hand", [0, 0])[1] + .1
    and rig.get("head", [0, 0])[0] > rig.get("hand", [0, 0])[0] + .1, rig))
results.append(check("grip: hand holds the lower handle",
    rig.get("grip", 0) >= .12 and rig.get("localTop", 0) > .1
    and rig.get("localBottom", 0) < -.4, rig))
```

In `/tmp/opencode/tool_tests.py`, change the parent check in the `models` evaluation to:

```python
parentIsWrist:g.parent===me.wristR,
wristOnElbow:me.wristR.parent===me.elbowR,
elbowOnArm:me.elbowR.parent===me.armR
```

and update the check body to require `t.get("wristOnElbow")`, `t.get("elbowOnArm")`, and `models.get("vmSwordParent")`. Change the gap scan from `for(let y=-.04;y>=-.56;y-=.02)` to `for(let y=.16;y>=-.38;y-=.02)`.

In the `tp` evaluation in `/tmp/opencode/tool_tests.py`, delete the
`check("third person: arm and wrist chop down and return to rest", ...)` assertion. Keep
the `tp` evaluation and the `check("third person: switching tools mid-swing ...")` check,
because the old wrist sweep is replaced by the animator in Task 2.

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
python3 /tmp/opencode/swing_tests.py
python3 /tmp/opencode/tool_tests.py
```

Expected: `swing_tests.py` fails on `me.elbowR` being undefined; `tool_tests.py` fails on the wrist/elbow parent checks.

- [ ] **Step 3: Implement the elbow chain, grip lift, and rest pose**

In `js/game.js`, replace only the right-arm creation; keep `arm(-.36)` for the left arm. The chain must preserve the existing sleeve and hand boxes and total length:

```js
function armR(){
  const g=new THREE.Group(); g.position.set(.36,1.28,0);
  box(.22,.28,.22,0x1f8cf0,0,-.14,0,g);
  const e=new THREE.Group(); e.position.set(0,-.28,0); g.add(e);
  box(.22,.22,.22,0x1f8cf0,0,-.11,0,e);
  box(.2,.16,.2,0xf6c28f,0,-.29,0,e);
  me.add(g); g.userData.elbow=e; return g;
}
me.armR=armR(); me.elbowR=me.armR.userData.elbow;
me.armR.rotation.z=.3;
me.elbowR.rotation.x=1.9;
```

In the existing `stepMe` swing block, change `me.wristR.rotation.x=2.0-s*.8;` to
`me.wristR.rotation.x=0;` so the old shoulder-only swing does not overwrite the new
rest wrist. Task 2 replaces that whole block.

Attach the wrist to the elbow at the same world position as before:

```js
me.wristR=new THREE.Group();
me.wristR.position.set(0,-.34,0);
me.wristR.rotation.order='YXZ';
me.wristR.rotation.x=0;
me.wristR.rotation.y=-.5;
me.elbowR.add(me.wristR);
```

At the end of `toolModel(kind)`, before `return g`, shift every box up and record the grip:

```js
const GRIP_LIFT=.18;
g.children.forEach(c=>c.position.y+=GRIP_LIFT);
g.userData.grip=GRIP_LIFT;
```

Do not change the tool palette, box counts, or existing `tools(m, force)` visibility logic.

- [ ] **Step 4: Run the tests to verify they pass**

Run:

```bash
python3 /tmp/opencode/swing_tests.py
python3 /tmp/opencode/tool_tests.py
```

Expected: the three new `swing_tests.py` checks pass; all `tool_tests.py` checks pass after the old third-person swing assertion is removed.

- [ ] **Step 5: Verify the task result**

Run `python3 /tmp/opencode/tool_tests.py` and confirm the model and render checks pass. Report the rig hierarchy and rest-pose numbers from the test output.

---

### Task 2: Per-tool timelines, pose curves, queue, and both views

**Files:**
- Modify: `js/game.js:240` (remove old `swing` state), `js/game.js:290-299` (`SWING_DUR`, `swingPose`, `stepVM`), `js/game.js:311-317` (`stepMe`), `js/game.js:321-324` (`swimPose`), `js/game.js:659` (loop)
- Modify: `/tmp/opencode/swing_tests.py` (add animator checks)
- Modify: `/tmp/opencode/tool_tests.py:109-155` (replace old swing checks)

**Interfaces:**
- Consumes: `me.armR`, `me.elbowR`, `me.wristR`, `vmR`, `vmWrist`, `third`, `vm`, `me`, `sw`, `mvg`, `fly`, `riding`, `swimming`, `sk`, `spt`.
- Produces: `const MODE_TOOL = {build:'hammer', erase:'pick', sword:'sword'}`; `const SWING = { pick:{dur:.48, impact:.55, pose:'chop', k:1}, hammer:{dur:.50, impact:.55, pose:'chop', k:1.12}, sword:{dur:.38, impact:.50, pose:'slash', k:1} }`; `const pose = {shX,shZ,elX,wrX,wrY,vmX,vmZ,vwX,vwY}` all starting at `0`; `poseSwing(kind, p, out)`; `startSwing(kind, act)`; `stepSwing(dt)`; `cancelSwing()`; `resetPose()`; constants `ELBOW_REST=1.9`, `WRIST_Y=-.5`, `VWRIST_REST=2.0`, `VR_Z=-.15`.

- [ ] **Step 1: Add the failing timeline, pose, queue, and view tests**

Append to `/tmp/opencode/swing_tests.py`:

```python
specs = await p.ev(r"""
(()=>{
  const out={};
  for(const k of ['pick','hammer','sword']){
    const s=SWING[k];
    out[k]={dur:s.dur,impact:s.impact,pose:s.pose};
  }
  return {out,hasStart:typeof startSwing==='function',
    hasStep:typeof stepSwing==='function',hasPose:typeof poseSwing==='function'};
})()
""")
s=specs.get("out",{})
results.append(check("specs: pickaxe and hammer are 450-500 ms, sword 350-400 ms",
    specs.get("hasStart") is True and specs.get("hasStep") is True
    and specs.get("hasPose") is True
    and .45 <= s.get("pick",{}).get("dur",0) <= .50
    and .45 <= s.get("hammer",{}).get("dur",0) <= .50
    and .35 <= s.get("sword",{}).get("dur",0) <= .40, specs))
results.append(check("specs: tools use chop/chop/slash at the planned impact fractions",
    s.get("pick",{}).get("pose")=="chop"
    and s.get("hammer",{}).get("pose")=="chop"
    and s.get("sword",{}).get("pose")=="slash"
    and .50 <= s.get("pick",{}).get("impact",0) <= .60
    and .45 <= s.get("sword",{}).get("impact",0) <= .55, specs))

poses = await p.ev(r"""
(()=>{
  const o={}; const out={};
  for(const k of ['pick','hammer','sword']){
    const s=SWING[k];
    out[k]={};
    poseSwing(k,0,o); out[k].rest={...o};
    poseSwing(k,s.impact*.36,o); out[k].wind={...o};
    poseSwing(k,s.impact,o); out[k].hit={...o};
    poseSwing(k,1,o); out[k].end={...o};
  }
  return out;
})()
""")
results.append(check("pose: chop winds back, drives forward/down, and returns to rest",
    poses.get("pick",{}).get("rest",{}).get("shX",9)==0
    and poses.get("pick",{}).get("wind",{}).get("shX",0) < -.2
    and poses.get("pick",{}).get("hit",{}).get("shX",0) > .5
    and poses.get("pick",{}).get("hit",{}).get("elX",0) < -.5
    and abs(poses.get("pick",{}).get("end",{}).get("shX",9)) < .001
    and abs(poses.get("hammer",{}).get("wind",{}).get("shX",0))
        >= abs(poses.get("pick",{}).get("wind",{}).get("shX",0)), poses))
results.append(check("pose: sword pulls back, crosses diagonally, and returns to rest",
    poses.get("sword",{}).get("wind",{}).get("shZ",0) > .1
    and poses.get("sword",{}).get("hit",{}).get("shZ",0) < -.2
    and abs(poses.get("sword",{}).get("hit",{}).get("wrY",0)) > .2
    and abs(poses.get("sword",{}).get("end",{}).get("shX",9)) < .001, poses))

anim = await p.ev(r"""
(()=>{
  let n=0; cancelSwing(); startSwing('pick',()=>n++);
  const before=n;
  stepSwing(SWING.pick.dur*.3); const early=n;
  stepSwing(SWING.pick.dur*.3); const onHit=n;
  stepSwing(SWING.pick.dur*.5); const after=n;
  return {before,early,onHit,after,anim:!!anim,
    rest:Object.values(pose).every(v=>Math.abs(v)<.001)};
})()
""")
results.append(check("animator: action fires once on impact, never before or twice",
    anim.get("before")==0 and anim.get("early")==0 and anim.get("onHit")==1
    and anim.get("after")==1 and anim.get("anim") is False
    and anim.get("rest") is True, anim))

queue = await p.ev(r"""
(()=>{
  const log=[]; cancelSwing();
  startSwing('pick',()=>log.push('a'));
  startSwing('hammer',()=>log.push('b'));
  startSwing('sword',()=>log.push('c'));
  const queued=animNext&&animNext.kind;
  stepSwing(SWING.pick.dur);
  const first={log:[...log],anim:anim&&anim.kind,next:animNext&&animNext.kind};
  stepSwing(SWING.hammer.dur);
  return {queued,first,log,anim:!!anim};
})()
""")
results.append(check("animator: one follow-up is queued, extras are ignored",
    queue.get("queued")=="hammer" and queue.get("first",{}).get("log")==["a"]
    and queue.get("first",{}).get("anim")=="hammer"
    and queue.get("first",{}).get("next") is None
    and queue.get("log")==["a","b"] and queue.get("anim") is False, queue))

longstep = await p.ev(r"""
(()=>{
  let n=0; cancelSwing(); startSwing('sword',()=>n++);
  stepSwing(5);
  return {n,anim:!!anim,next:!!animNext,
    rest:Object.values(pose).every(v=>Math.abs(v)<.001)};
})()
""")
results.append(check("animator: a long frame step crosses impact once and resets",
    longstep.get("n")==1 and longstep.get("anim") is False
    and longstep.get("next") is False and longstep.get("rest") is True, longstep))

views = await p.ev(r"""
(()=>{
  mvg=0; fly=false; riding=null;
  cancelSwing(); third=true; me.visible=true; stepMe(0);
  const tRest={arm:+me.armR.rotation.x.toFixed(3),
    elbow:+me.elbowR.rotation.x.toFixed(3),wrist:+me.wristR.rotation.x.toFixed(3)};
  cancelSwing(); third=false; vm.visible=true; stepVM(0);
  const vRest={x:+vmR.rotation.x.toFixed(3),z:+vmR.rotation.z.toFixed(3),
    wx:+vmWrist.rotation.x.toFixed(3),wy:+vmWrist.rotation.y.toFixed(3)};
  cancelSwing(); startSwing('pick',null);
  anim.t=SWING.pick.dur*SWING.pick.impact; stepSwing(0);
  third=true; me.visible=true; stepMe(0);
  const tHit={arm:+me.armR.rotation.x.toFixed(3),
    elbow:+me.elbowR.rotation.x.toFixed(3),wrist:+me.wristR.rotation.x.toFixed(3)};
  third=false; vm.visible=true; stepVM(0);
  const vHit={x:+vmR.rotation.x.toFixed(3),z:+vmR.rotation.z.toFixed(3),
    wx:+vmWrist.rotation.x.toFixed(3),wy:+vmWrist.rotation.y.toFixed(3)};
  cancelSwing();
  return {tRest,vRest,tHit,vHit};
})()
""")
results.append(check("views: one timeline drives first and third person",
    views.get("tHit",{}).get("arm",0) > views.get("tRest",{}).get("arm",0)
    and views.get("tHit",{}).get("elbow",9) < views.get("tRest",{}).get("elbow",-9)
    and views.get("vHit",{}).get("wx",9) < views.get("vRest",{}).get("wx",-9), views))

swim = await p.ev(r"""
(()=>{
  third=true; me.visible=true; swimming=true; riding=null; mvg=0; sw=0; sk=1; spt=0;
  cancelSwing(); startSwing('pick',null);
  anim.t=SWING.pick.dur*SWING.pick.impact; stepSwing(0); stepMe(0);
  return {arm:+me.armR.rotation.x.toFixed(3),
    elbow:+me.elbowR.rotation.x.toFixed(3),wrist:+me.wristR.rotation.x.toFixed(3)};
})()
""")
results.append(check("swim: the stroke keeps the third-person arm at rest",
    abs(swim.get("arm",0) - 1.571) < .02
    and abs(swim.get("elbow",0) - 1.9) < .02
    and abs(swim.get("wrist",9)) < .02, swim))
```

In `/tmp/opencode/tool_tests.py`, replace the old `swing` and `tp` evaluations (the `swingPose`/`SWING_DUR` blocks) with the new `anim`/`SWING` equivalents, or delete those checks and keep the model, render, camera, and tool-switch checks. The suite must not reference `swingPose` or `SWING_DUR` after this task.

- [ ] **Step 2: Run the tests to verify they fail**

Run `python3 /tmp/opencode/swing_tests.py`.

Expected: FAIL on `SWING`/`startSwing`/`poseSwing` not defined. `tool_tests.py` may already pass once its old swing references are replaced; its only requirement is that it no longer references `swingPose` or `SWING_DUR`.

- [ ] **Step 3: Implement the timelines, pose curves, animator, and pose application**

Replace `SWING_DUR` and `swingPose` with the following interfaces. Use a shared `mix(a,b,t)` and `smooth(t)=t*t*(3-2*t)` helper, and zero every `out` field at the start of each pose function.

```js
const SWING={
  pick:{dur:.48,impact:.55,pose:'chop',k:1},
  hammer:{dur:.50,impact:.55,pose:'chop',k:1.12},
  sword:{dur:.38,impact:.50,pose:'slash',k:1}
};
const pose={shX:0,shZ:0,elX:0,wrX:0,wrY:0,vmX:0,vmZ:0,vwX:0,vwY:0};
let anim=null,animNext=null;
function resetPose(){for(const k in pose)pose[k]=0}
function poseSwing(kind,p,out){/* dispatch to chopPose or slashPose */}
function chopPose(p,hit,out,k){/* wind-up -> accelerated strike -> eased return */}
function slashPose(p,hit,out,k){/* pull back -> diagonal cross -> eased return */}
function startSwing(kind,act){/* idle starts; active queues one follow-up */}
function stepSwing(dt){/* advance, pose, fire once, end, start queue */}
function cancelSwing(){anim=null;animNext=null;resetPose()}
```

Use the spec impact as the phase boundary. Wind-up ends at `hit*.36`. Wind-up uses `smooth(t)`, the strike uses `t*t`, and the return uses `1-(1-t)*(1-t)`. Start from rest `0`, blend to the wind key, then to the impact key, then back to `0`.

Key values (offsets from rest; multiply every value by the spec's `k`):

| Pose | shX | shZ | elX | wrX | wrY | vmX | vmZ | vwX | vwY |
|------|-----|-----|-----|-----|-----|-----|-----|-----|-----|
| Chop wind | -.55 | 0 | .25 | .35 | 0 | -.25 | 0 | .45 | 0 |
| Chop impact | 1.00 | 0 | -1.10 | -.40 | 0 | .30 | 0 | -.90 | 0 |
| Slash wind | -.20 | .35 | .10 | .20 | -.20 | -.15 | .25 | .20 | -.25 |
| Slash impact | .85 | -.45 | -.75 | -.30 | .90 | .35 | -.55 | -.45 | .65 |

`startSwing` starts immediately when `anim` is null; otherwise it stores `{kind, act}` in `animNext` only if that is empty. `stepSwing` advances `anim.t`, clamps progress at 1, calls `poseSwing`, fires `anim.act` once when `p >= SWING[anim.kind].impact`, and on `p >= 1` resets the pose, starts the queued swing if present, and clears `anim`.

Apply the pose in `stepVM` and `stepMe`:

```js
// stepVM: replace the old swing lines (vmR.rotation.x=s*.08 and the two
// vmR.position shifts) with these; keep only the vm.position bob lines
vmWrist.rotation.x=VWRIST_REST+pose.vwX;
vmWrist.rotation.y=pose.vwY;
vmR.rotation.x=pose.vmX;
vmR.rotation.z=VR_Z+pose.vmZ;

// stepMe, replacing the old swing lines
me.armR.rotation.x=(anim?0:sw)+pose.shX;
me.armR.rotation.z=.3+pose.shZ;
me.elbowR.rotation.x=ELBOW_REST+pose.elX;
me.wristR.rotation.x=pose.wrX;
me.wristR.rotation.y=WRIST_Y+pose.wrY;
```

Set `ELBOW_REST=1.9`, `WRIST_Y=-.5`, `VWRIST_REST=2.0`, `VR_Z=-.15` once near the animation block, and use those constants in both the rest setup and the per-frame pose application. Remove `swing` from the `let third=...` declaration and every remaining reference to `swing`, `SWING_DUR`, and `swingPose`.

Keep the game runnable between tasks: in `tap()` change `swing=.3` to
`startSwing(MODE_TOOL[mode],null);`, and in the sword button change `swing=.3` to
`startSwing('sword',null);`. Leave their existing immediate effects in place; Task 3
replaces them with captured impact actions.

In `swimPose`, inside the existing `if(sk>.02){...}` block after the arm/leg blend, pin the tool rig to rest while the stroke owns the arm:

```js
me.elbowR.rotation.x=ELBOW_REST;
me.wristR.rotation.x=0;
me.wristR.rotation.y=WRIST_Y;
```

In the loop, replace the two `stepVM(dt); stepMe(dt);` calls with:

```js
if(me.visible||vm.visible)stepSwing(dt);
stepVM(dt);stepMe(dt);
```

`stepSwing` is called exactly once per frame, before either view applies the pose. Do not advance it while both views are hidden.

- [ ] **Step 4: Run the tests to verify they pass**

Run:

```bash
python3 /tmp/opencode/swing_tests.py
python3 /tmp/opencode/tool_tests.py
```

Expected: all checks in `swing_tests.py` pass; `tool_tests.py` passes with the old swing checks replaced by the new timeline/pose checks.

- [ ] **Step 5: Verify the task result**

Run `python3 /tmp/opencode/game_tests.py` and confirm it still passes. Report the timeline values, queue result, long-step result, and view/swim results.

---

### Task 3: Impact-frame actions, capture/revalidation, and mode cancel

**Files:**
- Modify: `js/game.js:518-548` (`hitAt`, `tap`, build/erase effects)
- Modify: `js/game.js:583-584` (sword button)
- Modify: `js/game.js:595` (`setMode`)
- Modify: `/tmp/opencode/swing_tests.py` (add action checks)

**Interfaces:**
- Consumes: `startSwing`, `stepSwing`, `cancelSwing`, `SWING`, `anim`, `animNext`, `MODE_TOOL`, `pick`, `get`, `setB`, `rebuild`, `flash`, `burst`, `hitA`, `toast`, `cur`, `pos`, `mode`, `rc2`, `cam`, `A`, `RIDE`.
- Produces: `captureTap(cx,cy) -> Function|null`; `applyBuild(x,y,z,id)`; `applyErase(x,y,z)`; `applySword(a)`; `captureSword(cx,cy) -> animal|null`. `tap(cx,cy)` starts the correct swing with the captured action; `setMode(m)` calls `cancelSwing()`.

- [ ] **Step 1: Add the failing action tests**

Append to `/tmp/opencode/swing_tests.py`:

```python
build = await p.ev(r"""
(()=>{
  clearAnimals();
  const x=Math.floor(pos.x)+3,z=Math.floor(pos.z)+3,y=FLATH+1;
  setB(x,y,z,0); rebuild(x,z);
  const oldPick=pick;
  pick=()=>({hit:[x,y-1,z],prev:[x,y,z]});
  mode='build'; cur=4; cancelSwing(); tap(0,0);
  const before=get(x,y,z);
  stepSwing(SWING.hammer.dur*.4); const early=get(x,y,z);
  stepSwing(SWING.hammer.dur*.3); const hit=get(x,y,z);
  pick=oldPick;
  return {before,early,hit};
})()
""")
results.append(check("build: block changes on impact, not on tap",
    build.get("before")==0 and build.get("early")==0
    and build.get("hit")==4, build))

fizzle = await p.ev(r"""
(()=>{
  const x=Math.floor(pos.x)+3,z=Math.floor(pos.z)+3,y=FLATH+1;
  setB(x,y,z,0);
  applyBuild(x,y,z,4);
  const placed=get(x,y,z);
  setB(x,y,z,5);
  applyBuild(x,y,z,4);
  return {placed,still:get(x,y,z)};
})()
""")
results.append(check("build: a target that becomes solid before impact fizzles",
    fizzle.get("placed")==4 and fizzle.get("still")==5, fizzle))

erase = await p.ev(r"""
(()=>{
  const x=Math.floor(pos.x)+3,z=Math.floor(pos.z)+3,y=FLATH+1;
  setB(x,y,z,6); rebuild(x,z);
  applyErase(x,y,z);
  return {gone:get(x,y,z)};
})()
""")
results.append(check("erase: the captured block is removed on impact", erase.get("gone")==0, erase))

sword = await p.ev(r"""
(()=>{
  let n=0; const old=hitA; hitA=()=>n++;
  const a={x:pos.x+1,z:pos.z,g:{visible:true}};
  cancelSwing(); startSwing('sword',()=>applySword(a));
  stepSwing(SWING.sword.dur*.3); const early=n;
  stepSwing(SWING.sword.dur*.3); const hit=n;
  stepSwing(SWING.sword.dur); const after=n;
  hitA=old; cancelSwing();
  return {early,hit,after};
})()
""")
results.append(check("sword: damage fires on the impact frame only",
    sword.get("early")==0 and sword.get("hit")==1
    and sword.get("after")==1, sword))

cancel = await p.ev(r"""
(()=>{
  let n=0; cancelSwing();
  startSwing('pick',()=>n++); startSwing('sword',()=>n++);
  setMode('sword'); stepSwing(5);
  const vis={hammer:me.hammer.visible,pick:me.pick.visible,sword:me.sword.visible};
  return {n,anim:!!anim,next:!!animNext,vis,mode};
})()
""")
results.append(check("mode switch: cancels the swing, queue, and hidden tool action",
    cancel.get("n")==0 and cancel.get("anim") is False
    and cancel.get("next") is False and cancel.get("mode")=="sword"
    and cancel.get("vis")=={"hammer":False,"pick":False,"sword":True}, cancel))

empty = await p.ev(r"""
(()=>{
  clearAnimals(); const old=pick; pick=()=>null;
  mode='erase'; cancelSwing(); tap(0,0);
  const started=!!anim;
  stepSwing(SWING.pick.dur*2);
  pick=old;
  return {started,anim:!!anim};
})()
""")
results.append(check("empty target: the swing plays, no action runs, and nothing throws",
    empty.get("started") is True and empty.get("anim") is False, empty))
```

- [ ] **Step 2: Run the tests to verify they fail**

Run `python3 /tmp/opencode/swing_tests.py`.

Expected: FAIL on `captureTap`/`applyBuild`/`applyErase`/`applySword` not defined, and on `tap` still applying immediately.

- [ ] **Step 3: Implement capture, apply, and mode cancel**

Replace `tap()` with:

```js
function tap(cx,cy){
  if(!riding&&tryMount(cx,cy))return;
  startSwing(MODE_TOOL[mode],captureTap(cx,cy));
}
```

`captureTap` returns a closure or `null`:

- Sword: call `captureSword(cx,cy)`; return `a ? ()=>applySword(a) : null`.
- Erase: `const r=pick(cx,cy); if(!r)return null; const [x,y,z]=r.hit; return ()=>applyErase(x,y,z)`.
- Build: `const r=pick(cx,cy); if(!r)return null; const g=get(...r.hit); const t=(g>=16&&g<=22)?r.hit:r.prev; if(!t)return null; const id=cur; return ()=>applyBuild(t[0],t[1],t[2],id)`.

`applyBuild(x,y,z,id)` rechecks the target cell: if it now holds a solid block that is not water (`13`) and not a replaceable plant (`16..22`), return without effects. Keep the existing step-aside guard against the player's own cell, then call `flash`, `setB(x,y,z,id)`, and `rebuild(x,z)`. `applyErase(x,y,z)` rechecks that the block still exists and is not water; keep the bedrock toast; otherwise call `flash`, `burst(x,y,z,id)`, `setB(...,0)`, and `rebuild(x,z)`.

`captureSword(cx,cy)` keeps the existing raycast, block-occlusion check, and animal lookup from `hitAt`, but does not call `hitA`. `applySword(a)` rechecks `a && a.g.visible`, checks the 6-block range and toasts `Move closer!` at impact, then calls `hitA(a)`.

Update the sword button handler to remove the `last`/`n-last` throttles for both the
non-sword and sword paths, show the sword for 800 ms as today, find the best animal in
front, and replace the Task 2 `startSwing('sword',null)` plus immediate `hitA(best)` with
one call:

```js
startSwing('sword',best?()=>applySword(best):null);
```

The non-sword path keeps calling `tap(innerWidth/2,innerHeight/2)`.

`setMode(m)` must call `cancelSwing()` before changing `mode` and calling `tools(m)`.

- [ ] **Step 4: Run the tests to verify they pass**

Run:

```bash
python3 /tmp/opencode/swing_tests.py
python3 /tmp/opencode/tool_tests.py
python3 /tmp/opencode/game_tests.py
```

Expected: all checks pass, including the new build, fizzle, erase, sword, cancel, and empty-target checks.

- [ ] **Step 5: Verify the task result**

Run `python3 /tmp/opencode/verify_shift.py` and `python3 /tmp/opencode/test_light_queue.py`. Expected: all checks pass. Report the impact-action results and confirm no pending action survives `setMode`.

---

### Task 4: Visual tuning, screenshots, and full regression

**Files:**
- Modify: `js/game.js` (rest and pose angle values only)
- Modify: `/tmp/opencode/tool_visual.py:52-66` (drive the animator)
- Modify: `index.html:62` (`?v=4` → `?v=5`)

**Interfaces:**
- Consumes: `SWING`, `startSwing`, `stepSwing`, `cancelSwing`, `anim`, `pose`, `third`, `setMode`, `mvg`, `fly`, `riding`.
- Produces: 24 screenshots at `/tmp/opencode/tool-<tool>-<view>-<phase>.png`, where phase is `rest`, `wind`, `impact`, or `return` for both `fp` and `tp`.

- [ ] **Step 1: Update the visual script to freeze timeline poses**

Replace the old `swing=SWING_DUR*...` block with a helper that sets the timeline and freezes:

```python
await ev("cancelSwing();")
await shot("tool-%s-%s-rest" % (name, view))
for phase, label in [(0.2, "wind"), (0.55, "impact"), (0.8, "return")]:
    await ev("cancelSwing(); startSwing('%s',null);"
             "anim.t=SWING['%s'].dur*%s; anim.fired=true; stepSwing(0); anim=null;"
             % (name, name, phase))
    await asyncio.sleep(0.2)
    await shot("tool-%s-%s-%s" % (name, view, label))
```

Use `SWING[name].impact` instead of `0.55` for the impact shot, and `SWING[name].impact*.36` instead of `0.2` for the wind shot. Keep `mvg=0`, `fly=false`, `riding=null`, `pitch=0`, `yaw=0`, and `clearAnimals(); spawnT=1e9;`.

- [ ] **Step 2: Run the visual script to capture the baseline**

Run:

```bash
python3 /tmp/opencode/tool_visual.py
```

Expected: 24 new tool screenshots plus the existing extra-state screenshots. Confirm the filenames for all three tools in both views.

- [ ] **Step 3: Inspect and tune against the reference**

Open `tool-hammer-tp-rest.png`, `tool-pick-tp-rest.png`, and `tool-sword-tp-rest.png` beside the approved reference. Check:

- The right elbow is visibly bent, the upper arm hangs, and the hand sits beside the hip.
- The hand grips the lower third of the handle, not the butt.
- The pick/hammer head and sword blade ride above the hand and angle outward.
- No part of the tool is buried in the torso or floating away from the hand.

Open the wind, impact, and return shots. Check that the pick and hammer raise back/up and strike down/forward, the sword pulls back and crosses diagonally, and every tool returns to the same rest pose. Adjust only the rest constants and the key values from Task 2, then rerun the script. Repeat until the three tools read correctly.

- [ ] **Step 4: Bump the cache-buster and run every suite**

Change `index.html` line 62 to `js/game.js?v=5`. Then run:

```bash
python3 /tmp/opencode/swing_tests.py
python3 /tmp/opencode/tool_tests.py
python3 /tmp/opencode/game_tests.py
python3 /tmp/opencode/verify_shift.py
python3 /tmp/opencode/test_light_queue.py
python3 /tmp/opencode/tool_visual.py
```

Expected: every suite reports all checks passed, and the visual script saves the full screenshot set without errors.

- [ ] **Step 5: Final visual verification**

Confirm the extra-state screenshots still show the tool in front of walls, unfogged in rain/night/underwater, and the held block self-occluding. Note in the handoff that Firefox needs one hard refresh after the cache-buster change. Report the final suite counts and the screenshot paths.

---

## Self-Review

- **Spec coverage:** rest pose (Task 1), per-tool durations and impact fractions (Task 2), pose curves for both views (Task 2), queue/overlap (Task 2), impact actions and revalidation (Task 3), mode cancel (Task 3), swimming (Task 2), visual tuning and regressions (Task 4).
- **Step scan:** each step names the file, the exact interface or test, and the expected result. No `TBD` or "handle edge cases" lines.
- **Type consistency:** `SWING[kind]` uses `dur`, `impact`, `pose`, `k`; `pose` uses `shX`, `shZ`, `elX`, `wrX`, `wrY`, `vmX`, `vmZ`, `vwX`, `vwY`; `startSwing(kind,act)`, `stepSwing(dt)`, `cancelSwing()`, `poseSwing(kind,p,out)` are used with the same names in tests and implementation.
- **Review Focus:** each listed failure mode has an owning test: queue (Task 2), long step (Task 2), mode switch (Task 3), empty target (Task 3), view/swim (Task 2).
- **Proportion:** the plan defines signatures, key values, and tests; it does not transcribe every implementation body.
