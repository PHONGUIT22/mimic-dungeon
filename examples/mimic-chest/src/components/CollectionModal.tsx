import { useMemo, useState } from 'react';
import { PAYTABLE, type HistoryItem, type DisplayCard, getCardForOutcome } from '../lib/mimic';
import {
  SACRED_ARCHETYPES,
  type MysticCardDef,
  RELIC_EDITIONS,
  TOTAL_RELICS_COUNT,
  RELIC_MILESTONES,
  getArchetypeIndexForCard,
  getRelicId,
  computeUnlockedPillarsIndices,
  getCurrentMilestone,
} from '../lib/proceduralNames';
import { ProceduralSigil } from './ProceduralSigil';
import {
  GrimoireIcon,
  TemplePillarIcon,
  ScrollIcon,
  CloseIcon,
  CheckIcon,
  LockIcon,
  StarIcon,
} from './Icons';

export interface CollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  discoveredCardIds: string[];
  discoveredRelicIds?: string[];
  history?: HistoryItem[];
}

export function CollectionModal({
  isOpen,
  onClose,
  discoveredCardIds,
  discoveredRelicIds = [],
  history = [],
}: CollectionModalProps) {
  const [activeTab, setActiveTab] = useState<'pillars' | 'archive'>('pillars');

  const allPillars = useMemo(() => SACRED_ARCHETYPES, []);

  // Determine which archetypes are unlocked based on discoveredCardIds
  const unlockedIndices = useMemo(
    () => computeUnlockedPillarsIndices(discoveredCardIds),
    [discoveredCardIds],
  );

  // Set of all discovered relic keys: 'RELIC_${archetypeIndex}_${edition}'
  const relicSet = useMemo(() => {
    const set = new Set<string>(discoveredRelicIds);
    // Also derive any relics present in history to guarantee 100% synchronization
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
        const archIdx = getArchetypeIndexForCard(card?.cardId, card?.tierIndex);
        const edition = card?.edition || item.outcome.edition || 'standard';
        set.add(getRelicId(archIdx, edition));
      }
    }
    // Also derive standard editions for any pillars in discoveredCardIds
    for (const cardId of discoveredCardIds) {
      const archIdx = getArchetypeIndexForCard(cardId, 0);
      set.add(getRelicId(archIdx, 'standard'));
    }
    return set;
  }, [discoveredRelicIds, history, discoveredCardIds]);

  const relicCount = Math.min(TOTAL_RELICS_COUNT, relicSet.size);
  const { current: currentMilestone, progressPercent: relicProgressPercent } = useMemo(
    () => getCurrentMilestone(relicCount),
    [relicCount],
  );

  const totalPillars = allPillars.length;
  const discoveredPillarsCount = unlockedIndices.size;

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
        style={{ maxWidth: '820px', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-gold)',
              }}
            >
              <GrimoireIcon size={18} />
            </div>
            <div>
              <h2
                className="font-heading"
                style={{ fontSize: '17px', fontWeight: 800, color: '#fff', letterSpacing: '0.5px' }}
              >
                TAROT CODEX & ARCANA RELICS
              </h2>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                {relicCount} / {TOTAL_RELICS_COUNT} ARCANA RELICS DISCOVERED • {currentMilestone ? currentMilestone.name.toUpperCase() : 'NOVICE SEEKER'}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="modal-close-btn" title="Close">
            <CloseIcon size={14} />
          </button>
        </div>

        {/* Milestone Badges Tracker Banner (Task 3.2) */}
        <div
          className="codex-milestones-bar"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '8px',
            margin: '6px 0 10px 0',
            padding: '8px 10px',
            background: 'var(--bg-inset)',
            borderRadius: '6px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {RELIC_MILESTONES.map(milestone => {
            const isAchieved = relicCount >= milestone.count;
            return (
              <div
                key={milestone.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 8px',
                  borderRadius: '5px',
                  background: isAchieved ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.2)',
                  border: isAchieved ? `1px solid ${milestone.accentColor}66` : '1px dashed rgba(255, 255, 255, 0.1)',
                  boxShadow: isAchieved ? `0 0 10px ${milestone.accentColor}20` : 'none',
                }}
                title={`${milestone.name} (${milestone.count} Relics): ${milestone.description}`}
              >
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: isAchieved ? `${milestone.accentColor}22` : 'rgba(255, 255, 255, 0.05)',
                    border: `1px solid ${isAchieved ? milestone.accentColor : 'rgba(255, 255, 255, 0.15)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isAchieved ? milestone.accentColor : 'var(--text-muted)',
                    fontSize: '11px',
                    flexShrink: 0,
                  }}
                >
                  {isAchieved ? <CheckIcon size={12} /> : <StarIcon size={11} />}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span
                    style={{
                      fontFamily: 'Rubik, sans-serif',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: isAchieved ? '#ffffff' : 'var(--text-secondary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {milestone.name}
                  </span>
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '9px',
                      color: isAchieved ? milestone.accentColor : 'var(--text-muted)',
                    }}
                  >
                    {isAchieved ? `${milestone.count} Relics ✓` : `${relicCount}/${milestone.count}`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tab Switcher Navigation */}
        <div
          className="collection-tab-bar"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            paddingBottom: '8px',
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
              gap: '8px',
              padding: '8px 12px',
              borderRadius: '5px',
              border: activeTab === 'pillars' ? '1px solid var(--accent-gold)' : '1px solid var(--border-subtle)',
              background: activeTab === 'pillars' ? 'rgba(245, 158, 11, 0.12)' : 'var(--bg-inset)',
              color: activeTab === 'pillars' ? 'var(--accent-gold)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'pillars' ? 800 : 600,
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <TemplePillarIcon size={14} /> 12 Primal Pillars ({discoveredPillarsCount}/{totalPillars})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('archive')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '8px 12px',
              borderRadius: '5px',
              border: activeTab === 'archive' ? '1px solid #c084fc' : '1px solid var(--border-subtle)',
              background: activeTab === 'archive' ? 'rgba(192, 132, 252, 0.12)' : 'var(--bg-inset)',
              color: activeTab === 'archive' ? '#c084fc' : 'var(--text-secondary)',
              fontWeight: activeTab === 'archive' ? 800 : 600,
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <ScrollIcon size={14} /> Channeled Archive ({channeledCards.length} Sigils)
          </button>
        </div>

        {/* TAB 1: 12 PRIMAL PILLARS */}
        {activeTab === 'pillars' && (
          <>
            {/* Relics Progress Bar Banner */}
            <div
              style={{
                margin: '0 0 8px 0',
                padding: '8px 12px',
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
                      color: relicCount === TOTAL_RELICS_COUNT ? 'var(--accent-gold)' : 'var(--text-primary)',
                    }}
                  >
                    COMPLETION: {relicCount} / {TOTAL_RELICS_COUNT} RELICS ({relicProgressPercent}%)
                  </span>
                  {relicCount === TOTAL_RELICS_COUNT && (
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
                      ★ GRAND INQUISITOR ★
                    </span>
                  )}
                </div>
                <span style={{ fontFamily: 'monospace', fontSize: '10px', color: 'var(--text-muted)' }}>
                  12 ARCHETYPES × 4 EDITIONS
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
                    width: `${relicProgressPercent}%`,
                    height: '100%',
                    background:
                      relicCount === TOTAL_RELICS_COUNT
                        ? 'linear-gradient(90deg, #f59e0b, #c084fc, #00e701)'
                        : 'linear-gradient(90deg, #38bdf8, #f59e0b)',
                    borderRadius: '3px',
                    transition: 'width 0.4s ease',
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
                padding: '4px 2px 8px 2px',
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
                        minHeight: '205px',
                        opacity: 0.65,
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                      title="Veiled Archetype • Draw cards to summon!"
                    >
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

                      <div
                        style={{
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          padding: '12px 0',
                        }}
                      >
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            border: '1px dashed #334155',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#64748b',
                          }}
                        >
                          <LockIcon size={16} />
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
                          VEILED ARCHETYPE
                        </span>
                      </div>

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

                // UNLOCKED CARD: Display card info & 4 Edition Relic slots (Task 3.2)
                return (
                  <div
                    key={card.id}
                    className={`collection-card unlocked card-tier-${card.tierIndex}`}
                    style={{
                      borderRadius: '6px',
                      background: 'var(--bg-inset)',
                      border: `1px solid ${tierInfo.color}45`,
                      borderTop: `3px solid ${tierInfo.color}`,
                      padding: '10px 8px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      minHeight: '205px',
                      position: 'relative',
                      overflow: 'hidden',
                      boxShadow: `0 4px 14px rgba(0, 0, 0, 0.5), 0 0 12px ${tierInfo.color}15`,
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

                    {/* Center Procedural Sigil Artwork */}
                    <div
                      style={{
                        width: '58px',
                        height: '58px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '4px 0',
                      }}
                    >
                      <ProceduralSigil seed={card.sigilSeed} tier={card.tierIndex} className="w-full h-full" />
                    </div>

                    {/* 4 Edition Relic Completion Badges (Task 3.2) */}
                    <div
                      style={{
                        width: '100%',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: '3px',
                        margin: '4px 0',
                        padding: '3px',
                        background: 'rgba(0, 0, 0, 0.35)',
                        borderRadius: '4px',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                      }}
                    >
                      {RELIC_EDITIONS.map(edition => {
                        const relicId = getRelicId(cardIdx, edition);
                        const isOwned = relicSet.has(relicId);
                        const label = edition === 'standard' ? 'STD' : edition === 'foil' ? 'FOIL' : edition === 'holo' ? 'HOLO' : 'POLY';

                        return (
                          <div
                            key={edition}
                            style={{
                              textAlign: 'center',
                              fontSize: '8px',
                              fontFamily: 'monospace',
                              fontWeight: 800,
                              padding: '2px 0',
                              borderRadius: '2px',
                              background: isOwned
                                ? edition === 'polychrome'
                                  ? 'linear-gradient(135deg, rgba(236, 72, 153, 0.3), rgba(168, 85, 247, 0.3))'
                                  : edition === 'holo'
                                    ? 'rgba(56, 189, 248, 0.25)'
                                    : edition === 'foil'
                                      ? 'rgba(245, 158, 11, 0.25)'
                                      : 'rgba(255, 255, 255, 0.15)'
                                : 'rgba(0, 0, 0, 0.4)',
                              color: isOwned
                                ? edition === 'polychrome'
                                  ? '#f472b6'
                                  : edition === 'holo'
                                    ? '#38bdf8'
                                    : edition === 'foil'
                                      ? '#fbbf24'
                                      : '#ffffff'
                                : 'rgba(255, 255, 255, 0.2)',
                              border: isOwned
                                ? `1px solid ${
                                    edition === 'polychrome'
                                      ? '#ec4899'
                                      : edition === 'holo'
                                        ? '#38bdf8'
                                        : edition === 'foil'
                                          ? '#f59e0b'
                                          : 'rgba(255, 255, 255, 0.3)'
                                  }`
                                : '1px solid transparent',
                            }}
                            title={`${card.name} (${edition.toUpperCase()} edition): ${isOwned ? 'Discovered!' : 'Locked'}`}
                          >
                            {isOwned ? label : '—'}
                          </div>
                        );
                      })}
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
                margin: '0 0 8px 0',
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
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-muted)',
                  }}
                >
                  <ScrollIcon size={22} />
                </div>
                <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  No Channeled Sigils Recorded Yet
                </span>
                <span style={{ fontSize: '11px', maxWidth: '380px', textAlign: 'center' }}>
                  Place wagers and open cards to channel rare procedural sigils with Foil, Holo, and Polychrome editions!
                </span>
              </div>
            ) : (
              <div
                className="collection-cards-grid"
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '4px 2px 8px 2px',
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
                        border: `1px solid ${tierInfo.color}45`,
                        borderTop: `3px solid ${tierInfo.color}`,
                        padding: '10px 8px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        minHeight: '190px',
                        position: 'relative',
                        overflow: 'hidden',
                        boxShadow: `0 4px 14px rgba(0, 0, 0, 0.5), 0 0 12px ${tierInfo.color}15`,
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
                            {card.edition === 'polychrome' ? 'POLYCHROME' : card.edition.toUpperCase()}
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
                          width: '60px',
                          height: '60px',
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
              ? `Arcana Relics: Discover Standard, Foil, Holo, and Polychrome editions of all 12 Archetypes!`
              : `Channeled Sigils: ${channeledCards.length} unique algorithmic signatures preserved.`}
          </span>

          <button
            type="button"
            onClick={onClose}
            style={{
              borderRadius: '4px',
              background: '#212b39',
              border: '1px solid var(--border-medium)',
              padding: '6px 16px',
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
