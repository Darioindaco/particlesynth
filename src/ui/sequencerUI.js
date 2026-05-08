// UI-only: sequencer cell rendering and interaction. No AudioNodes.
import { seq, controls } from '../state/store.js';
import { stepNoteLabel, seqIsChordTone } from '../audio/sequencer.js';

export let seqCellEls = [];

export function seqRenderCells() {
  const strip = document.getElementById('seqStrip');
  if (!strip) return;
  strip.innerHTML = '';
  seqCellEls = [];

  for (let i = 0; i < seq.stepCount; i++) {
    const step = seq.steps[i];
    const cell = document.createElement('div');
    cell.className = 'seq-cell';

    const noteEl = document.createElement('span');
    noteEl.className   = 'seq-note';
    noteEl.textContent = stepNoteLabel(step.noteIdx);

    const velWrap = document.createElement('div');
    velWrap.className  = 'seq-vel-wrap';
    const velBar = document.createElement('div');
    velBar.className   = 'seq-vel-bar';
    velBar.style.height = Math.round(step.velocity * 100) + '%';
    velWrap.appendChild(velBar);

    cell.appendChild(noteEl);
    cell.appendChild(velWrap);
    strip.appendChild(cell);
    seqCellEls.push(cell);
  }

  seqBindCells();
}

export function seqBindCells() {
  seqCellEls.forEach((cell, i) => {
    if (i >= seq.stepCount) return;

    cell.addEventListener('click', e => {
      if (e.target.classList.contains('seq-note')) return;
      seq.steps[i].active = !seq.steps[i].active;
    });

    cell.addEventListener('dblclick', () => {
      seq.steps[i].active = !seq.steps[i].active;
    });

    cell.querySelector('.seq-note')?.addEventListener('click', e => {
      e.stopPropagation();
      seq.pickingStep = seq.pickingStep === i ? -1 : i;
    });

    const velWrap = cell.querySelector('.seq-vel-wrap');
    if (!velWrap) return;

    velWrap.addEventListener('pointerdown', e => {
      e.preventDefault(); e.stopPropagation();
      seq.velDragStep     = i;
      seq.velDragStartY   = e.clientY;
      seq.velDragStartVel = seq.steps[i].velocity;
      velWrap.setPointerCapture(e.pointerId);
    });

    velWrap.addEventListener('pointermove', e => {
      if (seq.velDragStep !== i) return;
      const dy = seq.velDragStartY - e.clientY;
      seq.steps[i].velocity = Math.max(0, Math.min(1, seq.velDragStartVel + dy / 60));
      velWrap.querySelector('.seq-vel-bar').style.height = Math.round(seq.steps[i].velocity * 100) + '%';
    });

    velWrap.addEventListener('pointerup', () => {
      if (seq.velDragStep === i) seq.velDragStep = -1;
    });
  });
}

export function seqUpdateVisuals() {
  const now      = performance.now();
  const chordOn  = controls.chordOn;
  const swingVal = controls.swing;

  seqCellEls.forEach((cell, i) => {
    if (i >= seq.stepCount) return;
    const step = seq.steps[i];
    cell.classList.toggle('seq-current',   seq.playing && i === seq.currentStep);
    cell.classList.toggle('seq-flash',     seq.flashStep === i && now - seq.flashTime < 80);
    cell.classList.toggle('seq-on',        step.active);
    cell.classList.toggle('seq-picking',   i === seq.pickingStep);
    cell.classList.toggle('seq-chord-dot', chordOn && seqIsChordTone(step.noteIdx));

    if (swingVal > 50 && i % 2 === 1) {
      cell.style.transform = `translateX(${(swingVal - 50) / 50 * 7}px)`;
    } else {
      cell.style.transform = '';
    }

    const noteEl = cell.querySelector('.seq-note');
    if (noteEl) noteEl.textContent = stepNoteLabel(step.noteIdx);
  });
}

// ─── Note-pick mode: keyboard → step note assignment ─────────
export function handleSeqNotePick(noteIdx) {
  if (seq.pickingStep === -1) return false;
  seq.steps[seq.pickingStep].noteIdx = noteIdx;
  seq.pickingStep = -1;
  return true;
}
