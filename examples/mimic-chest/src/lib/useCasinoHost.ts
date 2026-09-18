import { useEffect, useState, useCallback, useRef } from 'react';
import {
  connectGameToHost,
  observeGameContentSize,
  type GuestApiV1,
  type HostApiV1,
  type HostSnapshotV1,
} from '@chain/casino-sdk/guest';
import { bytesToHex, encodeAbiParameters, type Hex } from 'viem';
import {
  outcomeFromRoll,
  sampleRollFromRandomness,
} from './mimic';

const DEFAULT_DEMO_BALANCE = 1000n * 10n ** 18n; // 1,000.00 TEST tokens
const DUMMY_GAME_ADDRESS = '0x1234567890123456789012345678901234567890' as const;

export type UseCasinoHostReturn = {
  hostApi: HostApiV1 | null;
  snapshot: HostSnapshotV1 | null;
  isDemoMode: boolean;
  resetDemoBalance: () => void;
};

export function useCasinoHost(): UseCasinoHostReturn {
  const [hostApi, setHostApi] = useState<HostApiV1 | null>(null);
  const [snapshot, setSnapshot] = useState<HostSnapshotV1 | null>(null);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  // Demo balance and sessions
  const [demoBalance, setDemoBalance] = useState<bigint>(() => {
    try {
      const stored = sessionStorage.getItem('mimic_demo_balance');
      return stored ? BigInt(stored) : DEFAULT_DEMO_BALANCE;
    } catch {
      return DEFAULT_DEMO_BALANCE;
    }
  });

  const demoBalanceRef = useRef(demoBalance);
  demoBalanceRef.current = demoBalance;

  const [demoSessions, setDemoSessions] = useState<HostSnapshotV1['sessions']['items']>([]);
  const demoSessionsRef = useRef(demoSessions);
  demoSessionsRef.current = demoSessions;

  const sessionCounterRef = useRef(1);
  const pendingPayoutsRef = useRef<Map<string, bigint>>(new Map());

  const resetDemoBalance = useCallback(() => {
    setDemoBalance(DEFAULT_DEMO_BALANCE);
    try {
      sessionStorage.setItem('mimic_demo_balance', DEFAULT_DEMO_BALANCE.toString());
    } catch {
      // sandboxed iframe
    }
  }, []);

  // Update demo snapshot whenever demoBalance or demoSessions change
  useEffect(() => {
    if (!isDemoMode) return;

    try {
      sessionStorage.setItem('mimic_demo_balance', demoBalance.toString());
    } catch {
      // sandboxed
    }

    const demoSnapshot: HostSnapshotV1 = {
      apiVersion: 1,
      integration: {
        chainId: 31337,
        slug: 'mimic-chest',
        gameAddress: DUMMY_GAME_ADDRESS,
        manifest: {
          schemaVersion: 1,
          gameId: 'ArcanaFate',
          apiVersion: 1,
          defaultLocale: 'en',
          locales: {
            en: {
              name: 'Arcana Fate',
              description: 'Instant sacred sigils & mystic cards casino game with 96.00% RTP.',
            },
          },
        },
      },
      ui: {
        theme: 'dark',
        locale: 'en',
      },
      token: {
        symbol: 'TEST',
        decimals: 18,
        iconUrl: '/assets/chest-icon.svg',
      },
      balances: {
        smartVaultBalance: demoBalance.toString(),
      },
      casino: {
        availableLiquidity: (500000000n * 10n ** 18n).toString(),
        maxBetRiskBps: 100,
        maxAllowedReservedProfit: (50000n * 10n ** 18n).toString(),
        maxBetAmount: (1000n * 10n ** 18n).toString(),
      },
      sessions: {
        items: demoSessions,
      },
      wallet: {
        status: 'ready',
        address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        smartVaultAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
      },
    };

    setSnapshot(demoSnapshot);
  }, [isDemoMode, demoBalance, demoSessions]);

  // Dual mode detection: Penpal bridge vs Standalone
  useEffect(() => {
    let mounted = true;
    const inIframe = typeof window !== 'undefined' && window.self !== window.top;

    if (!inIframe) {
      // Standalone mode: immediately activate Demo Mode
      console.log('[Mimic Dungeon] Standalone mode detected — activating Demo Mode (1,000 TEST tokens).');
      setIsDemoMode(true);
      return;
    }

    // Inside iframe: connect to host via Penpal
    const guestMethods: GuestApiV1 = {
      async setState(nextSnapshot) {
        if (!mounted) return;
        setSnapshot(nextSnapshot);
      },
    };

    const connection = connectGameToHost(guestMethods);

    // Fallback timer: if host handshake does not resolve in 2 seconds, activate Demo Mode
    const fallbackTimer = setTimeout(() => {
      if (mounted && !hostApi) {
        console.log('[Mimic Dungeon] Host handshake timed out — falling back to Demo Mode.');
        setIsDemoMode(true);
      }
    }, 2000);

    void connection.promise
      .then(parent => {
        if (mounted) {
          clearTimeout(fallbackTimer);
          setIsDemoMode(false);
          setHostApi(parent);
          console.log('[Mimic Dungeon] Connected to host via Penpal bridge.');
        }
      })
      .catch(() => {
        if (mounted) {
          console.log('[Mimic Dungeon] Penpal connection failed — switching to Demo Mode.');
          setIsDemoMode(true);
        }
      });

    return () => {
      mounted = false;
      clearTimeout(fallbackTimer);
      connection.destroy();
    };
  }, []);

  // Demo hostApi mock implementation
  const demoHostApi = useRef<HostApiV1>({
    async openSession({ wager }) {
      const wagerBig = BigInt(wager);
      if (demoBalanceRef.current < wagerBig) {
        throw new Error('Insufficient demo balance. Reset balance to continue playing!');
      }

      // Deduct bet from balance immediately
      setDemoBalance(prev => prev - wagerBig);

      // Generate clean 32-byte VRF random seed (viem bytesToHex already prepends 0x)
      const randomBytes = new Uint8Array(32);
      crypto.getRandomValues(randomBytes);
      const rawHex = bytesToHex(randomBytes);
      const randomHex: Hex = (rawHex.startsWith('0x') ? rawHex : `0x${rawHex}`) as Hex;

      // Sample roll via Rejection Sampling (0..99)
      const roll = sampleRollFromRandomness(randomBytes);
      const outcome = outcomeFromRoll(roll, wagerBig, randomHex);

      const sessionId = String(sessionCounterRef.current++);
      const sessionKey = `demo:${sessionId}`;
      const now = Math.floor(Date.now() / 1000);

      // Save payout in ref so revealOutcome can reliably credit it
      pendingPayoutsRef.current.set(sessionId, outcome.payout);

      // 1. Create session in WAITING_RANDOMNESS state
      const pendingSession: HostSnapshotV1['sessions']['items'][number] = {
        sessionId,
        sessionKey,
        gameAddress: DUMMY_GAME_ADDRESS,
        wager,
        stake: wager,
        isSettled: false,
        phase: 1, // WAITING_RANDOMNESS
        phaseName: 'WAITING_RANDOMNESS',
        payout: '0',
        lastEventTimestamp: now,
        openedAt: now,
        raw: {
          gameState: '0x',
          randomness: randomHex,
          requestId: `0xreq_${sessionId}`,
          openTransactionHash: `0xtx_open_${sessionId}` as Hex,
        },
      };

      setDemoSessions(prev => [pendingSession, ...prev]);

      // 2. Simulate VRF fulfillment after 1100ms
      setTimeout(() => {
        let encodedGameState: Hex = '0x';
        try {
          // Encode contract-standard format: (uint8 tier, uint256 payout, bytes32 randomness, uint8 roll)
          encodedGameState = encodeAbiParameters(
            [{ type: 'uint8' }, { type: 'uint256' }, { type: 'bytes32' }, { type: 'uint8' }],
            [outcome.tierIndex, outcome.payout, randomHex, outcome.roll],
          );
        } catch (e) {
          console.warn('[Demo VRF] encode error:', e);
        }

        // Transition session to SETTLED
        setDemoSessions(prev =>
          prev.map(s =>
            s.sessionKey === sessionKey
              ? {
                  ...s,
                  isSettled: true,
                  phase: 3, // PHASE_SETTLED
                  phaseName: 'SETTLED',
                  payout: outcome.payout.toString(),
                  settledAt: Math.floor(Date.now() / 1000),
                  raw: {
                    ...s.raw,
                    gameState: encodedGameState,
                    settleTransactionHash: `0xtx_settle_${sessionId}` as Hex,
                  },
                }
              : s,
          ),
        );
      }, 1100);

      return {
        sessionKey,
        transactionHash: `0xtx_open_${sessionId}` as Hex,
      };
    },

    async revealOutcome({ sessionId }) {
      // Credit payout to demo balance
      const payout = pendingPayoutsRef.current.get(sessionId);
      if (payout !== undefined) {
        pendingPayoutsRef.current.delete(sessionId);
        if (payout > 0n) {
          setDemoBalance(prev => prev + payout);
        }
      } else {
        const item = demoSessionsRef.current.find(s => s.sessionId === sessionId);
        if (item && item.payout) {
          const p = BigInt(item.payout);
          if (p > 0n) {
            setDemoBalance(prev => prev + p);
          }
        }
      }
    },

    async submitAction() {
      throw new Error('Mimic Dungeon is an instant single-round game — no player actions required.');
    },

    async cancelStuckRandomness() {
      throw new Error('Cancel not supported in demo mode.');
    },

    async reportContentSize() {
      // No-op in demo mode
    },
  });

  const effectiveHostApi = isDemoMode ? demoHostApi.current : hostApi;

  // Frame height observer for Penpal
  useEffect(() => {
    if (!effectiveHostApi || isDemoMode) return;
    const observer = observeGameContentSize(effectiveHostApi);
    return () => observer.disconnect();
  }, [effectiveHostApi, isDemoMode]);

  return {
    hostApi: effectiveHostApi,
    snapshot,
    isDemoMode,
    resetDemoBalance,
  };
}
