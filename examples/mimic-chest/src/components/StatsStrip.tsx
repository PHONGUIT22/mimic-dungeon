import { formatUnits } from 'viem';
import type { MimicOutcome } from '../lib/mimic';

function formatToken(amount: bigint, decimals: number): string {
  const isNegative = amount < 0n;
  const abs = isNegative ? -amount : amount;
  const raw = formatUnits(abs, decimals);
  const [intPart, decPart = ''] = raw.split('.');
  const formattedDec = (decPart.slice(0, 2) + '00').slice(0, 2);
  return `${isNegative ? '-' : ''}${intPart}.${formattedDec}`;
}

export function StatsStrip({
  history,
  decimals,
  symbol,
}: {
  history: Array<{ wager: bigint; outcome: MimicOutcome }>;
  decimals: number;
  symbol: string;
}) {
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
        <span className="stat-title">Rounds</span>
        <span className="stat-val">{totalRounds}</span>
      </div>

      <div className="stat-card">
        <span className="stat-title">Win Rate</span>
        <span className="stat-val">{winRate}%</span>
      </div>

      <div className="stat-card">
        <span className="stat-title">Net Profit</span>
        <span
          className="stat-val"
          style={{
            color: isZero
              ? 'var(--text-primary)'
              : isPositive
                ? 'var(--emerald)'
                : 'var(--red)',
          }}
        >
          {isPositive ? '+' : ''}
          {formatToken(netProfit, decimals)} {symbol}
        </span>
      </div>

      <div className="stat-card">
        <span className="stat-title">RTP Model</span>
        <span className="stat-val" style={{ color: '#818cf8' }}>
          96.00%
        </span>
      </div>
    </div>
  );
}
