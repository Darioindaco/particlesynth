import { audio, collVoices, controls } from '../state/store.js';
import { warmthToFreq } from '../musical/scales.js';
import { SCALES } from '../musical/scales.js';

export const COLL_MAX_VOICES = 16;
export const COLL_CHORD_IVLS = [[0,4,7],[0,3,7],[0,2,7],[0,4,7,10],[0,4,7,11]];

// ─── Voice pool ───────────────────────────────────────────────
export function acquireCollVoice(vol, pan) {
  const { AC, masterGain } = audio;
  if (!AC) return null;
  if (collVoices.length >= COLL_MAX_VOICES) {
    let minGain = Infinity, minIdx = 0;
    for (let i = 0; i < collVoices.length; i++) {
      const g = collVoices[i].gainNode.gain.value;
      if (g < minGain) { minGain = g; minIdx = i; }
    }
    try { collVoices[minIdx].gainNode.disconnect(); } catch {}
    collVoices.splice(minIdx, 1);
  }
  const gainNode = AC.createGain();
  const panNode  = new StereoPannerNode(AC, { pan: Math.max(-1, Math.min(1, pan)) });
  gainNode.gain.setValueAtTime(Math.min(vol, 1), AC.currentTime);
  gainNode.connect(panNode);
  panNode.connect(masterGain);
  const voice = { gainNode, panNode, stopAt: null };
  collVoices.push(voice);
  return voice;
}

export function pruneCollVoices(collObjects) {
  const { AC } = audio;
  if (!AC) return;
  const now = AC.currentTime;
  for (let i = collVoices.length - 1; i >= 0; i--) {
    if (collVoices[i].stopAt && collVoices[i].stopAt < now) {
      try { collVoices[i].gainNode.disconnect(); } catch {}
      collVoices.splice(i, 1);
    }
  }
  for (const obj of collObjects) obj.hitLevel = Math.max(0, obj.hitLevel * 0.87);
}

// ─── Sound engines ────────────────────────────────────────────
function triggerCPitched(obj, impactSpd, warmth, vol) {
  const { AC } = audio;
  const s = obj.sound;
  const v = acquireCollVoice(vol, s.pan); if (!v) return;
  const t = AC.currentTime;
  const notes = SCALES[controls.scale] ?? SCALES.pentatonic;
  const total = notes.length * 4;
  const idx   = Math.min(s.noteIdx, total - 1);
  const midi  = 45 + Math.floor(idx / notes.length) * 12 + notes[idx % notes.length];
  const freq  = 110 * Math.pow(2, (midi - 45) / 12) * Math.pow(2, (warmth - 0.5) * 2 / 12);
  const osc   = AC.createOscillator();
  osc.type = s.waveform; osc.frequency.setValueAtTime(freq, t);
  osc.connect(v.gainNode);
  const atkT = t + s.attack / 1000, relT = atkT + s.decay / 1000 + s.release / 1000;
  v.gainNode.gain.setValueAtTime(0, t);
  v.gainNode.gain.linearRampToValueAtTime(vol, atkT);
  v.gainNode.gain.exponentialRampToValueAtTime(0.001, relT);
  osc.start(t); osc.stop(relT + 0.05); v.stopAt = relT + 0.05;
}

function triggerCPerc(obj, impactSpd, warmth, vol) {
  const { AC } = audio;
  const s = obj.sound;
  const v = acquireCollVoice(vol, s.pan); if (!v) return;
  const t = AC.currentTime, dec = s.percDecay;
  if (s.percType === 'kick' || s.percType === 'tom') {
    const mul = s.percType === 'kick' ? 2 : 1.5;
    const osc = AC.createOscillator();
    osc.frequency.setValueAtTime(s.percFreq * mul, t);
    osc.frequency.exponentialRampToValueAtTime(s.percFreq * 0.4, t + dec * 0.6);
    osc.connect(v.gainNode);
    v.gainNode.gain.setValueAtTime(vol, t);
    v.gainNode.gain.exponentialRampToValueAtTime(0.001, t + dec);
    osc.start(t); osc.stop(t + dec + 0.05); v.stopAt = t + dec + 0.05;
  } else {
    const isHat = s.percType === 'hat';
    const dur   = isHat ? Math.min(dec, 0.25) : dec;
    const buf   = AC.createBuffer(1, Math.ceil(AC.sampleRate * dur), AC.sampleRate);
    const d     = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = AC.createBufferSource(); src.buffer = buf;
    const flt = AC.createBiquadFilter();
    flt.type = 'highpass'; flt.frequency.value = isHat ? 7000 : 400 + s.percFreq * 2;
    src.connect(flt); flt.connect(v.gainNode);
    v.gainNode.gain.setValueAtTime(vol, t);
    v.gainNode.gain.exponentialRampToValueAtTime(0.001, t + dur * (isHat ? 0.5 : 0.9));
    src.start(t); src.stop(t + dur + 0.02); v.stopAt = t + dur + 0.02;
  }
}

function triggerCGranular(obj, impactSpd, warmth, vol) {
  const { AC } = audio;
  const s   = obj.sound;
  const den = Math.max(1, Math.round(s.granDensity));
  const gDur = s.granSize / 1000;
  const MAT = {
    metal: { filt: 'bandpass', freq: 600 + warmth * 5000, q: 10 },
    wood:  { filt: 'bandpass', freq: 250 + warmth * 1500, q:  4 },
    glass: { filt: 'highpass', freq: 3000,                q: 12 },
    stone: { filt: 'lowpass',  freq: 300 + warmth * 800,  q:  2 },
  };
  const mat = MAT[s.granMat] ?? MAT.metal;
  for (let gi = 0; gi < den; gi++) {
    const v = acquireCollVoice(vol / den, s.pan); if (!v) continue;
    const t = AC.currentTime + gi * gDur * 0.35;
    const buf = AC.createBuffer(1, Math.ceil(AC.sampleRate * gDur), AC.sampleRate);
    const d   = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = AC.createBufferSource(); src.buffer = buf;
    const flt = AC.createBiquadFilter();
    flt.type = mat.filt; flt.frequency.value = mat.freq; flt.Q.value = mat.q;
    src.connect(flt); flt.connect(v.gainNode);
    v.gainNode.gain.setValueAtTime(0, t);
    v.gainNode.gain.linearRampToValueAtTime(vol / den, t + gDur * 0.08);
    v.gainNode.gain.exponentialRampToValueAtTime(0.001, t + gDur);
    src.start(t); src.stop(t + gDur + 0.02); v.stopAt = t + gDur + 0.02;
  }
}

function triggerCFMBurst(obj, impactSpd, warmth, vol) {
  const { AC } = audio;
  const s   = obj.sound;
  const v   = acquireCollVoice(vol, s.pan); if (!v) return;
  const t   = AC.currentTime, dur = s.fmDuration / 1000;
  const pm  = Math.pow(2, (warmth - 0.5) * 2 / 12);
  const car = s.fmCarrier * pm, modF = car * s.fmRatio;
  const mod = AC.createOscillator(), modG = AC.createGain(), osc = AC.createOscillator();
  mod.frequency.setValueAtTime(modF, t);
  modG.gain.setValueAtTime(modF * s.fmIndex, t);
  modG.gain.exponentialRampToValueAtTime(modF * s.fmIndex * 0.05, t + dur);
  mod.connect(modG); modG.connect(osc.frequency); osc.connect(v.gainNode);
  v.gainNode.gain.setValueAtTime(vol, t);
  v.gainNode.gain.exponentialRampToValueAtTime(0.001, t + dur);
  mod.start(t); mod.stop(t + dur + 0.05);
  osc.start(t); osc.stop(t + dur + 0.05); v.stopAt = t + dur + 0.05;
}

function triggerCChord(obj, impactSpd, warmth, vol) {
  const { AC } = audio;
  const s    = obj.sound;
  const ivls = COLL_CHORD_IVLS[Math.min(s.chordQIdx, COLL_CHORD_IVLS.length - 1)];
  const dur  = s.chordDuration;
  const rootMidi = 45 + Math.round(warmth * 24);
  for (const semi of ivls) {
    const v = acquireCollVoice(vol / ivls.length, s.pan); if (!v) continue;
    const t    = AC.currentTime;
    const freq = 110 * Math.pow(2, (rootMidi + semi - 45) / 12);
    const osc  = AC.createOscillator();
    osc.type = 'sine'; osc.frequency.setValueAtTime(freq, t);
    osc.connect(v.gainNode);
    v.gainNode.gain.setValueAtTime(0, t);
    v.gainNode.gain.linearRampToValueAtTime(vol / ivls.length, t + 0.01);
    v.gainNode.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.start(t); osc.stop(t + dur + 0.05); v.stopAt = t + dur + 0.05;
  }
}

function triggerCRes(obj, impactSpd, warmth, vol) {
  const { AC } = audio;
  const s   = obj.sound;
  const v   = acquireCollVoice(vol, s.pan); if (!v) return;
  const t   = AC.currentTime, dur = s.resDec;
  const freq = warmthToFreq(warmth, controls.scale) * Math.pow(2, (warmth - 0.5) * 2 / 12);
  const impDur = 0.02;
  const buf  = AC.createBuffer(1, Math.ceil(AC.sampleRate * impDur), AC.sampleRate);
  const d    = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src  = AC.createBufferSource(); src.buffer = buf;
  const flt  = AC.createBiquadFilter();
  flt.type = 'bandpass'; flt.frequency.setValueAtTime(freq, t); flt.Q.value = 25;
  src.connect(flt); flt.connect(v.gainNode);
  v.gainNode.gain.setValueAtTime(vol, t);
  v.gainNode.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.start(t); src.stop(t + impDur + 0.01); v.stopAt = t + dur + 0.05;
}

// ─── Dispatcher ───────────────────────────────────────────────
export function triggerCollisionSound(obj, impactSpd, warmth) {
  if (!audio.AC || !audio.started) return;
  const now = performance.now();
  if (now - obj.lastTriggerMs < obj.sound.cooldown) return;
  obj.lastTriggerMs = now;
  const s   = obj.sound;
  const vol = Math.min(0.9, s.volume * (0.15 + s.velSens * impactSpd * 0.06));
  switch (s.type) {
    case 'pitched': triggerCPitched (obj, impactSpd, warmth, vol); break;
    case 'perc':    triggerCPerc    (obj, impactSpd, warmth, vol); break;
    case 'gran':    triggerCGranular(obj, impactSpd, warmth, vol); break;
    case 'fm':      triggerCFMBurst (obj, impactSpd, warmth, vol); break;
    case 'chord':   triggerCChord   (obj, impactSpd, warmth, vol); break;
    default:        triggerCRes     (obj, impactSpd, warmth, vol); break;
  }
}
