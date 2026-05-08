# Particle Synth

A physics-based audio playground in a single HTML file. Particles bounce around a canvas and produce sound — their position, speed, and collisions drive synthesis in real time. No install, no build step, no dependencies.

## Running

Open `index.html` in any modern browser. That's it.

```bash
# Optional local server (needed on some browsers for AudioContext)
python3 -m http.server 8080
```

## What it does

Each particle is a sound source. Physics parameters directly shape the audio:

- **Gravity / wind** — particles accelerate → pitch rises with speed
- **Viscosity** — energy drain → particles slow → tone fades
- **Bounciness** — wall impacts trigger grain bursts; harder bounce = louder
- **Attractor** — click and hold on the canvas to pull particles together → FM cluster effect
- **Particle–particle collisions** — warmth (pitch/timbre) transfers between particles on impact

## Synthesis modes

| Mode | Sound |
|------|-------|
| FM | Carrier oscillator modulated by nearby particles. Modulation depth is proximity-based. Ratio, feedback, 2-op and 4-op chains, LFO |
| SUB | Sawtooth through a resonant lowpass filter |
| ADD | 6 sine harmonics summed |

All modes are scale-quantized — pitches snap to the selected scale (pentatonic, minor, major, chromatic) rooted at A2 (110 Hz).

## Keyboard

Keys `A S D F G H J K` are white keys, `W E T Y U O P` are black keys — laid out like a piano. Press and hold to sustain a note particle; release to let it decay.

## Step Sequencer

- **▶ PLAY / ■ STOP** button or **spacebar** to start/stop (always restarts from step 1)
- 8, 16, or 32 steps; adjustable BPM and swing
- Click a step's note label → press a key to assign a pitch
- RND, CLR, FILL, SHL, SHR, REV tools for pattern editing

## Scene objects

Place force fields on the canvas from the SCENE toolbar:
- **ATTR** attractor, **REPL** repulsor, **HEAT** / **COLD** (warmth drift), **VRTX** vortex, **GRAV** gravity well

## Collision objects

Solid shapes particles bounce off, each with its own sound engine (resonator, percussion, FM burst, chord stab, etc.):
- **WALL**, **BOX**, **CIRCLE**, **TRI**, **POLY**

## Chord system

Enable **CHORD QUALITIES** to let particle clusters vote on a chord. Proximity groups of ≥3 particles get harmonic voicing overrides. A 3-second lock prevents rapid flipping.

## Controls

| Control | Action |
|---------|--------|
| Click + hold canvas | Attractor |
| Keyboard (A–K, W–P) | Play note particles |
| Spacebar | Play / Stop sequencer |
| ⬛ PANIC | Instantly kills all audio; click again to resume |
| RESET | Clear all particles and restart with empty canvas |

## Collaboration

This project is built by Francesco & Dario Indaco.

```bash
git pull   # get your brother's latest changes
git push   # share your changes
```
