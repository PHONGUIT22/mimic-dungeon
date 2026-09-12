import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { formatUnits, parseUnits } from 'viem';
import { computeMaxWager } from '@chain/casino-sdk/guest';

import { useCasinoHost } from './lib/useCasinoHost';
import {
  PHASE_SETTLED,
  decodeGameState,
  encodeGameData,
  isTerminalPhase,
  outcomeFromPayout,
  outcomeFromRandomness,
  type MimicOutcome,
} from './lib/mimic';
import { CardStage, type CardAnimationState } from './components/CardStage';
import { Sidebar } from './components/Sidebar';
import { HistoryStrip } from './components/HistoryStrip';
import { StatsStrip } from './components/StatsStrip';
import { PaytableModal } from './components/PaytableModal';
import { WinOverlay } from './components/WinOverlay';

type Round = {
  sessionKey: string;
  wager: bigint;
  status: 'opening' | 'waiting' | 'landing' | 'done';
  sessionId?: string;
  outcome?: MimicOutcome;
  payout?: bigint;
};

type HistoryItem = {
  wager: bigint;
  outcome: MimicOutcome;
  sessionKey?: string;
  timestamp?: number;
};

const FAST_MODE_KEY = 'mimic_fast_mode';
const HISTORY_STORAGE_KEY = 'mimic_game_history';

function loadFastMode(): boolean {
  try {
    return localStorage.getItem(FAST_MODE_KEY) === 'true';
  } catch {
    return false;
  }
}

function loadStoredHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY) ?? sessionStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item: any) => ({
      wager: BigInt(item.wager),
      outcome: {
        ...item.outcome,
        payout: BigInt(item.outcome.payout),
        multiplierBps: BigInt(item.outcome.multiplierBps ?? 0),
      },
      sessionKey: item.sessionKey,
      timestamp: item.timestamp,
    }));
  } catch (err) {
    console.warn('[Mimic Dungeon] Failed to load history from storage:', err);
    return [];
  }
}

function saveStoredHistory(items: HistoryItem[]) {
  try {
    const serialized = JSON.stringify(
      items.slice(0, 100).map(item => ({
        wager: item.wager.toString(),
        outcome: {
          ...item.outcome,
          payout: item.outcome.payout.toString(),
          multiplierBps: item.outcome.multiplierBps.toString(),
        },
        sessionKey: item.sessionKey,
        timestamp: item.timestamp,
      })),
    );
    localStorage.setItem(HISTORY_STORAGE_KEY, serialized);
    sessionStorage.setItem(HISTORY_STORAGE_KEY, serialized);
  } catch (err) {
    console.warn('[Mimic Dungeon] Failed to save history to storage:', err);
  }
}

export function App() {
  const { hostApi, snapshot, isDemoMode, resetDemoBalance } = useCasinoHost();

  const [wagerInput, setWagerInput] = useState('1.00');
  const [round, setRound] = useState<Round | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paytableOpen, setPaytableOpen] = useState(false);
  const [winDismissed, setWinDismissed] = useState(false);
  const [fastMode, setFastMode] = useState(loadFastMode);
  const [history, setHistory] = useState<HistoryItem[]>(loadStoredHistory);

  // Track already recorded session keys to prevent duplicate history entries
  const recordedSessionsRef = useRef<Set<string>>(
    new Set(loadStoredHistory().map(h => h.sessionKey).filter(Boolean) as string[]),
  );

  const recordOutcomeToHistory = useCallback((sessionKey: string, wager: bigint, outcome: MimicOutcome) => {
    if (recordedSessionsRef.current.has(sessionKey)) return;
    recordedSessionsRef.current.add(sessionKey);

    setHistory(prev => {
      const next: HistoryItem[] = [{ wager, outcome, sessionKey, timestamp: Date.now() }, ...prev];
      saveStoredHistory(next);
      return next;
    });
  }, []);

  const toggleFastMode = useCallback(() => {
    setFastMode(prev => {
      const next = !prev;
      try {
        localStorage.setItem(FAST_MODE_KEY, String(next));
      } catch {
        // sandboxed
      }
      return next;
    });
  }, []);

  const decimals = snapshot?.token.decimals ?? 18;
  const symbol = snapshot?.token.symbol ?? 'TEST';

  const balance = useMemo(() => {
    const raw = snapshot?.balances.smartVaultBalance;
    return raw !== undefined ? BigInt(raw) : undefined;
  }, [snapshot?.balances.smartVaultBalance]);

  // Max wager clamp from casino risk limits (max multiplier is 5x)
  const maxAllowedWager = useMemo(() => {
    return computeMaxWager(snapshot, { maxMultiplierX: 5 });
  }, [snapshot]);

  // Watch session updates in host snapshot to settle the round
  useEffect(() => {
    if (!round || round.status !== 'waiting' || !snapshot) return;

    const row = snapshot.sessions.items.find(item => item.sessionKey === round.sessionKey);
    if (!row || !(row.isSettled || isTerminalPhase(row.phase))) return;

    if (row.phase !== undefined && row.phase !== PHASE_SETTLED && !row.raw?.gameState) {
      setError('The round did not settle normally. Token handling follows on-chain rules.');
      setRound(null);
      return;
    }

    // Resolve outcome safely with layered fallbacks: gameState -> randomness -> payout
    let outcome: MimicOutcome | null = null;

    if (row.raw?.gameState && row.raw.gameState !== '0x') {
      try {
        outcome = decodeGameState(row.raw.gameState as `0x${string}`, round.wager);
      } catch (err) {
        console.warn('[Mimic Dungeon] decodeGameState failed:', err);
      }
    }

    if (!outcome && row.raw?.randomness && row.raw.randomness !== '0x') {
      try {
        outcome = outcomeFromRandomness(row.raw.randomness as `0x${string}`, round.wager);
      } catch (err) {
        console.warn('[Mimic Dungeon] outcomeFromRandomness failed:', err);
      }
    }

    if (!outcome && row.payout !== undefined) {
      try {
        outcome = outcomeFromPayout(BigInt(row.payout), round.wager);
      } catch (err) {
        console.warn('[Mimic Dungeon] outcomeFromPayout failed:', err);
      }
    }

    if (!outcome) return;

    const rowPayout = row.payout !== undefined ? BigInt(row.payout) : outcome.payout;

    // Immediately commit to history so Stats and History strip update in real time!
    recordOutcomeToHistory(round.sessionKey, round.wager, outcome);

    setRound(current =>
      current && current.sessionKey === round.sessionKey
        ? {
            ...current,
            status: 'landing',
            sessionId: row.sessionId,
            outcome,
            payout: rowPayout,
          }
        : current,
    );
  }, [snapshot, round, recordOutcomeToHistory]);

  // Stuck watchdog: unfreeze if session hangs > 20s
  useEffect(() => {
    if (!round || round.status !== 'waiting') return;
    const timer = setTimeout(() => {
      setError('Session timed out waiting for randomness fulfillment.');
      setRound(null);
    }, 20000);
    return () => clearTimeout(timer);
  }, [round]);

  // Host reveal outcome synchronization & animation completion
  const hostApiRef = useRef(hostApi);
  hostApiRef.current = hostApi;

  useEffect(() => {
    if (!round || !round.outcome) return;
    if (round.status !== 'landing') return;

    // Chest reveal celebration: 1.2s in normal mode, 300ms in fast mode
    const animDuration = fastMode ? 300 : 1200;

    const animTimer = setTimeout(() => {
      setRound(current =>
        current && current.sessionKey === round.sessionKey
          ? { ...current, status: 'done' }
          : current,
      );

      // MANDATORY REQUIREMENT: revealOutcome immediately when animation ends to credit balance
      if (round.sessionId) {
        void hostApiRef.current?.revealOutcome({ sessionId: round.sessionId }).catch(err => {
          console.warn('[Mimic Dungeon] revealOutcome notice:', err);
        });
      }
    }, animDuration);

    return () => clearTimeout(animTimer);
  }, [round?.status, round?.sessionKey, round?.sessionId, round?.outcome, fastMode]);

  const handleOpenChest = useCallback(async () => {
    if (!hostApi) return;
    setError(null);
    setWinDismissed(false);

    let parsed: bigint;
    try {
      parsed = parseUnits(wagerInput.trim(), decimals);
    } catch {
      setError('Please enter a valid bet amount.');
      return;
    }

    if (parsed <= 0n) {
      setError('Bet amount must be greater than 0.');
      return;
    }

    if (balance !== undefined && parsed > balance) {
      setError('Insufficient balance to draw card.');
      return;
    }

    const pendingKey = `pending:${Date.now()}`;
    setRound({ sessionKey: pendingKey, wager: parsed, status: 'opening' });

    try {
      const { sessionKey } = await hostApi.openSession({
        wager: parsed.toString(),
        gameData: encodeGameData(),
      });

      setRound(current =>
        current?.sessionKey === pendingKey
          ? { ...current, sessionKey, status: 'waiting' }
          : current,
      );
    } catch (cause) {
      setRound(null);
      setError(cause instanceof Error ? cause.message : 'Failed to draw fate card session.');
    }
  }, [hostApi, wagerInput, decimals, balance]);

  const animationState: CardAnimationState =
    !round
      ? 'idle'
      : round.status === 'opening' || round.status === 'waiting'
        ? 'opening'
        : 'revealed';

  const isBusy = round !== null && round.status !== 'done';

  return (
    <div className="mimic-app">
      {/* Top Header Navigation Bar (Compact 48px) */}
      <header className="mimic-header">
        <div className="header-left">
          <div className="logo-box">
            <span>🔮</span>
          </div>
          <div className="header-titles">
            <h1 className="game-title">ARCANA FATE</h1>
            <span className="badge-rtp">96.00% RTP</span>
            <span className="badge-vrf">VRF CERTIFIED</span>
          </div>
        </div>

        <div className="header-right">
          {isDemoMode && <span className="badge-demo">DEMO MODE</span>}

          <div className="header-balance-box">
            <span className="header-balance-label">VAULT</span>
            <span className="header-balance-val">
              {balance !== undefined ? formatUnits(balance, decimals).slice(0, 8) : '0.00'} {symbol}
            </span>
          </div>
        </div>
      </header>

      {/* Main Game Dashboard Console */}
      <main className="mimic-main">
        <div className="mimic-game-frame">
          {/* Left Sidebar Controls */}
          <Sidebar
            balance={balance}
            decimals={decimals}
            symbol={symbol}
            wagerInput={wagerInput}
            onWagerChange={setWagerInput}
            onOpenChest={handleOpenChest}
            disabled={isBusy}
            fastMode={fastMode}
            onToggleFastMode={toggleFastMode}
            onOpenPaytable={() => setPaytableOpen(true)}
            isDemoMode={isDemoMode}
            onResetDemoBalance={resetDemoBalance}
            maxAllowedWager={maxAllowedWager}
          />

          {/* Right Stage Column */}
          <div className="mimic-stage-column">
            {error && (
              <div className="error-banner">
                <span>⚠️ {error}</span>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="btn-error-dismiss"
                >
                  ✕
                </button>
              </div>
            )}

            {/* 3D Fate Card Stage Viewport */}
            <CardStage
              state={animationState}
              outcome={round?.outcome ?? null}
              fastMode={fastMode}
            />

            {/* Live History Ticker Strip */}
            <HistoryStrip history={history.map(h => h.outcome)} />
          </div>
        </div>

        {/* Bottom Game Analytics Grid */}
        <StatsStrip history={history} decimals={decimals} symbol={symbol} />
      </main>

      {/* Modals & Overlays */}
      <PaytableModal isOpen={paytableOpen} onClose={() => setPaytableOpen(false)} />

      {round?.outcome && round.status === 'done' && !winDismissed && (
        <WinOverlay
          outcome={round.outcome}
          payout={round.payout ?? 0n}
          decimals={decimals}
          symbol={symbol}
          onDismiss={() => setWinDismissed(true)}
        />
      )}
    </div>
  );
}
