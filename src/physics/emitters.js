// Pure physics — no DOM, no AudioNodes.
import { sceneObjects, controls, canvas } from '../state/store.js';
import { spawnParticle } from './particles.js';

export function tickEmitters(dt) {
  for (const obj of sceneObjects) {
    if (obj.type !== 'emitter') continue;
    if (obj.mode === 'continuous') {
      obj.emAccumulator = (obj.emAccumulator ?? 0) + obj.emRate * dt;
      while (obj.emAccumulator >= 1) {
        obj.emAccumulator -= 1;
        _emitOne(obj);
      }
    } else if (obj.mode === 'pulse') {
      obj.emPulseTimer = (obj.emPulseTimer ?? 0) + dt;
      const period = 1 / Math.max(0.01, obj.emRate);
      if (obj.emPulseTimer >= period) {
        obj.emPulseTimer -= period;
        const burst = Math.max(1, Math.round(obj.emBurstCount ?? 4));
        for (let i = 0; i < burst; i++) _emitOne(obj);
      }
    } else if (obj.mode === 'burst') {
      // Burst fires once per "spawn" — handled by the Add button / external trigger
    }
  }
}

export function emitterFireBurst(obj) {
  const n = Math.max(1, Math.round(obj.emBurstCount ?? 8));
  for (let i = 0; i < n; i++) _emitOne(obj);
}

function _emitOne(obj) {
  const angle  = (obj.emAngle  ?? -Math.PI / 2) + (Math.random() - 0.5) * ((obj.emSpread ?? 45) * Math.PI / 180);
  const speed  = (obj.emSpeed  ?? 2) * (0.5 + Math.random() * 0.5);
  const vx     = Math.cos(angle) * speed;
  const vy     = Math.sin(angle) * speed;
  const warmth = (obj.emWarmthMin ?? 0.2) + Math.random() * ((obj.emWarmthMax ?? 0.8) - (obj.emWarmthMin ?? 0.2));
  spawnParticle(obj.x, obj.y, warmth, vx, vy);
}
