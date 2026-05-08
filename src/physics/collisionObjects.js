import {
  collObjects, collSparks, collPlacement, collDrag,
  collSelectedObj, setCollSelectedObj, canvas, particles,
} from '../state/store.js';
import { triggerCollisionSound } from '../audio/collisionSounds.js';

// ─── Factory ──────────────────────────────────────────────────
export function makeCollisionObject(type, extra) {
  return Object.assign({
    id: Math.random(), type,
    name: type.toUpperCase(),
    bounciness: 0.8,
    lastTriggerMs: 0, flashUntil: 0, hitLevel: 0,
    sound: {
      type: 'res', volume: 0.7, pan: 0, velSens: 0.7,
      retrigger: 'free', cooldown: 50,
      waveform: 'sine', noteIdx: 0, attack: 5, decay: 300, release: 100,
      percType: 'kick', percFreq: 80, percDecay: 0.3,
      granMat: 'metal', granSize: 80, granDensity: 2,
      fmCarrier: 220, fmRatio: 2, fmIndex: 4, fmDuration: 200,
      chordQIdx: 0, chordDuration: 0.5,
      resDec: 1.0,
    },
  }, extra);
}

// ─── Geometry helpers ─────────────────────────────────────────
export function ptSegClosest(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 < 0.0001) return { x: ax, y: ay };
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return { x: ax + t * dx, y: ay + t * dy };
}

export function triVerts(obj) {
  return [0, 2 * Math.PI / 3, 4 * Math.PI / 3].map(da => ({
    x: obj.cx + Math.cos(obj.angle + da) * obj.size,
    y: obj.cy + Math.sin(obj.angle + da) * obj.size,
  }));
}

export function collObjEdges(obj) {
  if (obj.type === 'wall') return [{ ax: obj.x1, ay: obj.y1, bx: obj.x2, by: obj.y2 }];
  if (obj.type === 'box') {
    const { bx: x, by: y, bw: w, bh: h } = obj;
    return [
      { ax: x,   ay: y,   bx: x+w, by: y   },
      { ax: x+w, ay: y,   bx: x+w, by: y+h },
      { ax: x+w, ay: y+h, bx: x,   by: y+h },
      { ax: x,   ay: y+h, bx: x,   by: y   },
    ];
  }
  if (obj.type === 'tri') {
    const v = triVerts(obj);
    return [
      { ax: v[0].x, ay: v[0].y, bx: v[1].x, by: v[1].y },
      { ax: v[1].x, ay: v[1].y, bx: v[2].x, by: v[2].y },
      { ax: v[2].x, ay: v[2].y, bx: v[0].x, by: v[0].y },
    ];
  }
  if (obj.type === 'poly') {
    return obj.verts.map((v, i) => {
      const n = obj.verts[(i + 1) % obj.verts.length];
      return { ax: v.x, ay: v.y, bx: n.x, by: n.y };
    });
  }
  return [];
}

export function collObjCenter(obj) {
  if (obj.type === 'wall')   return { x: (obj.x1 + obj.x2) / 2, y: (obj.y1 + obj.y2) / 2 };
  if (obj.type === 'box')    return { x: obj.bx + obj.bw / 2, y: obj.by + obj.bh / 2 };
  if (obj.type === 'circle') return { x: obj.cx, y: obj.cy };
  if (obj.type === 'tri')    return { x: obj.cx, y: obj.cy };
  if (obj.type === 'poly') {
    let sx = 0, sy = 0;
    for (const v of obj.verts) { sx += v.x; sy += v.y; }
    return { x: sx / obj.verts.length, y: sy / obj.verts.length };
  }
  return { x: 0, y: 0 };
}

export function moveCollObj(obj, dx, dy) {
  if (obj.type === 'wall')   { obj.x1 += dx; obj.y1 += dy; obj.x2 += dx; obj.y2 += dy; }
  if (obj.type === 'box')    { obj.bx += dx; obj.by += dy; }
  if (obj.type === 'circle') { obj.cx += dx; obj.cy += dy; }
  if (obj.type === 'tri')    { obj.cx += dx; obj.cy += dy; }
  if (obj.type === 'poly')   { for (const v of obj.verts) { v.x += dx; v.y += dy; } }
}

function pointInConvex(px, py, verts) {
  for (let i = 0; i < verts.length; i++) {
    const a = verts[i], b = verts[(i + 1) % verts.length];
    if ((b.x - a.x) * (py - a.y) - (b.y - a.y) * (px - a.x) < 0) return false;
  }
  return true;
}

export function hitTestCollObj(mx, my) {
  for (let i = collObjects.length - 1; i >= 0; i--) {
    const obj = collObjects[i];
    if (obj.type === 'wall') {
      const cp = ptSegClosest(mx, my, obj.x1, obj.y1, obj.x2, obj.y2);
      if (Math.hypot(mx - cp.x, my - cp.y) < 10) return i;
    } else if (obj.type === 'box') {
      if (mx >= obj.bx && mx <= obj.bx + obj.bw && my >= obj.by && my <= obj.by + obj.bh) return i;
    } else if (obj.type === 'circle') {
      if (Math.hypot(mx - obj.cx, my - obj.cy) <= obj.radius) return i;
    } else if (obj.type === 'tri') {
      if (pointInConvex(mx, my, triVerts(obj))) return i;
    } else if (obj.type === 'poly' && obj.verts.length >= 3) {
      if (pointInConvex(mx, my, obj.verts)) return i;
    }
  }
  return -1;
}

// ─── Physics resolution ───────────────────────────────────────
export function resolveCollisionObjects() {
  for (const p of particles) {
    for (const obj of collObjects) {
      let hitNx = 0, hitNy = 0, didHit = false;

      if (obj.type === 'circle') {
        const dx = p.x - obj.cx, dy = p.y - obj.cy;
        const d  = Math.hypot(dx, dy);
        const minD = obj.radius + p.r;
        if (d < minD && d > 0.01) {
          const pen = minD - d;
          const nx = dx / d, ny = dy / d;
          p.x += nx * pen; p.y += ny * pen;
          const dot = p.vx * nx + p.vy * ny;
          if (dot < 0) { p.vx -= (1 + obj.bounciness) * dot * nx; p.vy -= (1 + obj.bounciness) * dot * ny; }
          hitNx = nx; hitNy = ny; didHit = true;
        }
      } else {
        const edges = collObjEdges(obj);
        let bestPen = 0, bestNx = 0, bestNy = 0, bestEdge = false;
        for (const edge of edges) {
          const cp   = ptSegClosest(p.x, p.y, edge.ax, edge.ay, edge.bx, edge.by);
          const dx   = p.x - cp.x, dy = p.y - cp.y;
          const dist = Math.hypot(dx, dy);
          if (dist < p.r && dist > 0.0001) {
            const pen = p.r - dist;
            if (pen > bestPen) { bestPen = pen; bestNx = dx / dist; bestNy = dy / dist; bestEdge = true; }
          }
        }
        if (bestEdge) {
          p.x += bestNx * bestPen; p.y += bestNy * bestPen;
          const dot = p.vx * bestNx + p.vy * bestNy;
          if (dot < 0) { p.vx -= (1 + obj.bounciness) * dot * bestNx; p.vy -= (1 + obj.bounciness) * dot * bestNy; }
          hitNx = bestNx; hitNy = bestNy; didHit = true;
        }
      }

      if (didHit) {
        const impactSpd = Math.hypot(p.vx, p.vy);
        p.tension = Math.min(1, p.tension + Math.min(0.4, impactSpd * 0.015));
        obj.flashUntil = performance.now() + 140;
        obj.hitLevel   = Math.min(1, obj.hitLevel + impactSpd * 0.06);
        triggerCollisionSound(obj, impactSpd, p.warmth);
        const nc = Math.min(8, Math.floor(1 + impactSpd * 0.4));
        for (let s = 0; s < nc; s++) {
          const sa = Math.atan2(-hitNy, -hitNx) + (Math.random() - 0.5) * 2.0;
          const sv = 0.4 + Math.random() * impactSpd * 0.25;
          collSparks.push({
            x: p.x, y: p.y,
            vx: Math.cos(sa) * sv, vy: Math.sin(sa) * sv,
            life: 1, decay: 0.05 + Math.random() * 0.06, r: 1.2 + Math.random() * 1.2,
          });
        }
      }
    }
  }
}

// ─── Placement ────────────────────────────────────────────────
export function setCollPlacementType(type) {
  collPlacement.type      = type;
  collPlacement.p1        = null;
  collPlacement.polyVerts = [];
  canvas.el.style.cursor  = type ? 'crosshair' : 'default';
}

export function finalizeCollPlacement(obj) {
  collObjects.push(obj);
  collPlacement.type      = null;
  collPlacement.p1        = null;
  collPlacement.polyVerts = [];
  canvas.el.style.cursor  = 'default';
  setCollSelectedObj(obj);
}
