# 🎴 Arcana Fate (Project Code-name: Mimic Dungeon)

[![Chain Jam Vol. 1](https://img.shields.io/badge/Event-Chain_Jam_Vol._1-blueviolet?style=for-the-badge)](https://jam.chain.wtf/)
[![Live Demo](https://img.shields.io/badge/Live_Demo-mimic--chest.vercel.app-emerald?style=for-the-badge&logo=vercel)](https://mimic-chest.vercel.app/)
[![License: MIT](https://img.shields.io/badge/License-MIT-amber?style=for-the-badge)](LICENSE)
[![Certified RTP](https://img.shields.io/badge/RTP-96.00%25_Provably_Fair-success?style=for-the-badge)](#certified-provably-fair--zero-modulo-bias)

> **An on-chain cosmic roguelike casino game powered by deterministic procedural sacred sigils and certified 96.00% Provably Fair RTP on Base L2.**

---

## 🌟 Overview

**Arcana Fate** reimagines the instant on-chain casino experience through the lens of Balatro-inspired tactile game feel and sacred geometry. Players place a wager, enter a mystical summoning circle, and choose between three face-down cards. 

Behind the scenes, cryptographic VRF entropy from the blockchain channels deterministic procedural sacred sigils, generates cosmic card names, and resolves instant single-round outcomes with zero modulo bias.

- 🎮 **Live Production Demo**: [https://mimic-chest.vercel.app/](https://mimic-chest.vercel.app/)
- 🏆 **Hackathon**: Built for **Chain Jam Vol. 1** using `@chain/casino-sdk`

---

## ⚡ Core Pillars

### 1. 🔯 Infinite Procedural Sacred Sigils & Mystic Nomenclature
- **100% Pure Vector SVG**: Every card face is generated dynamically in code without any external image assets or HTTP downloads. Zero bandwidth, infinite scalability, pixel-sharp across 4K displays.
- **Multi-Layer Sacred Geometry**:
  - **Outer Boundary**: Rotating regular polygons (triangles, squares, hexagons, octagons, dodecagons) or triple concentric orbital dashed rings derived from `seed % 6`.
  - **Internal Sacred Mesh**: Rotating geometric frameworks (`(seed * 17) % 360°`) including Star Tetrahedrons (Merkaba), Seed of Life intersecting petal arcs, and Metatron crystalline diagonal grids.
  - **Core Glyph**: Central astrological focal points including Concentric Cosmic Rings, Mystical Crescent Moons, Eyes of Providence, and Radiant Sunbursts.
  - **Satellite Nodes**: 3 to 8 orbiting celestial points tracking along outer perimeters.
- **Infinite Mystic Nomenclature**: Dynamic lexical matrix concatenating `[Prefix] [Core Noun] [Suffix / Epithet]` (e.g. *Solar Crucible of Dawn*, *Abyssal Vortex of Null*, *Astral Weaver Resonant*, *Cosmic Horizon of Infinity*) paired with authentic Roman numerals and flavor text.

### 2. 🃏 Balatro-Inspired High Juice UX & Audio
- **3D Parallax & Physical Card Feel**: True CSS 3D transforms (`preserve-3d`, backface separation, mouse tilt parallax) without Blink flattening bugs.
- **Rarity Editions**: 
  - **Foil (15%)**: Silver reflective border with double bell chimes (A5 → E6).
  - **Holo (10%)**: Prismatic chromatic shift with triple harmonic resonance (F#5 → A5 → D6).
  - **Polychrome (5%)**: Vibrant multi-color cycling gradient sheen with crystal overtone chimes and flaming title banners.
  *(All edition variants are purely cosmetic to preserve strict contract RTP integrity).*
- **Near-Miss Psychology**: When revealing **The Void (x0.0)** loss, the two unpicked cards flip with a staggered rhythm (350ms). One unpicked card is guaranteed to reveal a Tier 3 (x5.0) Jackpot branded with an animated **SO CLOSE! MISSED JACKPOT** stamp accompanied by a procedural sigh sound.
- **Scoring Tally & Micro Screen Shake**: Multiplier numbers do not abruptly appear; they roll up with pitch-shifted synthesizer ticks, followed by an impactful camera shake on final payout resolution.
- **Zero-File Procedural Web Audio**: Built entirely with native Web Audio API oscillators, bandpass filters, and harmonic sweeps. Zero MP3/WAV assets required.

### 3. ⚖️ Certified Provably Fair & Zero Modulo Bias
- **Smart Contract Compliance**: Fully implements the canonical [`ICasinoGameV2`](./simulator/contracts/MimicChest.sol) interface.
- **Unbiased Rejection Sampling**: Implements strict rejection sampling on 32-byte VRF seeds:
  ```solidity
  uint8 internal constant SAMPLE_RANGE = 100;
  uint8 internal constant SAMPLE_REJECT = 200; // floor(256 / 100) * 100 = 200
  ```
  Bytes $\ge 200$ are discarded, guaranteeing that each outcome $[0, 99]$ has exactly 2 preimages in $[0, 255]$, eliminating modulo bias entirely.
- **Mathematical RTP (96.00%)**:
  $$\text{RTP} = (50\% \times 0.0) + (30\% \times 1.2) + (16\% \times 2.5) + (4\% \times 5.0) = 0 + 0.36 + 0.40 + 0.20 = 96.00\%$$

| Tier Index | Card Class | Multiplier | Probability | Contract Math | Payout (`wager = 10`) |
|:---:|:---|:---:|:---:|:---|:---:|
| **0** | **The Void** | `x0.0` | 50.0% | `0` | `0 TEST` |
| **1** | **Silver Rune** | `x1.2` | 30.0% | `(wager * 12) / 10` | `12 TEST` |
| **2** | **Golden Sun** | `x2.5` | 16.0% | `(wager * 25) / 10` | `25 TEST` |
| **3** | **Destiny** | `x5.0` | 4.0% | `wager * 5` | `50 TEST` |

- **Interactive Verification**: Every history pill in the Live History strip opens a Stake-style Provably Fair Verifier displaying the 32-byte hex seed, roll number, transaction hash, and timestamp.

### 4. 📜 The Infinite Codex & Compendium
- **Tab 1: 12 Primal Pillars**: Tracks discovery of the 12 sacred foundational archetypes (3 Void, 3 Silver, 3 Gold, 3 Destiny). Unlocked cards illuminate with procedural vector art, while undiscovered cards remain shrouded in mystery.
- **Tab 2: Channeled Archive**: An unbounded scrollable grimoire archiving every unique procedural card channeled through VRF during gameplay, complete with edition badges and individual sigils.
- **Synchronized HUD Counters**: Real-time HUD button dynamically reports `Codex (X/12)` synchronized with the modal.

---

## 📂 Repository Architecture

```text
casino-sdk/
├── examples/
│   └── mimic-chest/               # Frontend Application (Arcana Fate)
│       ├── public/
│       │   ├── game.manifest.json # Platform Game Manifest (bilingual en/vi)
│       │   └── assets/            # Minimal SVGs (icons & cover)
│       ├── src/
│       │   ├── components/
│       │   │   ├── CardStage.tsx       # 3D card stage, near-miss stamps, tallying
│       │   │   ├── ProceduralSigil.tsx  # Pure SVG sacred geometry vector engine
│       │   │   ├── CollectionModal.tsx  # Dual-tab Codex & Channeled Archive
│       │   │   ├── VerifyModal.tsx      # Provably fair verification modal
│       │   │   ├── StatsStrip.tsx       # Live session statistics & reset
│       │   │   └── HistoryStrip.tsx     # Clickable session outcomes
│       │   ├── lib/
│       │   │   ├── mimic.ts            # Contract paytable & outcome decoder
│       │   │   ├── proceduralNames.ts  # Deterministic card naming & archetype registry
│       │   │   ├── audio.ts            # Procedural Web Audio API sound manager
│       │   │   └── useCasinoHost.ts    # Dual-mode Penpal guest bridge / standalone demo
│       │   ├── App.tsx                 # Core game state machine & round orchestration
│       │   └── styles.css              # Glassmorphism, Balatro editions, and animations
│       └── index.html                  # Includes mandatory Chain Jam widget script
├── simulator/
│   └── contracts/
│       ├── MimicChest.sol         # Production smart contract (ICasinoGameV2)
│       └── interfaces/
│           └── ICasinoGameV2.sol  # Canonical casino game interface
└── src/                           # @chain/casino-sdk core library (guest & host)
```

---

## 🚀 Quickstart & Local Development

### Prerequisites
- Node.js 18+ or 20+
- npm 9+

### 1. Installation
Clone the repository and install all dependencies:
```bash
git clone https://github.com/PHONGUIT22/mimic-dungeon.git
cd mimic-dungeon
npm install
```

### 2. Run the Game (Development Server)
Launch the standalone game client:
```bash
npm --prefix examples/mimic-chest run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser. The client automatically activates **Demo Mode** with 1,000 TEST tokens and local VRF simulation when running outside an iframe.

### 3. Typecheck & Build
Verify TypeScript integrity and create the production bundle:
```bash
# Type check
npm --prefix examples/mimic-chest run check-types

# Production build
npm --prefix examples/mimic-chest run build
```

---

## 🛡️ Chain Jam Compliance Checklist

- [x] **Fatal Requirement (Widget Script)**: `<script async src="https://jam.chain.wtf/widget.js"></script>` embedded in `<head>` of `index.html` and verified in production `dist/index.html`.
- [x] **Platform Manifest**: Complete `public/game.manifest.json` with bilingual locale metadata (`en`/`vi`) and `mode: "full-iframe"`.
- [x] **Zero-Wallet UX**: Communicates strictly via `@chain/casino-sdk/guest` with the parent host Smart Vault. No manual wallet popups or external Web3 modal libraries.
- [x] **RTP Certified**: Mathematical RTP is strictly **96.00%**, fully compliant with the 93%–98% competition bracket.

---

## 📜 License

This project is licensed under the [MIT License](LICENSE). Built with 🔮 by the Arcana Fate team for **Chain Jam Vol. 1**.
