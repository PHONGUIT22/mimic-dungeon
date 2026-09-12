import type { HistoryItem } from '../lib/mimic';

export interface HistoryStripProps {
  history: HistoryItem[];
  onSelectRound?: (item: HistoryItem) => void;
}

export function HistoryStrip({ history, onSelectRound }: HistoryStripProps) {
  if (history.length === 0) {
    return (
      <div className="history-strip-box empty">
        <span className="history-label">LIVE</span>
        <span className="history-empty-text">No draws yet. Place a bet to generate VRF on-chain proof.</span>
      </div>
    );
  }

  return (
    <div className="history-strip-box">
      <span className="history-label">LIVE</span>
      <div className="history-items-row">
        {history.slice(0, 24).map((item, idx) => {
          const outcome = item.outcome;
          const tier = outcome.tierIndex;
          const pillClass =
            tier === 3
              ? 'pill-legendary'
              : tier === 2
                ? 'pill-gold'
                : tier === 1
                  ? 'pill-silver'
                  : 'pill-mimic';

          const multText =
            tier === 3 ? '5.00×' : tier === 2 ? '2.50×' : tier === 1 ? '1.20×' : '0.00×';

          return (
            <button
              key={`${outcome.randomness ?? ''}_${outcome.roll}_${idx}`}
              type="button"
              onClick={() => onSelectRound?.(item)}
              title={`Click to verify VRF seed • ${outcome.name} (${multText}) • Roll: ${outcome.roll}/100`}
              className={`history-pill ${pillClass}`}
              style={{ cursor: 'pointer', background: 'transparent' }}
            >
              <span className="pill-mult">{multText}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
