import { formatUnits } from 'viem';
import type { HistoryItem } from '../lib/mimic';

function formatToken(amount: bigint, decimals: number): string {
  const isNegative = amount < 0n;
  const abs = isNegative ? -amount : amount;
  const raw = formatUnits(abs, decimals);
  const [intPart, decPart = ''] = raw.split('.');
  const formattedDec = (decPart.slice(0, 4) + '00').slice(0, 2);
  return `${isNegative ? '-' : ''}${intPart}.${formattedDec}`;
}

export interface StatsStripProps {
  history: HistoryItem[];
  decimals: number;
  symbol: string;
  onReset?: () => void;
}

export function StatsStrip({
  history,
  decimals,
  symbol,
  onReset,
}: StatsStripProps) {
  const totalRounds = history.length;
  const wins = history.filter(h => h.outcome.won).length;
  const winRate = totalRounds > 0 ? ((wins / totalRounds) * 100).toFixed(1) : '0.0';

  const totalWagered = history.reduce((sum, h) => sum + h.wager, 0n);
  const totalPayout = history.reduce((sum, h) => sum + h.outcome.payout, 0n);
  const netProfit = totalPayout - totalWagered;
  const isPositive = netProfit > 0n;
  const isZero = netProfit === 0n;

  return (
    <div className="stats-grid">
      <div className="stat-card">
        <span className="stat-title">Rounds Played</span>
        <span className="stat-val">{totalRounds}</span>
      </div>

      <div className="stat-card">
        <span className="stat-title">Win Rate</span>
        <span className="stat-val">{winRate}%</span>
      </div>

      <div className="stat-card">
        <span className="stat-title">Total Wagered</span>
        <span className="stat-val">
          {formatToken(totalWagered, decimals)} {symbol}
        </span>
      </div>

      <div className="stat-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <span className="stat-title">Net Profit</span>
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              title="Reset session stats & history"
              className="btn-reset-stats"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '9px',
                fontFamily: 'monospace',
                cursor: 'pointer',
                padding: '0 2px',
                textDecoration: 'underline',
              }}
            >
              Reset
            </button>
          )}
        </div>
        <span
          className="stat-val"
          style={{
            color: isZero
              ? 'var(--text-primary)'
              : isPositive
                ? 'var(--accent-success)'
                : 'var(--accent-danger)',
          }}
        >
          {isPositive ? '+' : ''}
          {formatToken(netProfit, decimals)} {symbol}
        </span>
      </div>
    </div>
  );
}
