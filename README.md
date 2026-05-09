# Particle Synthesis Engine

A browser-based audio-visual playground where physics-simulated particles generate music. Each particle is a living synthesizer — its position, velocity, and "warmth" determine its pitch, timbre, and behaviour. Collide them, heat them, freeze them, spin them into vortices, or sequence them into melodic patterns.

Open `index.html` in any modern browser. No install, no dependencies.

---

## Interface Overview

The interface has three zones:

- **Left panel** — Physics, Synthesis, Scene objects
- **Canvas** — The simulation and oscilloscope
- **Right panel** — Harmonic, Sequencer, Control, Keyboard
- **Sequencer strip** — Step sequencer below the canvas

Every section header is clickable to collapse/expand it.

Clicking any scene or collision object on the canvas opens a **contextual floating popup** directly next to the object, containing all its settings. The popup can be freely repositioned by dragging the handle bar at its top. It hides automatically while dragging an object and reappears on release.

---

## Left Panel

### Physics

Controls the global simulation environment.

| Control | Range | Default | Description |
|---|---|---|---|
| GRAVITY | 0 – 0.5 | 0.08 | Downward pull on all particles |
| WIND | -0.3 – 0.3 | 0.00 | Horizontal force; negative = left |
| VISCOSITY | 0.8 – 1.0 | 0.98 | Velocity damping per frame; lower = more drag |
| BOUNCINESS | 0.1 – 1.0 | 0.75 | Energy retention on wall and object collision |

### Synthesis

Selects and configures the audio engine used by all particles.

**Mode** — FM · Subtractive · Additive

---

#### FM Mode

Two or four cascaded FM operators. Warmth controls waveform shape (sine → triangle → sawtooth as warmth rises).

| Control | Range | Default | Description |
|---|---|---|---|
| FM DEPTH | 0 – 12 | 3.0 | Modulation depth in semitones |
| FM RATIO | 0.5× – 4× / FREE | 1× | Modulator-to-carrier frequency ratio |
| FM FEEDBACK | 0 – 1 | 0.00 | Self-modulation amount |
| OPERATORS | 2-OP / 4-OP | 2-OP | Number of FM operators in chain |
| LFO RATE | 0.1 – 8 Hz | 1.00 | Low-frequency oscillator speed |
| LFO TARGET | FM DEPTH / FILTER CUTOFF / WARMTH DRIFT / REVERB | FM DEPTH | What the LFO modulates |
| LFO SYNC TO BPM | toggle | off | Locks LFO to musical time divisions |
| LFO SYNC DIV | 1/4 · 1/2 · 1 BAR · 2 BARS | 1 BAR | Division when BPM sync is on |
| BUBBLE RESONANCE | toggle | on | Bandpass filter at carrier frequency for a resonant "bubble" sound |

#### Subtractive Mode

Sawtooth oscillator through a resonant lowpass filter.

| Control | Range | Default | Description |
|---|---|---|---|
| RESONANCE | 0.1 – 20 | 5.0 | Filter Q; higher = sharper peak |
| FILT ATTACK | 0.001 – 0.1 s | 0.010 | Filter envelope attack on collision |
| FILT DECAY | 0.05 – 2.0 s | 0.30 | Filter envelope decay on collision |

#### Additive Mode

Six harmonic partials summed together.

| Control | Range | Default | Description |
|---|---|---|---|
| HARM SPREAD | 0 – 1 | 0.60 | Detuning of upper harmonics |

#### Shared (all modes)

| Control | Range | Default | Description |
|---|---|---|---|
| GRAIN DENSITY | 0 – 1 | 0.5 | Frequency of grain events on collision and bounce |
| MASTER VOL | 0 – 1 | 0.60 | Global output level |
| REVERB | 0 – 1 | 0.35 | Wet/dry mix of the convolution reverb |

---

### Scene

Place interactive objects on the canvas. Click a button to select the tool, then click on the canvas to place. Click any placed object to open its settings in a floating popup next to it. Right-click to delete.

#### Force Objects

| Button | Type | Effect |
|---|---|---|
| ATTR | Attractor | Pulls particles inward |
| REPL | Repulsor | Pushes particles outward |
| HEAT | Heat Source | Raises particle warmth (→ higher pitch, warmer timbre) |
| COLD | Cold Source | Lowers particle warmth and slows movement |
| VRTX | Vortex | Spins particles in a circular pattern |
| GRAV | Gravity Well | Directional gravitational pull; can absorb particles |
| ⊕ EMITTER | Emitter | Continuously spawns new particles |

##### Attractor settings
| Setting | Range | Default | Description |
|---|---|---|---|
| PULL MODE | CONTINUOUS / PULSE / GRAVITY | CONTINUOUS | How the attraction force is applied |
| PULSE RATE | 0.5 – 8 | 2 | Pulses per second (PULSE mode only) |
| WARMTH EFFECT | -1 – 1 | 0 | Slowly warms (+) or cools (-) particles inside radius |
| MASS THRESHOLD | 0.1 – 3.0 | 3.0 | Heavy particles above this mass are less affected |

##### Repulsor settings
| Setting | Range | Default | Description |
|---|---|---|---|
| SHAPE | CIRCLE / DIRECTIONAL / CONE | CIRCLE | Push geometry |
| DIRECTION | 0 – 360° | 0 | Aim direction for DIRECTIONAL and CONE shapes |
| CONE ANGLE | 10 – 180° | 60 | Half-angle of the CONE shape |
| EXPLOSION BURST | button | — | One-shot high-force repulsion burst |

##### Heat Source settings
| Setting | Range | Default | Description |
|---|---|---|---|
| TEMPERATURE | 0.1 – 1.0 | 0.8 | Maximum warmth particles reach inside radius |
| HEAT RATE | 0.001 – 0.05 | 0.02 | Speed of warming |
| COOLING RATE | 0.0001 – 0.01 | 0.001 | Speed of cooling just outside radius |
| SHIMMER | 0 – 1 | 0.4 | Visual shimmer intensity |
| SOUND CHARACTER | RAW / BRIGHT / HARMONIC | RAW | Warmth target for audio character |

##### Cold Source settings
| Setting | Range | Default | Description |
|---|---|---|---|
| TEMPERATURE | 0 – 0.9 | 0.2 | Minimum warmth particles reach inside radius |
| FREEZE THRESHOLD | 0 – 0.5 | 0.2 | Warmth level below which particles slow sharply |
| CRYSTALLISE | toggle | off | Snaps particle pitches to exact scale degrees |
| SLOW FACTOR | 0.9 – 1.0 | 0.97 | Velocity multiplier applied inside radius |

##### Vortex settings
| Setting | Range | Default | Description |
|---|---|---|---|
| CLOCKWISE | toggle | off | Spin direction |
| SPEED | 0.1 – 5.0 | 3 | Tangential force magnitude |
| INWARD PULL | 0 – 1 | 0 | Additional radial pull toward center |
| CHAOS | 0 – 1 | 0 | Random jitter in tangential force |

##### Gravity Well settings
| Setting | Range | Default | Description |
|---|---|---|---|
| PULL STRENGTH | 1.0 – 20.0 | 5 | Gravitational force magnitude |
| DIRECTION | 0 – 360° | 90 | Direction of gravitational pull |
| EVENT HORIZON | toggle | off | Particles that reach the center are absorbed |
| RUMBLE | 0 – 1 | 0.5 | Grain audio volume when absorbing particles |

##### All force object shared settings
| Setting | Range | Default | Description |
|---|---|---|---|
| NAME | text | auto | Display label |
| RADIUS | 40 – 300 px | varies | Influence radius |
| STRENGTH | 0.1 – 2.0 | 1.0 | Effect multiplier |
| OPACITY | 0.2 – 1.0 | 0.8 | Visual transparency |
| ACTIVE | toggle | on | Enable/disable without deleting |

---

#### Emitter settings

Emitters spawn particles in a configurable cone direction.

| Setting | Range | Default | Description |
|---|---|---|---|
| MODE | CONTINUOUS / BURST / PULSE / OFF | CONTINUOUS | Emission mode |
| RATE (P/S) | 0.2 – 20 | 2 | Particles per second (CONTINUOUS) |
| BURST COUNT | 1 – 32 | 8 | Particles per fire event (BURST) |
| FIRE BURST | button | — | Manually trigger a burst |
| PARTICLES | 1 – 16 | 2 | Particles per pulse event (PULSE) |
| INTERVAL (S) | 0.1 – 10 | 1.5 | Seconds between pulses (PULSE) |
| DIRECTION° | 0 – 360° | 270 | Emission direction (270 = upward) |
| SPREAD° | 0 – 180° | 45 | Cone half-angle; 0 = single ray, 180 = semicircle |
| SPEED | 0.5 – 20 | 4 | Launch velocity |
| SPEED VARIANCE | 0 – 1 | 0.4 | Randomness applied to speed |
| WARMTH MIN | 0 – 1 | 0.0 | Lower bound of emitted particle warmth |
| WARMTH MAX | 0 – 1 | 1.0 | Upper bound of emitted particle warmth |
| TENSION MIN | 0.1 – 1 | 0.2 | Lower bound of emitted particle tension (affects size and mass) |
| TENSION MAX | 0.1 – 1 | 0.8 | Upper bound of emitted particle tension |

The warmth range shows a live colour gradient preview and a hint label (ICY COLD · COOL BLUE · WARM MIDRANGE · WARM AMBER · SCORCHING HOT · FULL SPECTRUM · MIXED).

---

#### Collision Objects

Solid geometry that particles physically bounce off. Each object can be independently configured to produce sound on impact.

| Button | Shape | Placement |
|---|---|---|
| WALL | Line segment | Click two points |
| BOX | Rectangle | Click two diagonal corners |
| CIRC | Circle | Click center, then radius point |
| TRI | Triangle | Single click (auto-sized) |
| POLY | Polygon | Click each vertex; double-click or click near start to finish |

##### Collision object settings (all types)

| Setting | Range | Default | Description |
|---|---|---|---|
| NAME | text | auto | Display label |
| SOUND ENGINE | RESONATOR / PITCHED / PERCUSSION / GRANULAR / FM BURST / CHORD STAB | RESONATOR | Audio engine triggered on impact |
| VOLUME | 0 – 1 | 0.70 | Impact sound volume |
| PAN | -1 – 1 | 0.00 | Stereo position |
| VEL SENS | 0 – 1 | 0.70 | How much impact velocity affects loudness |
| COOLDOWN | 0 – 500 ms | 50 ms | Minimum time between consecutive sounds |
| BOUNCINESS | 0 – 1 | 0.80 | Elasticity of the collision surface |

##### Sound engine parameters

**RESONATOR** — Decaying resonant body
| Setting | Range | Default |
|---|---|---|
| DECAY | 0.05 – 4 s | 1.00 s |

**PITCHED** — Oscillator with envelope
| Setting | Range | Default |
|---|---|---|
| WAVEFORM | SINE / TRIANGLE / SAW / SQUARE | SINE |
| ATTACK | 1 – 200 ms | 5 ms |
| DECAY | 10 – 2000 ms | 300 ms |

**PERCUSSION** — Synthesized drum
| Setting | Range | Default |
|---|---|---|
| TYPE | KICK / SNARE / HI-HAT / TOM | KICK |
| FREQ | 30 – 400 Hz | 80 Hz |
| DECAY | 0.05 – 1.5 s | 0.30 s |

**GRANULAR** — Material texture
| Setting | Range | Default |
|---|---|---|
| MATERIAL | METAL / WOOD / GLASS / STONE | METAL |
| GRAIN SIZE | 10 – 200 ms | 80 ms |
| DENSITY | 1 – 8 | 2 |

**FM BURST** — Short FM transient
| Setting | Range | Default |
|---|---|---|
| CARRIER | 40 – 1200 Hz | 220 Hz |
| RATIO | 0.5 – 8 | 2.0 |
| INDEX | 0 – 16 | 4 |
| DURATION | 20 – 1000 ms | 200 ms |

**CHORD STAB** — Voiced chord hit
| Setting | Range | Default |
|---|---|---|
| QUALITY | MAJOR / MINOR / SUS2 / DOM7 / MAJ7 | MAJOR |
| DURATION | 0.1 – 2 s | 0.5 s |

---

## Right Panel

### Harmonic

| Control | Default | Description |
|---|---|---|
| CHORD QUALITIES | off | When enabled, nearby particle clusters are voiced as chords. The chord quality (min9 · min7 · maj7 · dom7 · maj9 · aug) is determined by the average warmth of the cluster. Requires ≥ 3 particles within 130 px. A 3-second lock prevents rapid chord changes. |

The current chord name is displayed when active.

### Sequencer

| Control | Range | Default | Description |
|---|---|---|---|
| BPM | 20 – 200 | 90 | Tempo |
| SWING | 0 – 100 | 0 | Delays odd steps for shuffle feel |
| STEPS | 8 / 16 / 32 | 16 | Pattern length (prompts confirmation to reset) |
| SCALE | PENTATONIC / MINOR / MAJOR / CHROMATIC | PENTATONIC | Musical scale used for note quantization |
| GRAIN TYPE | DROPLET / PLUCK / NOISE | DROPLET | Grain synthesis model for particle collisions and bounces |
| BEAT SYNC GRAINS | toggle | on | Restricts grain events to downbeats and half-beats |
| DRONE ROOT | toggle | on | Sustains a quiet root sine wave (110 Hz) as a tonal anchor |

### Control

| Control | Description |
|---|---|
| PARTICLE LIMIT (12–64) | Maximum number of particles; oldest are culled when exceeded |
| ⚡ DISTURBANCE | Applies random velocity and warmth impulses to all particles |
| + PARTICLE | Spawns one particle at a random position |
| RESET | Removes all particles |
| ▶ START AUDIO | Initialises the Web Audio context (required before any sound) |
| ⬛ PANIC — KILL AUDIO | Mutes all audio; click again to restore |

**NOTE LIFETIME** — Controls what happens to keyboard-triggered particles on key release:

| Mode | Behaviour |
|---|---|
| INSTANT | Particle decays and disappears immediately |
| LIVE | Particle transitions to an ambient particle and continues |
| TIMED | Particle continues for a set duration (1–30 s) then disappears |

### Keyboard

Visual mini-keyboard showing which keys are currently held. Keys light up in warmth colour when pressed.

| Keys | Notes |
|---|---|
| A S D F G H J K | Scale degrees across one octave (lower row) |
| W E T Y U O P | Upper octave accidentals (black keys) |

Pressing a key spawns a particle at the bottom of the canvas locked to the corresponding pitch and warmth value. The particle plays as long as the key is held, then follows the NOTE LIFETIME mode.

---

## Sequencer Strip

Located below the canvas.

### Transport & Tools

| Button | Action |
|---|---|
| ▶ PLAY / ■ STOP | Start or stop the sequencer |
| RND | Randomise all steps and their notes |
| CLR | Clear the entire pattern |
| FILL | Activate all steps |
| ◀ SHL | Shift pattern one step left |
| SHR ▶ | Shift pattern one step right |
| REV | Reverse the pattern |

### Step Cells

Each cell in the grid represents one sequencer step.

- **Click the toggle box** — Enable or disable the step
- **Click the note label** — Enter note-pick mode; press any keyboard key (A–K, W–P) to assign that pitch to the step. The label turns orange while waiting.
- **Drag the velocity bar** up or down — Set the velocity (0–100%) for that step
- A small **green dot** appears on steps that are part of the current chord voicing

The playhead highlights the current step with a white border, and briefly flashes white on each trigger.

---

## Canvas Interactions

| Action | Effect |
|---|---|
| Click and hold | Creates a temporary attractor at the cursor; particles accelerate toward it |
| Release | Attractor disappears |
| Click on a force/emitter object | Opens a floating settings popup next to the object |
| Drag a force/emitter object | Moves it; popup hides during drag and reappears on release |
| Right-click a scene object | Deletes it |
| Click on a collision object | Opens a floating settings popup next to the object |
| Drag a collision object | Moves it; popup hides during drag and reappears on release |
| Right-click a collision object | Deletes it |

When placing a collision polygon, each click adds a vertex. Double-click, or click near the first vertex, to close and finalise the shape.

---

## Warmth System

Warmth is the core parameter connecting physics to sound. It is a 0–1 value per particle that simultaneously controls:

- **Pitch** — quantized to the selected scale across 4 octaves (110 Hz root)
- **FM waveform** — sine (cold) → triangle → sawtooth (hot)
- **Visual colour** — blue (cold) → cyan → purple → amber → red (hot)
- **Chord voicing** — cluster warmth determines chord quality

Warmth changes via:
- Velocity (faster particles run slightly warmer)
- Heat and Cold sources
- Particle–particle thermal exchange on collision
- Attractor warmth effect
- Cold source crystallisation (snaps to scale degrees)
- Emitter warmth range settings

---

## Audio Chain

```
Particles & Collisions
        │
   masterGain (0–1)
        │
   ┌────┴────┐
  dry       reverb (2.2 s impulse)
   │         │
   └────┬────┘
      limiter (−10 dB threshold, 8:1)
        │
     analyser (FFT 512–2048)
        │
    destination
```

A persistent drone oscillator (110 Hz sine) feeds into masterGain as a quiet tonal anchor.

---

## Performance Notes

- Particle–particle collision uses a spatial grid for counts above 32 (O(n) instead of O(n²))
- The analyser FFT size automatically reduces from 2048 to 512 above 48 particles
- Up to 8 simultaneous grain voices; new grains are skipped when the pool is full
- Up to 16 simultaneous collision voices with a round-robin voice pool
- Closing a section in the panel hides it with a CSS transition — nothing is removed from the DOM
