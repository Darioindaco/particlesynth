import { harmony, particles, controls } from '../state/store.js';
import { warmthToFreq, SCALES } from './scales.js';

// Chord quality definitions: [name, intervals]
export const CHORD_QUALITIES = [
  ['maj',  [0, 4, 7]],
  ['min',  [0, 3, 7]],
  ['dim',  [0, 3, 6]],
  ['aug',  [0, 4, 8]],
  ['dom7', [0, 4, 7, 10]],
  ['maj7', [0, 4, 7, 11]],
  ['min7', [0, 3, 7, 10]],
  ['sus2', [0, 2, 7]],
  ['sus4', [0, 5, 7]],
];

function floodCluster(idx, visited, warmths, threshold) {
  const cluster = [];
  const stack   = [idx];
  while (stack.length) {
    const i = stack.pop();
    if (visited[i]) continue;
    visited[i] = true;
    cluster.push(i);
    for (let j = 0; j < warmths.length; j++) {
      if (!visited[j] && Math.abs(warmths[i] - warmths[j]) < threshold) stack.push(j);
    }
  }
  return cluster;
}

export function detectChord(scaleName) {
  if (particles.length < 2) return null;
  const notes   = SCALES[scaleName] ?? SCALES.pentatonic;
  const total   = notes.length * 3;
  const warmths = particles.map(p => p.warmth);

  // Find largest cluster within warmth proximity threshold
  const visited = new Array(warmths.length).fill(false);
  let bestCluster = [];
  for (let i = 0; i < warmths.length; i++) {
    if (visited[i]) continue;
    const cluster = floodCluster(i, visited, warmths, 0.15);
    if (cluster.length > bestCluster.length) bestCluster = cluster;
  }
  if (bestCluster.length < 2) return null;

  const clusterWarmths = bestCluster.map(i => warmths[i]);
  const centroid       = clusterWarmths.reduce((a, b) => a + b) / clusterWarmths.length;
  const rootIdx        = Math.floor(centroid * (total - 1));
  const rootOctave     = Math.floor(rootIdx / notes.length);
  const rootSemi       = notes[rootIdx % notes.length];

  // Majority-vote chord quality
  const votes = new Array(CHORD_QUALITIES.length).fill(0);
  for (const w of clusterWarmths) {
    const ni  = Math.floor(w * (total - 1));
    const rel = notes[ni % notes.length] - rootSemi;
    for (let q = 0; q < CHORD_QUALITIES.length; q++) {
      if (CHORD_QUALITIES[q][1].includes(((rel % 12) + 12) % 12)) votes[q]++;
    }
  }
  const bestQ = votes.indexOf(Math.max(...votes));
  const [qualityName, intervals] = CHORD_QUALITIES[bestQ];

  return {
    root:    rootSemi,
    octave:  rootOctave,
    quality: qualityName,
    notes:   intervals.map(i => rootSemi + i),
  };
}

export function warmthToChord(warmth) {
  return detectChord(controls.scale);
}

// Returns true if a note index falls on a chord tone of the current activeChord
export function isChordTone(noteIdx, scaleName) {
  const ch = harmony.activeChord;
  if (!ch) return false;
  const notes = SCALES[scaleName] ?? SCALES.pentatonic;
  const semi  = notes[noteIdx % notes.length];
  return ch.notes.includes(((semi - ch.root) % 12 + 12) % 12);
}

// Call every frame (audio-side): updates harmony.activeChord with lock
export function updateChordVoicing() {
  if (!controls.chordOn) return;
  const now = performance.now();
  if (now < harmony.chordLockUntil) return;
  const ch = detectChord(controls.scale);
  if (ch) {
    harmony.activeChord   = ch;
    harmony.chordLockUntil = now + 3000;
  }
}
