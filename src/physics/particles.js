import { particles, sceneObjects, controls, canvas, audio } from '../state/store.js';
import { Particle, spawnGrain } from '../audio/synthesis.js';
import { warmthToFreq } from '../musical/scales.js';
import { triggerCollisionSound } from '../audio/collisionSounds.js';

const PROX_DIST = 140;

// ─── Particle factory ─────────────────────────────────────────
export function spawnParticle(x, y, warmth, vx = 0, vy = 0) {
  if (particles.length >= controls.maxParticles) cullOldestParticle();
  const p = new Particle(
    x ?? canvas.width  * 0.2 + Math.random() * canvas.width  * 0.6,
    y ?? canvas.height * 0.2 + Math.random() * canvas.height * 0.6,
    vx + (Math.random() - 0.5) * 1.5,
    vy + (Math.random() - 0.5) * 1.5,
    warmth ?? Math.random(),
  );
  if (audio.started) p.initAudio(canvas.width);
  particles.push(p);
  return p;
}

export function cullOldestParticle() {
  if (!particles.length) return;
  particles.shift().destroy();
}

export function initParticles(count = 0) {
  for (const p of particles) p.destroy();
  particles.length = 0;
  for (let i = 0; i < count; i++) spawnParticle();
}

// ─── Spatial grid for O(n) collision detection ────────────────
function buildCandidatePairs() {
  if (particles.length <= 32) {
    const pairs = [];
    for (let i = 0; i < particles.length; i++)
      for (let j = i + 1; j < particles.length; j++)
        pairs.push([i, j]);
    return pairs;
  }
  const cell  = PROX_DIST;
  const grid  = new Map();
  const key   = (cx, cy) => (cx << 16) | (cy & 0xffff);
  for (let i = 0; i < particles.length; i++) {
    const p  = particles[i];
    const cx = Math.floor(p.x / cell);
    const cy = Math.floor(p.y / cell);
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++) {
        const k = key(cx + dx, cy + dy);
        if (!grid.has(k)) grid.set(k, []);
        grid.get(k).push(i);
      }
  }
  const seen  = new Set();
  const pairs = [];
  for (const cell of grid.values()) {
    for (let a = 0; a < cell.length; a++)
      for (let b = a + 1; b < cell.length; b++) {
        const ia = Math.min(cell[a], cell[b]), ib = Math.max(cell[a], cell[b]);
        const k  = (ia << 16) | ib;
        if (!seen.has(k)) { seen.add(k); pairs.push([ia, ib]); }
      }
  }
  return pairs;
}

// ─── Elastic collision between two particles ──────────────────
export function resolveParticleCollision(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const d  = Math.hypot(dx, dy);
  const minD = a.r + b.r;
  if (d >= minD || d < 0.001) return;

  const pen = minD - d;
  const nx = dx / d, ny = dy / d;
  a.x -= nx * pen * 0.5; a.y -= ny * pen * 0.5;
  b.x += nx * pen * 0.5; b.y += ny * pen * 0.5;

  const rvx = b.vx - a.vx, rvy = b.vy - a.vy;
  const dot  = rvx * nx + rvy * ny;
  if (dot >= 0) return;

  const ma = a.mass, mb = b.mass, total = ma + mb;
  const j  = (-(1 + controls.bounce) * dot) / total;
  a.vx -= j * mb * nx; a.vy -= j * mb * ny;
  b.vx += j * ma * nx; b.vy += j * ma * ny;

  // Warmth exchange
  const impactSpd = Math.abs(dot);
  const wExch = impactSpd * 0.002;
  const wDiff = b.warmth - a.warmth;
  a.warmth = Math.max(0, Math.min(1, a.warmth + wDiff * wExch));
  b.warmth = Math.max(0, Math.min(1, b.warmth - wDiff * wExch));

  // Tension spike → grain trigger
  const spike = Math.min(0.5, impactSpd * 0.02);
  a.tension = Math.min(1, a.tension + spike);
  b.tension = Math.min(1, b.tension + spike);
  if (audio.started && impactSpd > 1.5) {
    spawnGrain(a.warmth, a.tension, a.x, canvas.width);
  }
}

// ─── Main physics tick ────────────────────────────────────────
export function physics() {
  const W = canvas.width, H = canvas.height;
  const g  = controls.gravity;
  const wi = controls.wind;
  const vi = controls.viscosity;
  const bo = controls.bounce;

  for (const p of particles) {
    // Apply forces
    p.vx += wi * 0.01;
    p.vy += g  * 0.1;
    p.vx *= vi;
    p.vy *= vi;

    // Disturbance
    if (controls.disturbance > 0 && Math.random() < 0.05) {
      p.vx += (Math.random() - 0.5) * controls.disturbance * 0.3;
      p.vy += (Math.random() - 0.5) * controls.disturbance * 0.3;
    }

    // Wall bounce
    if (p.x - p.r < 0) {
      p.x = p.r; p.vx = Math.abs(p.vx) * bo;
      p.tension = Math.min(1, p.tension + 0.15);
      if (audio.started) spawnGrain(p.warmth, p.tension, p.x, W);
    }
    if (p.x + p.r > W) {
      p.x = W - p.r; p.vx = -Math.abs(p.vx) * bo;
      p.tension = Math.min(1, p.tension + 0.15);
      if (audio.started) spawnGrain(p.warmth, p.tension, p.x, W);
    }
    if (p.y - p.r < 0) {
      p.y = p.r; p.vy = Math.abs(p.vy) * bo;
    }
    if (p.y + p.r > H) {
      p.y = H - p.r; p.vy = -Math.abs(p.vy) * bo;
      p.tension = Math.min(1, p.tension + 0.12);
      if (audio.started) spawnGrain(p.warmth, p.tension, p.x, W);
    }

    // Tension decay
    p.tension *= 0.992 - controls.tension * 0.008;

    // Warmth drift
    if (controls.warmthDriftAmt > 0) {
      p.warmth = Math.max(0, Math.min(1, p.warmth + (Math.random() - 0.5) * controls.warmthDriftAmt * 0.002));
    }

    p.x += p.vx;
    p.y += p.vy;
  }

  // Scene object effects (attractor, repeller, emitter, vortex, NLT)
  for (const obj of sceneObjects) {
    applySceneObject(obj);
  }

  // Particle-particle collisions
  const pairs = buildCandidatePairs();
  for (const [ia, ib] of pairs) {
    resolveParticleCollision(particles[ia], particles[ib]);
  }

  // FM proximity coupling
  applyFMProximity();
}

function applySceneObject(obj) {
  for (const p of particles) {
    const dx = obj.x - p.x, dy = obj.y - p.y;
    const d  = Math.hypot(dx, dy);
    if (d < 0.1 || d > obj.radius * 2) continue;
    const nx = dx / d, ny = dy / d;
    const str = obj.strength ?? 0.5;

    if (obj.type === 'attractor') {
      const f = str * 0.4 / (d * 0.05 + 1);
      p.vx += nx * f; p.vy += ny * f;
    } else if (obj.type === 'repeller') {
      const f = str * 0.4 / (d * 0.05 + 1);
      p.vx -= nx * f; p.vy -= ny * f;
    } else if (obj.type === 'vortex') {
      const tx = -ny, ty = nx;
      p.vx += tx * str * 0.3; p.vy += ty * str * 0.3;
    } else if (obj.type === 'nlt_harmonic') {
      p.warmth = Math.max(0, Math.min(1, p.warmth + (0.5 - p.warmth) * 0.01 * str));
    } else if (obj.type === 'nlt_chaos') {
      p.vx += (Math.random() - 0.5) * str * 0.5;
      p.vy += (Math.random() - 0.5) * str * 0.5;
    }
  }
}

function applyFMProximity() {
  if (particles.length < 2) return;
  const mode = controls.synthMode;
  if (mode !== 'fm' && mode !== 'fm4') return;

  for (let i = 0; i < particles.length; i++) {
    const a = particles[i];
    if (!a.gainNode) continue;
    for (let j = i + 1; j < particles.length; j++) {
      const b = particles[j];
      if (!b.gainNode) continue;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d > PROX_DIST) continue;
      const proximity = 1 - d / PROX_DIST;
      a.setFMDepth(controls.fmDepth * (1 + proximity * 2));
      b.setFMDepth(controls.fmDepth * (1 + proximity * 2));
    }
  }
}
