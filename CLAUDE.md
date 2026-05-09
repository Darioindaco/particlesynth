# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the App

This is a zero-dependency, single-file app. Open `index.html` in any modern browser — no build step, no server required.

```bash
# Quick local server if needed (e.g. for AudioContext on some browsers)
python3 -m http.server 8080
```

There are no tests, no linter, and no package manager. JS syntax can be validated with:

```bash
node --check index.html  # won't work directly — extract the script block first
sed -n '/<script>/,/<\/script>/p' index.html | head -n -1 | tail -n +2 > /tmp/check.js && node --check /tmp/check.js
```

## Architecture

The entire application is one `index.html` file (~3500 lines). CSS, HTML, and JS are all inline. The JS is structured with section comments (`// ── Section Name ──`).

### The "Warmth" Abstraction

`warmth` (0–1 float) is the core musical parameter on every particle. It maps to pitch via `warmthToFreq(w, p)` — quantized to the active scale across 4 octaves from ROOT (110 Hz = A2). It also drives synthesis timbre: in FM mode, warmth below 0.33 = sine, 0.33–0.66 = triangle, above 0.66 = sawtooth. Color is also warmth-derived via `warmthToColor(w, alpha)`.

### Particle Class

Each `Particle` owns Web Audio nodes (oscillators, filters, gains) created in `initAudio()` and cleaned up in `destroy()`. The audio graph varies by synthesis mode:
- **FM**: carrier osc → bandpass → lowpass → oscGain, with FM modulator and a 1-block feedback delay loop
- **SUB**: sawtooth → lowpass (resonant) → oscGain
- **ADD**: 6 sine harmonics merged → oscGain

`syncAudio(immediate)` updates frequency and gain each physics frame. Uses `setTargetAtTime` with τ=0.06 normally, or τ=0.3 when a chord voicing assignment changes (rule: slow glide only on chord change).

### Main Loop (`loop()`)

Called via `requestAnimationFrame`. Each frame runs: `updateLFO` → `updateChordVoicing` → `physics` → `updateFM` → `draw` → `drawScope` → `seqUpdateVisuals` → `pruneCollVoices`.

`physics()` is the heaviest function: applies gravity/wind/viscosity, scene object forces, boundary bounces, particle–particle collisions (spatial grid above 32 particles), collision object resolution, key-note lifetime transitions, and particle culling.

`draw()` renders to two canvases stacked vertically: `#main` (particle scene) and `#scope` (oscilloscope). Below them sits `#seqWrap` (step sequencer strip). Canvas height = wrapper height − 60px (scope) − 110px (sequencer). The JS constant `SEQ_H = 110` must match the CSS `#seqWrap { height: 110px }` — update both together.

### Two Kinds of "Objects"

**Scene objects** (`sceneObjects[]`) — force fields (attractor, repulsor, heat, cold, vortex, gwell). Created by `createObject()`, stored as plain objects with `.x .y .r .type`. Settings panel is built dynamically by `buildSettingsHTML()` / `wireSettingsListeners()` and injected into `#floatSceneContent` inside `#floatPanel`. Toolbar buttons use `data-type` attribute.

**Collision objects** (`collObjects[]`) — solid shapes particles bounce off. Created by `makeCollisionObject()`. Shape types: `wall` (x1,y1,x2,y2), `box` (bx,by,bw,bh), `circle` (cx,cy,radius), `tri` (cx,cy,size,angle), `poly` (verts[]). Each has a `sound` sub-object. Toolbar buttons use `data-ctype`. Settings shown in the static `#collisionPanel` div (inside `#floatPanel`, toggled via `.visible` class). The `.scene-btn` click handler skips buttons without `data-type` to avoid conflict with `data-ctype` buttons.

### Floating Settings Panel

Both scene and collision object settings are shown in a single `#floatPanel` div (`position:absolute` inside `#canvasWrap`). It contains two children that alternate visibility: `#floatSceneContent` (dynamic HTML for scene objects) and `#collisionPanel` (static HTML for collision objects).

- `openSettings(obj)` / `closeSettings()` — show/hide the panel for scene objects
- `openCollPanel(obj)` / `closeCollPanel()` — show/hide the panel for collision objects
- `positionFloatPanel(canvasX, canvasY, hintR)` — places the panel to the right of the object (flips left near the edge); `hintR` is the object's visual radius so the panel clears the object
- `collObjCenter(obj)` — computes the canvas-space center for any collision shape type
- `collObjHintR(obj)` — computes the visual half-size for accurate panel offset
- During object drag, the panel is hidden via `mousemove`; `restoreFloatPanel()` re-shows it on `mouseup`/`mouseleave`
- The panel has a drag handle (`#floatDragHandle`) so users can freely reposition it

### Chord Voicing System

When enabled, `updateChordVoicing()` runs each frame: flood-fills proximity clusters (≥3 particles within 130px), determines chord quality by majority vote of warmth values against `CHORD_QUALITIES[]`, then assigns each particle a `_chordFreq` override. A 3-second lock (`chordLockUntil`) prevents rapid chord flipping. The `warmthToFreq` function checks `p._chordFreq` first before computing from warmth.

### Step Sequencer

Uses AudioContext lookahead scheduling (100ms ahead, 25ms interval). `seqScheduler()` runs `setTimeout`-based loops separately from `requestAnimationFrame` to ensure tight timing. Steps fire `spawnSeqParticle()` which creates particles with `isKeyNote=true, keyReleased=true` (already released, subject to NOTE LIFETIME rules). Swing is implemented as asymmetric step intervals: even steps get `base * (1 + swingFactor)`, odd steps get `base * (1 - swingFactor)`.

The transport has a single **play/stop toggle** button (`#seqPlay`): clicking or pressing **spacebar** while stopped calls `seqPlay()`; while playing calls `seqStop()` (resets to step 0). There is no pause — stop always resets. `seqUpdateTransport()` updates the button label between `▶ PLAY` and `■ STOP`.

### Collision Audio — Voice Pool

`acquireCollVoice(vol, pan)` manages a 16-voice pool (`collVoices[]`). When full, it steals the quietest active voice. Voices route: source nodes → gainNode → StereoPannerNode → masterGain. `pruneCollVoices()` removes expired voices and decays `hitLevel` on all collision objects each frame.

### Key Helpers / Conventions

- `sl(id)` — reads a slider's float value: `parseFloat(document.getElementById(id).value)`
- `_sh` object — builder methods (`_sh.row`, `_sh.sel`, `_sh.chk`, `_sh.btn`) for generating settings panel HTML strings
- Slider display elements follow the convention `id` + `v` suffix (e.g. slider `bpm` → display span `bpmv`)
- `setSelectedTool(type)` cancels collision placement mode; `setCollPlacementType(type)` does not call back into setSelectedTool (no circular dependency)
- AudioContext (`AC`) is lazily initialized on first user interaction via `initAudio()`; `audioStarted` guards all audio operations
- App starts with `initParticles(0)` — empty canvas on load. The RESET button calls `initParticles(12)`.
- **Panic button** (`#panicBtn`): sets `masterGain.gain` to 0 via `cancelScheduledValues` + `setValueAtTime`, then calls `AC.suspend()` and `seqStop()`. Clicking again calls `AC.resume()` and restores gain from the mastervol slider.
