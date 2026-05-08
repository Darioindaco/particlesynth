import { audio, controls } from '../state/store.js';

// ─── Reverb impulse ───────────────────────────────────────────
function buildReverb(AC) {
  const len = AC.sampleRate * 2.5;
  const buf = AC.createBuffer(2, len, AC.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2);
  }
  const conv = AC.createConvolver();
  conv.buffer = buf;
  return conv;
}

// ─── Boot ─────────────────────────────────────────────────────
export function initAudio() {
  if (audio.AC) return;

  const AC       = new AudioContext();
  const master   = AC.createGain();
  const compressor = AC.createDynamicsCompressor();
  compressor.threshold.value = -24;
  compressor.knee.value      = 6;
  compressor.ratio.value     = 4;
  compressor.attack.value    = 0.003;
  compressor.release.value   = 0.25;

  const analyser = AC.createAnalyser();
  analyser.fftSize = 2048;

  const reverbNode = buildReverb(AC);
  const dryGain    = AC.createGain();
  const wetGain    = AC.createGain();

  master.connect(dryGain);
  master.connect(reverbNode);
  reverbNode.connect(wetGain);
  dryGain.connect(compressor);
  wetGain.connect(compressor);
  compressor.connect(analyser);
  analyser.connect(AC.destination);

  audio.AC         = AC;
  audio.masterGain = master;
  audio.reverbNode = reverbNode;
  audio.dryGain    = dryGain;
  audio.wetGain    = wetGain;
  audio.analyser   = analyser;
  audio.started    = true;

  syncAudioParams();
}

export function syncAudioParams() {
  const { AC, masterGain, dryGain, wetGain } = audio;
  if (!AC) return;
  const t = AC.currentTime;
  masterGain.gain.setTargetAtTime(controls.masterVol, t, 0.05);
  dryGain.gain.setTargetAtTime(1 - controls.reverbMix, t, 0.05);
  wetGain.gain.setTargetAtTime(controls.reverbMix,     t, 0.05);
}

// Convenience: sl(param, value, time?) — set or ramp AudioParam
export function sl(param, value, t) {
  if (!audio.AC) return;
  const ct = t ?? audio.AC.currentTime;
  param.setTargetAtTime(value, ct, 0.05);
}
