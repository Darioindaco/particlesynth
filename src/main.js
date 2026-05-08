// Cross-category wiring only. Each import belongs to exactly one layer.
// audio/* = no DOM  |  ui/* = no AudioNodes  |  physics/* = pure math

import { canvas, audio, controls, particles, seq, collObjects, collPlacement } from './state/store.js';

// Physics
import { physics, spawnParticle, initParticles } from './physics/particles.js';
import { resolveCollisionObjects, setCollPlacementType } from './physics/collisionObjects.js';

// Audio (initAudio called from panel.js startBtn handler)
import { updateFM, updateLFO } from './audio/synthesis.js';
import { pruneCollVoices } from './audio/collisionSounds.js';
import { initSeqSteps } from './audio/sequencer.js';

// Musical
import { updateChordVoicing } from './musical/harmony.js';

// UI
import { bindPanel, updateParticleCount } from './ui/panel.js';
import { draw, drawScope, bindCanvasEvents } from './ui/canvas.js';
import { seqRenderCells, seqUpdateVisuals, handleSeqNotePick } from './ui/sequencerUI.js';

// Emitter tick (scene objects)
import { tickEmitters } from './physics/emitters.js';


// ─── Canvas setup ─────────────────────────────────────────────
const cvEl  = document.getElementById('canvas');
canvas.el   = cvEl;
canvas.ctx  = cvEl.getContext('2d');

function resizeCanvas() {
  const wrap = cvEl.parentElement;
  cvEl.width  = canvas.width  = wrap.clientWidth  || window.innerWidth - 320;
  cvEl.height = canvas.height = wrap.clientHeight || window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// ─── Sequencer init ───────────────────────────────────────────
initSeqSteps(16);

// ─── Keyboard note → particle handler ────────────────────────
const LOWER_KEYS = 'asdfghjkl;'.split('');
const UPPER_KEYS = 'qwertyuiop'.split('');
const ALL_KEYS   = [...LOWER_KEYS, ...UPPER_KEYS];

const _activeKeyParticles = new Map();

function onKeyNote(idx, isDown) {
  if (handleSeqNotePick(idx)) return;
  if (isDown) {
    if (_activeKeyParticles.has(idx)) return;
    const warmth = idx / (ALL_KEYS.length - 1);
    const p = spawnParticle(
      canvas.width * 0.5 + (Math.random() - 0.5) * 100,
      canvas.height * 0.7,
      warmth,
    );
    if (p) {
      p.noteHeld = true;
      _activeKeyParticles.set(idx, p);
    }
  } else {
    const p = _activeKeyParticles.get(idx);
    if (p) { p.noteHeld = false; _activeKeyParticles.delete(idx); }
  }
}

// ─── UI binding ───────────────────────────────────────────────
bindPanel(onKeyNote);
bindCanvasEvents();

// Collision toolbar
document.querySelectorAll('[data-ctype]').forEach(btn => {
  btn.addEventListener('click', () => {
    const t = btn.dataset.ctype;
    if (collPlacement.type === t) {
      setCollPlacementType(null);
      btn.classList.remove('scene-active');
    } else {
      setCollPlacementType(t);
      document.querySelectorAll('[data-ctype]').forEach(b =>
        b.classList.toggle('scene-active', b.dataset.ctype === t));
    }
  });
});

// ─── Main loop ────────────────────────────────────────────────
let _lastLoop = performance.now();

function loop() {
  const now   = performance.now();
  const dt    = Math.min(0.05, (now - _lastLoop) / 1000);
  _lastLoop   = now;

  // Auto-tune analyser
  if (audio.analyser) {
    const target = particles.length > 48 ? 512 : 2048;
    if (audio.analyser.fftSize !== target) audio.analyser.fftSize = target;
  }

  updateLFO(dt);
  updateChordVoicing();
  tickEmitters(dt);
  physics();
  resolveCollisionObjects();
  updateFM();
  draw();
  drawScope();
  seqUpdateVisuals();
  pruneCollVoices(collObjects);

  const ft = document.getElementById('frametime');
  if (ft) ft.textContent = (performance.now() - now).toFixed(1);

  requestAnimationFrame(loop);
}

initParticles(0);
seqRenderCells();
loop();
