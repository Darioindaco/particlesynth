import { audio, seq, controls, particles, canvas } from '../state/store.js';
import { warmthToFreq, noteIndexToWarmth, SCALES } from '../musical/scales.js';
import { Particle } from './synthesis.js';
import { isChordTone } from '../musical/harmony.js';

// ─── Default step factory ─────────────────────────────────────
export function makeDefaultStep(i, total) {
  return {
    active:   i % 4 === 0,
    noteIdx:  Math.floor(Math.random() * 8),
    velocity: 0.6 + Math.random() * 0.3,
    prob:     1.0,
  };
}

export function initSeqSteps(count = 16) {
  seq.steps.length = 0;
  for (let i = 0; i < count; i++) seq.steps.push(makeDefaultStep(i, count));
  seq.stepCount = count;
}

// ─── Note label ───────────────────────────────────────────────
export function stepNoteLabel(noteIdx) {
  const notes = SCALES[controls.scale] ?? SCALES.pentatonic;
  const names = ['A','B♭','B','C','C#','D','D#','E','F','F#','G','G#'];
  const oct   = Math.floor(noteIdx / notes.length);
  const semi  = notes[noteIdx % notes.length];
  return names[(semi + 9) % 12] + (oct + 2);
}

// ─── Step interval (ms, accounting for swing) ────────────────
export function stepIntervalMs(stepIdx) {
  const base = (60000 / seq.bpm) / 4; // 16th note
  if (seq.swing <= 50) return base;
  const swing = seq.swing / 100;
  return stepIdx % 2 === 0
    ? base * (1 + (swing - 0.5) * 0.5)
    : base * (1 - (swing - 0.5) * 0.5);
}

// ─── Chord-tone check (delegates to harmony) ─────────────────
export function seqIsChordTone(noteIdx) {
  return isChordTone(noteIdx, controls.scale);
}

// ─── Spawn a sequencer particle ───────────────────────────────
export function spawnSeqParticle(step) {
  if (!audio.AC) return;
  const warmth = noteIndexToWarmth(step.noteIdx, controls.scale);
  const x = canvas.width  * 0.1 + Math.random() * canvas.width  * 0.8;
  const y = canvas.height * 0.1 + Math.random() * canvas.height * 0.4;
  const vx = (Math.random() - 0.5) * 3 * step.velocity;
  const vy = -(1 + Math.random() * 2) * step.velocity;

  const p = new Particle(x, y, vx, vy, warmth);
  p.initAudio(canvas.width);
  particles.push(p);

  // Cull if over limit
  while (particles.length > controls.maxParticles) {
    const oldest = particles.shift();
    oldest.destroy();
  }
}

// ─── Scheduler (lookahead Web Audio clock) ───────────────────
function scheduleStep(stepIdx, time) {
  const step = seq.steps[stepIdx];
  if (!step || !step.active) return;
  if (Math.random() > step.prob) return;

  spawnSeqParticle(step);
  seq.flashStep = stepIdx;
  seq.flashTime = performance.now();
}

function seqScheduler() {
  const { AC } = audio;
  if (!AC || !seq.playing) return;

  while (seq.nextStepTime < AC.currentTime + seq.scheduleAheadS) {
    scheduleStep(seq.currentStep, seq.nextStepTime);
    const intervalS = stepIntervalMs(seq.currentStep) / 1000;
    seq.nextStepTime += intervalS;
    seq.currentStep  = (seq.currentStep + 1) % seq.stepCount;
  }
  seq.scheduleTimer = setTimeout(seqScheduler, seq.lookaheadMs);
}

export function seqPlay() {
  if (seq.playing) return;
  if (!audio.AC) return;
  seq.playing      = true;
  seq.currentStep  = 0;
  seq.nextStepTime = audio.AC.currentTime + 0.05;
  seqScheduler();
}

export function seqStop() {
  seq.playing = false;
  if (seq.scheduleTimer !== null) {
    clearTimeout(seq.scheduleTimer);
    seq.scheduleTimer = null;
  }
  seq.currentStep = -1;
}

export function seqSetStepCount(n) {
  seq.stepCount = n;
  while (seq.steps.length < n) seq.steps.push(makeDefaultStep(seq.steps.length, n));
  seq.steps.length = n;
}

// ─── Pattern tools ────────────────────────────────────────────
export function seqRandomise() {
  for (const s of seq.steps) {
    s.active   = Math.random() > 0.5;
    s.noteIdx  = Math.floor(Math.random() * 12);
    s.velocity = 0.4 + Math.random() * 0.6;
  }
}

export function seqClearAll()  { seq.steps.forEach(s => s.active = false); }
export function seqFillAll()   { seq.steps.forEach(s => s.active = true);  }

export function seqShift(dir) {
  if (dir > 0) seq.steps.unshift(seq.steps.pop());
  else         seq.steps.push(seq.steps.shift());
}

export function seqReverse() {
  seq.steps.reverse();
}
