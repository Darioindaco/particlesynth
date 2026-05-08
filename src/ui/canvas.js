// UI-only: pure rendering. No AudioNode creation or physics mutation.
import {
  particles, sceneObjects, collObjects, collSparks, collPlacement,
  collSelectedObj, canvas, audio, controls, mouse, collDrag, setCollSelectedObj,
} from '../state/store.js';
import { warmthToColor } from '../audio/synthesis.js';
import {
  collObjCenter, triVerts,
  setCollPlacementType, finalizeCollPlacement, makeCollisionObject,
  hitTestCollObj, moveCollObj,
} from '../physics/collisionObjects.js';
import { spawnParticle } from '../physics/particles.js';
import { openCollPanel } from './collisionPanel.js';

const PROX_DIST = 140;

// ─── Main particle draw ───────────────────────────────────────
export function draw() {
  const { el: cv, ctx, width: W, height: H } = canvas;
  if (!ctx) return;

  ctx.fillStyle = 'rgba(8,8,20,0.22)';
  ctx.fillRect(0, 0, W, H);

  drawSceneObjects(ctx);
  drawCollisionObjects(ctx);

  // FM proximity lines
  if (controls.synthMode === 'fm' || controls.synthMode === 'fm4') {
    drawOpChains(ctx);
  }

  for (const p of particles) {
    const col = warmthToColor(p.warmth);
    const r   = p.r + p.tension * 4;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
    grad.addColorStop(0, col);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fill();
  }

  // Particle count HUD
  const ft = document.getElementById('particleCount');
  if (ft) ft.textContent = particles.length;
}

// ─── FM op-chain proximity lines ──────────────────────────────
function drawOpChains(ctx) {
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const a = particles[i], b = particles[j];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d > PROX_DIST) continue;
      const alpha = (1 - d / PROX_DIST) * 0.35;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = `rgba(80,160,255,${alpha})`;
      ctx.lineWidth   = 0.8;
      ctx.stroke();
    }
  }
}

// ─── Scene objects ────────────────────────────────────────────
export function drawSceneObjects(ctx) {
  for (const obj of sceneObjects) {
    const col = obj.type === 'attractor' ? '100,220,100'
              : obj.type === 'repeller'  ? '220,80,80'
              : obj.type === 'vortex'    ? '180,100,255'
              : obj.type === 'emitter'   ? '255,180,50'
              : '100,180,255';
    ctx.beginPath();
    ctx.arc(obj.x, obj.y, obj.radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${col},0.4)`;
    ctx.lineWidth   = 1.5;
    ctx.stroke();
    ctx.fillStyle   = `rgba(${col},0.06)`;
    ctx.fill();

    ctx.fillStyle   = `rgba(${col},0.8)`;
    ctx.font        = '10px Courier New';
    ctx.textAlign   = 'center';
    ctx.fillText(obj.type.toUpperCase(), obj.x, obj.y + 4);

    // Emitter direction arrow
    if (obj.type === 'emitter') {
      const angle = (obj.emAngle ?? -Math.PI / 2);
      const ax    = obj.x + Math.cos(angle) * obj.radius * 0.7;
      const ay    = obj.y + Math.sin(angle) * obj.radius * 0.7;
      ctx.beginPath();
      ctx.moveTo(obj.x, obj.y);
      ctx.lineTo(ax, ay);
      ctx.strokeStyle = `rgba(${col},0.7)`;
      ctx.lineWidth   = 2;
      ctx.stroke();
    }
  }
}

// ─── Collision objects ────────────────────────────────────────
export function drawCollisionObjects(ctx) {
  const now = performance.now();

  // Sparks
  for (let i = collSparks.length - 1; i >= 0; i--) {
    const sp = collSparks[i];
    sp.x += sp.vx; sp.y += sp.vy; sp.vy += 0.04;
    sp.life = Math.max(0, sp.life - sp.decay);
    if (sp.life <= 0) { collSparks.splice(i, 1); continue; }
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, sp.r * sp.life, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,${140 + Math.round(100 * sp.life)},40,${sp.life * 0.9})`;
    ctx.fill();
  }

  ctx.save();
  ctx.font = '8px Courier New';
  ctx.textAlign = 'center';

  for (const obj of collObjects) {
    const flash  = now < obj.flashUntil;
    const flashF = flash ? Math.min(1, (obj.flashUntil - now) / 140) : 0;
    const sel    = obj === collSelectedObj;
    const baseCol = sel ? [120, 210, 255] : [70, 140, 220];
    const r = baseCol[0] + Math.round(flashF * 135);
    const g = baseCol[1] + Math.round(flashF * 50);
    const b = baseCol[2] - Math.round(flashF * 160);
    const col = `rgba(${r},${g},${b},${0.8 + flashF * 0.2})`;
    ctx.strokeStyle = col;
    ctx.lineWidth   = sel ? 2 : 1.5;
    ctx.fillStyle   = `rgba(30,70,150,${0.05 + flashF * 0.18})`;

    if (obj.type === 'wall') {
      ctx.beginPath(); ctx.moveTo(obj.x1, obj.y1); ctx.lineTo(obj.x2, obj.y2); ctx.stroke();
      for (const pt of [{ x: obj.x1, y: obj.y1 }, { x: obj.x2, y: obj.y2 }]) {
        ctx.beginPath(); ctx.arc(pt.x, pt.y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = col; ctx.fill();
      }
    } else if (obj.type === 'box') {
      ctx.beginPath(); ctx.rect(obj.bx, obj.by, obj.bw, obj.bh);
      ctx.fill(); ctx.stroke();
    } else if (obj.type === 'circle') {
      ctx.beginPath(); ctx.arc(obj.cx, obj.cy, obj.radius, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    } else if (obj.type === 'tri') {
      const verts = triVerts(obj);
      ctx.beginPath(); ctx.moveTo(verts[0].x, verts[0].y);
      ctx.lineTo(verts[1].x, verts[1].y); ctx.lineTo(verts[2].x, verts[2].y);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if (obj.type === 'poly' && obj.verts.length >= 2) {
      ctx.beginPath(); ctx.moveTo(obj.verts[0].x, obj.verts[0].y);
      for (let i = 1; i < obj.verts.length; i++) ctx.lineTo(obj.verts[i].x, obj.verts[i].y);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }

    const cen = collObjCenter(obj);
    ctx.fillStyle = `rgba(140,200,255,${0.45 + flashF * 0.55})`;
    ctx.fillText(obj.name, cen.x, cen.y - (obj.type === 'wall' ? 8 : 4));

    if (obj.hitLevel > 0.01 && obj.type !== 'wall') {
      const mw = 26, mh = 3, mx = cen.x - mw / 2, my = cen.y + 8;
      ctx.fillStyle = 'rgba(10,20,50,0.75)';
      ctx.fillRect(mx, my, mw, mh);
      ctx.fillStyle = flash ? 'rgba(255,140,40,0.9)' : 'rgba(70,170,255,0.85)';
      ctx.fillRect(mx, my, mw * obj.hitLevel, mh);
    }

    if (sel) {
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.arc(cen.x, cen.y, 20, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(120,210,255,0.35)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // Placement preview
  if (collPlacement.type && mouse.x !== null) {
    ctx.strokeStyle = 'rgba(80,200,255,0.55)';
    ctx.lineWidth   = 1.5;
    ctx.setLineDash([5, 5]);

    if (collPlacement.p1) {
      const p1 = collPlacement.p1;
      if (collPlacement.type === 'wall') {
        ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
      } else if (collPlacement.type === 'box') {
        const x = Math.min(p1.x, mouse.x), y = Math.min(p1.y, mouse.y);
        ctx.beginPath(); ctx.rect(x, y, Math.abs(mouse.x - p1.x), Math.abs(mouse.y - p1.y)); ctx.stroke();
      } else if (collPlacement.type === 'circle') {
        const rad = Math.max(8, Math.hypot(mouse.x - p1.x, mouse.y - p1.y));
        ctx.beginPath(); ctx.arc(p1.x, p1.y, rad, 0, Math.PI * 2); ctx.stroke();
      }
    } else if (collPlacement.type === 'tri') {
      const tmp = { type: 'tri', cx: mouse.x, cy: mouse.y, size: 36, angle: -Math.PI / 2 };
      const v   = triVerts(tmp);
      ctx.beginPath(); ctx.moveTo(v[0].x, v[0].y); ctx.lineTo(v[1].x, v[1].y); ctx.lineTo(v[2].x, v[2].y); ctx.closePath(); ctx.stroke();
    }

    if (collPlacement.type === 'poly' && collPlacement.polyVerts.length > 0) {
      ctx.beginPath(); ctx.moveTo(collPlacement.polyVerts[0].x, collPlacement.polyVerts[0].y);
      for (let i = 1; i < collPlacement.polyVerts.length; i++) ctx.lineTo(collPlacement.polyVerts[i].x, collPlacement.polyVerts[i].y);
      ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
      ctx.setLineDash([]);
      for (const vv of collPlacement.polyVerts) {
        ctx.beginPath(); ctx.arc(vv.x, vv.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(80,200,255,0.8)'; ctx.fill();
      }
    }
    ctx.setLineDash([]);
  }

  ctx.restore();
}

// ─── Oscilloscope ─────────────────────────────────────────────
export function drawScope() {
  const scopeEl = document.getElementById('scope');
  if (!scopeEl) return;
  const sctx = scopeEl.getContext('2d');
  const W    = scopeEl.width, H = scopeEl.height;
  sctx.clearRect(0, 0, W, H);
  const { analyser } = audio;
  if (!analyser) return;

  const buf = new Uint8Array(analyser.fftSize);
  analyser.getByteTimeDomainData(buf);

  sctx.beginPath();
  sctx.strokeStyle = 'rgba(80,200,255,0.7)';
  sctx.lineWidth   = 1.5;
  for (let i = 0; i < buf.length; i++) {
    const x = (i / buf.length) * W;
    const y = ((buf[i] / 128) - 1) * (H / 2) + H / 2;
    i === 0 ? sctx.moveTo(x, y) : sctx.lineTo(x, y);
  }
  sctx.stroke();
}

// ─── Canvas mouse / touch interaction ────────────────────────
export function bindCanvasEvents() {
  const cv = canvas.el;

  cv.addEventListener('mousemove', e => {
    const rect = cv.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;

    if (collDrag.obj) {
      const dx = mouse.x - collDrag.startX, dy = mouse.y - collDrag.startY;
      moveCollObj(collDrag.obj, dx - (collDrag.lastDx ?? 0), dy - (collDrag.lastDy ?? 0));
      collDrag.lastDx = dx; collDrag.lastDy = dy;
    }

    if (mouse.down && mouse.dragParticle) {
      mouse.dragParticle.x  = mouse.x;
      mouse.dragParticle.y  = mouse.y;
      mouse.dragParticle.vx = 0;
      mouse.dragParticle.vy = 0;
    }
  });

  cv.addEventListener('mousedown', e => {
    const rect = cv.getBoundingClientRect();
    mouse.x    = e.clientX - rect.left;
    mouse.y    = e.clientY - rect.top;
    mouse.down = true;

    if (collPlacement.type) {
      handleCollPlacementClick(mouse.x, mouse.y);
      return;
    }

    // Try drag existing collision object
    const ci = hitTestCollObj(mouse.x, mouse.y);
    if (ci !== -1) {
      if (e.detail === 2) {
        // Double-click → open panel
        setCollSelectedObj(collObjects[ci]);
        openCollPanel(collObjects[ci]);
      } else {
        collDrag.obj    = collObjects[ci];
        collDrag.startX = mouse.x;
        collDrag.startY = mouse.y;
        collDrag.lastDx = 0;
        collDrag.lastDy = 0;
        setCollSelectedObj(collObjects[ci]);
      }
      return;
    }

    // Spawn particle
    if (audio.started) spawnParticle(mouse.x, mouse.y);
  });

  cv.addEventListener('mouseup', () => {
    mouse.down         = false;
    mouse.dragParticle = null;
    collDrag.obj       = null;
    collDrag.lastDx    = 0;
    collDrag.lastDy    = 0;
  });

  cv.addEventListener('mouseleave', () => {
    mouse.x = null; mouse.y = null;
  });

  cv.addEventListener('touchstart', e => {
    e.preventDefault();
    const t = e.touches[0];
    const rect = cv.getBoundingClientRect();
    mouse.x = t.clientX - rect.left;
    mouse.y = t.clientY - rect.top;
    if (audio.started) spawnParticle(mouse.x, mouse.y);
  }, { passive: false });

  cv.addEventListener('touchmove', e => {
    e.preventDefault();
    const t    = e.touches[0];
    const rect = cv.getBoundingClientRect();
    mouse.x    = t.clientX - rect.left;
    mouse.y    = t.clientY - rect.top;
  }, { passive: false });
}

function handleCollPlacementClick(mx, my) {
  const type = collPlacement.type;

  if (type === 'tri') {
    finalizeCollPlacement(makeCollisionObject('tri', { cx: mx, cy: my, size: 36, angle: -Math.PI / 2 }));
    return;
  }
  if (type === 'poly') {
    if (collPlacement.polyVerts.length >= 3 && Math.hypot(mx - collPlacement.polyVerts[0].x, my - collPlacement.polyVerts[0].y) < 20) {
      finalizeCollPlacement(makeCollisionObject('poly', { verts: [...collPlacement.polyVerts] }));
    } else {
      collPlacement.polyVerts.push({ x: mx, y: my });
    }
    return;
  }

  if (!collPlacement.p1) {
    collPlacement.p1 = { x: mx, y: my };
    return;
  }

  const p1 = collPlacement.p1;
  if (type === 'wall') {
    finalizeCollPlacement(makeCollisionObject('wall', { x1: p1.x, y1: p1.y, x2: mx, y2: my }));
  } else if (type === 'box') {
    finalizeCollPlacement(makeCollisionObject('box', {
      bx: Math.min(p1.x, mx), by: Math.min(p1.y, my),
      bw: Math.abs(mx - p1.x), bh: Math.abs(my - p1.y),
    }));
  } else if (type === 'circle') {
    finalizeCollPlacement(makeCollisionObject('circle', {
      cx: p1.x, cy: p1.y, radius: Math.max(8, Math.hypot(mx - p1.x, my - p1.y)),
    }));
  }
}
