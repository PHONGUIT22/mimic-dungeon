# 🎴 Arcana Fate (Project Code-name: Mimic Dungeon)

[![Chain Jam Vol. 1](https://img.shields.io/badge/Event-Chain_Jam_Vol._1-blueviolet?style=for-the-badge)](https://jam.chain.wtf/)
[![Live Demo](https://img.shields.io/badge/Live_Demo-mimic--chest.vercel.app-emerald?style=for-the-badge&logo=vercel)](https://mimic-chest.vercel.app/)
[![License: MIT](https://img.shields.io/badge/License-MIT-amber?style=for-the-badge)](LICENSE)
[![Certified RTP](https://img.shields.io/badge/RTP-96.00%25_Provably_Fair-success?style=for-the-badge)](#-certified-provably-fair--zero-modulo-bias)

> **An occult dark-fantasy tabletop casino game powered by 90s vintage fantasy TCG aesthetics, deterministic procedural sacred sigils, pure Web Audio synthesis, and certified 96.00% Provably Fair RTP on Base L2.**

---

## 🌟 Overview

**Arcana Fate** transports players into the candlelit sanctum of an ancient occult astrologer, reimagining the instant on-chain casino experience through the lens of classic 90s Trading Card Games (TCG), D&D tabletop divination, Balatro-inspired tactile juice, and sacred geometry.

Players place a wager, commune with the midnight velvet tabletop, and deliberate between three face-down fate cards. Behind the scenes, cryptographic VRF entropy from the blockchain channels deterministic procedural sacred sigils, generates cosmic card names, and resolves instant single-round outcomes with zero modulo bias.

- 🎮 **Live Production Demo**: [https://mimic-chest.vercel.app/](https://mimic-chest.vercel.app/)
- 🏆 **Hackathon**: Built for **Chain Jam Vol. 1** using `@chain/casino-sdk`

---

## ⚡ Core Pillars & Gameplay Mechanics

### 1. 🃏 90s Vintage Fantasy TCG & Occult Tabletop Atmosphere
- **Occult Tabletop Environment**: Medieval midnight-blue velvet cloth surface with gold-embroidered runic borders, 18 ambient floating dust motes / soul sparks, and twin flickering corner candles with organic flame halos.
- **Metallic Chamfered Outer Borders**: Thick, rich beveled borders with clipped/notched bevel corners customized by card rarity:
  - ⬛ **The Void (`0.0x`)**: Obsidian dark-iron border with jagged runic notches.
  - 🥈 **Silver Rune (`1.2x`)**: Polished antique sterling silver with celestial filigree.
  - 🥇 **Golden Sun (`2.5x`)**: Radiant solar gold with ornate royal flourishes.
  - 🌈 **Wheel of Destiny (`5.0x`)**: Shimmering polychrome holographic frame.
- **Heroic Card Dimensions & Contrast**: Scaled-up cards (`clamp(175px, 24vw, 220px)`) featuring textured parchment illustration windows and ornate gold scrollwork ribbons for clean title and multiplier visibility.
- **Authentic Fantasy Typography**: Infused with Google Fonts **Cinzel** and **MedievalSharp** for ancient grimoire aesthetics.
- **Dark Oracle Prophetic Micro-copy**: Distinct English prophetic quotes for every Tarot outcome displayed dynamically on card footers and outcome banners.

### 2. 🔯 Infinite Procedural Sacred Sigils & Mystic Nomenclature
- **100% Pure Vector SVG**: Every card face and sigil is generated dynamically in code without any external image assets or HTTP downloads. Zero bandwidth, infinite scalability, pixel-sharp across all displays.
- **Multi-Layer Sacred Geometry**:
  - **Outer Boundary**: Rotating regular polygons (triangles, squares, hexagons, octagons, dodecagons) or triple concentric orbital dashed rings derived from `seed % 6`.
  - **Internal Sacred Mesh**: Rotating geometric frameworks (`(seed * 17) % 360°`) including Star Tetrahedrons (Merkaba), Seed of Life intersecting petal arcs, and Metatron crystalline diagonal grids.
  - **Core Glyph**: High-contrast focal glyphs including Concentric Cosmic Rings, Mystical Crescent Moons, Eyes of Providence, and Radiant Sunbursts with glowing core nodes.
  - **Satellite Nodes**: 3 to 8 orbiting celestial points tracking along outer perimeters.
- **Infinite Mystic Nomenclature**: Dynamic lexical matrix concatenating `[Prefix] [Core Noun] [Suffix / Epithet]` (e.g. *Solar Crucible of Dawn*, *Abyssal Vortex of Null*, *Astral Weaver Resonant*, *Cosmic Horizon of Infinity*) paired with authentic Roman numerals.

### 3. 🎛️ Suspense & Sensory Juice
- **Slow Peek / Squeeze Suspense**: 440ms anticipation lift upon picking a card, seeping an aura glow corresponding to the hidden outcome (Obsidian smoke, Silver mist, Golden fire, Polychrome rays) while synthesizing a rising-pitch tension sweep.
- **Rune Resonance Pentagram Circle**: 3D perspective 5-Seal matrix underneath cards tracking consecutive winning streaks, culminating in rotating **FATE SURGE Overdrive**.
- **Near-Miss Psychology**: When revealing a **The Void (`0.0x`)** loss, unpicked cards flip with a staggered rhythm (350ms). One unpicked card is guaranteed to reveal a Tier 3 (`5.0x`) Jackpot branded with an animated **SO CLOSE! MISSED JACKPOT** stamp accompanied by a procedural sigh sound.
- **Balatro-Style Multiplier Tally**: Multiplier numbers roll up with pitch-shifted mechanical synthesizer clicks (`440Hz * 2^(step/12)`), followed by an impactful micro-screen shake on final payout resolution.
- **Proactive Wager Validation & One-Click MAX All-in**:
  - **Instant MAX Clamp**: Calculates $\min(\text{Balance}, \text{MaxAllowedBet})$ for effortless All-in wagering.
  - **Automatic Live Clamping**: Re-evaluates and auto-clamps input values on balance updates without disruptive error dialogs.

### 4. 🎵 Pure Web Audio Procedural Synthesis (Zero External Files)
Built 100% with native Web Audio API oscillators, bandpass filters, and FM synthesizers (zero external audio file dependencies, instant load):
- **Balatro Dark Occult Lounge BGM**:
  - Continuous, smooth 4-chord progression (**Dm9 → Am9 → BbMaj7 → C9**) through a warm 750Hz lowpass filter with slow 0.05Hz breathing LFO modulation.
  - **Subtle Melodic Celestial Runs**: Intentional 8-note Aeolian modal melodic motifs playing every 3.8 seconds with soft bell envelopes (18ms attack, 1.4s exponential decay, octave shimmer overtone).
  - **Zero Fatiguing Pulse**: Completely eliminated repetitive heartbeat thumps.
  - **Zero Routine Ducking**: BGM maintains a stable, uninterrupted, soothing volume level (`nominalBgmGain = 0.22`) during normal gameplay, ducking gently only during the 5.0x Tier 3 Jackpot.
- **Tactile Casino Juice SFX**:
  - **Casino Chip Clink (`playChipClink`)**: 2.8kHz resonant pop (12ms decay) simulating heavy clay casino chips clattering when clicking bet modifier buttons (`1/2`, `2X`, `MAX`, `+1/+5/+25/+100`).
  - **Weighty Paper Card Slide (`playPaperSlideWhoosh`)**: Filtered noise sweeping 900Hz → 2400Hz with cardstock body snap for a tactile "SHH-WHIP".
  - **Mechanical Card Select (`playCardSelect`)**: 4ms micro-noise transient + woody 240Hz resonant pop ("TOCK").
  - **Silver FM Coin Ping (`playSilver`)**: 3 rapid FM coin pings (C7, E7, G7 with stereo shimmer) + pleasant ascending chime.
  - **Golden Sun Coin Shower (`playGold`)**: Rapid cascade of 6 metallic coin drops (0ms, 40ms, 85ms, 130ms, 180ms, 230ms) in stereo producing a rich "cha-ching" burst.
  - **The Void Deep Gong (`playMimic`)**: Heavy 75Hz → 24Hz sub-bass drop with 92Hz ominous low gong and tape-stop crunch.
  - **Mythic Jackpot Fanfare (`playLegendary`)**: Royal arpeggio (C5-E5-G5-B5-D6-G6) with shimmering polychrome bell resonance and sub-bass boom.
- **Master Brickwall Limiter**: Routes all SFX and BGM through a peak compressor/limiter (`threshold: -2.0dB`, `ratio: 16:1`) to prevent digital clipping while maximizing perceived loudness and warmth.

### 5. 📜 The Infinite Codex & Compendium
- **Tab 1: 12 Primal Pillars**: Tracks discovery of the 12 sacred foundational archetypes (3 Void, 3 Silver, 3 Gold, 3 Destiny). Unlocked cards illuminate with procedural vector art, while undiscovered cards remain shrouded in mystery.
- **Tab 2: Channeled Archive**: An unbounded scrollable grimoire archiving every unique procedural card channeled through VRF during gameplay, complete with edition badges and individual sigils.
- **Synchronized HUD Counters**: Real-time HUD button dynamically reports `Codex (X/12)` synchronized with the modal.

---

## ⚖️ Certified Provably Fair & Zero Modulo Bias

- **Smart Contract Compliance**: Fully implements the canonical [`ICasinoGameV2`](./simulator/contracts/ArcanaFate.sol) interface.
- **Unbiased Rejection Sampling**: Implements strict rejection sampling on 32-byte VRF seeds:
  ```solidity
  uint8 internal constant SAMPLE_RANGE = 100;
  uint8 internal constant SAMPLE_REJECT = 200; // floor(256 / 100) * 100 = 200
  ```
  Bytes $\ge 200$ are discarded, guaranteeing that each outcome $[0, 99]$ has exactly 2 preimages in $[0, 255]$, eliminating modulo bias entirely.
- **Mathematical RTP (96.00%)**:
  $$\text{RTP} = (50\% \times 0.0) + (30\% \times 1.2) + (16\% \times 2.5) + (4\% \times 5.0) = 0 + 0.36 + 0.40 + 0.20 = 96.00\%$$

| Tier Index | Card Class | Multiplier | Probability | Contract Math | Payout (`wager = 10`) | Visual Tier |
|:---:|:---|:---:|:---:|:---|:---:|:---|
| **0** | **The Void** | `x0.0` | 50.0% | `0` | `0 TEST` | Obsidian Iron |
| **1** | **Silver Rune** | `x1.2` | 30.0% | `(wager * 12) / 10` | `12 TEST` | Antique Silver |
| **2** | **Golden Sun** | `x2.5` | 16.0% | `(wager * 25) / 10` | `25 TEST` | Solar Gold |
| **3** | **Destiny** | `x5.0` | 4.0% | `wager * 5` | `50 TEST` | Royal Polychrome |

- **Interactive Verification**: Every history pill in the Live History strip opens a Stake-style Provably Fair Verifier displaying the 32-byte hex seed, roll number, transaction hash, and timestamp.

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
│       │   │   ├── CardStage.tsx       # 3D card stage, 90s TCG cards, near-miss stamps, tallying
│       │   │   ├── ProceduralSigil.tsx  # Pure SVG sacred geometry vector engine
│       │   │   ├── Sidebar.tsx          # Bet controls, chip clink SFX, balance card, audio toggles
│       │   │   ├── CollectionModal.tsx  # Dual-tab Codex & Channeled Archive
│       │   │   ├── VerifyModal.tsx      # Provably fair verification modal
│       │   │   ├── StatsStrip.tsx       # Live session statistics & reset
│       │   │   └── HistoryStrip.tsx     # Clickable session outcomes
│       │   ├── lib/
│       │   │   ├── mimic.ts            # Contract paytable & outcome decoder
│       │   │   ├── proceduralNames.ts  # Deterministic card naming & archetype registry
│       │   │   ├── audio.ts            # Procedural Web Audio API sound manager (BGM & SFX)
│       │   │   └── useCasinoHost.ts    # Dual-mode Penpal guest bridge / standalone demo
│       │   ├── App.tsx                 # Core game state machine, header bar, round orchestration
│       │   └── styles.css              # 90s TCG cards, velvet table, dust motes, candle flicker
│       └── index.html                  # Includes mandatory Chain Jam widget script & Google Fonts
├── simulator/
│   └── contracts/
│       ├── ArcanaFate.sol         # Production smart contract (ICasinoGameV2)
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
- [x] **Zero External Asset Dependencies**: 100% pure procedural Web Audio API synthesis and SVG vector graphics for lightning-fast loading.

---

## 📜 License

This project is licensed under the [MIT License](LICENSE). Built with 🔮 by the Arcana Fate team for **Chain Jam Vol. 1**.
