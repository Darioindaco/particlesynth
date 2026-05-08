import { audio, particles, controls, harmony, canvas } from '../state/store.js';
import { warmthToFreq, HARMONIC_RATIOS } from '../musical/scales.js';
import { sl } from './engine.js';

// ─── Color from warmth (used by renderer too, exported) ───────
export function warmthToColor(w) {
  const r = Math.round(20  + w * 235);
  const g = Math.round(40  + (1 - Math.abs(w - 0.5) * 2) * 180);
  const b = Math.round(220 - w * 200);
  return `rgb(${r},${g},${b})`;
}

// ─── Grain synthesis (Karplus-Strong physical model) ──────────
export function spawnGrain(warmth, tension, x, canvasWidth) {
  const { AC, masterGain } = audio;
  if (!AC) return;
  const freq    = warmthToFreq(warmth, controls.scale);
  const dur     = 0.08 + tension * 0.35;
  const bufLen  = Math.ceil(AC.sampleRate * dur);
  const buf     = AC.createBuffer(1, bufLen, AC.sampleRate);
  const d       = buf.getChannelData(0);
  const period  = Math.round(AC.sampleRate / freq);
  // Fill with noise then apply Karplus-Strong feedback
  for (let i = 0; i < Math.min(period, bufLen); i++) d[i] = Math.random() * 2 - 1;
  for (let i = period; i < bufLen; i++) d[i] = 0.5 * (d[i - period] + d[i - period + 1 < period ? 0 : i - period + 1]);

  const src   = AC.createBufferSource();
  src.buffer  = buf;
  const gn    = AC.createGain();
  const pan   = new StereoPannerNode(AC, { pan: Math.max(-1, Math.min(1, (x / canvasWidth) * 2 - 1)) });
  gn.gain.setValueAtTime(0.18 + tension * 0.22, AC.currentTime);
  gn.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + dur);
  src.connect(gn); gn.connect(pan); pan.connect(masterGain);
  src.start(); src.stop(AC.currentTime + dur + 0.01);
}

// ─── Synthesis mode helper ────────────────────────────────────
export function getSynthMode() { return controls.synthMode; }

// ─── Particle audio class ─────────────────────────────────────
export class Particle {
  constructor(x, y, vx, vy, warmth) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.r = 5 + warmth * 6;
    this.warmth  = warmth;
    this.tension = 0;
    this.mass    = 1 + warmth;

    // Audio nodes — null until initAudio called
    this.osc      = null;
    this.modOsc   = null;
    this.modGain  = null;
    this.gainNode = null;
    this.filterNode = null;
    this.filterEnvGain = null;
    this.panNode  = null;

    this.noteHeld = false;   // keyboard note mode
    this.keyFreq  = null;
  }

  initAudio(canvasWidth) {
    const { AC, masterGain } = audio;
    if (!AC) return;

    const mode  = getSynthMode();
    const freq  = this.keyFreq ?? warmthToFreq(this.warmth, controls.scale);
    const pan   = Math.max(-1, Math.min(1, (this.x / canvasWidth) * 2 - 1));
    const t     = AC.currentTime;

    this.gainNode = AC.createGain();
    this.gainNode.gain.setValueAtTime(0.001, t);
    this.panNode  = new StereoPannerNode(AC, { pan });

    if (mode === 'fm' || mode === 'fm4') {
      this.osc     = AC.createOscillator();
      this.modOsc  = AC.createOscillator();
      this.modGain = AC.createGain();
      this.osc.frequency.setValueAtTime(freq, t);
      this.modOsc.frequency.setValueAtTime(freq * 2, t);
      this.modGain.gain.setValueAtTime(freq * controls.fmDepth * 4, t);
      this.modOsc.connect(this.modGain);
      this.modGain.connect(this.osc.frequency);
      this.osc.connect(this.gainNode);
      this.osc.start();
      this.modOsc.start();
    } else if (mode === 'subtractive') {
      this.osc = AC.createOscillator();
      this.osc.type = 'sawtooth';
      this.osc.frequency.setValueAtTime(freq, t);
      this.filterNode = AC.createBiquadFilter();
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.setValueAtTime(controls.filterCutoff, t);
      this.filterNode.Q.setValueAtTime(controls.filterRes, t);
      this.filterEnvGain = AC.createGain();
      this.filterEnvGain.gain.setValueAtTime(1, t);
      this.osc.connect(this.filterNode);
      this.filterNode.connect(this.gainNode);
      this.osc.start();
    } else if (mode === 'additive') {
      this.addOscs = [];
      this.addGains = [];
      for (let h = 0; h < HARMONIC_RATIOS.length; h++) {
        const ho = AC.createOscillator();
        const hg = AC.createGain();
        ho.frequency.setValueAtTime(freq * HARMONIC_RATIOS[h], t);
        hg.gain.setValueAtTime(1 / (h + 1) * 0.3, t);
        ho.connect(hg); hg.connect(this.gainNode);
        ho.start();
        this.addOscs.push(ho);
        this.addGains.push(hg);
      }
    }

    this.gainNode.connect(this.panNode);
    this.panNode.connect(masterGain);
    this.gainNode.gain.linearRampToValueAtTime(0.12 + this.warmth * 0.08, t + 0.02);
  }

  syncAudio(canvasWidth) {
    if (!this.gainNode) return;
    const { AC } = audio;
    const mode = getSynthMode();
    const freq = this.keyFreq ?? warmthToFreq(this.warmth, controls.scale);
    const t    = AC.currentTime;
    const pan  = Math.max(-1, Math.min(1, (this.x / canvasWidth) * 2 - 1));

    sl(this.panNode.pan, pan);

    if (mode === 'fm' || mode === 'fm4') {
      if (this.osc) sl(this.osc.frequency, freq);
    } else if (mode === 'subtractive') {
      if (this.osc) sl(this.osc.frequency, freq);
      if (this.filterNode) {
        sl(this.filterNode.frequency, controls.filterCutoff);
        sl(this.filterNode.Q, controls.filterRes);
      }
    } else if (mode === 'additive') {
      if (this.addOscs) {
        this.addOscs.forEach((ho, h) => sl(ho.frequency, freq * HARMONIC_RATIOS[h]));
      }
    }
  }

  triggerFilterEnv() {
    if (!this.filterNode) return;
    const { AC } = audio;
    const t = AC.currentTime;
    this.filterNode.frequency.cancelScheduledValues(t);
    this.filterNode.frequency.setValueAtTime(controls.filterCutoff * 4, t);
    this.filterNode.frequency.exponentialRampToValueAtTime(controls.filterCutoff, t + 0.25);
  }

  setFMDepth(depth) {
    if (!this.modGain || !this.osc) return;
    const freq = this.keyFreq ?? warmthToFreq(this.warmth, controls.scale);
    sl(this.modGain.gain, freq * depth * 4);
  }

  destroy() {
    const stop = (node) => { try { node.stop?.(); node.disconnect?.(); } catch {} };
    stop(this.osc);
    stop(this.modOsc);
    if (this.addOscs) this.addOscs.forEach(stop);
    try { this.gainNode?.disconnect(); } catch {}
    try { this.panNode?.disconnect(); } catch {}
    try { this.filterNode?.disconnect(); } catch {}
  }
}

// ─── FM chain update ──────────────────────────────────────────
export function updateFM() {
  const W = canvas.width || 800;
  for (const p of particles) {
    if (!p.gainNode) continue;
    p.syncAudio(W);
  }
}

// ─── LFO ─────────────────────────────────────────────────────
import { lfo } from '../state/store.js';

export function updateLFO(dt) {
  const { AC } = audio;
  if (!AC) return;
  const rate  = controls.lfoSync
    ? (controls.bpm / 60) * controls.lfoRate
    : controls.lfoRate;
  lfo.phase = (lfo.phase + dt * rate * Math.PI * 2) % (Math.PI * 2);
  const val = Math.sin(lfo.phase) * 0.5 + 0.5; // 0..1

  if (controls.lfoTarget === 'fmDepth') {
    const depth = controls.fmDepth * (1 + val * controls.lfoDepth);
    for (const p of particles) p.setFMDepth(depth);
  } else if (controls.lfoTarget === 'filterCutoff' && controls.synthMode === 'subtractive') {
    const fc = controls.filterCutoff * (0.5 + val * controls.lfoDepth);
    for (const p of particles) {
      if (p.filterNode) sl(p.filterNode.frequency, fc);
    }
  } else if (controls.lfoTarget === 'warmthDrift') {
    for (const p of particles) {
      p.warmth = Math.max(0, Math.min(1, p.warmth + (val - 0.5) * controls.lfoDepth * 0.01));
    }
  } else if (controls.lfoTarget === 'reverb' && audio.wetGain) {
    sl(audio.wetGain.gain, controls.reverbMix * (0.5 + val * controls.lfoDepth));
  }
}

// ─── Drone ────────────────────────────────────────────────────
export function startDrone() {
  const { AC, masterGain } = audio;
  if (!AC || harmony.droneGain) return;
  const freq = warmthToFreq(0.0, controls.scale);
  const g    = AC.createGain();
  g.gain.setValueAtTime(0.001, AC.currentTime);
  g.gain.linearRampToValueAtTime(0.12, AC.currentTime + 0.3);
  const oscs = [1, 2, 3].map(ratio => {
    const o = AC.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq * ratio, AC.currentTime);
    o.connect(g);
    o.start();
    return o;
  });
  g.connect(masterGain);
  harmony.droneGain = g;
  harmony.droneOscs = oscs;
}

export function stopDrone() {
  if (!harmony.droneGain) return;
  const t = audio.AC.currentTime;
  harmony.droneGain.gain.linearRampToValueAtTime(0.001, t + 0.3);
  harmony.droneOscs.forEach(o => { try { o.stop(t + 0.35); } catch {} });
  harmony.droneGain = null;
  harmony.droneOscs = [];
}
