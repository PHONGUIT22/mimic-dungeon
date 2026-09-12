import { useMemo } from 'react';
import { TAROT_CATALOG, PAYTABLE } from '../lib/mimic';
import { CardArt } from './CardStage';

export interface CollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  discoveredCardIds: string[];
}

export function CollectionModal({
  isOpen,
  onClose,
  discoveredCardIds,
}: CollectionModalProps) {
  const allCards = useMemo(() => Object.values(TAROT_CATALOG), []);
  const discoveredSet = useMemo(() => new Set(discoveredCardIds), [discoveredCardIds]);
  const discoveredCount = useMemo(
    () => allCards.filter(c => discoveredSet.has(c.id)).length,
    [allCards, discoveredSet],
  );

  const totalCards = allCards.length;
  const progressPercent = Math.round((discoveredCount / totalCards) * 100);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card collection-modal-card"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '720px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>🃏</span>
            <div>
              <h2
                className="font-heading"
                style={{ fontSize: '16px', fontWeight: 800, color: '#fff', letterSpacing: '0.5px' }}
              >
                TAROT COMPENDIUM
              </h2>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                MYSTICAL ARCANA COLLECTION • BALATRO ALBUM
              </span>
            </div>
          </div>
          <button onClick={onClose} className="modal-close-btn" title="Close">
            ✕
          </button>
        </div>

        {/* Discovery Progress Bar Banner */}
        <div
          style={{
            margin: '10px 0 6px 0',
            padding: '10px 14px',
            borderRadius: '6px',
            background: 'var(--bg-inset)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  fontWeight: 800,
                  color: progressPercent === 100 ? 'var(--accent-gold)' : 'var(--text-primary)',
                }}
              >
                DISCOVERED: {discoveredCount} / {totalCards} ({progressPercent}%)
              </span>
              {progressPercent === 100 && (
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '9px',
                    fontWeight: 900,
                    padding: '2px 6px',
                    borderRadius: '3px',
                    background: 'linear-gradient(90deg, #f59e0b, #c084fc)',
                    color: '#000',
                  }}
                >
                  ★ MASTER OF FATE ★
                </span>
              )}
            </div>
            <span style={{ fontFamily: 'monospace', fontSize: '10px', color: 'var(--text-muted)' }}>
              12 ARCANA CARDS
            </span>
          </div>

          {/* Progress Track */}
          <div
            style={{
              width: '100%',
              height: '6px',
              borderRadius: '3px',
              background: '#0d1219',
              border: '1px solid var(--border-subtle)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${progressPercent}%`,
                height: '100%',
                background:
                  progressPercent === 100
                    ? 'linear-gradient(90deg, #f59e0b, #a855f7, #00e701)'
                    : 'linear-gradient(90deg, #38bdf8, #f59e0b)',
                borderRadius: '3px',
                transition: 'width 0.4s ease',
                boxShadow: '0 0 8px rgba(245, 158, 11, 0.6)',
              }}
            />
          </div>
        </div>

        {/* 12-Card Grid (Scrollable) */}
        <div
          className="collection-cards-grid"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '6px 2px 10px 2px',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '8px',
          }}
        >
          {allCards.map(card => {
            const isUnlocked = discoveredSet.has(card.id);
            const tierInfo = PAYTABLE[card.tierIndex] || PAYTABLE[0];

            if (!isUnlocked) {
              return (
                <div
                  key={card.id}
                  className="collection-card locked"
                  style={{
                    borderRadius: '6px',
                    background: '#0a0e16',
                    border: '1px dashed rgba(255, 255, 255, 0.15)',
                    padding: '10px 8px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    minHeight: '190px',
                    opacity: 0.65,
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                  title="Undiscovered Card • Play more rounds to find!"
                >
                  {/* Card Header */}
                  <div
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      opacity: 0.4,
                      borderBottom: '1px dashed rgba(255, 255, 255, 0.1)',
                      paddingBottom: '4px',
                    }}
                  >
                    <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#64748b' }}>?</span>
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '9px',
                        background: '#1e293b',
                        padding: '1px 4px',
                        borderRadius: '2px',
                        color: '#64748b',
                      }}
                    >
                      ???
                    </span>
                  </div>

                  {/* Center Locked Glyphs */}
                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      padding: '12px 0',
                    }}
                  >
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        border: '1px dashed #334155',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#475569',
                        fontSize: '18px',
                        fontFamily: 'monospace',
                        fontWeight: 900,
                      }}
                    >
                      ?
                    </div>
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '9px',
                        fontWeight: 800,
                        color: '#64748b',
                        letterSpacing: '1px',
                      }}
                    >
                      LOCKED
                    </span>
                  </div>

                  {/* Card Footer */}
                  <div style={{ width: '100%', textAlign: 'center', borderTop: '1px dashed rgba(255, 255, 255, 0.08)', paddingTop: '4px' }}>
                    <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#475569', fontWeight: 700 }}>
                      ???
                    </div>
                    <div style={{ fontSize: '8px', color: '#334155' }}>Tier {card.tierIndex} Secret</div>
                  </div>
                </div>
              );
            }

            // UNLOCKED CARD
            return (
              <div
                key={card.id}
                className={`collection-card unlocked card-tier-${card.tierIndex}`}
                style={{
                  borderRadius: '6px',
                  background: 'var(--bg-inset)',
                  border: `1px solid ${tierInfo.color}55`,
                  borderTop: `3px solid ${tierInfo.color}`,
                  padding: '10px 8px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  minHeight: '190px',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: `0 4px 14px rgba(0, 0, 0, 0.5), 0 0 12px ${tierInfo.color}22`,
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
              >
                {/* Card Header */}
                <div
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    paddingBottom: '4px',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '10px',
                      fontWeight: 800,
                      color: tierInfo.color,
                    }}
                  >
                    {card.roman}
                  </span>
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '9px',
                      fontWeight: 800,
                      background: 'rgba(0, 0, 0, 0.6)',
                      padding: '1px 5px',
                      borderRadius: '3px',
                      color: tierInfo.color,
                      border: `1px solid ${tierInfo.color}44`,
                    }}
                  >
                    {card.multiplierText}
                  </span>
                </div>

                {/* Center SVG Artwork */}
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '6px 0',
                  }}
                >
                  <CardArt iconType={card.iconType} tier={card.tierIndex} />
                </div>

                {/* Card Footer Info */}
                <div
                  style={{
                    width: '100%',
                    textAlign: 'center',
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    paddingTop: '4px',
                  }}
                >
                  <div
                    className="font-heading"
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      color: '#ffffff',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {card.name}
                  </div>
                  <div
                    style={{
                      fontSize: '9px',
                      color: 'var(--text-secondary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {card.subtitle}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: '10px',
            marginTop: '6px',
          }}
        >
          <span style={{ fontFamily: 'monospace', fontSize: '10px', color: 'var(--text-muted)' }}>
            Tip: Keep drawing fate cards to discover rare Tier II & III legendaries!
          </span>

          <button
            type="button"
            onClick={onClose}
            style={{
              borderRadius: '4px',
              background: '#212b39',
              border: '1px solid var(--border-medium)',
              padding: '6px 14px',
              fontFamily: 'Rubik, sans-serif',
              fontSize: '12px',
              fontWeight: 700,
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
