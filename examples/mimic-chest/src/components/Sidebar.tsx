import { useState, useMemo, memo } from 'react';
import { formatUnits, parseUnits } from 'viem';
import { sound } from '../lib/audio';
import type { RoundStep } from '../lib/mimic';
import {
  TierVoidIcon,
  TierSilverIcon,
  TierGoldIcon,
  TierDestinyIcon,
  LightningIcon,
  BgmIcon,
  BgmOffIcon,
  SoundIcon,
  SoundOffIcon,
  RulesBookIcon,
  GrimoireIcon,
} from './Icons';

export const Sidebar = memo(function Sidebar({
  balance,
  decimals,
  symbol,
  wagerInput,
  onWagerChange,
  onOpenChest,
  disabled,
  fastMode,
  onToggleFastMode,
  onOpenPaytable,
  isDemoMode,
  onResetDemoBalance,
  maxAllowedWager,
  roundStep,
  onOpenCollection,
  discoveredCount = 0,
  unlockedPillarsCount,
  totalUniqueSigils,
  discoveredRelicsCount = 0,
  bgmActive,
  onToggleBgm,
}: {
  balance: bigint | undefined;
  decimals: number;
  symbol: string;
  wagerInput: string;
  onWagerChange: (val: string) => void;
  onOpenChest: () => void;
  disabled: boolean;
  fastMode: boolean;
  onToggleFastMode: () => void;
  onOpenPaytable: () => void;
  onOpenCollection: () => void;
  discoveredCount?: number;
  unlockedPillarsCount?: number;
  totalUniqueSigils?: number;
  discoveredRelicsCount?: number;
  isDemoMode: boolean;
  onResetDemoBalance: () => void;
  maxAllowedWager?: bigint;
  roundStep?: RoundStep;
  bgmActive?: boolean;
  onToggleBgm?: () => void;
}) {
  const [soundEnabled, setSoundEnabled] = useState(sound.sfxEnabled);
  const [localBgmEnabled, setLocalBgmEnabled] = useState(sound.isBgmEnabled());

  const isBgmOn = bgmActive !== undefined ? bgmActive : localBgmEnabled;

  const toggleSound = () => {
    const next = sound.toggleSfx();
    setSoundEnabled(next);
  };

  const toggleBgm = () => {
    if (onToggleBgm) {
      onToggleBgm();
    } else {
      const next = sound.toggleBgm();
      setLocalBgmEnabled(next);
      if (sound.sfxEnabled) sound.playClick();
    }
  };

  const parsedWager = useMemo(() => {
    if (!wagerInput.trim()) return null;
    try {
      const p = parseUnits(wagerInput.trim(), decimals);
      return p > 0n ? p : null;
    } catch {
      return null;
    }
  }, [wagerInput, decimals]);

  const maxEffectiveWager = useMemo(() => {
    if (balance !== undefined && maxAllowedWager !== undefined) {
      return balance < maxAllowedWager ? balance : maxAllowedWager;
    }
    return balance !== undefined ? balance : maxAllowedWager;
  }, [balance, maxAllowedWager]);

  const handleHalf = () => {
    sound.playChipClink();
    if (!parsedWager) return;
    const half = parsedWager / 2n;
    if (half > 0n) onWagerChange(formatUnits(half, decimals));
  };

  const handleDouble = () => {
    sound.playChipClink();
    if (!parsedWager) return;
    const dbl = parsedWager * 2n;
    const finalVal = maxEffectiveWager && dbl > maxEffectiveWager ? maxEffectiveWager : dbl;
    onWagerChange(formatUnits(finalVal, decimals));
  };

  const handleMax = () => {
    sound.playChipClink();
    if (balance !== undefined && balance > 0n) {
      // All-in exactly Math.min(currentBalance, maxBetLimit)
      const maxVal = maxEffectiveWager !== undefined && maxEffectiveWager > 0n ? maxEffectiveWager : balance;
      onWagerChange(formatUnits(maxVal, decimals));
    } else if (maxAllowedWager !== undefined) {
      onWagerChange(formatUnits(maxAllowedWager, decimals));
    } else {
      onWagerChange(formatUnits(parseUnits('100', decimals), decimals));
    }
  };

  const handleQuickAdd = (amount: number) => {
    sound.playChipClink();
    const current = parsedWager ?? 0n;
    const added = current + parseUnits(String(amount), decimals);
    const finalVal = maxEffectiveWager && added > maxEffectiveWager ? maxEffectiveWager : added;
    onWagerChange(formatUnits(finalVal, decimals));
  };

  return (
    <aside className="mimic-sidebar">
      {/* Demo Mode Notice */}
      {isDemoMode && (
        <div className="demo-notice-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
            <span style={{ fontWeight: 'bold' }}>Demo Mode (1,000 TEST)</span>
          </div>
          <button
            onClick={onResetDemoBalance}
            className="btn-reset-demo"
            title="Reset demo chips to 1,000"
          >
            Reset 1K
          </button>
        </div>
      )}

      {/* Vault Balance Card */}
      <div className="balance-card">
        <div className="balance-card-header">
          <span>{isDemoMode ? 'Demo Tokens' : 'Smart Vault'}</span>
          <span style={{ fontWeight: 700 }}>{symbol}</span>
        </div>
        <div className="balance-card-val">
          {balance !== undefined ? formatUnits(balance, decimals).slice(0, 10) : '—'} {symbol}
        </div>
      </div>

      {/* Bet Amount Input */}
      <div className="input-section">
        <div className="input-label-row">
          <label htmlFor="wagerInput">Bet Amount</label>
          {maxAllowedWager && (
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Max: {formatUnits(maxAllowedWager, decimals).slice(0, 6)}
            </span>
          )}
        </div>

        <div className="input-wrapper">
          <input
            id="wagerInput"
            type="text"
            value={wagerInput}
            onChange={e => onWagerChange(e.target.value)}
            disabled={disabled}
            placeholder="1.00"
            className="input-wager"
          />
          <span className="input-unit">{symbol}</span>
        </div>

        {/* Quick Bet Buttons: 1/2, 2x, Max */}
        <div className="quick-buttons-grid">
          <button
            type="button"
            onClick={handleHalf}
            disabled={disabled}
            className="btn-quick"
          >
            ½
          </button>
          <button
            type="button"
            onClick={handleDouble}
            disabled={disabled}
            className="btn-quick"
          >
            2×
          </button>
          <button
            type="button"
            onClick={handleMax}
            disabled={disabled}
            className="btn-quick"
          >
            MAX
          </button>
        </div>

        {/* Preset Chips: +1, +5, +10, +25 */}
        <div className="preset-chips-grid">
          {[1, 5, 10, 25].map(chip => (
            <button
              key={chip}
              type="button"
              onClick={() => handleQuickAdd(chip)}
              disabled={disabled}
              className="btn-chip"
            >
              +{chip}
            </button>
          ))}
        </div>
      </div>

      {/* Paytable Multipliers Preview */}
      <div className="paytable-card">
        <span className="paytable-card-title">FATE CARDS</span>
        <div className="paytable-row">
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f87171' }}>
            <TierVoidIcon size={14} /> The Void (50%)
          </span>
          <span className="paytable-mono-mult" style={{ color: '#ef4444' }}>0.00×</span>
        </div>
        <div className="paytable-row">
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#cbd5e1' }}>
            <TierSilverIcon size={14} /> Silver Rune (30%)
          </span>
          <span className="paytable-mono-mult" style={{ color: '#cbd5e1' }}>1.20×</span>
        </div>
        <div className="paytable-row">
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fde047' }}>
            <TierGoldIcon size={14} /> Golden Sun (16%)
          </span>
          <span className="paytable-mono-mult" style={{ color: '#f59e0b' }}>2.50×</span>
        </div>
        <div className="paytable-row">
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#d8b4fe' }}>
            <TierDestinyIcon size={14} /> Destiny (4%)
          </span>
          <span className="paytable-mono-mult" style={{ color: '#c084fc' }}>5.00×</span>
        </div>
      </div>

      {/* Big Action Button */}
      <button
        type="button"
        onClick={() => {
          sound.playClick();
          onOpenChest();
        }}
        disabled={
          roundStep === 'awaiting_pick' ||
          disabled ||
          !parsedWager ||
          parsedWager <= 0n ||
          (balance !== undefined && (parsedWager > balance || balance === 0n))
        }
        className="btn-open-chest"
      >
        {roundStep === 'opening_session'
          ? 'DEALING...'
          : roundStep === 'awaiting_pick'
            ? 'CHOOSE A CARD ABOVE'
            : roundStep === 'revealing'
              ? 'REVEALING...'
              : balance !== undefined && balance === 0n
                ? 'INSUFFICIENT BALANCE'
                : 'DRAW CARD'}
      </button>

      {/* Utility Bar */}
      <div className="sidebar-footer">
        <button
          type="button"
          onClick={onToggleFastMode}
          className={`btn-util ${fastMode ? 'active' : ''}`}
          title="Skip card flip animation for faster rounds"
        >
          <LightningIcon size={14} /> Fast
        </button>

        <button
          type="button"
          onClick={toggleBgm}
          className={`btn-util ${isBgmOn ? 'active' : ''}`}
          title="Toggle ambient dungeon music (BGM)"
        >
          {isBgmOn ? <BgmIcon size={14} /> : <BgmOffIcon size={14} />} Music
        </button>

        <button
          type="button"
          onClick={toggleSound}
          className={`btn-util ${soundEnabled ? 'active' : ''}`}
          title="Toggle game sound effects"
        >
          {soundEnabled ? <SoundIcon size={14} /> : <SoundOffIcon size={14} />} SFX
        </button>

        <button
          type="button"
          onClick={onOpenPaytable}
          className="btn-util"
          title="View card paytable, RTP rules, and VRF proof"
        >
          <RulesBookIcon size={14} /> Rules
        </button>

        <button
          type="button"
          onClick={() => {
            sound.playClick();
            onOpenCollection();
          }}
          className="btn-util btn-util-album"
          title={`Tarot Codex • ${discoveredRelicsCount} / 48 Arcana Relics Discovered (${unlockedPillarsCount ?? discoveredCount}/${totalUniqueSigils ?? 12} Pillars)`}
        >
          <GrimoireIcon size={14} /> Codex ({discoveredRelicsCount}/48)
        </button>
      </div>
    </aside>
  );
});
