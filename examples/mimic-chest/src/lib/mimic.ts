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
