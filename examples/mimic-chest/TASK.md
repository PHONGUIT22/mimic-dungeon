# TASK: ULTRA-POLISH "ARCANA FATE" TO A SHOWSTOPPER CASINO EXPERIENCE (CHAIN JAM VOL. 1)

You are tasked with executing the **Phase 3: Showstopper Upgrade** for `Arcana Fate: Mimic Dungeon` (a Vite + React 19 + TypeScript Web3 Casino game for Chain Jam Vol. 1).

Your mission is to elevate this game from a "qualifying entry" into a **Top-3 Winner & Chain.wtf Integration candidate** by executing 3 strategic pillars:
1. **Anti-AI-Slop Purge & Taste Elevation** (strict compliance with `RULE.md`).
2. **Balatro-Style Casino Juice & Psychological Suspense** (Squeeze tension, near-miss impact, dynamic foil sheen).
3. **Retention & Meta-Progression** (Dark Oracle Prophecies, Tarot Codex tracker, Rune Resonance Surge).

---

### STRICT CONSTRAINTS & INVARIANTS (CRITICAL)
1. **DO NOT touch or alter** `solidity/contracts/ArcanaFate.sol` or `simulator/contracts/ArcanaFate.sol`.
2. **DO NOT modify the mathematical RTP (96.00%) or the 4 core tiers**:
   - Tier 0: The Void (`x0.0`) - 50%
   - Tier 1: Silver Rune (`x1.2`) - 30%
   - Tier 2: Golden Sun (`x2.5`) - 16%
   - Tier 3: Wheel of Destiny (`x5.0`) - 4%
   - Mathematical formula: `0.50*0 + 0.30*1.2 + 0.16*2.5 + 0.04*5.0 = 0.96` (Exact).
3. **DO NOT break `@chain/casino-sdk` integration**:
   - `useCasinoHost.ts`, Penpal bridge, session lifecycle, manifest schema must remain 100% compliant.
   - Dual-mode (Iframe Penpal vs Standalone Demo with 1,000 TEST tokens) must stay functional.
4. **DO NOT remove the Jam Widget** `<script async src="https://jam.chain.wtf/widget.js"></script>` in `index.html`.
5. **DO NOT add external audio files (mp3/wav) or CDN image placeholders**:
   - Audio must stay 100% pure procedural Web Audio API in `src/lib/audio.ts`.
   - Visuals must stay 100% procedural SVG / CSS / Canvas.
6. **Code must compile cleanly**: `npm run build` and `npx tsc --noEmit` must pass with 0 errors.

---

### PILLAR 1: ANTI-AI-SLOP PURGE & TASTE ELEVATION (RULE.md COMPLIANCE)

#### 1.1 Replace ALL Emoji in UI controls with Monoline SVG (1.6–1.8px stroke, `currentColor`)
Inspect all components (`App.tsx`, `Sidebar.tsx`, `CollectionModal.tsx`, `PaytableModal.tsx`, `CardStage.tsx`):
- **Header Logo (`App.tsx`)**: Replace `<span>🔮</span>` with a custom, geometric Sacred Sigil / Arcana Eye SVG.
- **Fast Mode Button (`App.tsx` & `Sidebar.tsx`)**: Replace `⚡` with a crisp 1.8px stroke lightning bolt SVG (`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">...`).
- **BGM Button (`App.tsx` & `Sidebar.tsx`)**: Replace `🎵` / `🔇` with an occult soundwave / lyre chord SVG.
- **Collection / Codex Button (`Sidebar.tsx` & `CollectionModal.tsx`)**: Replace `🔯`, `🏛️`, `📜` with an ancient grimoire / runic tablet SVG.
- **Paytable Modal (`PaytableModal.tsx`)**:
  - Remove all emoji: `🔮`, `☀️`, `🥈`, `💀`. Replace with clean SVG glyphs or medieval roman numerals (`0`, `I`, `II`, `III`).
  - **Rule 5 Fix**: Drop `borderLeft: 3px solid ${tier.color}` on rounded cards (the canonical "AI dashboard tile"). Use a subtle inner border or full border color tone without the generic left-stripe.

#### 1.2 Occult Velvet Altar Atmosphere
- Enhance the tabletop feel in `src/styles.css` and `CardStage.tsx`:
  - Deepen the crimson/dark-purple velvet cloth texture with subtle radial lighting.
  - Animate the twin occult candles with realistic organic flame flickers and dynamic warm glow casting across the 3 card slots.
  - Remove any generic SaaS/dashboard card borders.

---

### PILLAR 2: BALATRO CASINO JUICE & PSYCHOLOGICAL SUSPENSE

#### 2.1 Squeeze Suspense Phase (Rising Tension)
When player picks a card during `awaiting_pick`:
1. The selected card smoothly lifts `translateY(-24px) scale(1.08)`.
2. Aura glow corresponding to the outcome tier seeps through the card edges (Void: deep crimson smoke; Silver: ethereal pale blue; Gold: radiant solar amber; Destiny: chromatic plasma).
3. Audio synth triggers a rising pitch tension sweep (`sound.playCardSqueeze(tier)`).
4. After ~400ms suspense, the card snaps open with an explosive particle burst.

#### 2.2 Near-Miss Psychological Reveal
When the player hits **Tier 0: The Void (x0.0)**:
1. The 2 unpicked cards flip 350ms later to reveal near-miss outcomes (at least one Tier 2 or Tier 3).
2. If a missed Tier 3 (Destiny x5.0) is revealed, stamp an embossed wax seal / gothic stamp: **"SO CLOSE! MISSED JACKPOT"**.
3. Audio synth plays a subtle ethereal descending sigh (`sound.playNearMissSigh()`), triggering immediate replay instinct.

#### 2.3 Dynamic Balatro Card Editions (Foil, Holo, Polychrome)
- **Foil (+50 Chip shimmer)**: Metallic silver-gold reflective sheen that moves with cursor angle.
- **Holographic (+10 Multiplier pulse)**: Prismatic spectral refraction across the card face.
- **Polychrome (x1.5 Multiplier flame)**: Swirling rainbow plasma background with flaming border and screen-shake on reveal.

---

### PILLAR 3: RETENTION & META-PROGRESSION

#### 3.1 Dark Oracle Prophecies
In `CardStage.tsx` and `App.tsx`:
- When idle or awaiting wager, the Altar foot displays mystical procedurally selected oracle whisper quotes:
  - *"The stars align in solar gold tonight..."*
  - *"Beware the thirteenth seal; the Void hungers..."*
  - *"Destiny smiles upon those who dare the third card..."*
- Rotates smoothly every 12 seconds with gentle fade in/out.

#### 3.2 Tarot Codex & Relic Completion Tracker
- In `Sidebar.tsx` and `CollectionModal.tsx`:
  - Clearly display collection discovery count: **"X / 48 Arcana Relics Discovered"** (12 Archetypes × 4 Editions: Standard, Foil, Holo, Polychrome).
  - Add milestone badges:
    - *Novice Seeker* (5 relics)
    - *Occult Adept* (15 relics)
    - *Fate Weaver* (30 relics)
    - *Grand Inquisitor* (all 48 relics)
  - Persist discovery history in `localStorage`.

#### 3.3 Rune Resonance (Consecutive Win Streak Overdrive)
- When player strings 2+ consecutive wins:
  - Pentagram Sigil on tabletop lights up:
    - Streak 1: Seal of Ether (pale cyan).
    - Streak 2: Seal of Wealth (solar amber).
    - Streak 3+: **FATE SURGE OVERDRIVE** (plasma purple rotation, increased particle density, enhanced pitch-shift tally audio).

---

### VERIFICATION & QUALITY GATES
Execute after all changes:
1. `npm run build` in `casino-sdk/examples/mimic-chest` must exit code 0.
2. `npx tsc --noEmit` in `casino-sdk/examples/mimic-chest` must pass with 0 errors.
3. Open standalone demo in browser, verify:
   - 3-card spread deals smoothly.
   - Squeeze suspense audio and aura play before card flip.
   - Near-miss reveal triggers properly on loss.
   - Zero emojis in UI controls.
   - Compendium opens and tracks relics correctly.