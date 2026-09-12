import type { MimicOutcome } from '../lib/mimic';

export function HistoryStrip({ history }: { history: MimicOutcome[] }) {
  if (history.length === 0) {
    return (
      <div className="history-strip-box empty">
        <span className="history-label">LIVE</span>
        <span className="history-empty-text">No chests opened yet. Place bet to start.</span>
      </div>
    );
  }

  return (
    <div className="history-strip-box">
      <span className="history-label">LIVE</span>
      <div className="history-items-row">
        {history.slice(0, 24).map((item, idx) => {
          const tier = item.tierIndex;
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
            <div
              key={`${item.randomness ?? ''}_${item.roll}_${idx}`}
              title={`${item.name} (${multText}) • Roll: ${item.roll}/100`}
              className={`history-pill ${pillClass}`}
            >
              <span className="pill-mult">{multText}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
