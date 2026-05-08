// UI-only: reads/writes controls store. No AudioNode creation.
import { controls, particles, sceneObjects, canvas, audio } from '../state/store.js';
import { savePreset, loadPreset, listPresets, deletePreset } from '../state/presets.js';
import { initParticles, spawnParticle } from '../physics/particles.js';
import { syncAudioParams } from '../audio/engine.js';
import { startDrone, stopDrone } from '../audio/synthesis.js';
import { seqPlay, seqStop, seqSetStepCount, seqRandomise, seqClearAll, seqFillAll, seqShift, seqReverse } from '../audio/sequencer.js';

// ─── Helpers ──────────────────────────────────────────────────
function bindSlider(id, key, decimals = 2, onChange) {
  const el   = document.getElementById(id);
  const disp = document.getElementById(id + 'V');
  if (!el) return;
  el.value = controls[key];
  if (disp) disp.textContent = Number(controls[key]).toFixed(decimals);
  el.addEventListener('input', function () {
    controls[key] = parseFloat(this.value);
    if (disp) disp.textContent = Number(controls[key]).toFixed(decimals);
    onChange?.();
  });
}

function bindSelect(id, key, onChange) {
  const el = document.getElementById(id);
  if (!el) return;
  el.value = controls[key];
  el.addEventListener('change', function () {
    controls[key] = this.value;
    onChange?.();
  });
}

function bindCheck(id, key, onChange) {
  const el = document.getElementById(id);
  if (!el) return;
  el.checked = controls[key];
  el.addEventListener('change', function () {
    controls[key] = this.checked;
    onChange?.();
  });
}

// ─── Collapsible sections ─────────────────────────────────────
export function toggleSection(id) {
  const body = document.getElementById(id);
  if (!body) return;
  const header = body.previousElementSibling;
  body.classList.toggle('collapsed');
  header?.classList.toggle('collapsed');
}
window.toggleSection = toggleSection;

// ─── Scene objects ────────────────────────────────────────────
function updateObjList() {
  const list = document.getElementById('objList');
  if (!list) return;
  list.innerHTML = '';
  sceneObjects.forEach((obj, i) => {
    const btn = document.createElement('button');
    btn.className   = 'obj-item';
    btn.textContent = `${obj.type} #${i + 1}`;
    btn.onclick     = () => openSettings(obj);
    list.appendChild(btn);
  });
}

function updateObjCount() {
  const el = document.getElementById('objCount');
  if (el) el.textContent = sceneObjects.length;
}

function updateParticleCount() {
  const el = document.getElementById('particleCount');
  if (el) el.textContent = particles.length;
}
export { updateParticleCount };

// ─── Scene object settings panel ─────────────────────────────
let _settingsTarget = null;

function _sh(type, attrs, ...children) {
  const el = document.createElement(type);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  children.forEach(c => { if (c !== undefined) el.append(typeof c === 'string' ? c : c); });
  return el;
}

function buildSettingsHTML(obj) {
  const frag = document.createDocumentFragment();
  const common = [
    ['strength', 'Strength', 0, 1, 0.01],
    ['radius',   'Radius',   20, 300, 1],
  ];
  const extra = {
    emitter: [
      ['emRate',     'Rate/s',     0.1, 20,  0.1],
      ['emSpeed',    'Speed',      0,   8,   0.1],
      ['emSpread',   'Spread°',    0,   360, 1],
      ['emWarmthMin','Warmth min', 0,   1,   0.01],
      ['emWarmthMax','Warmth max', 0,   1,   0.01],
      ['emTensionMin','Tension min',0,  1,   0.01],
      ['emTensionMax','Tension max',0,  1,   0.01],
    ],
  };
  const rows = [...common, ...(extra[obj.type] ?? [])];
  for (const [prop, label, min, max, step] of rows) {
    const row  = _sh('div', { class: 'settings-row' });
    const lbl  = _sh('label', {}, label);
    const inp  = _sh('input', { type: 'range', min, max, step, value: obj[prop] ?? (min + max) / 2 });
    const disp = _sh('span', { class: 'val' }, String(obj[prop] ?? ''));
    inp.addEventListener('input', () => {
      obj[prop] = parseFloat(inp.value);
      disp.textContent = inp.value;
    });
    row.append(lbl, inp, disp);
    frag.append(row);
  }
  return frag;
}

function openSettings(obj) {
  _settingsTarget = obj;
  const panel = document.getElementById('settingsPanel');
  if (!panel) return;
  panel.innerHTML = '';
  const title = document.createElement('h4');
  title.textContent = obj.type.toUpperCase();
  panel.appendChild(title);
  panel.appendChild(buildSettingsHTML(obj));
  const del = document.createElement('button');
  del.textContent = 'Remove';
  del.onclick = () => {
    const idx = sceneObjects.indexOf(obj);
    if (idx !== -1) sceneObjects.splice(idx, 1);
    panel.innerHTML = '';
    updateObjList(); updateObjCount();
  };
  panel.appendChild(del);
  panel.classList.add('visible');
}

function closeSettings() {
  const panel = document.getElementById('settingsPanel');
  if (panel) panel.classList.remove('visible');
  _settingsTarget = null;
}

// ─── Scene toolbar buttons (add object) ───────────────────────
function bindSceneButtons() {
  document.querySelectorAll('[data-scene-type]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (sceneObjects.length >= controls.maxObjects) return;
      const type = btn.dataset.sceneType;
      const obj  = {
        type,
        x: canvas.width  * 0.5,
        y: canvas.height * 0.4,
        radius:     80,
        strength:   0.5,
        angle:      0,
        mode:       'continuous',
        emRate:     3,
        emSpeed:    2,
        emSpread:   45,
        emWarmthMin: 0.2,
        emWarmthMax: 0.8,
        emTensionMin: 0,
        emTensionMax: 0.3,
        emAccumulator: 0,
        emPulseTimer: 0,
      };
      sceneObjects.push(obj);
      updateObjList(); updateObjCount();
      openSettings(obj);
    });
  });
}

// ─── Presets panel ────────────────────────────────────────────
function refreshPresetList() {
  const sel = document.getElementById('presetSelect');
  if (!sel) return;
  sel.innerHTML = '<option value="">-- select preset --</option>';
  for (const name of listPresets()) {
    const opt = document.createElement('option');
    opt.value = opt.textContent = name;
    sel.appendChild(opt);
  }
}

function bindPresets() {
  refreshPresetList();

  document.getElementById('presetSaveBtn')?.addEventListener('click', () => {
    const name = document.getElementById('presetName')?.value?.trim();
    if (!name) return;
    try {
      savePreset(name);
      refreshPresetList();
    } catch (e) { alert(e.message); }
  });

  document.getElementById('presetLoadBtn')?.addEventListener('click', () => {
    const name = document.getElementById('presetSelect')?.value;
    if (!name) return;
    try {
      loadPreset(name);
      // Sync all DOM inputs to updated controls
      syncControlsToDOM();
    } catch (e) { alert(e.message); }
  });

  document.getElementById('presetDeleteBtn')?.addEventListener('click', () => {
    const name = document.getElementById('presetSelect')?.value;
    if (!name) return;
    deletePreset(name);
    refreshPresetList();
  });
}

// Re-apply controls → DOM after preset load
function syncControlsToDOM() {
  const ids = [
    ['gravity',       'gravity',       2],
    ['wind',          'wind',          2],
    ['viscosity',     'viscosity',     2],
    ['bounce',        'bounce',        2],
    ['tension',       'tension',       2],
    ['reverbMix',     'reverbMix',     2],
    ['masterVol',     'masterVol',     2],
    ['fmDepth',       'fmDepth',       2],
    ['filterCutoff',  'filterCutoff',  0],
    ['filterRes',     'filterRes',     1],
    ['lfoRate',       'lfoRate',       2],
    ['lfoDepth',      'lfoDepth',      2],
  ];
  for (const [id, key, dec] of ids) {
    const el   = document.getElementById(id);
    const disp = document.getElementById(id + 'V');
    if (el) el.value = controls[key];
    if (disp) disp.textContent = Number(controls[key]).toFixed(dec);
  }
  syncAudioParams();
}

// ─── Keyboard note constants ───────────────────────────────────
const LOWER_KEYS = 'asdfghjkl;'.split('');
const UPPER_KEYS = 'qwertyuiop'.split('');

function updateKeyboardDisplay(key, active) {
  const allKeys = [...LOWER_KEYS, ...UPPER_KEYS];
  const idx     = allKeys.indexOf(key);
  if (idx === -1) return;
  document.querySelectorAll('.key-note').forEach((el, i) => {
    if (i === idx) el.classList.toggle('active', active);
  });
}

// ─── Main bind ────────────────────────────────────────────────
export function bindPanel(onKeyNote) {
  // Physics
  bindSlider('gravity',    'gravity',    2, syncAudioParams);
  bindSlider('wind',       'wind',       2);
  bindSlider('viscosity',  'viscosity',  2);
  bindSlider('bounce',     'bounce',     2);
  bindSlider('tension',    'tension',    2);

  // Audio
  bindSlider('reverbMix',  'reverbMix',  2, syncAudioParams);
  bindSlider('masterVol',  'masterVol',  2, syncAudioParams);
  bindSlider('fmDepth',    'fmDepth',    2);
  bindSlider('filterCutoff', 'filterCutoff', 0);
  bindSlider('filterRes',  'filterRes',  1);

  // Synthesis mode
  bindSelect('synthMode',  'synthMode');

  // Scale
  bindSelect('scale', 'scale');

  // Chord
  bindCheck('chordOn', 'chordOn');

  // Drone
  bindCheck('droneOn', 'droneOn', () => {
    controls.droneOn ? startDrone() : stopDrone();
  });

  // LFO
  bindSlider('lfoRate',    'lfoRate',    2);
  bindSlider('lfoDepth',   'lfoDepth',   2);
  bindSelect('lfoTarget',  'lfoTarget');
  bindCheck('lfoSync',     'lfoSync');

  // Limits
  bindSlider('maxParticles', 'maxParticles', 0);
  bindSlider('maxObjects',   'maxObjects',   0);

  // Warmth drift
  bindSlider('warmthDriftAmt', 'warmthDriftAmt', 2);

  // Disturbance
  bindSlider('disturbance', 'disturbance', 2);

  // NLT mode
  bindSelect('nltMode', 'nltMode');

  // Op count
  const opCountEl = document.getElementById('opCount');
  if (opCountEl) {
    opCountEl.value = controls.opCount;
    opCountEl.addEventListener('change', () => { controls.opCount = parseInt(opCountEl.value); });
  }

  // Add / Reset particles
  document.getElementById('addBtn')?.addEventListener('click', () => {
    if (audio.started) spawnParticle();
    updateParticleCount();
  });
  document.getElementById('resetBtn')?.addEventListener('click', () => {
    initParticles(0);
    updateParticleCount();
  });

  // Start audio
  document.getElementById('startBtn')?.addEventListener('click', async () => {
    const { initAudio } = await import('../audio/engine.js');
    if (!audio.started) initAudio();
    if (audio.AC?.state === 'suspended') await audio.AC.resume();
  });

  // Panic (kill all audio)
  document.getElementById('panicBtn')?.addEventListener('click', () => {
    for (const p of particles) p.destroy();
    particles.length = 0;
    updateParticleCount();
  });

  // Sequencer transport
  document.getElementById('seqPlayBtn')?.addEventListener('click',  () => seqPlay());
  document.getElementById('seqStopBtn')?.addEventListener('click',  () => seqStop());
  document.getElementById('seqRandBtn')?.addEventListener('click',  () => seqRandomise());
  document.getElementById('seqClearBtn')?.addEventListener('click', () => seqClearAll());
  document.getElementById('seqFillBtn')?.addEventListener('click',  () => seqFillAll());
  document.getElementById('seqShiftLBtn')?.addEventListener('click',() => seqShift(-1));
  document.getElementById('seqShiftRBtn')?.addEventListener('click',() => seqShift(1));
  document.getElementById('seqRevBtn')?.addEventListener('click',   () => seqReverse());

  document.getElementById('seqStepCount')?.addEventListener('change', function () {
    seqSetStepCount(parseInt(this.value));
  });

  bindSlider('swing', 'swing', 0, () => { controls.swing = parseInt(document.getElementById('swing').value); });
  bindSlider('bpm',   'bpm',   0, () => { controls.bpm   = parseInt(document.getElementById('bpm').value);   });

  // Scene buttons
  bindSceneButtons();

  // Presets
  bindPresets();

  // Panel blur (unfocus on slider release)
  for (const id of ['panel-left', 'panel-right']) {
    document.getElementById(id)?.addEventListener('mouseup', () => document.activeElement?.blur());
  }

  // Keyboard notes
  const keyNoteStart = (key, isDown) => {
    const allKeys = [...LOWER_KEYS, ...UPPER_KEYS];
    const idx = allKeys.indexOf(key);
    if (idx === -1) return;
    if (onKeyNote) onKeyNote(idx, isDown);
    updateKeyboardDisplay(key, isDown);
  };

  document.addEventListener('keydown', e => {
    if (e.repeat || e.target.tagName === 'INPUT') return;
    keyNoteStart(e.key.toLowerCase(), true);
  });
  document.addEventListener('keyup', e => {
    keyNoteStart(e.key.toLowerCase(), false);
  });
}
