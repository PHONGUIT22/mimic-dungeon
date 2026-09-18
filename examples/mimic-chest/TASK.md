# TASK: OVERHAUL "ARCANA FATE" TO A 3-CARD BALATRO-STYLE CASINO EXPERIENCE

You are tasked with upgrading the frontend and presentation layer of `Arcana Fate: Mimic Dungeon` (a Vite + React 19 + TypeScript Web3 Casino game for Chain Jam Vol. 1). 

### CORE OBJECTIVE
Transform the single-card draw into an engaging, high-retention 3-card "Arcana Pack" spread with Balatro aesthetic, "Illusion of Control" interactive picking, "Near-Miss" psychological reveal, dynamic foil editions, and pitch-shifted tally sound design.

### STRICT CONSTRAINTS & INVARIANTS (CRITICAL)
1. DO NOT touch or alter `solidity/contracts/ArcanaFate.sol`.
2. DO NOT change the mathematical RTP (96.00%) or the 4 core tiers:
   - Tier 0: The Void (x0.0) - 50%
   - Tier 1: Silver Rune (x1.2) - 30%
   - Tier 2: Golden Sun (x2.5) - 16%
   - Tier 3: Wheel of Destiny (x5.0) - 4%
3. DO NOT break the `@chain/casino-sdk` integration (`useCasinoHost.ts`, `Penpal` bridge, session lifecycle, manifest schema).
4. VRF still resolves exactly ONE outcome per round on-chain/mock. The 3-card mechanic is handled on the client:
   - Player initiates wager -> 3 cards deal face-down.
   - Player clicks 1 of the 3 cards.
   - The selected card MUST bind to the actual VRF outcome.
   - The remaining 2 cards flip immediately after (staggered by 300ms) with simulated "near-miss" outcomes (e.g. if player drew Tier 0, reveal one Tier 1/2 and one Tier 3 in the other slots to induce near-miss FOMO).
5. Must compile cleanly with `npm run build` and pass `tsc --noEmit` without any type errors.

---