import { decodeAbiParameters, encodeAbiParameters, hexToBytes, keccak256, type Hex } from 'viem';
import type { HexString } from '@chain/casino-sdk';
import { generateMysticCard, type MysticCardDef } from './proceduralNames';
import { hashSeed } from '../components/ProceduralSigil';

export const RTP_BPS = 9600n; // 96.00% RTP
export const BASIS_POINTS = 10000n;
export const MAX_MULTIPLIER = 5n;

export const SAMPLE_RANGE = 100;
export const SAMPLE_REJECT = 200; // floor(256 / 100) * 100 = 200. Rejects >= 200 to eliminate modulo bias.

export type RoundStep = 'idle' | 'opening_session' | 'awaiting_pick' | 'revealing' | 'settled';

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

export type EditionBonusInfo = {
  bonusText: string;
  bonusType: 'add' | 'mult' | 'none';
  bonusValue: number;
  baseMultiplier: number;
  finalMultiplier: number;
};

export type DisplayCard = {
  cardId: string;
  name: string;
  roman: string;
  category: string;
  tierIndex: number;
  tier: ChestTierType;
  baseMultiplier: number;
  multiplier: number;
  multiplierText: string;
  payout: bigint;
  subtitle: string;
  description: string;
  edition: CardEdition;
  editionBonus?: EditionBonusInfo;
  isActualOutcome?: boolean;
  roll?: number;
  iconType: string;
  sigilSeed?: number;
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
    roman: 'XXII',
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
    roman: 'X',
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

export function computeEditionBonus(baseMultiplier: number, edition: CardEdition): EditionBonusInfo {
  if (edition === 'foil') {
    return {
      bonusText: 'FOIL EDITION',
      bonusType: 'none',
      bonusValue: 0,
      baseMultiplier,
      finalMultiplier: baseMultiplier,
    };
  }
  if (edition === 'holo') {
    return {
      bonusText: 'HOLO EDITION',
      bonusType: 'none',
      bonusValue: 0,
      baseMultiplier,
      finalMultiplier: baseMultiplier,
    };
  }
  if (edition === 'polychrome') {
    return {
      bonusText: 'POLYCHROME EDITION',
      bonusType: 'none',
      bonusValue: 0,
      baseMultiplier,
      finalMultiplier: baseMultiplier,
    };
  }
  return {
    bonusText: '',
    bonusType: 'none',
    bonusValue: 0,
    baseMultiplier,
    finalMultiplier: baseMultiplier,
  };
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

  const editionBonus = computeEditionBonus(cardDef.multiplier, edition);

  return {
    cardId: cardDef.id,
    name: cardDef.name,
    roman: cardDef.roman,
    category: cardDef.category,
    tierIndex: cardDef.tierIndex,
    tier: cardDef.tier,
    baseMultiplier: cardDef.multiplier,
    multiplier: cardDef.multiplier,
    multiplierText: cardDef.multiplierText,
    payout,
    subtitle: editionBonus.bonusText ? `${cardDef.subtitle} • ${editionBonus.bonusText}` : cardDef.subtitle,
    description: cardDef.description,
    edition,
    editionBonus,
    isActualOutcome,
    roll,
    iconType: cardDef.iconType,
  };
}

export function createDisplayCardFromMystic(
  mysticDef: MysticCardDef,
  wager: bigint,
  edition: CardEdition = 'standard',
  isActualOutcome: boolean = false,
  roll?: number,
): DisplayCard {
  let payout: bigint;
  if (mysticDef.tierIndex === 0) {
    payout = 0n;
  } else if (mysticDef.tierIndex === 1) {
    payout = (wager * 12n) / 10n;
  } else if (mysticDef.tierIndex === 2) {
    payout = (wager * 25n) / 10n;
  } else {
    payout = wager * 5n;
  }

  const editionBonus = computeEditionBonus(mysticDef.multiplier, edition);

  return {
    cardId: mysticDef.id,
    name: mysticDef.name,
    roman: mysticDef.roman,
    category: mysticDef.category,
    tierIndex: mysticDef.tierIndex,
    tier: mysticDef.tier,
    baseMultiplier: mysticDef.multiplier,
    multiplier: mysticDef.multiplier,
    multiplierText: mysticDef.multiplierText,
    payout,
    subtitle: editionBonus.bonusText ? `${mysticDef.subtitle} • ${editionBonus.bonusText}` : mysticDef.subtitle,
    description: mysticDef.flavorText,
    edition,
    editionBonus,
    isActualOutcome,
    roll,
    iconType: 'sigil',
    sigilSeed: mysticDef.sigilSeed,
  };
}

export function getCardForOutcome(
  tierIndex: number,
  roll: number,
  wager: bigint,
  randomnessSeed?: string,
): DisplayCard {
  const safeTier = Math.max(0, Math.min(3, tierIndex));
  const rawSeed =
    typeof randomnessSeed === 'string' && randomnessSeed.startsWith('0x')
      ? hashSeed(randomnessSeed) + roll
      : roll * 10007 + (typeof randomnessSeed === 'number' ? randomnessSeed : 42);

  const mysticDef = generateMysticCard(rawSeed, safeTier);
  const edition = sampleCardEdition(randomnessSeed || roll);
  return createDisplayCardFromMystic(mysticDef, wager, edition, true, roll);
}

/**
 * Generates 2 complementary dummy cards for the unselected slots.
 * If actualOutcome.tierIndex === 0, ensure at least one unpicked card is generated as Tier 2 or Tier 3
 * to trigger maximum Near-Miss psychology!
 */
export function generateNearMissCards(actualOutcome: MimicOutcome, wager: bigint): DisplayCard[] {
  const dummyCards: DisplayCard[] = [];
  const actualTier = actualOutcome.tierIndex;
  const baseSeed = hashSeed(actualOutcome.randomness || String(actualOutcome.roll)) + 997;

  if (actualTier === 0) {
    // Player lost (The Void x0.0). Near-Miss psychology:
    // Slot 1 unpicked: Guarantee Tier 3 (5.0x Mythic Jackpot)
    const card1 = generateMysticCard(baseSeed + 301, 'destiny');
    const edition1 = sampleCardEdition(baseSeed + 301);
    dummyCards.push(createDisplayCardFromMystic(card1, wager, edition1, false));

    // Slot 2 unpicked: Tier 1 (Silver 1.2x) or Tier 2 (Gold 2.5x)
    const midTier = baseSeed % 10 < 6 ? 2 : 1;
    const card2 = generateMysticCard(baseSeed + 502, midTier);
    const edition2 = sampleCardEdition(baseSeed + 502);
    dummyCards.push(createDisplayCardFromMystic(card2, wager, edition2, false));
  } else if (actualTier === 1) {
    // Player won Silver 1.2x: Show one Tier 2/3 (could have won more!) and one Tier 0 (dodged loss)
    const card0 = generateMysticCard(baseSeed + 101, 'void');
    dummyCards.push(createDisplayCardFromMystic(card0, wager, sampleCardEdition(baseSeed + 101), false));

    const higherTier = baseSeed % 10 < 4 ? 3 : 2;
    const cardHigh = generateMysticCard(baseSeed + 703, higherTier);
    dummyCards.push(createDisplayCardFromMystic(cardHigh, wager, sampleCardEdition(baseSeed + 703), false));
  } else if (actualTier === 2) {
    // Player won Gold 2.5x: Show one Tier 3 (Jackpot was right there!) and one Tier 0 (dodged loss)
    const card3 = generateMysticCard(baseSeed + 303, 'destiny');
    dummyCards.push(createDisplayCardFromMystic(card3, wager, sampleCardEdition(baseSeed + 303), false));

    const card0 = generateMysticCard(baseSeed + 102, 'void');
    dummyCards.push(createDisplayCardFromMystic(card0, wager, sampleCardEdition(baseSeed + 102), false));
  } else {
    // Player hit Tier 3 (5.0x Mythic Jackpot!): Show Tier 0 and Tier 1 (proving they found the only jackpot)
    const card0 = generateMysticCard(baseSeed + 103, 'void');
    dummyCards.push(createDisplayCardFromMystic(card0, wager, sampleCardEdition(baseSeed + 103), false));

    const card1 = generateMysticCard(baseSeed + 404, 'silver');
    dummyCards.push(createDisplayCardFromMystic(card1, wager, sampleCardEdition(baseSeed + 404), false));
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

export type HistoryItem = {
  wager: bigint;
  outcome: MimicOutcome;
  sessionKey?: string;
  sessionId?: string;
  timestamp?: number;
};

// abi.encode(tier, payout, randomness, roll)
const GAME_STATE_PARAMS = [
  { type: 'uint8' },
  { type: 'uint256' },
  { type: 'bytes32' },
  { type: 'uint8' },
] as const;

/**
 * Rejection Sampling: identical mirror of ArcanaFate.sol `_sampleRoll`.
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

  if (roll < 50) {
    // 0..49: Mimic (50%)
    tierInfo = PAYTABLE[0];
  } else if (roll < 80) {
    // 50..79: Silver (30%)
    tierInfo = PAYTABLE[1];
  } else if (roll < 96) {
    // 80..95: Gold (16%)
    tierInfo = PAYTABLE[2];
  } else {
    // 96..99: Legendary (4%)
    tierInfo = PAYTABLE[3];
  }

  const card = getCardForOutcome(tierInfo.tierIndex, roll, wager, randomness);
  const finalMultiplier = card.multiplier;
  const payout = card.payout;
  const multiplierBps = BigInt(Math.round(finalMultiplier * 10000));

  return {
    tier: tierInfo.tier,
    tierIndex: tierInfo.tierIndex,
    multiplier: finalMultiplier,
    multiplierBps,
    payout,
    roll,
    name: card.name,
    description: card.description,
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

/**
 * Atmospheric Occult Dark Oracle Micro-copy (Prophecies)
 * Distinct quotes for each Tarot fate outcome tier.
 */
export const DARK_ORACLE_QUOTES: Record<number, string[]> = {
  0: [
    "The void devours the souls of the greedy.",
    "Fate turns its back. Ashes to ashes, dust to dust.",
    "Even the stars cast shadows in the abyss.",
    "Not even a consolation rune. The darkness smiled.",
    "Greed demanded more. The silence answered.",
    "The abyss gazes back, and it found thee wanting.",
  ],
  1: [
    "A faint glimmer guides through the darkest night.",
    "Taking profit early is also an ancient wisdom.",
    "Technically a win. The runes acknowledge you.",
    "A humble bounty. Greed slumbers for now.",
    "The silver thread remains unbroken.",
    "Modest fortune favors the patient traveler.",
  ],
  2: [
    "The solar crest blazes; divine fortune smiles upon the bold!",
    "Gold flows where the daring tread.",
    "A glorious omen etched upon the celestial spheres.",
    "The Sun crest laughs; abundance fills your coffers!",
    "Radiant alchemy! The arcane turns into gold!",
  ],
  3: [
    "THE COSMOS SHIVERS! THOU ART THE MASTER OF DESTINY!",
    "A celestial convergence! The heavens bow before your will!",
    "Prophecy fulfilled! The Wheel of Destiny crowns a legend!",
    "Beyond the stars, your triumph is carved in timeless gold!",
    "THE WEAVE RENDERS IN AWE! JACKPOT OF THE GODS!",
  ],
};

export function getDarkOracleQuote(tierIndex: number, seed?: number | string): string {
  const quotes = DARK_ORACLE_QUOTES[tierIndex] ?? DARK_ORACLE_QUOTES[0];
  let numSeed = 0;
  if (typeof seed === 'number') {
    numSeed = Math.abs(seed);
  } else if (typeof seed === 'string') {
    for (let i = 0; i < seed.length; i++) {
      numSeed = (numSeed * 31 + seed.charCodeAt(i)) >>> 0;
    }
  }
  return quotes[numSeed % quotes.length];
}
