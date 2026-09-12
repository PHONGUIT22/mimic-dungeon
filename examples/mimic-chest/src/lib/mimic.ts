import { decodeAbiParameters, encodeAbiParameters, hexToBytes, keccak256, type Hex } from 'viem';
import type { HexString } from '@chain/casino-sdk';

export const RTP_BPS = 9600n; // 96.00% RTP
export const BASIS_POINTS = 10000n;
export const MAX_MULTIPLIER = 5n;

export const SAMPLE_RANGE = 100;
export const SAMPLE_REJECT = 200; // floor(256 / 100) * 100 = 200. Rejects >= 200 to eliminate modulo bias.

export type ChestTierType = 'MIMIC' | 'SILVER' | 'GOLD' | 'LEGENDARY';

export type ChestTierInfo = {
  tier: ChestTierType;
  tierIndex: number;
  name: string;
  nameVi: string;
  multiplier: number;
  multiplierText: string;
  probability: number;
  probabilityText: string;
  color: string;
  glowColor: string;
  bgGradient: string;
  badgeBorder: string;
  description: string;
};

export const PAYTABLE: ChestTierInfo[] = [
  {
    tier: 'MIMIC',
    tierIndex: 0,
    name: 'The Void',
    nameVi: 'Lá Bài Hư Vô (Cursed)',
    multiplier: 0,
    multiplierText: 'x0.0',
    probability: 0.50,
    probabilityText: '50.0%',
    color: '#ef4444',
    glowColor: 'rgba(239, 68, 68, 0.6)',
    bgGradient: 'from-purple-950/90 to-black',
    badgeBorder: 'border-red-600',
    description: 'The cursed dark void consumes your wager into oblivion (x0.0).',
  },
  {
    tier: 'SILVER',
    tierIndex: 1,
    name: 'Silver Rune',
    nameVi: 'Cổ Tự Bạc (Silver)',
    multiplier: 1.2,
    multiplierText: 'x1.2',
    probability: 0.30,
    probabilityText: '30.0%',
    color: '#cbd5e1',
    glowColor: 'rgba(148, 163, 184, 0.6)',
    bgGradient: 'from-slate-900 to-neutral-950',
    badgeBorder: 'border-slate-400',
    description: 'Sacred silver glyph grants your bet back plus 20% bonus profit (x1.2).',
  },
  {
    tier: 'GOLD',
    tierIndex: 2,
    name: 'Golden Sun',
    nameVi: 'Thái Dương Vàng (Gold)',
    multiplier: 2.5,
    multiplierText: 'x2.5',
    probability: 0.16,
    probabilityText: '16.0%',
    color: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.6)',
    bgGradient: 'from-amber-950/80 to-neutral-950',
    badgeBorder: 'border-amber-400',
    description: 'Radiant solar arcana bestows a blazing 2.5x golden payout (x2.5).',
  },
  {
    tier: 'LEGENDARY',
    tierIndex: 3,
    name: 'Wheel of Destiny',
    nameVi: 'Vòng Quay Định Mệnh (Mythic)',
    multiplier: 5.0,
    multiplierText: 'x5.0',
    probability: 0.04,
    probabilityText: '4.0%',
    color: '#c084fc',
    glowColor: 'rgba(192, 132, 252, 0.8)',
    bgGradient: 'from-fuchsia-950/90 to-purple-950',
    badgeBorder: 'border-purple-400',
    description: 'Mythical holographic foil card that bends fate itself! Top 5.0x Jackpot (x5.0).',
  },
];

export type CardEdition = 'standard' | 'foil' | 'holo' | 'polychrome';

export type TarotCardId =
  | 'THE_FOOL'
  | 'THE_HANGED_MAN'
  | 'THE_MIMIC'
  | 'THE_MAGICIAN'
  | 'THE_HERMIT'
  | 'THE_EMPRESS'
  | 'THE_SUN'
  | 'THE_STAR'
  | 'WHEEL_OF_FORTUNE'
  | 'THE_WORLD'
  | 'THE_SOUL'
  | 'WHEEL_OF_DESTINY';

export type TarotCardDef = {
  id: TarotCardId;
  name: string;
  roman: string;
  category: string;
  tierIndex: number;
  tier: ChestTierType;
  multiplier: number;
  multiplierText: string;
  subtitle: string;
  description: string;
  iconType: string;
};

export type DisplayCard = {
  cardId: TarotCardId;
  name: string;
  roman: string;
  category: string;
  tierIndex: number;
  tier: ChestTierType;
  multiplier: number;
  multiplierText: string;
  payout: bigint;
  subtitle: string;
  description: string;
  edition: CardEdition;
  isActualOutcome?: boolean;
  roll?: number;
  iconType: string;
};

export const TAROT_CATALOG: Record<TarotCardId, TarotCardDef> = {
  // Tier 0 (0.0x - The Void)
  THE_FOOL: {
    id: 'THE_FOOL',
    name: 'The Fool',
    roman: '0',
    category: 'The Void',
    tierIndex: 0,
    tier: 'MIMIC',
    multiplier: 0,
    multiplierText: 'x0.0',
    subtitle: 'Zero sum oblivion',
    description: 'A heedless leap into darkness. The abyss devours all.',
    iconType: 'fool',
  },
  THE_HANGED_MAN: {
    id: 'THE_HANGED_MAN',
    name: 'The Hanged Man',
    roman: 'XII',
    category: 'The Void',
    tierIndex: 0,
    tier: 'MIMIC',
    multiplier: 0,
    multiplierText: 'x0.0',
    subtitle: 'Bound by the abyss',
    description: 'Suspended in twilight stillness. No return from the depths.',
    iconType: 'hanged_man',
  },
  THE_MIMIC: {
    id: 'THE_MIMIC',
    name: 'The Devourer',
    roman: 'XIII',
    category: 'The Void',
    tierIndex: 0,
    tier: 'MIMIC',
    multiplier: 0,
    multiplierText: 'x0.0',
    subtitle: 'Swallowed whole',
    description: 'Vicious fangs snap shut from the shadows. Bet consumed.',
    iconType: 'mimic',
  },

  // Tier 1 (1.2x - Silver)
  THE_MAGICIAN: {
    id: 'THE_MAGICIAN',
    name: 'The Magician',
    roman: 'I',
    category: 'Silver Arcana',
    tierIndex: 1,
    tier: 'SILVER',
    multiplier: 1.2,
    multiplierText: 'x1.2',
    subtitle: 'Arcane transmutation',
    description: 'Transmutes raw ether into reliable silver gains.',
    iconType: 'magician',
  },
  THE_HERMIT: {
    id: 'THE_HERMIT',
    name: 'The Hermit',
    roman: 'IX',
    category: 'Silver Arcana',
    tierIndex: 1,
    tier: 'SILVER',
    multiplier: 1.2,
    multiplierText: 'x1.2',
    subtitle: 'Solitary fortune',
    description: 'The ancient lantern reveals a safe and steady path.',
    iconType: 'hermit',
  },
  THE_EMPRESS: {
    id: 'THE_EMPRESS',
    name: 'The Empress',
    roman: 'III',
    category: 'Silver Arcana',
    tierIndex: 1,
    tier: 'SILVER',
    multiplier: 1.2,
    multiplierText: 'x1.2',
    subtitle: 'Bountiful blessing',
    description: 'Fertile harvest showers modest silver bounty upon your stake.',
    iconType: 'empress',
  },

  // Tier 2 (2.5x - Gold)
  THE_SUN: {
    id: 'THE_SUN',
    name: 'The Sun',
    roman: 'XIX',
    category: 'Solar Arcana',
    tierIndex: 2,
    tier: 'GOLD',
    multiplier: 2.5,
    multiplierText: 'x2.5',
    subtitle: 'Radiant gold payout',
    description: 'Solar flares illuminate rich golden treasure.',
    iconType: 'sun',
  },
  THE_STAR: {
    id: 'THE_STAR',
    name: 'The Star',
    roman: 'XVII',
    category: 'Solar Arcana',
    tierIndex: 2,
    tier: 'GOLD',
    multiplier: 2.5,
    multiplierText: 'x2.5',
    subtitle: 'Guiding celestial light',
    description: 'A brilliant constellation promises stellar golden victory.',
    iconType: 'star',
  },
  WHEEL_OF_FORTUNE: {
    id: 'WHEEL_OF_FORTUNE',
    name: 'Wheel of Fortune',
    roman: 'X',
    category: 'Solar Arcana',
    tierIndex: 2,
    tier: 'GOLD',
    multiplier: 2.5,
    multiplierText: 'x2.5',
    subtitle: 'Turn of the fates',
    description: 'The great wheel halts on magnificent golden prosperity.',
    iconType: 'wheel',
  },

  // Tier 3 (5.0x - Mythic Jackpot)
  THE_WORLD: {
    id: 'THE_WORLD',
    name: 'The World',
    roman: 'XXI',
    category: 'Cosmic Arcana',
    tierIndex: 3,
    tier: 'LEGENDARY',
    multiplier: 5.0,
    multiplierText: 'x5.0',
    subtitle: 'Cosmic ascension',
    description: 'Complete cosmic mastery! Top 5.0x Mythic Jackpot.',
    iconType: 'world',
  },
  THE_SOUL: {
    id: 'THE_SOUL',
    name: 'The Soul',
    roman: '∞',
    category: 'Cosmic Arcana',
    tierIndex: 3,
    tier: 'LEGENDARY',
    multiplier: 5.0,
    multiplierText: 'x5.0',
    subtitle: 'Transcendent jackpot',
    description: 'Ethereal immortality and celestial vault unlocked.',
    iconType: 'soul',
  },
  WHEEL_OF_DESTINY: {
    id: 'WHEEL_OF_DESTINY',
    name: 'Wheel of Destiny',
    roman: '★',
    category: 'Cosmic Arcana',
    tierIndex: 3,
    tier: 'LEGENDARY',
    multiplier: 5.0,
    multiplierText: 'x5.0',
    subtitle: 'Celestial sovereign',
    description: 'The stars align for sovereign maximum jackpot reward.',
    iconType: 'destiny',
  },
};

export const CARDS_BY_TIER: Record<number, TarotCardDef[]> = {
  0: [TAROT_CATALOG.THE_FOOL, TAROT_CATALOG.THE_HANGED_MAN, TAROT_CATALOG.THE_MIMIC],
  1: [TAROT_CATALOG.THE_MAGICIAN, TAROT_CATALOG.THE_HERMIT, TAROT_CATALOG.THE_EMPRESS],
  2: [TAROT_CATALOG.THE_SUN, TAROT_CATALOG.THE_STAR, TAROT_CATALOG.WHEEL_OF_FORTUNE],
  3: [TAROT_CATALOG.THE_WORLD, TAROT_CATALOG.THE_SOUL, TAROT_CATALOG.WHEEL_OF_DESTINY],
};

/**
 * Deterministically or pseudo-randomly assign card edition:
 * Standard: 70%
 * Foil: 15% (silver reflective border + spark glow)
 * Holo: 10% (prismatic color-shifting background)
 * Polychrome: 5% (vibrant rainbow gradient cycling sheen)
 */
export function sampleCardEdition(seed?: number | string): CardEdition {
  let rand: number;
  if (typeof seed === 'number') {
    rand = (Math.abs(seed * 9301 + 49297) % 233280) / 233280;
  } else if (typeof seed === 'string' && seed.length > 0) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    rand = (Math.abs(hash) % 1000) / 1000;
  } else {
    rand = Math.random();
  }

  if (rand < 0.70) return 'standard';
  if (rand < 0.85) return 'foil';
  if (rand < 0.95) return 'holo';
  return 'polychrome';
}

export function createDisplayCard(
  cardDef: TarotCardDef,
  wager: bigint,
  edition: CardEdition = 'standard',
  isActualOutcome: boolean = false,
  roll?: number,
): DisplayCard {
  let payout: bigint;
  if (cardDef.tierIndex === 0) {
    payout = 0n;
  } else if (cardDef.tierIndex === 1) {
    payout = (wager * 12n) / 10n;
  } else if (cardDef.tierIndex === 2) {
    payout = (wager * 25n) / 10n;
  } else {
    payout = wager * 5n;
  }

  return {
    cardId: cardDef.id,
    name: cardDef.name,
    roman: cardDef.roman,
    category: cardDef.category,
    tierIndex: cardDef.tierIndex,
    tier: cardDef.tier,
    multiplier: cardDef.multiplier,
    multiplierText: cardDef.multiplierText,
    payout,
    subtitle: cardDef.subtitle,
    description: cardDef.description,
    edition,
    isActualOutcome,
    roll,
    iconType: cardDef.iconType,
  };
}

export function getCardForOutcome(
  tierIndex: number,
  roll: number,
  wager: bigint,
  randomnessSeed?: string,
): DisplayCard {
  const safeTier = Math.max(0, Math.min(3, tierIndex));
  const tierCards = CARDS_BY_TIER[safeTier] || CARDS_BY_TIER[0];
  const cardDef = tierCards[Math.abs(roll) % tierCards.length];
  const edition = sampleCardEdition(randomnessSeed || roll);
  return createDisplayCard(cardDef, wager, edition, true, roll);
}

/**
 * Generates 2 complementary dummy cards for the unselected slots.
 * If actualOutcome.tierIndex === 0, ensure at least one unpicked card is generated as Tier 2 or Tier 3
 * to trigger maximum Near-Miss psychology!
 */
export function generateNearMissCards(actualOutcome: MimicOutcome, wager: bigint): DisplayCard[] {
  const dummyCards: DisplayCard[] = [];
  const actualTier = actualOutcome.tierIndex;

  if (actualTier === 0) {
    // Player lost (Tier 0). Near-Miss psychology:
    // Slot 1 unpicked: Guarantee Tier 2 or Tier 3 (50% chance of Tier 3 Jackpot, 50% Tier 2 Gold)
    const highTier = Math.random() < 0.5 ? 3 : 2;
    const highTierCards = CARDS_BY_TIER[highTier];
    const card1 = highTierCards[Math.floor(Math.random() * highTierCards.length)];
    const edition1 = sampleCardEdition();
    dummyCards.push(createDisplayCard(card1, wager, edition1, false));

    // Slot 2 unpicked: Tier 1 (Silver 1.2x) or Tier 2 (Gold 2.5x)
    const midTier = Math.random() < 0.6 ? 1 : 2;
    const midTierCards = CARDS_BY_TIER[midTier];
    const card2 = midTierCards[Math.floor(Math.random() * midTierCards.length)];
    const edition2 = sampleCardEdition();
    dummyCards.push(createDisplayCard(card2, wager, edition2, false));
  } else if (actualTier === 1) {
    // Player won Silver 1.2x: Show one Tier 2/3 (could have won more!) and one Tier 0 (dodged bullet)
    const tier0Cards = CARDS_BY_TIER[0];
    const card0 = tier0Cards[Math.floor(Math.random() * tier0Cards.length)];
    dummyCards.push(createDisplayCard(card0, wager, sampleCardEdition(), false));

    const higherTier = Math.random() < 0.4 ? 3 : 2;
    const higherCards = CARDS_BY_TIER[higherTier];
    const cardHigh = higherCards[Math.floor(Math.random() * higherCards.length)];
    dummyCards.push(createDisplayCard(cardHigh, wager, sampleCardEdition(), false));
  } else if (actualTier === 2) {
    // Player won Gold 2.5x: Show one Tier 3 (Jackpot was right there!) and one Tier 0 (dodged loss)
    const tier3Cards = CARDS_BY_TIER[3];
    const card3 = tier3Cards[Math.floor(Math.random() * tier3Cards.length)];
    dummyCards.push(createDisplayCard(card3, wager, sampleCardEdition(), false));

    const tier0Cards = CARDS_BY_TIER[0];
    const card0 = tier0Cards[Math.floor(Math.random() * tier0Cards.length)];
    dummyCards.push(createDisplayCard(card0, wager, sampleCardEdition(), false));
  } else {
    // Player hit Tier 3 (5.0x Mythic Jackpot!): Show Tier 0 and Tier 1 (proving they found the only jackpot)
    const tier0Cards = CARDS_BY_TIER[0];
    const card0 = tier0Cards[Math.floor(Math.random() * tier0Cards.length)];
    dummyCards.push(createDisplayCard(card0, wager, sampleCardEdition(), false));

    const tier1Cards = CARDS_BY_TIER[1];
    const card1 = tier1Cards[Math.floor(Math.random() * tier1Cards.length)];
    dummyCards.push(createDisplayCard(card1, wager, sampleCardEdition(), false));
  }

  return dummyCards;
}

export type MimicOutcome = {
  tier: ChestTierType;
  tierIndex: number;
  multiplier: number;
  multiplierBps: bigint;
  payout: bigint;
  roll: number;
  name: string;
  description: string;
  won: boolean;
  randomness: HexString;
  card?: DisplayCard;
  edition?: CardEdition;
};

// abi.encode(tier, payout, randomness, roll)
const GAME_STATE_PARAMS = [
  { type: 'uint8' },
  { type: 'uint256' },
  { type: 'bytes32' },
  { type: 'uint8' },
] as const;

/**
 * Rejection Sampling: identical mirror of MimicChest.sol `_sampleRoll`.
 * Traverses bytes, rejects any byte >= SAMPLE_REJECT (200), expands via keccak256 if needed.
 */
export function sampleRollFromRandomness(randomBytes: Uint8Array): number {
  let idx = 0;
  let current: Uint8Array = randomBytes;
  while (true) {
    if (idx < 32 && idx < current.length) {
      const b = current[idx];
      idx++;
      if (b < SAMPLE_REJECT) {
        return b % SAMPLE_RANGE;
      }
      continue;
    }
    current = hexToBytes(keccak256(current));
    idx = 0;
  }
}

export function outcomeFromRoll(roll: number, wager: bigint, randomness: HexString = '0x0'): MimicOutcome {
  let tierInfo: ChestTierInfo;
  let payout: bigint;
  let multiplierBps: bigint;

  if (roll < 50) {
    // 0..49: Mimic (50%)
    tierInfo = PAYTABLE[0];
    payout = 0n;
    multiplierBps = 0n;
  } else if (roll < 80) {
    // 50..79: Silver (30%)
    tierInfo = PAYTABLE[1];
    payout = (wager * 12n) / 10n;
    multiplierBps = 12000n;
  } else if (roll < 96) {
    // 80..95: Gold (16%)
    tierInfo = PAYTABLE[2];
    payout = (wager * 25n) / 10n;
    multiplierBps = 25000n;
  } else {
    // 96..99: Legendary (4%)
    tierInfo = PAYTABLE[3];
    payout = wager * 5n;
    multiplierBps = 50000n;
  }

  const card = getCardForOutcome(tierInfo.tierIndex, roll, wager, randomness);

  return {
    tier: tierInfo.tier,
    tierIndex: tierInfo.tierIndex,
    multiplier: tierInfo.multiplier,
    multiplierBps,
    payout,
    roll,
    name: tierInfo.name,
    description: tierInfo.description,
    won: payout > 0n,
    randomness,
    card,
    edition: card.edition,
  };
}

export function outcomeFromRandomness(randomnessHex: HexString | Hex, wager: bigint): MimicOutcome {
  const cleanHex = randomnessHex.startsWith('0x') ? randomnessHex : `0x${randomnessHex}`;
  const bytes = hexToBytes(cleanHex as Hex);
  const roll = sampleRollFromRandomness(bytes);
  return outcomeFromRoll(roll, wager, cleanHex as HexString);
}

export function decodeGameState(gameState: HexString, _wager?: bigint): MimicOutcome | null {
  if (!gameState || gameState === '0x') return null;
  try {
    // Primary format: (uint8 tier, uint256 payout, bytes32 randomness, uint8 roll)
    const [tierNum, payoutBig, randomnessRaw, rollNum] = decodeAbiParameters(
      GAME_STATE_PARAMS,
      gameState,
    );
    const tier = Number(tierNum);
    const roll = Number(rollNum);
    const payout = BigInt(payoutBig);
    const randomness = (randomnessRaw as HexString) ?? '0x0';
    const tierInfo = PAYTABLE[tier] ?? PAYTABLE[0];
    const wager = _wager ?? 0n;
    const card = getCardForOutcome(tier, roll, wager, randomness);

    return {
      tier: tierInfo.tier,
      tierIndex: tier,
      multiplier: tierInfo.multiplier,
      multiplierBps: BigInt(Math.round(tierInfo.multiplier * 10000)),
      payout,
      roll,
      name: tierInfo.name,
      description: tierInfo.description,
      won: payout > 0n,
      randomness,
      card,
      edition: card.edition,
    };
  } catch {
    try {
      // Alternative compact format: (uint8 tier, uint8 roll, uint256 payout)
      const [tierNum, rollNum, payoutBig] = decodeAbiParameters(
        [
          { type: 'uint8' },
          { type: 'uint8' },
          { type: 'uint256' },
        ] as const,
        gameState,
      );
      const tier = Number(tierNum);
      const roll = Number(rollNum);
      const payout = BigInt(payoutBig);
      const tierInfo = PAYTABLE[tier] ?? PAYTABLE[0];
      const wager = _wager ?? 0n;
      const card = getCardForOutcome(tier, roll, wager, '0x0');

      return {
        tier: tierInfo.tier,
        tierIndex: tier,
        multiplier: tierInfo.multiplier,
        multiplierBps: BigInt(Math.round(tierInfo.multiplier * 10000)),
        payout,
        roll,
        name: tierInfo.name,
        description: tierInfo.description,
        won: payout > 0n,
        randomness: '0x0',
        card,
        edition: card.edition,
      };
    } catch {
      return null;
    }
  }
}

export function outcomeFromPayout(payout: bigint, wager: bigint): MimicOutcome {
  if (wager === 0n || payout === 0n) {
    return outcomeFromRoll(0, wager); // Mimic
  }
  const ratio = (payout * 100n) / wager;
  if (ratio >= 450n) {
    return outcomeFromRoll(99, wager); // Legendary
  } else if (ratio >= 200n) {
    return outcomeFromRoll(90, wager); // Gold
  } else {
    return outcomeFromRoll(60, wager); // Silver
  }
}

export function encodeGameData(): HexString {
  // Instant game has no complex game parameters, encode empty tuple
  return encodeAbiParameters([], []);
}

export function maxPayout(wager: bigint): bigint {
  return wager * MAX_MULTIPLIER;
}

export function maxReservedProfit(wager: bigint): bigint {
  const payout = maxPayout(wager);
  return payout > wager ? payout - wager : 0n;
}

export const PHASE_SETTLED = 3;
export const PHASE_FORFEITED = 4;
export const PHASE_CANCELLED = 5;

export function isTerminalPhase(phase: number | undefined): boolean {
  return phase === PHASE_SETTLED || phase === PHASE_FORFEITED || phase === PHASE_CANCELLED;
}
