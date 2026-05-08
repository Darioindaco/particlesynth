// Single source of truth. All modules import from here; none holds their own globals.

// ─── Audio context ────────────────────────────────────────────
export const audio = {
  AC: null,           // AudioContext
  masterGain: null,   // GainNode
  reverbNode: null,   // ConvolverNode
  dryGain: null,      // GainNode
  wetGain: null,      // GainNode
  analyser: null,     // AnalyserNode
  started: false,
};

// ─── Particles ────────────────────────────────────────────────
export const particles = [];   // Particle instances

// ─── Scene objects (emitters, attractors, etc.) ───────────────
export const sceneObjects = []; // {type, x, y, …}

// ─── Collision objects ────────────────────────────────────────
export const collObjects = [];  // {type, …}
export const collSparks  = [];  // visual spark particles

// ─── Collision voice pool ─────────────────────────────────────
export const collVoices  = [];  // {gainNode, panNode, stopAt}

// ─── Sequencer state ──────────────────────────────────────────
export const seq = {
  steps: [],          // filled by sequencer.js init
  playing: false,
  stepCount: 16,
  currentStep: -1,
  bpm: 120,
  swing: 50,
  lookaheadMs: 25,
  scheduleAheadS: 0.1,
  nextStepTime: 0,
  scheduleTimer: null,
  flashStep: -1,
  flashTime: 0,
  pickingStep: -1,
  // velocity drag
  velDragStep: -1,
  velDragStartY: 0,
  velDragStartVel: 0,
};

// ─── Chord / harmony state ────────────────────────────────────
export const harmony = {
  activeChord: null,    // {root, quality, notes[]}
  chordLockUntil: 0,    // ms timestamp
  droneGain: null,      // GainNode
  droneOscs: [],        // OscillatorNode[]
};

// ─── LFO state ────────────────────────────────────────────────
export const lfo = {
  phase: 0,
};

// ─── Canvas / interaction state ───────────────────────────────
export const canvas = {
  el: null,     // HTMLCanvasElement — assigned in main.js
  ctx: null,    // CanvasRenderingContext2D
  width: 0,
  height: 0,
};

export const mouse = {
  x: null,
  y: null,
  down: false,
  dragParticle: null,
  dragObj: null,      // scene object drag
};

// ─── Collision placement / drag state ────────────────────────
export const collPlacement = {
  type: null,         // 'wall' | 'box' | 'circle' | 'tri' | 'poly' | null
  p1: null,           // first click point
  polyVerts: [],
};

export const collDrag = {
  obj: null,
  startX: 0, startY: 0,
  originX: 0, originY: 0,
};

export let collSelectedObj = null;
export function setCollSelectedObj(obj) { collSelectedObj = obj; }

// ─── Tool / interaction mode ──────────────────────────────────
export let selectedTool = null;  // 'gravity' | 'repel' | null
export function setSelectedTool(t) { selectedTool = t; }

// ─── Loop timing ──────────────────────────────────────────────
export let lastLoopTime = performance.now();
export function setLastLoopTime(t) { lastLoopTime = t; }

// ─── UI controls (read by audio/physics at runtime) ──────────
// These are thin wrappers so audio/physics don't touch the DOM.
// main.js syncs them from input events.
export const controls = {
  gravity: 0.08,
  wind: 0,
  viscosity: 0.98,
  bounce: 0.7,
  tension: 0.5,
  reverbMix: 0.3,
  masterVol: 0.7,
  fmDepth: 0.5,
  filterCutoff: 800,
  filterRes: 4,
  proxDist: 140,
  opCount: 2,
  synthMode: 'fm',
  scale: 'pentatonic',
  chordOn: false,
  droneOn: false,
  nltMode: 'off',
  bpm: 120,
  swing: 50,
  lfoRate: 1,
  lfoDepth: 0.5,
  lfoTarget: 'fmDepth',
  lfoSync: false,
  maxParticles: 64,
  maxObjects: 8,
  warmthDriftAmt: 0,
  disturbance: 0,
};
