import { formatUnits } from 'viem';
import type { MimicOutcome } from '../lib/mimic';
import { TierDestinyIcon, TierGoldIcon } from './Icons';

export function WinOverlay({
  outcome,
  payout,
  decimals,
  symbol,
  onDismiss,
}: {
  outcome: MimicOutcome;
  payout: bigint;
  decimals: number;
  symbol: string;
  onDismiss: () => void;
}) {
  const isLegendary = outcome.tierIndex === 3;
  const isGold = outcome.tierIndex === 2;

  // Only show celebration overlay for big wins (Gold & Legendary)
  if (!isLegendary && !isGold) return null;

  return (
    <div className="modal-backdrop">
      <div className={`win-overlay-card ${isLegendary ? 'win-card-legendary' : 'win-card-gold'}`}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
          {isLegendary ? (
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(192, 132, 252, 0.15)',
                border: '1.5px solid #c084fc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#c084fc',
                boxShadow: '0 0 24px rgba(192, 132, 252, 0.5)',
              }}
            >
              <TierDestinyIcon size={38} />
            </div>
          ) : (
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1.5px solid #f59e0b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f59e0b',
                boxShadow: '0 0 24px rgba(245, 158, 11, 0.5)',
              }}
            >
              <TierGoldIcon size={38} />
            </div>
          )}
        </div>

        <span
          style={{
            fontFamily: 'monospace',
            fontSize: '11px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            color: isLegendary ? '#d8b4fe' : '#fcd34d',
          }}
        >
          {isLegendary ? 'MYTHIC DESTINY HIT' : 'SOLAR BLESSING REWARD'}
        </span>

        <h2 style={{ fontFamily: 'Rubik, monospace', fontSize: '36px', fontWeight: 900, color: '#fff', margin: '4px 0' }}>
          {isLegendary ? '5.00×' : '2.50×'}
        </h2>

        <div className="win-payout-box">
          <span style={{ fontFamily: 'monospace', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Payout</span>
          <span style={{ fontFamily: 'Rubik, monospace', fontSize: '20px', fontWeight: 800, color: 'var(--accent-success)' }}>
            +{formatUnits(payout, decimals).slice(0, 10)} {symbol}
          </span>
        </div>

        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4, margin: '6px 0 14px 0' }}>
          {outcome.description}
        </p>

        <button
          onClick={onDismiss}
          className="btn-claim"
        >
          COLLECT WINNINGS
        </button>
      </div>
    </div>
  );
}
