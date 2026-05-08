// UI-only: collision object settings panel wiring. No AudioNodes.
import { collObjects } from '../state/store.js';
import { setCollSelectedObj } from '../state/store.js';

let _wired = false;
let _target = null;

export function openCollPanel(obj) {
  _target = obj;
  setCollSelectedObj(obj);
  const el = document.getElementById('collisionPanel');
  if (!el) return;
  el.classList.add('visible');
  const s = obj.sound;
  _set('collName',       'value',       obj.name);
  _set('collSoundType',  'value',       s.type);
  _set('collVol',        'value',       s.volume);
  _set('collVolV',       'textContent', s.volume.toFixed(2));
  _set('collPan',        'value',       s.pan);
  _set('collPanV',       'textContent', s.pan.toFixed(2));
  _set('collVel',        'value',       s.velSens);
  _set('collVelV',       'textContent', s.velSens.toFixed(2));
  _set('collCool',       'value',       s.cooldown);
  _set('collCoolV',      'textContent', s.cooldown);
  _set('collBnc',        'value',       obj.bounciness);
  _set('collBncV',       'textContent', obj.bounciness.toFixed(2));
  _set('collWave',       'value',       s.waveform);
  _set('collAtk',        'value',       s.attack);
  _set('collAtkV',       'textContent', s.attack);
  _set('collDec',        'value',       s.decay);
  _set('collDecV',       'textContent', s.decay);
  _set('collPercType',   'value',       s.percType);
  _set('collPercFreq',   'value',       s.percFreq);
  _set('collPercFV',     'textContent', s.percFreq);
  _set('collPercDec',    'value',       s.percDecay);
  _set('collPercDV',     'textContent', s.percDecay.toFixed(2));
  _set('collGranMat',    'value',       s.granMat);
  _set('collGranSz',     'value',       s.granSize);
  _set('collGranSzV',    'textContent', s.granSize);
  _set('collGranDn',     'value',       s.granDensity);
  _set('collGranDnV',    'textContent', s.granDensity);
  _set('collFmCr',       'value',       s.fmCarrier);
  _set('collFmCrV',      'textContent', s.fmCarrier);
  _set('collFmRa',       'value',       s.fmRatio);
  _set('collFmRaV',      'textContent', s.fmRatio.toFixed(1));
  _set('collFmId',       'value',       s.fmIndex);
  _set('collFmIdV',      'textContent', s.fmIndex);
  _set('collFmDu',       'value',       s.fmDuration);
  _set('collFmDuV',      'textContent', s.fmDuration);
  _set('collChordQ',     'value',       s.chordQIdx);
  _set('collChordDu',    'value',       s.chordDuration);
  _set('collChordDuV',   'textContent', s.chordDuration.toFixed(1));
  _set('collResDec',     'value',       s.resDec);
  _set('collResDV',      'textContent', s.resDec.toFixed(2));
  switchCollSoundPanel(s.type);
  if (!_wired) wireCollPanelListeners();
}

export function closeCollPanel() {
  _target = null;
  setCollSelectedObj(null);
  const el = document.getElementById('collisionPanel');
  if (el) el.classList.remove('visible');
}

function _set(id, prop, value) {
  const el = document.getElementById(id);
  if (el) el[prop] = value;
}

function switchCollSoundPanel(type) {
  for (const n of ['Res', 'Pitched', 'Perc', 'Gran', 'Fm', 'Chord']) {
    const el = document.getElementById('cPan' + n);
    if (el) el.style.display = 'none';
  }
  const map = { res: 'cPanRes', pitched: 'cPanPitched', perc: 'cPanPerc', gran: 'cPanGran', fm: 'cPanFm', chord: 'cPanChord' };
  const el  = document.getElementById(map[type]);
  if (el) el.style.display = '';
}

function wireCollPanelListeners() {
  _wired = true;

  function sliderSync(id, prop, dispId, decimals, target) {
    document.getElementById(id)?.addEventListener('input', function () {
      if (!_target) return;
      const v = parseFloat(this.value);
      if (target === 'obj') _target[prop] = v;
      else _target.sound[prop] = v;
      const d = document.getElementById(dispId);
      if (d) d.textContent = decimals > 0 ? v.toFixed(decimals) : v;
    });
  }

  function selectSync(id, prop, target) {
    document.getElementById(id)?.addEventListener('change', function () {
      if (!_target) return;
      const v = this.value;
      if (target === 'obj') _target[prop] = v;
      else _target.sound[prop] = target === 'int' ? parseInt(v) : v;
    });
  }

  document.getElementById('collName')?.addEventListener('input', function () {
    if (_target) _target.name = this.value || _target.type.toUpperCase();
  });

  selectSync('collSoundType', 'type', 'sound');
  document.getElementById('collSoundType')?.addEventListener('change', function () {
    if (_target) switchCollSoundPanel(this.value);
  });

  sliderSync('collVol',      'volume',       'collVolV',   2, 'sound');
  sliderSync('collPan',      'pan',          'collPanV',   2, 'sound');
  sliderSync('collVel',      'velSens',      'collVelV',   2, 'sound');
  sliderSync('collCool',     'cooldown',     'collCoolV',  0, 'sound');
  sliderSync('collBnc',      'bounciness',   'collBncV',   2, 'obj');
  selectSync('collWave',     'waveform',                      'sound');
  sliderSync('collAtk',      'attack',       'collAtkV',   0, 'sound');
  sliderSync('collDec',      'decay',        'collDecV',   0, 'sound');
  selectSync('collPercType', 'percType',                      'sound');
  sliderSync('collPercFreq', 'percFreq',     'collPercFV', 0, 'sound');
  sliderSync('collPercDec',  'percDecay',    'collPercDV', 2, 'sound');
  selectSync('collGranMat',  'granMat',                       'sound');
  sliderSync('collGranSz',   'granSize',     'collGranSzV',0, 'sound');
  sliderSync('collGranDn',   'granDensity',  'collGranDnV',0, 'sound');
  sliderSync('collFmCr',     'fmCarrier',    'collFmCrV',  0, 'sound');
  sliderSync('collFmRa',     'fmRatio',      'collFmRaV',  1, 'sound');
  sliderSync('collFmId',     'fmIndex',      'collFmIdV',  0, 'sound');
  sliderSync('collFmDu',     'fmDuration',   'collFmDuV',  0, 'sound');
  document.getElementById('collChordQ')?.addEventListener('change', function () {
    if (_target) _target.sound.chordQIdx = parseInt(this.value);
  });
  sliderSync('collChordDu',  'chordDuration','collChordDuV',1,'sound');
  sliderSync('collResDec',   'resDec',       'collResDV',  2, 'sound');

  document.getElementById('collDelBtn')?.addEventListener('click', () => {
    if (!_target) return;
    const idx = collObjects.indexOf(_target);
    if (idx !== -1) collObjects.splice(idx, 1);
    closeCollPanel();
  });
}
