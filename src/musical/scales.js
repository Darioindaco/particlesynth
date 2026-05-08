export const ROOT = 110; // A2 — base frequency

export const SCALES = {
  pentatonic: [0, 2, 4, 7, 9],
  major:      [0, 2, 4, 5, 7, 9, 11],
  minor:      [0, 2, 3, 5, 7, 8, 10],
  dorian:     [0, 2, 3, 5, 7, 9, 10],
  phrygian:   [0, 1, 3, 5, 7, 8, 10],
  lydian:     [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  chromatic:  [0,1,2,3,4,5,6,7,8,9,10,11],
};

export const HARMONIC_RATIOS = [1, 2, 3, 4, 5, 6];

// warmth 0→1 maps across 3 octaves of the current scale
export function warmthToFreq(warmth, scaleName = 'pentatonic') {
  const notes  = SCALES[scaleName] ?? SCALES.pentatonic;
  const total  = notes.length * 3;
  const idx    = Math.floor(warmth * (total - 1));
  const octave = Math.floor(idx / notes.length);
  const semi   = notes[idx % notes.length];
  return ROOT * Math.pow(2, octave) * Math.pow(2, semi / 12);
}

// key-note index → warmth (used by keyboard + sequencer)
export function noteIndexToWarmth(idx, scaleName = 'pentatonic') {
  const notes = SCALES[scaleName] ?? SCALES.pentatonic;
  const total = notes.length * 3;
  return Math.max(0, Math.min(1, idx / (total - 1)));
}
