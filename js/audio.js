/* ============================================================================
   Rylecraft Playground - audio engine (original, synthesized at runtime)
   ----------------------------------------------------------------------------
   Everything you hear is generated with the Web Audio API: no recordings, no
   downloaded assets, nothing sampled from another game. Music is composed live
   from small chord/scale tables, so it loops forever without a seam, costs no
   network bytes, and can change mood with a smooth two-layer crossfade.
   ========================================================================== */
window.RyleAudio = (function () {
  'use strict';

  var KEY = 'rylecraft.audio.v1';
  var DEFAULTS = { master: .85, music: .6, sfx: .85, ambient: .7, muted: false, musicOn: true };
  var cfg = Object.assign({}, DEFAULTS);
  try {
    var saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    for (var k in DEFAULTS) if (typeof saved[k] === typeof DEFAULTS[k]) cfg[k] = saved[k];
  } catch (e) {}

  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var rnd = function (a, b) { return a + Math.random() * (b - a); };
  var pick = function (a) { return a[(Math.random() * a.length) | 0]; };
  var midi = function (n) { return 440 * Math.pow(2, (n - 69) / 12); };

  var ctx = null, master, comp, analyser, musicBus, sfxBus, ambBus, delayWet, delayFb;
  var noiseBuf = null, unlocked = false, disposed = false;
  var focused = true, pageHidden = !!document.hidden;
  function active() { return !pageHidden && focused; }
  var scene = 'menu', musicStarted = false;
  var env = { night: false, raining: false, storm: false, water: false, underwater: false, forest: false, mountains: false };
  var beds = {}, bedNow = {};
  var voices = 0, MAXV = 28, last = {};
  var lis = { x: 0, y: 0, z: 0, fx: 0, fy: 0, fz: -1, ux: 0, uy: 1, uz: 0 };
  var ambAcc = 0, tBird = 3, tWater = 3, tCricket = 2, tThunder = 24;

  // ---------------------------------------------------------------- helpers
  function makeNoise(sec) {
    var n = Math.floor(ctx.sampleRate * (sec || 2));
    var b = ctx.createBuffer(1, n, ctx.sampleRate);
    var d = b.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  function gain(v) { var g = ctx.createGain(); g.gain.value = v == null ? 1 : v; return g; }
  function filter(type, freq, q) {
    var f = ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq;
    if (q != null) f.Q.value = q;
    return f;
  }
  function envGain(t, dur, vol, attack) {
    var g = gain(0);
    var a = attack == null ? .005 : attack;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + Math.min(a, dur * .4));
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    return g;
  }
  function tone(type, freq, t, dur, vol, out, slide) {
    var o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(Math.max(20, freq), t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
    var g = envGain(t, dur, vol);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + dur + .03);
  }
  function noise(t, dur, vol, out, opts) {
    opts = opts || {};
    var s = ctx.createBufferSource(); s.buffer = noiseBuf;
    var f = filter(opts.type || 'bandpass', opts.freq || 1200, opts.q == null ? .9 : opts.q);
    if (opts.to) f.frequency.exponentialRampToValueAtTime(opts.to, t + dur);
    var g = envGain(t, dur, vol, opts.attack);
    s.connect(f); f.connect(g); g.connect(out);
    s.start(t, rnd(0, 1.2)); s.stop(t + dur + .02);
  }
  function panner(pos, out) {
    var p = ctx.createPanner();
    p.panningModel = 'equalpower';
    p.distanceModel = 'inverse';
    p.refDistance = 2.5; p.maxDistance = 55; p.rolloffFactor = 1.4;
    if (p.positionX) { p.positionX.value = pos.x; p.positionY.value = pos.y; p.positionZ.value = pos.z; }
    else if (p.setPosition) p.setPosition(pos.x, pos.y, pos.z);
    p.connect(out);
    return p;
  }
  function voice(key, dur, fn, opts) {
    opts = opts || {};
    if (!ctx || !musicStarted || disposed || ctx.state !== 'running') return;
    var t = ctx.currentTime;
    var cool = opts.cool == null ? .035 : opts.cool;
    if (last[key] != null && t - last[key] < cool) return;
    if (voices >= MAXV) return;
    last[key] = t; voices++;
    var bus = opts.bus || sfxBus;
    var out = opts.pos ? panner(opts.pos, bus) : bus;
    try { fn(t, out, opts); } catch (e) {}
    setTimeout(function () { voices = Math.max(0, voices - 1); }, (dur + .15) * 1000);
  }

  // ------------------------------------------------------------- audio graph
  function ensure() {
    if (ctx) return true;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { ctx = new AC({ latencyHint: 'interactive' }); }
    catch (e) { try { ctx = new AC(); } catch (e2) { return false; } }
    noiseBuf = makeNoise(4);
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.knee.value = 24; comp.ratio.value = 4;
    comp.attack.value = .004; comp.release.value = .25;
    analyser = ctx.createAnalyser(); analyser.fftSize = 512; analyser.smoothingTimeConstant = .55;
    master = gain(0); master.connect(comp); comp.connect(analyser); analyser.connect(ctx.destination);
    musicBus = gain(1); sfxBus = gain(1); ambBus = gain(1);
    musicBus.connect(master); sfxBus.connect(master); ambBus.connect(master);
    // a small stereo-ish echo gives the music air without an expensive reverb
    var dl = ctx.createDelay(1.2); dl.delayTime.value = .31;
    var fb = gain(.23), wet = gain(.16), damp = filter('lowpass', 2300, .4);
    delayFb = fb; delayWet = wet;
    musicBus.connect(dl); dl.connect(damp); damp.connect(fb); fb.connect(dl);
    damp.connect(wet); wet.connect(master);
    buildBeds();
    buildMusic();
    applyVolumes(true);
    music.timer = setInterval(musicTick, 220);
    return true;
  }

  function bed(name, f1, f2, lfoHz, lfoDepth) {
    var src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    var a = filter(f1[0], f1[1], f1[2]);
    var out = gain(0);
    src.connect(a);
    if (f2) { var b = filter(f2[0], f2[1], f2[2]); a.connect(b); b.connect(out); }
    else a.connect(out);
    out.connect(ambBus);
    if (lfoHz) {
      var l = ctx.createOscillator(); l.frequency.value = lfoHz;
      var lg = gain(lfoDepth);
      l.connect(lg); lg.connect(out.gain); l.start();
    }
    src.start();
    beds[name] = out; bedNow[name] = 0;
  }
  function buildBeds() {
    bed('wind', ['bandpass', 430, .6], null, .07, .012);
    bed('leaves', ['highpass', 1500, .4], ['lowpass', 5200, .5], .5, .004);
    bed('water', ['lowpass', 780, .5], null, .17, .012);
    bed('rain', ['highpass', 1100, .4], ['lowpass', 6500, .4], .3, .006);
  }
  function setBed(name, level) {
    if (!ctx || !beds[name]) return;
    bedNow[name] = level;
    beds[name].gain.setTargetAtTime(level, ctx.currentTime, .7);
  }
  function applyVolumes(immediate, musicTc) {
    if (!ctx) return;
    var t = ctx.currentTime, tc = immediate ? .001 : .06;
    master.gain.setTargetAtTime(cfg.muted ? 0 : cfg.master * cfg.master, t, tc);
    var mg = cfg.musicOn ? cfg.music * cfg.music : 0;
    if (musicTc == null) {
      musicBus.gain.setTargetAtTime(mg, t, tc);
    } else {
      // a timed toggle uses a linear fade so OFF lands on an exact zero
      musicBus.gain.cancelScheduledValues(t);
      musicBus.gain.setValueAtTime(musicBus.gain.value, t);
      musicBus.gain.linearRampToValueAtTime(mg, t + musicTc);
    }
    // the echo tail lives outside the music bus, so close it too: OFF means
    // silence immediately, with no reverb ringing on after the button press
    var wet = cfg.musicOn ? .16 : 0, fb = cfg.musicOn ? .23 : 0;
    if (delayWet) {
      delayWet.gain.cancelScheduledValues(t);
      delayWet.gain.setValueAtTime(delayWet.gain.value, t);
      delayWet.gain.linearRampToValueAtTime(wet, t + (musicTc == null ? tc : musicTc));
    }
    if (delayFb) {
      delayFb.gain.cancelScheduledValues(t);
      delayFb.gain.setValueAtTime(delayFb.gain.value, t);
      delayFb.gain.linearRampToValueAtTime(fb, t + (musicTc == null ? tc : musicTc));
    }
    sfxBus.gain.setTargetAtTime(cfg.sfx * cfg.sfx, t, tc);
    // ambience (wind, birds, water, crickets, thunder) is background sound too:
    // it follows the same toggle so OFF really means silence
    var amb = cfg.musicOn ? cfg.ambient * cfg.ambient : 0;
    if (musicTc == null) {
      ambBus.gain.setTargetAtTime(amb, t, tc);
    } else {
      ambBus.gain.cancelScheduledValues(t);
      ambBus.gain.setValueAtTime(ambBus.gain.value, t);
      ambBus.gain.linearRampToValueAtTime(amb, t + musicTc);
    }
  }

  // ------------------------------------------------------------------ music
  // Each mood is a tiny composition recipe. Chords are semitone offsets from
  // the root; melodies wander through a pentatonic/diatonic scale and never
  // repeat an exact phrase, so the soundtrack has no loop point at all.
  var SCALES = {
    major: [0, 2, 4, 5, 7, 9, 11],
    majorPent: [0, 2, 4, 7, 9],
    minorPent: [0, 3, 5, 7, 10],
    dorian: [0, 2, 3, 5, 7, 9, 10],
    lydian: [0, 2, 4, 6, 7, 9, 11]
  };
  var MOODS = {
    menu: { bpm: 62, root: 60, scale: 'majorPent', inst: 'piano', arp: .45, mel: .5, pad: .9,
      prog: [[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]] },
    grass: { bpm: 76, root: 62, scale: 'majorPent', inst: 'marimba', arp: .5, mel: .52, pad: .65,
      prog: [[0, 4, 7], [5, 9, 12], [7, 11, 14], [0, 4, 7]] },
    forest: { bpm: 66, root: 62, scale: 'dorian', inst: 'flute', arp: .34, mel: .42, pad: .8,
      prog: [[0, 3, 7], [5, 9, 12], [10, 14, 17], [3, 7, 10]] },
    mountains: { bpm: 52, root: 57, scale: 'minorPent', inst: 'bell', arp: .34, mel: .3, pad: 1,
      prog: [[0, 3, 7], [8, 12, 15], [5, 8, 12], [0, 3, 7]] },
    ocean: { bpm: 50, root: 65, scale: 'majorPent', inst: 'bell', arp: .3, mel: .3, pad: 1.1,
      prog: [[0, 4, 7], [9, 12, 16], [5, 9, 12], [7, 11, 14]] },
    night: { bpm: 54, root: 57, scale: 'minorPent', inst: 'piano', arp: .28, mel: .36, pad: .9,
      prog: [[0, 3, 7], [8, 12, 15], [3, 7, 10], [10, 14, 17]] },
    fantasy: { bpm: 64, root: 64, scale: 'lydian', inst: 'bell', arp: .55, mel: .46, pad: .75,
      prog: [[0, 4, 7], [2, 6, 9], [7, 11, 14], [4, 9, 12]] }
  };
  var music = { layers: [], active: 0, grid: 0, next: 0, melIdx: 5 };

  function buildMusic() {
    music.layers = [gain(0), gain(0)];
    for (var i = 0; i < 2; i++) music.layers[i].connect(musicBus);
  }

  function inst(name, f, t, dur, vol, out) {
    if (name === 'pad') { padNote(f, t, dur, vol, out); return; }
    if (name === 'bell') {
      var b = ctx.createOscillator(); b.type = 'sine'; b.frequency.value = f;
      var b2 = ctx.createOscillator(); b2.type = 'sine'; b2.frequency.value = f * 2.76;
      var b3 = ctx.createOscillator(); b3.type = 'sine'; b3.frequency.value = f * 5.4;
      var g1 = envGain(t, dur, vol, .01), g2 = envGain(t, dur * .55, vol * .28, .01),
        g3 = envGain(t, dur * .3, vol * .12, .01);
      b.connect(g1); b2.connect(g2); b3.connect(g3);
      g1.connect(out); g2.connect(out); g3.connect(out);
      b.start(t); b.stop(t + dur + .04); b2.start(t); b2.stop(t + dur + .04); b3.start(t); b3.stop(t + dur + .04);
      return;
    }
    if (name === 'marimba') {
      tone('sine', f, t, dur, vol, out);
      tone('sine', f * 3.98, t, dur * .18, vol * .18, out);
      return;
    }
    if (name === 'flute') {
      var o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      var lfo = ctx.createOscillator(); lfo.frequency.value = 5.1;
      var lg = gain(f * .006); lfo.connect(lg); lg.connect(o.frequency);
      var g = envGain(t, dur, vol, .09);
      var lp = filter('lowpass', Math.max(900, f * 4), .5);
      o.connect(g); g.connect(lp); lp.connect(out);
      o.start(t); o.stop(t + dur + .05); lfo.start(t); lfo.stop(t + dur + .05);
      return;
    }
    if (name === 'bass') {
      var bo = ctx.createOscillator(); bo.type = 'triangle'; bo.frequency.value = f;
      var bg = envGain(t, dur, vol, .012);
      var bl = filter('lowpass', 340, .6);
      bo.connect(bg); bg.connect(bl); bl.connect(out);
      bo.start(t); bo.stop(t + dur + .05);
      return;
    }
    // piano-ish default
    var p = ctx.createOscillator(); p.type = 'triangle'; p.frequency.value = f;
    var h = ctx.createOscillator(); h.type = 'sine'; h.frequency.value = f * 2.005;
    var hg = gain(.24);
    var pg = envGain(t, dur, vol, .006);
    var pl = filter('lowpass', Math.min(6500, f * 9), .4);
    pl.frequency.setValueAtTime(Math.min(6500, f * 9), t);
    pl.frequency.exponentialRampToValueAtTime(Math.max(500, f * 2), t + dur);
    p.connect(pg); h.connect(hg); hg.connect(pg); pg.connect(pl); pl.connect(out);
    p.start(t); p.stop(t + dur + .04); h.start(t); h.stop(t + dur + .04);
  }
  function padNote(f, t, dur, vol, out) {
    var g = gain(0);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 1.4);
    g.gain.setValueAtTime(vol, t + Math.max(1.5, dur - 1.6));
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    var lp = filter('lowpass', 900, .5);
    g.connect(lp); lp.connect(out);
    var o1 = ctx.createOscillator(); o1.type = 'triangle'; o1.frequency.value = f; o1.detune.value = -5;
    var o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = f; o2.detune.value = 6;
    var o3 = ctx.createOscillator(); o3.type = 'sine'; o3.frequency.value = f * .5;
    var g2 = gain(.5), g3 = gain(.32);
    o1.connect(g); o2.connect(g2); g2.connect(g); o3.connect(g3); g3.connect(g);
    o1.start(t); o1.stop(t + dur + .05); o2.start(t); o2.stop(t + dur + .05); o3.start(t); o3.stop(t + dur + .05);
  }
  function chordNotes(chord, oct) {
    var n = [];
    for (var i = 0; i < chord.length; i++) n.push(midi(chord[i] + oct));
    return n;
  }
  function scheduleBar(mood, t, out) {
    var bar = Math.floor(music.grid / 8);
    var chord = mood.prog[Math.floor(bar / 2) % mood.prog.length];
    var notes = chordNotes(chord, mood.root + 12);
    for (var i = 0; i < notes.length; i++) inst('pad', notes[i], t, 5.6, .054 * mood.pad, out);
    inst('bass', midi(mood.root + chord[0] - 12), t, 2.8, .15, out);
    // occasional high colour note
    if (Math.random() < .5) inst(mood.inst, midi(mood.root + 24 + pick(chord)), t + .2, 2.6, .084, out);
  }
  function musicTick() {
    if (!ctx || disposed || !musicStarted || !cfg.musicOn || ctx.state !== 'running') return;
    var mood = MOODS[scene] || MOODS.menu;
    var step = 30 / mood.bpm; // one eighth note
    var now = ctx.currentTime;
    if (music.next < now) music.next = now + .05;
    var guard = 0;
    while (music.next < now + .65 && guard++ < 32) {
      var out = music.layers[music.active];
      var g = music.grid, t = music.next;
      if (g % 8 === 0) scheduleBar(mood, t, out);
      // sparse arpeggio
      if (g % 2 === 0 && Math.random() < mood.arp * .55) {
        var bar = Math.floor(g / 8);
        var chord = mood.prog[Math.floor(bar / 2) % mood.prog.length];
        var n = chord[(g / 2 | 0) % chord.length] + 24;
        inst(mood.inst, midi(mood.root + n), t, 1.9, .078, out);
      }
      // melody: gentle random walk through the scale
      if (Math.random() < mood.mel * .34) {
        var sc = SCALES[mood.scale];
        music.melIdx = clamp(music.melIdx + pick([-2, -1, -1, 0, 1, 1, 2]), 0, sc.length + 3);
        var idx = music.melIdx;
        var sem = idx < sc.length ? sc[idx] : 12 + sc[idx - sc.length];
        inst(mood.inst, midi(mood.root + 12 + sem), t, rnd(1.5, 2.8), .102, out);
      }
      music.grid++; music.next += step;
    }
  }
  function setScene(name) {
    if (!MOODS[name]) name = 'grass';
    if (!ctx) { scene = name; return; }
    if (name === scene && musicStarted) return;
    scene = name;
    var t = ctx.currentTime;
    var old = music.layers[music.active];
    music.active = 1 - music.active;
    var g = music.layers[music.active];
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(.0001, t);
    g.gain.linearRampToValueAtTime(1, t + 2.6);
    old.gain.cancelScheduledValues(t);
    old.gain.setTargetAtTime(0, t + .04, .9);
    music.grid = 0;
    music.melIdx = 5;
    if (music.next < t) music.next = t + .05;
    musicStarted = true;
    if (ctx.state !== 'running' && ctx.state !== 'closed' && active()) ctx.resume();
  }
  function setEnvironment(e) {
    if (e) for (var k in env) if (e[k] != null) env[k] = !!e[k];
    if (!ctx) return;
    var menu = scene === 'menu';
    setBed('wind', menu ? .012 : env.mountains ? .045 : .018);
    setBed('leaves', menu ? 0 : env.forest ? .03 : 0);
    setBed('water', menu ? 0 : env.water ? (env.underwater ? .085 : .05) : 0);
    setBed('rain', menu ? 0 : env.raining ? .075 : 0);
    if (env.raining) { if (tThunder > 14) tThunder = rnd(12, 26); }
  }

  // ------------------------------------------------------------------ sounds
  function matOf(id) {
    if (id === 1) return 'grass';
    if (id === 2) return 'dirt';
    if (id === 3 || id === 5) return 'stone';
    if (id === 4 || id === 22) return 'wood';
    if (id === 6) return 'sand';
    if (id === 7 || id === 23) return 'leaves';
    if (id === 12) return 'glass';
    if (id === 13) return 'water';
    if (id === 14) return 'snow';
    if (id === 15) return 'soft';
    if (id >= 16 && id <= 21) return 'grass';
    return 'soft';
  }
  function thump(t, out, vol, f0, f1, dur) { tone('sine', f0, t, dur, vol, out, f1); }

  function placeSound(id, t, out, broken) {
    var m = matOf(id);
    var big = broken ? 1.45 : 1;
    var d = (broken ? .3 : .19) * big;
    if (m === 'grass') {
      thump(t, out, .09 * big, 120, 65, .13);
      noise(t, d, .11 * big, out, { type: 'lowpass', freq: 1300, to: 420 });
      if (broken) noise(t + .04, .16, .07, out, { type: 'highpass', freq: 1900 });
    } else if (m === 'dirt') {
      thump(t, out, .12 * big, 95, 48, .17);
      noise(t, d, .09 * big, out, { type: 'lowpass', freq: 900 });
    } else if (m === 'stone') {
      noise(t, .055, .12 * big, out, { type: 'highpass', freq: 1800, q: .7 });
      thump(t, out, .1 * big, 150, 60, .12);
      if (broken) { noise(t + .05, .14, .09, out, { type: 'bandpass', freq: 900, q: .8 }); noise(t + .12, .16, .06, out, { type: 'highpass', freq: 2400 }); }
    } else if (m === 'wood') {
      tone('triangle', 200, t, .12, .09 * big, out, 125);
      noise(t, .06, .07 * big, out, { type: 'bandpass', freq: 850, q: 1.4 });
      if (broken) { noise(t + .05, .15, .08, out, { type: 'bandpass', freq: 700, q: 1.2 }); tone('triangle', 150, t + .05, .15, .05, out, 90); }
    } else if (m === 'sand') {
      noise(t, d + .05, .1 * big, out, { type: 'lowpass', freq: 1500, to: 700 });
    } else if (m === 'glass') {
      tone('sine', 2100, t, .22, .055 * big, out);
      tone('sine', 2950, t + .012, .18, .035 * big, out);
      noise(t, .06, .05 * big, out, { type: 'highpass', freq: 3000 });
      if (broken) { for (var i = 0; i < 4; i++) tone('sine', rnd(1800, 3600), t + rnd(.02, .2), .2, .022, out); }
    } else if (m === 'leaves') {
      noise(t, .11, .07 * big, out, { type: 'highpass', freq: 2300 });
      noise(t + .05, .1, .05, out, { type: 'bandpass', freq: 3200, q: .6 });
    } else if (m === 'snow') {
      noise(t, .18, .08, out, { type: 'lowpass', freq: 1100, to: 500 });
      thump(t, out, .04, 130, 80, .1);
    } else if (m === 'water') {
      noise(t, .2, .08, out, { type: 'lowpass', freq: 1500, to: 500 });
      tone('sine', 260, t, .18, .04, out, 90);
    } else {
      thump(t, out, .08, 130, 70, .12);
      noise(t, .1, .05, out, { type: 'lowpass', freq: 600 });
    }
  }
  function swingSound(kind, t, out) {
    var high = kind === 'sword' ? 1900 : kind === 'pick' ? 1500 : 1150;
    noise(t, kind === 'sword' ? .2 : .17, .05, out, { type: 'bandpass', freq: 440, to: high, q: 1.5, attack: .03 });
    if (kind === 'sword') tone('sine', 900, t + .02, .12, .012, out, 1500);
  }
  function impactSound(kind, id, t, out) {
    var m = matOf(id);
    if (kind === 'hammer') {
      thump(t, out, .14, 85, 42, .24);
      if (m === 'stone') noise(t, .1, .1, out, { type: 'highpass', freq: 1400 });
      else if (m === 'wood') tone('triangle', 190, t, .16, .06, out, 110);
      else noise(t, .13, .06, out, { type: 'lowpass', freq: 900 });
    } else if (kind === 'pick') {
      tone('square', 1250, t, .05, .025, out, 900);
      tone('triangle', 560, t + .006, .14, .05, out, 380);
      if (m === 'stone') noise(t, .11, .075, out, { type: 'bandpass', freq: 2200, q: 2 });
      else noise(t, .1, .045, out, { type: 'lowpass', freq: 800 });
    } else {
      noise(t, .1, .045, out, { type: 'highpass', freq: 1200 });
      thump(t, out, .07, 180, 80, .12);
    }
  }
  function stepSound(id, t, out) {
    var m = matOf(id);
    if (m === 'stone') { noise(t, .05, .05, out, { type: 'highpass', freq: 1700 }); thump(t, out, .035, 120, 70, .07); }
    else if (m === 'wood') { tone('triangle', 180, t, .06, .035, out, 140); noise(t, .03, .025, out, { type: 'bandpass', freq: 700 }); }
    else if (m === 'sand') noise(t, .09, .045, out, { type: 'lowpass', freq: 1200, to: 800 });
    else if (m === 'snow') noise(t, .1, .04, out, { type: 'lowpass', freq: 900, to: 500 });
    else if (m === 'leaves') noise(t, .08, .035, out, { type: 'highpass', freq: 2600 });
    else if (m === 'water') noise(t, .09, .05, out, { type: 'lowpass', freq: 1300, to: 700 });
    else if (m === 'glass') { noise(t, .04, .03, out, { type: 'highpass', freq: 2400 }); thump(t, out, .03, 160, 80, .06); }
    else { thump(t, out, .04, 110, 65, .08); noise(t, .07, .03, out, { type: 'lowpass', freq: 700 }); }
  }
  function uiSound(kind, t, out) {
    if (kind === 'open') {
      noise(t, .16, .035, out, { type: 'bandpass', freq: 700, to: 1800, q: 1.1 });
      tone('sine', 520, t + .02, .1, .035, out, 780);
    } else if (kind === 'select') {
      tone('sine', 760, t, .06, .045, out, 1050);
      tone('sine', 1520, t + .01, .05, .015, out);
    } else if (kind === 'world') {
      [0, .09, .18, .28].forEach(function (d, i) {
        tone('sine', midi([72, 76, 79, 84][i]), t + d, .5, .05, out);
        tone('sine', midi([72, 76, 79, 84][i]) * 2, t + d, .2, .01, out);
      });
    } else if (kind === 'save') {
      tone('sine', midi(79), t, .35, .05, out);
      tone('sine', midi(84), t + .11, .5, .045, out);
    } else if (kind === 'close') {
      tone('sine', 430, t, .07, .03, out, 320);
    } else {
      tone('sine', 880, t, .045, .035, out, 700);
      noise(t, .025, .015, out, { type: 'highpass', freq: 2500 });
    }
  }

  // ---------------------------------------------------------- animal voices
  function vib(type, f, t, dur, vol, out, rate, depth, slide, attack) {
    var o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    var l = ctx.createOscillator(); l.frequency.value = rate || 5;
    var lg = gain(depth || f * .02);
    l.connect(lg); lg.connect(o.frequency);
    var g = envGain(t, dur, vol, attack == null ? .02 : attack);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + dur + .04); l.start(t); l.stop(t + dur + .04);
  }
  function animalVoice(kind, t, out, hurt) {
    var p = hurt ? 1.18 : 1;
    if (kind === 'cow') {
      vib('sawtooth', 105 * p, t, .7, .10, out, 4.5, 7, hurt ? 90 : 72, .06);
      noise(t, .45, .035, out, { type: 'lowpass', freq: 500 });
    } else if (kind === 'sheep' || kind === 'goat') {
      vib('sawtooth', 360 * p, t, .48, .075, out, 8, 22, hurt ? 300 : 250, .03);
      noise(t, .3, .02, out, { type: 'bandpass', freq: 1000, q: 2 });
    } else if (kind === 'chicken') {
      for (var i = 0; i < 3; i++) {
        tone('square', (920 + i * 90) * p, t + i * .085, .06, .035, out, 700);
        noise(t + i * .085, .03, .012, out, { type: 'highpass', freq: 2500 });
      }
    } else if (kind === 'horse' || kind === 'unicorn' || kind === 'pegasus') {
      vib('sawtooth', 280 * p, t, .55, .075, out, 11, 45, hurt ? 420 : 210, .02);
      noise(t, .32, .03, out, { type: 'bandpass', freq: 900, q: 1.6 });
      if (kind !== 'horse') {
        tone('sine', midi(84), t + .18, .5, .025, out);
        tone('sine', midi(88), t + .28, .55, .02, out);
      }
    } else if (kind === 'wolf' || kind === 'icewolf') {
      vib('sine', 300, t, 1.05, .06, out, 5.2, 26, 470, .12);
      vib('sine', 470, t + 1.0, .5, .04, out, 4.4, 18, 330, .1);
      if (kind === 'icewolf') tone('sine', midi(96), t + .4, .7, .015, out);
    } else if (kind === 'fox' || kind === 'magicfox') {
      for (var j = 0; j < 2; j++) tone('triangle', (720 + j * 120) * p, t + j * .13, .1, .045, out, 480);
      if (kind === 'magicfox') { tone('sine', midi(91), t + .25, .6, .02, out); tone('sine', midi(95), t + .38, .5, .015, out); }
    } else if (kind === 'dragon') {
      vib('sawtooth', 62, t, 1.25, .09, out, 7, 12, hurt ? 85 : 45, .12);
      noise(t, 1.15, .07, out, { type: 'lowpass', freq: 340, to: 120 });
      tone('sine', 42, t, 1.1, .05, out, 30);
    } else if (kind === 'cat') {
      vib('triangle', 480 * p, t, .38, .045, out, 6, 30, 640, .04);
      tone('triangle', 640, t + .2, .18, .03, out, 420);
    } else if (kind === 'dog') {
      for (var d = 0; d < 2; d++) {
        noise(t + d * .14, .08, .06, out, { type: 'bandpass', freq: 700, q: 3 });
        tone('square', 240 * p, t + d * .14, .07, .035, out, 170);
      }
    } else if (kind === 'rabbit' || kind === 'turtle' || kind === 'crystalturtle') {
      tone('sine', 940 * p, t, .08, .03, out, 1200);
      noise(t, .12, .015, out, { type: 'highpass', freq: 2000 });
      if (kind === 'crystalturtle') { tone('sine', midi(96), t + .1, .7, .02, out); tone('sine', midi(100), t + .22, .6, .015, out); }
    } else if (kind === 'pig') {
      vib('square', 130 * p, t, .28, .06, out, 9, 18, 100, .02);
      noise(t, .2, .02, out, { type: 'bandpass', freq: 500, q: 2 });
    } else if (kind === 'deer' || kind === 'firedeer') {
      noise(t, .22, .05, out, { type: 'bandpass', freq: 900, q: 1.2 });
      tone('sine', 190 * p, t, .2, .03, out, 140);
      if (kind === 'firedeer') { tone('sine', midi(89), t + .15, .65, .02, out); tone('sine', midi(93), t + .3, .5, .014, out); }
    } else if (kind === 'camel') {
      vib('sawtooth', 95 * p, t, .55, .07, out, 6, 8, 75, .05);
    } else {
      tone('sine', 620 * p, t, .12, .035, out, 840);
      tone('sine', 840 * p, t + .1, .1, .025, out, 620);
    }
  }

  // -------------------------------------------------------------- ambience
  function birdCall() {
    var pos = { x: lis.x + rnd(-17, 17), y: lis.y + rnd(2, 8), z: lis.z + rnd(-17, 17) };
    voice('bird', .8, function (t, out) {
      var base = rnd(1700, 2900), n = 2 + (Math.random() * 3 | 0);
      for (var i = 0; i < n; i++) {
        tone('sine', base + rnd(-250, 350), t + i * rnd(.07, .13), .07, .028, out, base + rnd(500, 1400));
      }
    }, { pos: pos, cool: .2, bus: ambBus });
  }
  function bubble() {
    var pos = { x: lis.x + rnd(-8, 8), y: lis.y - rnd(.2, 2), z: lis.z + rnd(-8, 8) };
    voice('bubble', .5, function (t, out) {
      tone('sine', rnd(240, 420), t, .12, .022, out, rnd(600, 900));
      noise(t, .18, .015, out, { type: 'lowpass', freq: 1200 });
    }, { pos: pos, cool: .3, bus: ambBus });
  }
  function cricket() {
    var pos = { x: lis.x + rnd(-14, 14), y: lis.y + rnd(.2, 2.5), z: lis.z + rnd(-14, 14) };
    voice('cricket', .5, function (t, out) {
      for (var i = 0; i < 4; i++) tone('sine', 4200, t + i * .045, .025, .006, out);
    }, { pos: pos, cool: .4, bus: ambBus });
  }
  function thunder() {
    voice('thunder', 3.4, function (t, out) {
      noise(t, 2.8, .16, out, { type: 'lowpass', freq: 260, to: 70, attack: .08, q: .5 });
      noise(t + .1, 1.6, .07, out, { type: 'bandpass', freq: 600, to: 180, q: .5 });
      tone('sine', 55, t + .05, 1.8, .06, out, 28);
    }, { cool: 1, bus: ambBus });
  }

  // ---------------------------------------------------------- frame / listener
  var _v = null;
  function updateListener(cam) {
    if (!cam) return;
    lis.x = cam.position.x; lis.y = cam.position.y; lis.z = cam.position.z;
    if (window.THREE) {
      if (!_v) _v = new THREE.Vector3();
      _v.set(0, 0, -1).applyQuaternion(cam.quaternion);
      lis.fx = _v.x; lis.fy = _v.y; lis.fz = _v.z;
      _v.set(0, 1, 0).applyQuaternion(cam.quaternion);
      lis.ux = _v.x; lis.uy = _v.y; lis.uz = _v.z;
    }
    if (!ctx || !ctx.listener) return;
    var L = ctx.listener;
    if (L.positionX) {
      L.positionX.value = lis.x; L.positionY.value = lis.y; L.positionZ.value = lis.z;
      L.forwardX.value = lis.fx; L.forwardY.value = lis.fy; L.forwardZ.value = lis.fz;
      L.upX.value = lis.ux; L.upY.value = lis.uy; L.upZ.value = lis.uz;
    } else {
      if (L.setPosition) L.setPosition(lis.x, lis.y, lis.z);
      if (L.setOrientation) L.setOrientation(lis.fx, lis.fy, lis.fz, lis.ux, lis.uy, lis.uz);
    }
  }
  function frame(dt, cam) {
    updateListener(cam);
    if (!ctx || !musicStarted || !cfg.musicOn || disposed || ctx.state !== 'running') return;
    dt = Math.min(dt || 0, .1);
    if (scene === 'menu') return;
    if (!env.night && !env.raining) {
      tBird -= dt;
      if (tBird <= 0) { tBird = rnd(3.2, 8.5); birdCall(); }
    }
    if (env.water) { tWater -= dt; if (tWater <= 0) { tWater = rnd(1.8, 5.2); bubble(); } }
    if (env.night) { tCricket -= dt; if (tCricket <= 0) { tCricket = rnd(1.6, 4.6); cricket(); } }
    if (env.raining && !env.storm) { tThunder -= dt; if (tThunder <= 0) { tThunder = rnd(22, 52); thunder(); } }
  }

  // --------------------------------------------------------------- public API
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) {}
  }
  function unlock() {
    if (disposed) return;
    if (!ensure()) return;
    if (ctx.state !== 'running' && ctx.state !== 'closed') { try { ctx.resume(); } catch (e) {} }
    unlocked = true;
    if (!musicStarted) {
      music.next = ctx.currentTime + .08;
      setScene(scene);
    }
  }
  function setVolume(key, v) {
    if (key === 'muted') { setMuted(!!v); return; }
    if (DEFAULTS[key] == null || typeof DEFAULTS[key] !== 'number') return;
    cfg[key] = clamp(+v || 0, 0, 1);
    applyVolumes();
    persist();
  }
  function setMuted(m) {
    cfg.muted = !!m;
    applyVolumes();
    persist();
  }
  function setMusicEnabled(on) {
    on = !!on;
    if (cfg.musicOn === on) return;
    cfg.musicOn = on;
    if (on && ctx) {
      music.next = ctx.currentTime + .1;
      music.grid = 0;
      music.melIdx = 5;
      musicStarted = true;
      if (active() && ctx.state !== 'running' && ctx.state !== 'closed') {
        try { ctx.resume(); } catch (e) {}
      }
    }
    // a short fade avoids a click when the music bus opens or closes
    applyVolumes(false, on ? .22 : .12);
    persist();
  }
  function isMusicEnabled() { return !!cfg.musicOn; }
  function getSettings() { return Object.assign({}, cfg); }
  function ui(kind) {
    voice('ui:' + kind, .7, function (t, out) { uiSound(kind, t, out); }, { cool: .04 });
  }
  function blockPlace(id) {
    voice('place:' + matOf(id), .6, function (t, out) { placeSound(id, t, out, false); }, { cool: .045 });
  }
  function blockBreak(id) {
    voice('break:' + matOf(id), .8, function (t, out) { placeSound(id, t, out, true); }, { cool: .05 });
  }
  function toolSwing(kind) {
    voice('swing:' + kind, .4, function (t, out) { swingSound(kind, t, out); }, { cool: .1 });
  }
  function toolImpact(kind, id) {
    voice('hit:' + kind + ':' + matOf(id || 0), .5, function (t, out) { impactSound(kind, id, t, out); }, { cool: .05 });
  }
  function step(id) {
    voice('step:' + matOf(id), .2, function (t, out) { stepSound(id, t, out); }, { cool: .1 });
  }
  function jump() {
    voice('jump', .28, function (t, out) {
      noise(t, .16, .035, out, { type: 'bandpass', freq: 380, to: 1100, q: 1 });
      tone('sine', 240, t, .12, .02, out, 380);
    }, { cool: .12 });
  }
  function land(id, force) {
    var f = clamp(force == null ? .5 : force, .2, 1.2);
    voice('land', .35, function (t, out) {
      thump(t, out, .08 * f, 90, 45, .16);
      noise(t, .12, .05 * f, out, { type: 'lowpass', freq: 900, to: 400 });
      stepSound(id, t + .01, out);
    }, { cool: .12 });
  }
  function hoof() {
    voice('hoof', .25, function (t, out) {
      for (var i = 0; i < 2; i++) {
        tone('triangle', 190 + i * 20, t + i * .09, .05, .03, out, 120);
        noise(t + i * .09, .035, .02, out, { type: 'bandpass', freq: 800, q: 2 });
      }
    }, { cool: .18 });
  }
  function swim() {
    voice('swim', .4, function (t, out) {
      noise(t, .3, .04, out, { type: 'lowpass', freq: 1300, to: 500 });
      tone('sine', 220, t, .18, .02, out, 120);
    }, { cool: .3 });
  }
  function animal(kind, x, y, z, hurt) {
    voice('an:' + kind, 1.9, function (t, out) { animalVoice(kind, t, out, !!hurt); },
      { pos: { x: x == null ? lis.x : x, y: y == null ? lis.y : y, z: z == null ? lis.z : z }, cool: hurt ? .3 : .7, bus: ambBus });
  }
  function bird() {
    voice('bird:manual', .8, function (t, out) {
      var base = rnd(1800, 2900);
      for (var i = 0; i < 3; i++) tone('sine', base + rnd(-200, 400), t + i * .1, .07, .03, out, base + 800);
    }, { cool: .2, bus: ambBus });
  }
  function level() {
    if (!analyser) return 0;
    try {
      var n = analyser.fftSize, s = 0, i;
      // float data has no 8-bit noise floor, so a muted bus reads as true silence
      if (analyser.getFloatTimeDomainData) {
        var f = new Float32Array(n);
        analyser.getFloatTimeDomainData(f);
        for (i = 0; i < n; i++) s += f[i] * f[i];
        return Math.sqrt(s / n);
      }
      var a = new Uint8Array(n);
      analyser.getByteTimeDomainData(a);
      for (i = 0; i < n; i++) { var v = (a[i] - 128) / 128; s += v * v; }
      return Math.sqrt(s / n);
    } catch (e) { return 0; }
  }
  function debug() {
    return {
      unlocked: unlocked,
      state: ctx ? ctx.state : 'none',
      scene: scene,
      started: musicStarted,
      musicOn: !!cfg.musicOn,
      musicGain: musicBus ? +musicBus.gain.value.toFixed(5) : null,
      ambGain: ambBus ? +ambBus.gain.value.toFixed(5) : null,
      layers: music.layers.length,
      voices: voices,
      env: Object.assign({}, env),
      cfg: getSettings(),
      level: +level().toFixed(4)
    };
  }
  function dispose() {
    disposed = true;
    if (music.timer) clearInterval(music.timer);
    music.timer = null;
    if (ctx && ctx.close) { try { ctx.close(); } catch (e) {} }
    ctx = null;
  }

  // start audio only after a real gesture, as every mobile browser requires
  addEventListener('pointerdown', function (e) {
    unlock();
    if (!ctx || !musicStarted) return;
    var b = e.target && e.target.closest ? e.target.closest('button,[role="button"]') : null;
    if (!b) return;
    if (b.classList.contains('sw')) ui('select');
    else if (b.id === 'tB' || b.id === 'bSet') ui('open');
    else ui('click');
  }, { capture: true, passive: true });
  addEventListener('keydown', unlock, { passive: true });
  // some mobile browsers only grant audio activation on release/click, so retry there too
  ['pointerup', 'touchend', 'click'].forEach(function (ev) {
    addEventListener(ev, function () { unlock(); }, { capture: true, passive: true });
  });
  document.addEventListener('visibilitychange', function () {
    pageHidden = !!document.hidden;
    if (!ctx) return;
    if (!active()) { try { ctx.suspend(); } catch (e) {} }
    else if (unlocked) { try { ctx.resume(); } catch (e) {} }
  });
  addEventListener('blur', function () {
    focused = false;
    if (ctx) { try { ctx.suspend(); } catch (e) {} }
  });
  addEventListener('focus', function () {
    focused = true;
    if (ctx && unlocked && active()) { try { ctx.resume(); } catch (e) {} }
  });
  addEventListener('pagehide', function () {
    pageHidden = true;
    if (ctx) { try { ctx.suspend(); } catch (e) {} }
  });
  addEventListener('pageshow', function () {
    pageHidden = false;
    if (ctx && unlocked && active()) { try { ctx.resume(); } catch (e) {} }
  });
  addEventListener('beforeunload', dispose);

  return {
    unlock: unlock,
    init: unlock,
    setScene: setScene,
    setEnvironment: setEnvironment,
    frame: frame,
    updateListener: updateListener,
    blockPlace: blockPlace,
    blockBreak: blockBreak,
    toolSwing: toolSwing,
    toolImpact: toolImpact,
    step: step,
    jump: jump,
    land: land,
    hoof: hoof,
    swim: swim,
    animal: animal,
    bird: bird,
    thunder: thunder,
    ui: ui,
    setVolume: setVolume,
    setMuted: setMuted,
    setMusicEnabled: setMusicEnabled,
    isMusicEnabled: isMusicEnabled,
    getSettings: getSettings,
    debug: debug,
    level: level,
    dispose: dispose,
    get scene() { return scene; }
  };
})();
