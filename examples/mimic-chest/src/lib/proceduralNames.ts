import { hashSeed } from '../components/ProceduralSigil';

export type TierInput = 'void' | 'silver' | 'gold' | 'destiny' | 'MIMIC' | 'SILVER' | 'GOLD' | 'LEGENDARY' | number;

export interface MysticCardDef {
  id: string;
  seed: number;
  name: string;
  prefix: string;
  core: string;
  suffix: string;
  roman: string;
  category: string;
  tierIndex: number;
  tier: 'MIMIC' | 'SILVER' | 'GOLD' | 'LEGENDARY';
  multiplier: number;
  multiplierText: string;
  subtitle: string;
  flavorText: string;
  sigilSeed: number;
}

// -------------------------------------------------------------
// VOCABULARY MATRICES
// -------------------------------------------------------------

const TIER_META = [
  {
    tier: 'MIMIC' as const,
    tierIndex: 0,
    multiplier: 0,
    multiplierText: 'x0.0',
    category: 'The Void',
    prefixes: [
      'Void',
      'Abyssal',
      'Nether',
      'Obsidian',
      'Null',
      'Eldritch',
      'Entropic',
      'Shadow',
      'Cursed',
      'Hollow',
      'Eclipse',
      'Umbral',
      'Dread',
      'Phantom',
      'Singularity',
      'Nocturnal',
    ],
    cores: [
      'Vortex',
      'Siphon',
      'Maw',
      'Paradox',
      'Chasm',
      'Shard',
      'Abyss',
      'Crypt',
      'Echo',
      'Rift',
      'Monolith',
      'Labyrinth',
      'Omen',
      'Cipher',
      'Spire',
    ],
    suffixes: [
      'of the Abyss',
      'of Null',
      'of Oblivion',
      'Zero',
      'of Ruin',
      'Forgotten',
      'Consumed',
      'of Shadows',
      'Beyond Life',
      'of Despair',
      'Dreadbound',
      'of Emptiness',
    ],
    romans: ['0', 'Ø', 'XIII', 'XVI', 'XVIII', 'XXIII', 'NULL', 'Ω'],
    subtitles: [
      'Cursed threshold',
      'Devourer of light',
      'Entropic singularity',
      'Hollow oblivion',
      'Silent nullifier',
      'Shadow consumption',
    ],
    flavors: [
      'A bottomless cosmic rift that devours light and betakes all mortal treasure into nothingness.',
      'Entropic resonance drains the ether, leaving only silent hollow echoes in the dark.',
      'The ancient unmaker wakes, pulling fortunes beyond the threshold of nonexistence.',
      'Whispers from the hollow void collapse your wager into frozen starlight.',
      'All paths through this forbidden cipher fold into an inescapable, silent zero.',
      'A hungry abyss consumes the spark of luck, sealing the chamber in crimson gloom.',
    ],
  },
  {
    tier: 'SILVER' as const,
    tierIndex: 1,
    multiplier: 1.2,
    multiplierText: 'x1.2',
    category: 'Silver Rune',
    prefixes: [
      'Astral',
      'Lunar',
      'Silver',
      'Ethereal',
      'Arcane',
      'Spectral',
      'Chrono',
      'Mercurial',
      'Crystal',
      'Resonant',
      'Harmonic',
      'Shimmering',
      'Glacial',
      'Zephyr',
      'Starlit',
      'Mystic',
    ],
    cores: [
      'Glyph',
      'Weaver',
      'Prism',
      'Beacon',
      'Shard',
      'Talisman',
      'Pendulum',
      'Mirror',
      'Relic',
      'Compass',
      'Spiral',
      'Lattice',
      'Spire',
      'Nexus',
      'Sigil',
    ],
    suffixes: [
      'of Dawn',
      'of Equilibrium',
      'Resonant',
      'of the Moon',
      'Ascendant',
      'Balanced',
      'of Purity',
      'Harmonized',
      'of Mercury',
      'of the Tide',
      'of Clarity',
      'Serene',
    ],
    romans: ['II', 'III', 'VI', 'VIII', 'XIV', 'XV', 'IX', 'VII'],
    subtitles: [
      'Harmonic resonance',
      'Mercurial safe passage',
      'Lunar equilibrium',
      'Ethereal attunement',
      'Sacred rune guardian',
      'Gentle profit keeper',
    ],
    flavors: [
      'Polished astral silver reflects destiny, returning your stake crowned with a sacred 20% bonus.',
      'Harmonic resonance attunes the ley lines, safeguarding wealth with mercurial grace.',
      'A tranquil lunar compass guides safe passage through the perilous dungeon corridors.',
      'Crystalline lattice hums gently, transmuting cosmic dust into pure silver fortune.',
      'Silver runes align under starlight, granting calm assurance and steady bounty.',
      'The celestial mirror reveals hidden currents, guiding your path safely into profit.',
    ],
  },
  {
    tier: 'GOLD' as const,
    tierIndex: 2,
    multiplier: 2.5,
    multiplierText: 'x2.5',
    category: 'Golden Sun',
    prefixes: [
      'Solar',
      'Radiant',
      'Aureate',
      'Gilded',
      'Prime',
      'Sovereign',
      'Ignis',
      'Imperial',
      'Crowned',
      'Dawn',
      'Blazing',
      'Celestial',
      'Pyre',
      'Hyperion',
      'Golden',
      'Helios',
    ],
    cores: [
      'Sun',
      'Crucible',
      'Monolith',
      'Aegis',
      'Engine',
      'Crown',
      'Scepter',
      'Citadel',
      'Forge',
      'Zenith',
      'Matrix',
      'Vessel',
      'Pyramid',
      'Loom',
      'Relic',
    ],
    suffixes: [
      'of Splendor',
      'of Dawn',
      'Ascendant',
      'Sovereign',
      'of Kings',
      'Unleashed',
      'of Radiance',
      'of Fortune',
      'of the Sun',
      'Triumphant',
      'Eternal',
      'Magnificent',
    ],
    romans: ['I', 'IV', 'XI', 'XIX', 'XXIV', 'V', 'XII', 'XVIII'],
    subtitles: [
      'Solar transcendence',
      'Radiant golden bounty',
      'Forge of sovereigns',
      'Gilded zenith',
      'Aureate triumphal',
      'Imperial solar light',
    ],
    flavors: [
      'Blazing solar arcana erupts with searing golden light, multiplying your bounty by 2.5x.',
      'The gilded forge of the celestial architect blesses the brave with radiant treasures.',
      'A triumphant beacon of golden fire pierces through dungeon gloom with regal power.',
      'Liquid gold flows from the cosmic crucible, filling your coffers with boundless favor.',
      'The solar monolith shines at high noon, crowning your wager with imperial golden riches.',
      'Solar flares ignite the ancient vault, revealing deep veins of crystalline gold.',
    ],
  },
  {
    tier: 'LEGENDARY' as const,
    tierIndex: 3,
    multiplier: 5.0,
    multiplierText: 'x5.0',
    category: 'Wheel of Destiny',
    prefixes: [
      'Cosmic',
      'Singularity',
      'Quantum',
      'Genesis',
      'Infinite',
      'Mythic',
      'Primordial',
      'Omniscient',
      'Transcendent',
      'Divine',
      'Sovereign',
      'Apex',
      'Ouroboros',
      'Eternal',
      'Supernova',
      'Eschaton',
    ],
    cores: [
      'Wheel',
      'Horizon',
      'Nexus',
      'Paradox',
      'Destiny',
      'Core',
      'Eternity',
      'Eye',
      'Loom',
      'Infinity',
      'Monolith',
      'Weaver',
      'Crucible',
      'Gate',
      'Singularity',
    ],
    suffixes: [
      'of Infinity',
      'Beyond',
      'Prime',
      'of Eternity',
      'Unleashed',
      'of Fate',
      'Sovereign',
      'of the Cosmos',
      'Awakened',
      'Supreme',
      'of Creation',
      'Transcendent',
    ],
    romans: ['X', 'XVII', 'XX', 'XXI', 'XXII', '∞', 'ALPHA', 'OMEGA'],
    subtitles: [
      'Sovereign max jackpot',
      'Fate rewritten',
      'Cosmic singularity',
      'Genesis arcana',
      'Supreme destiny',
      'Infinite realm unlock',
    ],
    flavors: [
      'The mythical sovereign wheel fractures space-time, unleashing the ultimate 5.0x Jackpot!',
      'Transcendent cosmic geometry aligns the universe to bestow supreme sovereign glory.',
      'A reality-bending paradox rewrites destiny itself, showering the realm in jackpot starlight.',
      'Primordial nexus of pure creation unlocks the highest vault of cosmic abundance.',
      'The eye of infinity opens upon the dungeon, crowning the chosen one with 5.0x bounty.',
      'Space and time bend in reverent stillness as the celestial wheel seals your mythic victory.',
    ],
  },
];

/**
 * Normalizes input tier into integer index 0..3
 */
export function normalizeTierIndex(tier: TierInput): number {
  if (typeof tier === 'number') {
    return Math.max(0, Math.min(3, Math.floor(tier)));
  }
  const lower = String(tier).toLowerCase();
  if (lower === 'void' || lower === 'mimic') return 0;
  if (lower === 'silver') return 1;
  if (lower === 'gold') return 2;
  if (lower === 'destiny' || lower === 'legendary') return 3;
  return 0;
}

/**
 * Deterministically generates an infinite mystic card given a seed and tier.
 * Same seed + same tier = 100% deterministic name, sigil configuration, and flavor.
 */
export function generateMysticCard(seed: number | string, tier: TierInput): MysticCardDef {
  const numSeed = hashSeed(seed);
  const tierIndex = normalizeTierIndex(tier);
  const meta = TIER_META[tierIndex];

  // Deterministic word indices
  const prefixIdx = (numSeed + tierIndex * 13) % meta.prefixes.length;
  const coreIdx = (Math.floor(numSeed / 11) + tierIndex * 7) % meta.cores.length;
  const suffixIdx = (Math.floor(numSeed / 23) + tierIndex * 17) % meta.suffixes.length;

  const prefix = meta.prefixes[prefixIdx];
  const core = meta.cores[coreIdx];
  const suffix = meta.suffixes[suffixIdx];

  const name = `${prefix} ${core} ${suffix}`;
  const id = `SIGIL_${meta.tier}_${prefix.toUpperCase()}_${core.toUpperCase()}_${numSeed % 10000}`;

  const romanIdx = (numSeed + tierIndex * 5) % meta.romans.length;
  const roman = meta.romans[romanIdx];

  const subtitleIdx = (numSeed + tierIndex * 3) % meta.subtitles.length;
  const subtitle = meta.subtitles[subtitleIdx];

  const flavorIdx = (Math.floor(numSeed / 31) + tierIndex * 9) % meta.flavors.length;
  const flavorText = meta.flavors[flavorIdx];

  return {
    id,
    seed: numSeed,
    name,
    prefix,
    core,
    suffix,
    roman,
    category: meta.category,
    tierIndex,
    tier: meta.tier,
    multiplier: meta.multiplier,
    multiplierText: meta.multiplierText,
    subtitle,
    flavorText,
    sigilSeed: numSeed,
  };
}

/**
 * 12 Sacred Foundational Archetypes for the Tarot Compendium / Codex.
 * These 12 sacred pillars form the base grimoire for players to discover.
 */
export const SACRED_ARCHETYPES: MysticCardDef[] = [
  // Tier 0 (The Void x0.0)
  generateMysticCard(1019, 'void'),
  generateMysticCard(2027, 'void'),
  generateMysticCard(3049, 'void'),

  // Tier 1 (Silver Rune x1.2)
  generateMysticCard(4093, 'silver'),
  generateMysticCard(5107, 'silver'),
  generateMysticCard(6113, 'silver'),

  // Tier 2 (Golden Sun x2.5)
  generateMysticCard(7129, 'gold'),
  generateMysticCard(8147, 'gold'),
  generateMysticCard(9161, 'gold'),

  // Tier 3 (Wheel of Destiny x5.0)
  generateMysticCard(10177, 'destiny'),
  generateMysticCard(11197, 'destiny'),
  generateMysticCard(12209, 'destiny'),
];

export const LEGACY_INDEX_MAP: Record<string, number> = {
  THE_FOOL: 0,
  THE_HANGED_MAN: 1,
  THE_MIMIC: 2,
  THE_MAGICIAN: 3,
  THE_HERMIT: 4,
  THE_EMPRESS: 5,
  THE_SUN: 6,
  THE_STAR: 7,
  WHEEL_OF_FORTUNE: 8,
  THE_WORLD: 9,
  THE_SOUL: 10,
  WHEEL_OF_DESTINY: 11,
};

/**
 * Computes the set of unlocked pillar indices (0..11) from raw discovered card IDs.
 */
export function computeUnlockedPillarsIndices(discoveredCardIds: string[]): Set<number> {
  const set = new Set<number>();
  for (const rawId of discoveredCardIds) {
    // 1. Direct legacy ID match
    if (LEGACY_INDEX_MAP[rawId] !== undefined) {
      set.add(LEGACY_INDEX_MAP[rawId]);
      continue;
    }
    // 2. Direct sacred archetype ID match
    const directIdx = SACRED_ARCHETYPES.findIndex(c => c.id === rawId);
    if (directIdx !== -1) {
      set.add(directIdx);
      continue;
    }
    // 3. Procedural ID pattern: SIGIL_<TIER>_<WORDS>_<SEED>
    if (rawId.startsWith('SIGIL_')) {
      if (rawId.includes('_MIMIC_')) {
        const slot = Math.abs(rawId.length) % 3;
        set.add(slot); // 0, 1, or 2
      } else if (rawId.includes('_SILVER_')) {
        const slot = 3 + (Math.abs(rawId.length) % 3);
        set.add(slot); // 3, 4, or 5
      } else if (rawId.includes('_GOLD_')) {
        const slot = 6 + (Math.abs(rawId.length) % 3);
        set.add(slot); // 6, 7, or 8
      } else if (rawId.includes('_LEGENDARY_')) {
        const slot = 9 + (Math.abs(rawId.length) % 3);
        set.add(slot); // 9, 10, or 11
      }
    }
  }
  return set;
}

/**
 * Computes the exact number of unlocked 12 Primal Pillars (0..12).
 * Used by both HUD button and Modal header so they match 100%.
 */
export function computeUnlockedPillarsCount(discoveredCardIds: string[]): number {
  return computeUnlockedPillarsIndices(discoveredCardIds).size;
}

