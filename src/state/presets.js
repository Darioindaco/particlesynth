import { controls, seq, collObjects, sceneObjects } from './store.js';

const NS = 'particlesynth_preset_';

function serializeState() {
  return {
    controls: { ...controls },
    seq: {
      bpm:       seq.bpm,
      swing:     seq.swing,
      stepCount: seq.stepCount,
      steps:     seq.steps.map(s => ({ ...s })),
    },
    collObjects: collObjects.map(o => ({
      ...o,
      sound: { ...o.sound },
      ...(o.verts ? { verts: o.verts.map(v => ({ ...v })) } : {}),
    })),
    sceneObjects: sceneObjects.map(o => ({ ...o })),
  };
}

function applyState(data) {
  if (data.controls) Object.assign(controls, data.controls);

  if (data.seq) {
    seq.bpm       = data.seq.bpm       ?? seq.bpm;
    seq.swing     = data.seq.swing     ?? seq.swing;
    seq.stepCount = data.seq.stepCount ?? seq.stepCount;
    if (Array.isArray(data.seq.steps)) {
      seq.steps.length = 0;
      data.seq.steps.forEach(s => seq.steps.push({ ...s }));
    }
  }

  if (Array.isArray(data.collObjects)) {
    collObjects.length = 0;
    data.collObjects.forEach(o => {
      collObjects.push({
        ...o,
        sound: { ...o.sound },
        ...(o.verts ? { verts: o.verts.map(v => ({ ...v })) } : {}),
        lastTriggerMs: 0, flashUntil: 0, hitLevel: 0,
      });
    });
  }

  if (Array.isArray(data.sceneObjects)) {
    sceneObjects.length = 0;
    data.sceneObjects.forEach(o => sceneObjects.push({ ...o }));
  }
}

export function savePreset(name) {
  if (!name || !name.trim()) throw new Error('Preset name cannot be empty');
  const key = NS + name.trim();
  localStorage.setItem(key, JSON.stringify(serializeState()));
}

export function loadPreset(name) {
  const key = NS + name.trim();
  const raw = localStorage.getItem(key);
  if (!raw) throw new Error(`Preset "${name}" not found`);
  applyState(JSON.parse(raw));
}

export function listPresets() {
  const names = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(NS)) names.push(k.slice(NS.length));
  }
  return names.sort();
}

export function deletePreset(name) {
  localStorage.removeItem(NS + name.trim());
}
