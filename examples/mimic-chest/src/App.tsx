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
  getCardForOutcome,
  type MimicOutcome,
  type HistoryItem,
  type RoundStep,
} from './lib/mimic';
import { CardStage } from './components/CardStage';
import { Sidebar } from './components/Sidebar';
import { HistoryStrip } from './components/HistoryStrip';
import { StatsStrip } from './components/StatsStrip';
import { PaytableModal } from './components/PaytableModal';
import { VerifyModal } from './components/VerifyModal';
import { CollectionModal } from './components/CollectionModal';
import { WinOverlay } from './components/WinOverlay';
import { computeUnlockedPillarsCount, getArchetypeIndexForCard, getRelicId } from './lib/proceduralNames';
import { sound } from './lib/audio';
import {
  ArcanaEyeIcon,
  BgmIcon,
  BgmOffIcon,
  WarningIcon,
  CloseIcon,
} from './components/Icons';

export type { RoundStep };

type Round = {
  sessionKey: string;
  wager: bigint;
  step: RoundStep;
  sessionId?: string;
  outcome?: MimicOutcome;
  payout?: bigint;
  chosenIndex?: number;
};

const HISTORY_STORAGE_KEY = 'mimic_game_history';
const COLLECTION_STORAGE_KEY = 'mimic_card_collection';

function loadStoredHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY) ?? sessionStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item: any) => {
        // Genuine items must have valid wager, outcome with roll and 0x randomness
        return (
          item &&
          typeof item.wager === 'string' &&
          item.outcome &&
          typeof item.outcome.roll === 'number' &&
          typeof item.outcome.randomness === 'string' &&
          item.outcome.randomness.startsWith('0x')
        );
      })
      .map((item: any) => ({
        wager: BigInt(item.wager),
        outcome: {
          ...item.outcome,
          payout: BigInt(item.outcome.payout),
          multiplierBps: BigInt(item.outcome.multiplierBps ?? 0),
        },
        sessionKey: item.sessionKey,
        sessionId: item.sessionId,
        timestamp: item.timestamp ?? Date.now(),
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
        sessionId: item.sessionId,
        timestamp: item.timestamp,
      })),
    );
    localStorage.setItem(HISTORY_STORAGE_KEY, serialized);
    sessionStorage.setItem(HISTORY_STORAGE_KEY, serialized);
  } catch (err) {
    console.warn('[Mimic Dungeon] Failed to save history to storage:', err);
  }
}

function loadStoredCollection(): string[] {
  try {
    const raw = localStorage.getItem(COLLECTION_STORAGE_KEY) ?? sessionStorage.getItem(COLLECTION_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((id): id is string => typeof id === 'string');
    }
    return [];
  } catch {
    return [];
  }
}

function saveStoredCollection(collection: string[]) {
  try {
    const serialized = JSON.stringify(collection);
    localStorage.setItem(COLLECTION_STORAGE_KEY, serialized);
    sessionStorage.setItem(COLLECTION_STORAGE_KEY, serialized);
  } catch (err) {
    console.warn('[Mimic Dungeon] Failed to save collection to storage:', err);
  }
}

const RELICS_STORAGE_KEY = 'mimic_arcana_relics';

function loadStoredRelics(): string[] {
  try {
    const raw = localStorage.getItem(RELICS_STORAGE_KEY) ?? sessionStorage.getItem(RELICS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((id): id is string => typeof id === 'string');
    }
    return [];
  } catch {
    return [];
  }
}

function saveStoredRelics(relics: string[]) {
  try {
    const serialized = JSON.stringify(relics);
    localStorage.setItem(RELICS_STORAGE_KEY, serialized);
    sessionStorage.setItem(RELICS_STORAGE_KEY, serialized);
  } catch (err) {
    console.warn('[Mimic Dungeon] Failed to save relics to storage:', err);
  }
}

export function App() {
  const { hostApi, snapshot, isDemoMode, resetDemoBalance } = useCasinoHost();

  const [wagerInput, setWagerInput] = useState('1.00');
  const [round, setRound] = useState<Round | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paytableOpen, setPaytableOpen] = useState(false);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [discoveredCardIds, setDiscoveredCardIds] = useState<string[]>(() => {
    const stored = loadStoredCollection();
    // Merge any cards already in stored history
    const historyCardIds = loadStoredHistory()
      .map(h => {
        const card = h.outcome.card ?? getCardForOutcome(h.outcome.tierIndex, h.outcome.roll, h.wager, h.outcome.randomness);
        return card?.cardId;
      })
      .filter(Boolean) as string[];
    const merged = Array.from(new Set([...stored, ...historyCardIds]));
    if (merged.length > stored.length) {
      saveStoredCollection(merged);
    }
    return merged;
  });

  // 48 Arcana Relics Discovery Tracker (12 Archetypes × 4 Editions)
  const [discoveredRelicIds, setDiscoveredRelicIds] = useState<string[]>(() => {
    const stored = loadStoredRelics();
    const historyRelics = loadStoredHistory()
      .map(h => {
        const card = h.outcome.card ?? getCardForOutcome(h.outcome.tierIndex, h.outcome.roll, h.wager, h.outcome.randomness);
        const archIdx = getArchetypeIndexForCard(card?.cardId, card?.tierIndex);
        const edition = card?.edition || h.outcome.edition || 'standard';
        return getRelicId(archIdx, edition);
      })
      .filter(Boolean);
    const merged = Array.from(new Set([...stored, ...historyRelics]));
    if (merged.length > stored.length) {
      saveStoredRelics(merged);
    }
    return merged;
  });

  const unlockedPillarsCount = useMemo(
    () => computeUnlockedPillarsCount(discoveredCardIds),
    [discoveredCardIds],
  );
  const totalUniqueSigils = discoveredCardIds.length;

  const [selectedHistoryItem, setSelectedHistoryItem] = useState<HistoryItem | null>(null);
  const [isScreenShaking, setIsScreenShaking] = useState(false);
  const [winDismissed, setWinDismissed] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>(loadStoredHistory);

  const handleScreenShake = useCallback(() => {
    setIsScreenShaking(true);
    setTimeout(() => {
      setIsScreenShaking(false);
    }, 160);
  }, []);

  // Track already recorded session keys to prevent duplicate history entries
  const recordedSessionsRef = useRef<Set<string>>(
    new Set(loadStoredHistory().map(h => h.sessionKey).filter(Boolean) as string[]),
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
    recordedSessionsRef.current.clear();
    try {
      localStorage.removeItem(HISTORY_STORAGE_KEY);
      sessionStorage.removeItem(HISTORY_STORAGE_KEY);
      localStorage.removeItem('mimic_history');
      sessionStorage.removeItem('mimic_history');
    } catch (err) {
      console.warn('[Mimic Dungeon] Failed to clear history storage:', err);
    }
  }, []);

  const recordOutcomeToHistory = useCallback((sessionKey: string, wager: bigint, outcome: MimicOutcome, sessionId?: string) => {
    if (recordedSessionsRef.current.has(sessionKey)) return;
    recordedSessionsRef.current.add(sessionKey);

    // Auto-collect card into Tarot Compendium Album
    const card = outcome.card ?? getCardForOutcome(outcome.tierIndex, outcome.roll, wager, outcome.randomness);
    if (card?.cardId) {
      setDiscoveredCardIds(prev => {
        if (prev.includes(card.cardId)) return prev;
        const next = [...prev, card.cardId];
        saveStoredCollection(next);
        return next;
      });
    }

    // Auto-collect into 48 Relics Tracker (Task 3.2)
    const archIdx = getArchetypeIndexForCard(card?.cardId, card?.tierIndex);
    const edition = card?.edition || outcome.edition || 'standard';
    const relicId = getRelicId(archIdx, edition);
    setDiscoveredRelicIds(prev => {
      if (prev.includes(relicId)) return prev;
      const next = [...prev, relicId];
      saveStoredRelics(next);
      return next;
    });

    setHistory(prev => {
      const next: HistoryItem[] = [{ wager, outcome, sessionKey, sessionId, timestamp: Date.now() }, ...prev];
      saveStoredHistory(next);
      return next;
    });
  }, []);

  // BGM Active state for top header audio control
  const [bgmActive, setBgmActive] = useState(() => sound.isBgmEnabled());

  const handleToggleBgm = useCallback(() => {
    const next = sound.toggleBgm();
    setBgmActive(next);
    if (sound.sfxEnabled) sound.playClick();
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

  // Helper to auto-clamp wager input directly against current balance and max bet limits
  const handleWagerChange = useCallback(
    (val: string) => {
      if (val === '' || val === '.') {
        setWagerInput(val);
        return;
      }
      const clean = val.replace(/[^0-9.]/g, '');
      const parts = clean.split('.');
      const sanitized = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : clean;

      try {
        const parsed = parseUnits(sanitized, decimals);
        const maxLimit =
          balance !== undefined && maxAllowedWager !== undefined
            ? (balance < maxAllowedWager ? balance : maxAllowedWager)
            : balance !== undefined
              ? balance
              : maxAllowedWager;

        if (maxLimit !== undefined && maxLimit > 0n && parsed > maxLimit) {
          // Auto-clamp to max allowed limit (currentBalance or maxBetLimit)
          setWagerInput(formatUnits(maxLimit, decimals));
          return;
        }
      } catch {
        // partial typing, e.g. "1."
      }
      setWagerInput(sanitized);
    },
    [balance, maxAllowedWager, decimals],
  );

  // Auto-clamp or adjust wager when balance changes after a round settles (or on balance update)
  useEffect(() => {
    if (balance === undefined) return;
    if (round && (round.step === 'opening_session' || round.step === 'awaiting_pick' || round.step === 'revealing')) {
      return; // Do not interrupt an active round in-flight
    }

    try {
      const parsed = parseUnits(wagerInput.trim(), decimals);
      const maxLimit =
        maxAllowedWager !== undefined && maxAllowedWager < balance
          ? maxAllowedWager
          : balance;

      if (balance === 0n) {
        // If balance is empty, keep default minimum 1 TEST for display, but button is disabled
        if (parsed === 0n) {
          setWagerInput('1.00');
        }
      } else if (parsed > maxLimit && maxLimit > 0n) {
        // If bet exceeds current balance, auto-reset/clamp to current balance
        setWagerInput(formatUnits(maxLimit, decimals));
      }
    } catch {
      // Invalid input format, ignore
    }
  }, [balance, maxAllowedWager, decimals, round?.step]);

  // Ref to cache resolved VRF outcome across renders and asynchronous events
  const resolvedOutcomeRef = useRef<{
    sessionKey: string;
    sessionId: string;
    outcome: MimicOutcome;
    payout: bigint;
  } | null>(null);

  // Snapshot ref to inspect latest snapshot synchronously
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;

  // Handle card pick by player during awaiting_pick phase
  const handleCardPick = useCallback((index: number) => {
    setRound(current => {
      if (!current || (current.step !== 'awaiting_pick' && current.step !== 'opening_session')) {
        return current;
      }
      if (current.chosenIndex !== undefined) return current;

      // Check if resolvedOutcome is already available from ref or current state
      const cached = resolvedOutcomeRef.current;
      const hasOutcome =
        (cached && cached.sessionKey === current.sessionKey)
          ? cached
          : current.outcome
            ? { outcome: current.outcome, payout: current.payout ?? 0n, sessionId: current.sessionId ?? '' }
            : null;

      if (hasOutcome) {
        // 95%+ of the time on local simulator: VRF is already resolved!
        // Set chosenIndex and IMMEDIATELY transition to 'revealing'
        return {
          ...current,
          chosenIndex: index,
          outcome: hasOutcome.outcome,
          payout: hasOutcome.payout,
          sessionId: hasOutcome.sessionId || current.sessionId,
          step: 'revealing',
        };
      }

      // If VRF hasn't resolved yet: lock chosen index and wait for snapshot watcher
      return {
        ...current,
        chosenIndex: index,
      };
    });
  }, []);

  // Watch session updates in host snapshot to resolve randomness
  useEffect(() => {
    if (!round || !snapshot) return;
    if (round.step !== 'opening_session' && round.step !== 'awaiting_pick') return;

    const row = snapshot.sessions.items.find(
      item => item.sessionKey === round.sessionKey || (round.sessionId && item.sessionId === round.sessionId),
    );
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

    // Cache to ref immediately
    resolvedOutcomeRef.current = {
      sessionKey: round.sessionKey,
      sessionId: row.sessionId,
      outcome,
      payout: rowPayout,
    };

    setRound(current => {
      if (!current || current.sessionKey !== round.sessionKey) return current;

      // If player has already picked a card, transition to 'revealing' immediately!
      if (current.chosenIndex !== undefined && current.step !== 'settled') {
        return {
          ...current,
          sessionId: row.sessionId,
          outcome,
          payout: rowPayout,
          step: 'revealing',
        };
      }

      // If player has not picked yet, attach outcome and ensure awaiting_pick is set
      return {
        ...current,
        sessionId: row.sessionId,
        outcome,
        payout: rowPayout,
        step: current.step === 'opening_session' ? 'awaiting_pick' : current.step,
      };
    });
  }, [snapshot, round?.sessionKey, round?.sessionId, round?.step, round?.wager, round?.chosenIndex]);

  // AFK watchdog: give player 60 seconds to deliberate before auto-picking.
  // Fast Mode only speeds up card flip/reveal animations, never auto-picks.
  useEffect(() => {
    if (!round || round.step !== 'awaiting_pick' || round.chosenIndex !== undefined) {
      return;
    }
    const afkTimer = setTimeout(() => {
      handleCardPick(1);
    }, 60000);
    return () => clearTimeout(afkTimer);
  }, [round?.step, round?.chosenIndex, handleCardPick]);

  // Stuck watchdog: unfreeze if VRF / session opening hangs > 25s
  useEffect(() => {
    if (!round || round.step !== 'opening_session') return;
    const timer = setTimeout(() => {
      setError('Session timed out waiting for randomness fulfillment.');
      setRound(null);
    }, 25000);
    return () => clearTimeout(timer);
  }, [round?.sessionKey, round?.step]);

  // Consecutive win streak tracker (Rune Resonance)
  const currentStreak = useMemo(() => {
    let count = 0;
    for (const item of history) {
      if (item.outcome.won) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }, [history]);

  // Host reveal outcome synchronization & settlement completion
  const hostApiRef = useRef(hostApi);
  hostApiRef.current = hostApi;

  useEffect(() => {
    if (!round || round.step !== 'revealing' || !round.outcome) return;

    const currentOutcome = round.outcome;

    // Card reveal animation: 1200ms (380ms near-miss + tally sequence)
    const animDuration = 1200;

    const animTimer = setTimeout(() => {
      // 1. MANDATORY: revealOutcome on hostApi to credit guest balance
      if (round.sessionId) {
        void hostApiRef.current?.revealOutcome({ sessionId: round.sessionId }).catch(err => {
          console.warn('[Mimic Dungeon] revealOutcome notice:', err);
        });
      }

      // 2. Commit outcome to history (updates StatsStrip, HistoryStrip, and currentStreak!)
      recordOutcomeToHistory(round.sessionKey, round.wager, currentOutcome, round.sessionId);

      // 3. Transition to settled state
      setRound(current =>
        current && current.sessionKey === round.sessionKey
          ? { ...current, step: 'settled' }
          : current,
      );
    }, animDuration);

    return () => clearTimeout(animTimer);
  }, [
    round?.step,
    round?.sessionKey,
    round?.sessionId,
    round?.outcome,
    round?.wager,
    recordOutcomeToHistory,
  ]);

  const handleOpenChest = useCallback(async () => {
    if (!hostApi) return;
    setError(null);
    setWinDismissed(false);
    resolvedOutcomeRef.current = null;

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
    setRound({ sessionKey: pendingKey, wager: parsed, step: 'opening_session', chosenIndex: undefined, outcome: undefined });

    try {
      const { sessionKey } = await hostApi.openSession({
        wager: parsed.toString(),
        gameData: encodeGameData(),
      });

      // When openSession succeeds, transition to awaiting_pick (or revealing if already resolved and picked)
      setRound(current => {
        if (!current) return null;

        // Check if matching row is already present in current snapshot
        const matchingRow = snapshotRef.current?.sessions.items.find(
          item => item.sessionKey === sessionKey,
        );

        let outcome: MimicOutcome | null = null;
        let rowPayout = 0n;
        if (matchingRow && (matchingRow.isSettled || isTerminalPhase(matchingRow.phase))) {
          if (matchingRow.raw?.gameState && matchingRow.raw.gameState !== '0x') {
            try {
              outcome = decodeGameState(matchingRow.raw.gameState as `0x${string}`, parsed);
            } catch {
              // ignore
            }
          }
          if (!outcome && matchingRow.raw?.randomness && matchingRow.raw.randomness !== '0x') {
            try {
              outcome = outcomeFromRandomness(matchingRow.raw.randomness as `0x${string}`, parsed);
            } catch {
              // ignore
            }
          }
          if (!outcome && matchingRow.payout !== undefined) {
            try {
              outcome = outcomeFromPayout(BigInt(matchingRow.payout), parsed);
            } catch {
              // ignore
            }
          }
          if (outcome) {
            rowPayout = matchingRow.payout !== undefined ? BigInt(matchingRow.payout) : outcome.payout;
            resolvedOutcomeRef.current = {
              sessionKey,
              sessionId: matchingRow.sessionId,
              outcome,
              payout: rowPayout,
            };
          }
        }

        const effectiveOutcome = outcome || current.outcome;
        const effectivePayout = outcome ? rowPayout : current.payout;
        const effectiveSessionId = matchingRow?.sessionId || current.sessionId;

        return {
          ...current,
          sessionKey,
          outcome: effectiveOutcome,
          payout: effectivePayout,
          sessionId: effectiveSessionId,
          step: current.chosenIndex !== undefined && effectiveOutcome ? 'revealing' : 'awaiting_pick',
        };
      });
    } catch (cause) {
      setRound(null);
      setError(cause instanceof Error ? cause.message : 'Failed to draw fate card session.');
    }
  }, [hostApi, wagerInput, decimals, balance]);

  // Primary action button handler (player must click cards directly when awaiting pick)
  const handleActionClick = useCallback(() => {
    if (round?.step === 'awaiting_pick') {
      return;
    }
    handleOpenChest();
  }, [round?.step, handleOpenChest]);

  const isBusy = round !== null && round.step !== 'settled';

  return (
    <div className="mimic-app">
      {/* Top Header Navigation Bar (Compact 48px) */}
      <header className="mimic-header">
        <div className="header-left">
          <div className="logo-box">
            <ArcanaEyeIcon size={22} className="logo-sigil-icon" />
          </div>
          <div className="header-titles">
            <h1 className="game-title">ARCANA FATE</h1>
            <span className="badge-rtp">96.00% RTP</span>
            <span className="badge-vrf">VRF CERTIFIED</span>
          </div>
        </div>

        <div className="header-right">
          {/* Header Mystic BGM Audio Controls */}
          <div className="header-actions">
            <button
              type="button"
              onClick={handleToggleBgm}
              className={`header-btn-util header-btn-bgm ${bgmActive ? 'active' : 'inactive'}`}
              title="Procedural Web Audio Synthesizer (Dark Occult Drone & Mystic Arpeggios)"
            >
              <span className={`bgm-indicator-dot ${bgmActive ? 'pulsing' : ''}`} />
              <span className="btn-icon" style={{ display: 'inline-flex', alignItems: 'center' }}>
                {bgmActive ? <BgmIcon size={14} /> : <BgmOffIcon size={14} />}
              </span>
              <span className="btn-label">BGM: {bgmActive ? 'ON' : 'OFF'}</span>
            </button>
          </div>

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
            onWagerChange={handleWagerChange}
            onOpenChest={handleActionClick}
            disabled={isBusy}
            bgmActive={bgmActive}
            onToggleBgm={handleToggleBgm}
            onOpenPaytable={() => setPaytableOpen(true)}
            onOpenCollection={() => setCollectionOpen(true)}
            discoveredCount={unlockedPillarsCount}
            unlockedPillarsCount={unlockedPillarsCount}
            totalUniqueSigils={totalUniqueSigils}
            discoveredRelicsCount={discoveredRelicIds.length}
            isDemoMode={isDemoMode}
            onResetDemoBalance={resetDemoBalance}
            maxAllowedWager={maxAllowedWager}
            roundStep={round?.step ?? 'idle'}
          />

          {/* Right Stage Column */}
          <div className={`mimic-stage-column ${isScreenShaking ? 'screen-shake' : ''}`}>
            {error && (
              <div className="error-banner">
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <WarningIcon size={14} /> {error}
                </span>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="btn-error-dismiss"
                  title="Dismiss error"
                >
                  <CloseIcon size={12} />
                </button>
              </div>
            )}

            {/* 3D Fate Card Stage Viewport */}
            <CardStage
              step={round?.step ?? 'idle'}
              chosenIndex={round?.chosenIndex ?? null}
              outcome={round?.outcome ?? null}
              wager={round?.wager ?? 0n}
              streak={currentStreak}
              onCardPick={handleCardPick}
              onScreenShake={handleScreenShake}
            />

            {/* Live History Ticker Strip */}
            <HistoryStrip
              history={history}
              onSelectRound={item => setSelectedHistoryItem(item)}
            />
          </div>
        </div>

        {/* Bottom Game Analytics Grid */}
        <StatsStrip
          history={history}
          decimals={decimals}
          symbol={symbol}
          onReset={clearHistory}
        />
      </main>

      {/* Modals & Overlays */}
      <PaytableModal isOpen={paytableOpen} onClose={() => setPaytableOpen(false)} />

      <CollectionModal
        isOpen={collectionOpen}
        onClose={() => setCollectionOpen(false)}
        discoveredCardIds={discoveredCardIds}
        discoveredRelicIds={discoveredRelicIds}
        history={history}
      />

      <VerifyModal
        isOpen={selectedHistoryItem !== null}
        onClose={() => setSelectedHistoryItem(null)}
        item={selectedHistoryItem}
        decimals={decimals}
        symbol={symbol}
      />

      {round?.outcome && round.step === 'settled' && round.outcome.won && !winDismissed && (
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
