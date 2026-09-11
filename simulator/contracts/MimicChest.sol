// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { ICasinoGameV2, SessionContext, SessionPhase, StepResult } from './interfaces/ICasinoGameV2.sol';

/**
 * @title MimicChest
 * @notice Instant single-round casino game for Chain Jam Hackathon.
 *
 * Game mechanics ("Mimic Dungeon"):
 * - Player wagers an amount and opens a mystery chest.
 * - Randomness from VRF (32 bytes) is sampled with Rejection Sampling to eliminate Modulo Bias.
 *
 * Outcome paytable:
 * - 50% Mimic Monster  (x0.0) -> Loss
 * - 30% Silver Chest   (x1.2) -> Small win (wager * 12 / 10)
 * - 16% Gold Chest     (x2.5) -> Big win (wager * 25 / 10)
 * -  4% Legendary Relic (x5.0) -> Jackpot (wager * 5)
 *
 * Total RTP = 0.50*0 + 0.30*1.2 + 0.16*2.5 + 0.04*5.0 = 0 + 0.36 + 0.40 + 0.20 = 96.00% (exact).
 */
contract MimicChest is ICasinoGameV2 {
  enum ChestTier {
    MIMIC,     // 0: x0 (50%)
    SILVER,    // 1: x1.2 (30%)
    GOLD,      // 2: x2.5 (16%)
    LEGENDARY  // 3: x5.0 (4%)
  }

  uint8 internal constant SAMPLE_RANGE = 100;
  // Rejection threshold: floor(256 / 100) * 100 = 200.
  // Bytes in [200, 255] are rejected so that each value in [0, 99] has exactly 2 preimages (uniform probability 1/100).
  uint8 internal constant SAMPLE_REJECT = 200;

  uint256 internal constant WAD = 1e18;
  // RTP is 96.00% = 9600 / 10000
  uint256 internal constant RTP_BPS = 9600;
  uint256 internal constant BASIS_POINTS = 10000;
  // Top tier probability (4%) in WAD: 0.04 * 1e18 = 4e16
  uint256 internal constant TOP_TIER_PROBABILITY_WAD = 4e16;
  // Top tier multiplier: 5.0x
  uint256 internal constant MAX_MULTIPLIER = 5;

  error MimicChest__NoPlayerAction();
  error MimicChest__InvalidWager();

  /**
   * @notice Unbiased rejection sampling from VRF bytes32 seed.
   * Traverses bytes, rejecting any byte >= 200. If 32 bytes are exhausted, rehashes with keccak256.
   */
  function _sampleRoll(bytes32 seed) internal pure returns (uint8 roll) {
    uint256 idx = 0;
    bytes32 currentSeed = seed;
    while (true) {
      if (idx < 32) {
        uint8 b = uint8(currentSeed[idx]);
        idx++;
        if (b < SAMPLE_REJECT) {
          return b % SAMPLE_RANGE;
        }
        continue;
      }
      currentSeed = keccak256(abi.encodePacked(currentSeed));
      idx = 0;
    }
  }

  /**
   * @notice Maps sample roll in [0, 99] to chest tier and payout.
   */
  function _resolveOutcome(uint256 wager, uint8 roll)
    internal
    pure
    returns (ChestTier tier, uint256 payout)
  {
    if (roll < 50) {
      // 0..49: 50% Mimic Monster (0x)
      tier = ChestTier.MIMIC;
      payout = 0;
    } else if (roll < 80) {
      // 50..79: 30% Silver Chest (1.2x)
      tier = ChestTier.SILVER;
      payout = (wager * 12) / 10;
    } else if (roll < 96) {
      // 80..95: 16% Gold Chest (2.5x)
      tier = ChestTier.GOLD;
      payout = (wager * 25) / 10;
    } else {
      // 96..99: 4% Legendary Relic (5.0x)
      tier = ChestTier.LEGENDARY;
      payout = wager * MAX_MULTIPLIER;
    }
  }

  function quoteCaps(
    uint256 wager,
    bytes calldata /* gameData */
  ) external pure returns (uint256 maxEscrowStake, uint256 maxReservedProfit) {
    if (wager == 0) revert MimicChest__InvalidWager();
    maxEscrowStake = wager;
    // Max payout is 5x, so vault risk = 5x - 1x = 4x
    maxReservedProfit = wager * (MAX_MULTIPLIER - 1);
  }

  function quoteRiskParams(
    uint256 wager,
    bytes calldata /* gameData */
  )
    external
    pure
    returns (
      uint256 maxPayout,
      uint256 probabilityWad,
      uint256 expectedPayout,
      uint256 subJackpotVarianceScaled
    )
  {
    if (wager == 0) revert MimicChest__InvalidWager();
    maxPayout = wager * MAX_MULTIPLIER;
    probabilityWad = TOP_TIER_PROBABILITY_WAD;
    expectedPayout = (wager * RTP_BPS) / BASIS_POINTS;
    subJackpotVarianceScaled = 0;
  }

  function onSessionStart(
    SessionContext calldata ctx
  ) external pure returns (StepResult memory stepResult) {
    stepResult.newGameState = abi.encode(uint8(0), uint256(0), bytes32(0), uint8(0));
    stepResult.escrowDelta = 0;
    stepResult.reservedProfitDelta = int256(ctx.wagerBase * (MAX_MULTIPLIER - 1));
    stepResult.nextPhase = SessionPhase.WAITING_RANDOMNESS;
    stepResult.requestRandomnessNow = true;
    stepResult.payout = 0;
  }

  function onPlayerAction(
    SessionContext calldata,
    bytes calldata
  ) external pure returns (StepResult memory) {
    revert MimicChest__NoPlayerAction();
  }

  function onRandomness(
    SessionContext calldata ctx,
    bytes32 randomness
  ) external pure returns (StepResult memory stepResult) {
    uint8 roll = _sampleRoll(randomness);
    (ChestTier tier, uint256 payout) = _resolveOutcome(ctx.wagerBase, roll);

    // Encode result into gameState: (tier, payout, randomness, roll)
    stepResult.newGameState = abi.encode(uint8(tier), payout, randomness, roll);
    stepResult.escrowDelta = 0;
    stepResult.reservedProfitDelta = 0;
    stepResult.nextPhase = SessionPhase.SETTLED;
    stepResult.requestRandomnessNow = false;
    stepResult.payout = payout;
  }

  function quoteForfeitPayout(
    SessionContext calldata
  ) external pure returns (uint256) {
    return 0;
  }
}
