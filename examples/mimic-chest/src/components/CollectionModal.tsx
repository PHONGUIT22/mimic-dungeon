import { useMemo, useState } from 'react';
import { PAYTABLE, type HistoryItem, type DisplayCard, getCardForOutcome } from '../lib/mimic';
import {
  SACRED_ARCHETYPES,
  type MysticCardDef,
  computeUnlockedPillarsIndices,
} from '../lib/proceduralNames';
import { ProceduralSigil } from './ProceduralSigil';

export interface CollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  discoveredCardIds: string[];
  history?: HistoryItem[];
}

export function CollectionModal({
  isOpen,
  onClose,
  discoveredCardIds,
  history = [],
}: CollectionModalProps) {
  const [activeTab, setActiveTab] = useState<'pillars' | 'archive'>('pillars');

  const allPillars = useMemo(() => SACRED_ARCHETYPES, []);

  // Determine which archetypes are unlocked based on discoveredCardIds
  const unlockedIndices = useMemo(
    () => computeUnlockedPillarsIndices(discoveredCardIds),
    [discoveredCardIds],
  );

  const totalPillars = allPillars.length;
  const discoveredCount = unlockedIndices.size;
  const progressPercent = Math.round((discoveredCount / totalPillars) * 100);

  // Extract all unique channeled cards from gameplay history
  const channeledCards = useMemo(() => {
    const map = new Map<string, DisplayCard>();
    if (history && history.length > 0) {
      for (const item of history) {
        const card =
          item.outcome.card ??
          getCardForOutcome(
            item.outcome.tierIndex,
            item.outcome.roll,
            item.wager,
            item.outcome.randomness,
          );
        if (card && card.cardId && !map.has(card.cardId)) {
          map.set(card.cardId, card);
        }
      }
    }
    return Array.from(map.values());
  }, [history]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card collection-modal-card"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '750px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>🔯</span>
            <div>
              <h2
                className="font-heading"
                style={{ fontSize: '16px', fontWeight: 800, color: '#fff', letterSpacing: '0.5px' }}
              >
                SACRED SIGIL COMPENDIUM
              </h2>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                INFINITE PROCEDURAL CODEX • {channeledCards.length} UNIQUE SIGILS DISCOVERED
              </span>
            </div>
          </div>
          <button onClick={onClose} className="modal-close-btn" title="Close">
            ✕
          </button>
        </div>

        {/* Tab Switcher Navigation */}
        <div
          className="collection-tab-bar"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 0 10px 0',
            borderBottom: '1px solid var(--border-subtle)',
            marginBottom: '8px',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('pillars')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px 12px',
              borderRadius: '5px',
              border: activeTab === 'pillars' ? '1px solid #f59e0b' : '1px solid var(--border-subtle)',
              background: activeTab === 'pillars' ? 'rgba(245, 158, 11, 0.12)' : 'var(--bg-inset)',
              color: activeTab === 'pillars' ? '#f59e0b' : 'var(--text-secondary)',
              fontWeight: activeTab === 'pillars' ? 800 : 600,
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: activeTab === 'pillars' ? '0 0 12px rgba(245, 158, 11, 0.25)' : 'none',
            }}
          >
            <span>🏛️</span> 12 Primal Pillars ({discoveredCount}/12)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('archive')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px 12px',
              borderRadius: '5px',
              border: activeTab === 'archive' ? '1px solid #c084fc' : '1px solid var(--border-subtle)',
              background: activeTab === 'archive' ? 'rgba(192, 132, 252, 0.12)' : 'var(--bg-inset)',
              color: activeTab === 'archive' ? '#c084fc' : 'var(--text-secondary)',
              fontWeight: activeTab === 'archive' ? 800 : 600,
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: activeTab === 'archive' ? '0 0 12px rgba(192, 132, 252, 0.25)' : 'none',
            }}
          >
            <span>📜</span> Channeled Archive ({channeledCards.length} Sigils)
          </button>
        </div>

        {/* TAB 1: 12 PRIMAL PILLARS */}
        {activeTab === 'pillars' && (
          <>
            {/* Discovery Progress Bar Banner */}
            <div
              style={{
                margin: '2px 0 8px 0',
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
                    DISCOVERED: {discoveredCount} / {totalPillars} ({progressPercent}%)
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
                      ★ ARCH-MAGE OF DESTINY ★
                    </span>
                  )}
                </div>
                <span style={{ fontFamily: 'monospace', fontSize: '10px', color: 'var(--text-muted)' }}>
                  12 SACRED FOUNDATIONS
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
              {allPillars.map((card: MysticCardDef, cardIdx: number) => {
                const isUnlocked = unlockedIndices.has(cardIdx);
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
                      title="Undiscovered Sigil • Draw cards to summon!"
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
                            width: '44px',
                            height: '44px',
                            borderRadius: '50%',
                            border: '1px dashed #334155',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#475569',
                            fontSize: '20px',
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
                          UNREVEALED
                        </span>
                      </div>

                      {/* Card Footer */}
                      <div
                        style={{
                          width: '100%',
                          textAlign: 'center',
                          borderTop: '1px dashed rgba(255, 255, 255, 0.08)',
                          paddingTop: '4px',
                        }}
                      >
                        <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#475569', fontWeight: 700 }}>
                          ???
                        </div>
                        <div style={{ fontSize: '8px', color: '#334155' }}>Tier {card.tierIndex} Secret Sigil</div>
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

                    {/* Center Pure SVG Procedural Sigil */}
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
                      <ProceduralSigil seed={card.sigilSeed} tier={card.tierIndex} className="w-full h-full" />
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
          </>
        )}

        {/* TAB 2: CHANNELED ARCHIVE (KHO ẤN CHÚ VÔ TẬN) */}
        {activeTab === 'archive' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Archive Summary Banner */}
            <div
              style={{
                margin: '2px 0 8px 0',
                padding: '10px 14px',
                borderRadius: '6px',
                background: 'var(--bg-inset)',
                border: '1px solid rgba(192, 132, 252, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    fontWeight: 800,
                    color: '#c084fc',
                  }}
                >
                  CHANNELED ARCHIVE: {channeledCards.length} UNIQUE PROCEDURAL SIGILS
                </span>
                <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                  Every unique card summoned through on-chain VRF is preserved in this eternal library.
                </p>
              </div>
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: '9px',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '3px',
                  background: 'rgba(192, 132, 252, 0.15)',
                  border: '1px solid rgba(192, 132, 252, 0.4)',
                  color: '#c084fc',
                }}
              >
                INFINITE CODEX
              </span>
            </div>

            {/* Channeled Cards Scrollable Grid */}
            {channeledCards.length === 0 ? (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '30px 0',
                  color: 'var(--text-muted)',
                }}
              >
                <span style={{ fontSize: '32px' }}>✨</span>
                <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  No Channeled Sigils Recorded Yet
                </span>
                <span style={{ fontSize: '11px', maxWidth: '380px', textAlign: 'center' }}>
                  Place wagers and open mystery cards to channel rare procedural sigils with Foil, Holo, and Polychrome editions!
                </span>
              </div>
            ) : (
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
                {channeledCards.map((card: DisplayCard) => {
                  const tierInfo = PAYTABLE[card.tierIndex] || PAYTABLE[0];
                  const isEdition = card.edition && card.edition !== 'standard';

                  return (
                    <div
                      key={card.cardId}
                      className={`collection-card unlocked card-tier-${card.tierIndex} card-edition-${card.edition}`}
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
                      {/* Edition Sheen Background */}
                      {card.edition === 'polychrome' && <div className="card-polychrome-sheen" />}
                      {card.edition === 'holo' && <div className="card-holo-sheen" />}
                      {card.edition === 'foil' && <div className="card-foil-sheen" />}

                      {/* Card Header */}
                      <div
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                          paddingBottom: '4px',
                          zIndex: 2,
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

                        {isEdition && (
                          <span
                            className={`card-edition-badge edition-${card.edition}`}
                            style={{ fontSize: '8px', padding: '1px 4px' }}
                          >
                            {card.edition === 'polychrome' ? '★ POLY ★' : card.edition.toUpperCase()}
                          </span>
                        )}

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

                      {/* Center Pure SVG Procedural Sigil */}
                      <div
                        style={{
                          width: '64px',
                          height: '64px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '6px 0',
                          zIndex: 2,
                        }}
                      >
                        <ProceduralSigil
                          seed={card.sigilSeed ?? card.cardId}
                          tier={card.tierIndex}
                          className="w-full h-full"
                        />
                      </div>

                      {/* Card Footer Info */}
                      <div
                        style={{
                          width: '100%',
                          textAlign: 'center',
                          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                          paddingTop: '4px',
                          zIndex: 2,
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
            )}
          </div>
        )}

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
            {activeTab === 'pillars'
              ? 'Tip: Draw cards across all 4 tiers to discover the 12 sacred pillars!'
              : `Tip: You have channeled ${channeledCards.length} unique sigils in this session!`}
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
