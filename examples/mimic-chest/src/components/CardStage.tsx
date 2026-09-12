import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  type MimicOutcome,
  type DisplayCard,
  type RoundStep,
  getCardForOutcome,
  generateNearMissCards,
} from '../lib/mimic';
import { sound } from '../lib/audio';

export type CardAnimationState = 'idle' | 'opening' | 'revealed';

export type SpreadState =
  | 'idle'
  | 'dealing'
  | 'awaiting_pick'
  | 'revealing'
  | 'near_miss'
  | 'done';

export interface CardStageProps {
  step?: RoundStep;
  state?: CardAnimationState;
  chosenIndex?: number | null;
  outcome: MimicOutcome | null;
  wager?: bigint;
  fastMode: boolean;
  streak?: number;
  onCardPick?: (index: number) => void;
}

export function CardStage({
  step,
  state,
  chosenIndex = null,
  outcome,
  wager = 0n,
  fastMode,
  streak = 0,
  onCardPick,
}: CardStageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 3-Card spread internal state
  const [spreadState, setSpreadState] = useState<SpreadState>('idle');
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [cards, setCards] = useState<[DisplayCard | null, DisplayCard | null, DisplayCard | null]>([
    null,
    null,
    null,
  ]);
  const [flipped, setFlipped] = useState<[boolean, boolean, boolean]>([false, false, false]);

  // Mouse 3D Parallax tilt tracking
  const [tilt, setTilt] = useState<{ index: number | null; rx: number; ry: number }>({
    index: null,
    rx: 0,
    ry: 0,
  });

  // Particle System
  const particlesRef = useRef<
    Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      alpha: number;
      decay: number;
      shape: 'circle' | 'star' | 'square';
    }>
  >([]);

  const spawnParticles = useCallback((tierIndex: number, originX: number, originY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const baseCount = tierIndex === 3 ? 130 : tierIndex === 2 ? 85 : tierIndex === 1 ? 55 : 45;
    const count = Math.round(baseCount * (streak >= 3 ? 1.6 : 1.0));

    const colors =
      tierIndex === 3
        ? ['#c084fc', '#f472b6', '#38bdf8', '#facc15', '#ffffff', '#e879f9', '#fbbf24']
        : tierIndex === 2
          ? ['#fbbf24', '#f59e0b', '#d97706', '#fef08a', '#ffffff', '#34d399']
          : tierIndex === 1
            ? ['#94a3b8', '#cbd5e1', '#e2e8f0', '#38bdf8', '#ffffff']
            : ['#ef4444', '#b91c1c', '#7f1d1d', '#a855f7', '#1e1b4b'];

    const newParticles = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * (tierIndex === 3 ? 9.5 : 7) + 2;
      newParticles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (tierIndex > 0 ? 2.5 : 0),
        size: Math.random() * 5 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        decay: Math.random() * 0.018 + 0.012,
        shape: (tierIndex === 3 || streak >= 3 ? 'star' : Math.random() > 0.5 ? 'circle' : 'square') as
          | 'circle'
          | 'star'
          | 'square',
      });
    }
    particlesRef.current = newParticles;
  }, [streak]);

  // 1. Transition into 'dealing' when a new wager begins (state === 'opening')
  // Sync selectedIdx if chosenIndex is provided from props
  useEffect(() => {
    if (chosenIndex !== undefined && chosenIndex !== null) {
      setSelectedIdx(chosenIndex);
    }
  }, [chosenIndex]);

  // 1. Synchronize lifecycle step transitions
  useEffect(() => {
    if (step === 'opening_session' || state === 'opening') {
      setSpreadState('dealing');
      setSelectedIdx(null);
      setFlipped([false, false, false]);
      setCards([null, null, null]);
      sound.playDealWhoosh();

      const dealTimer = setTimeout(
        () => {
          setSpreadState('awaiting_pick');
        },
        fastMode ? 120 : 360,
      );

      return () => clearTimeout(dealTimer);
    } else if (step === 'awaiting_pick') {
      setSpreadState(prev => (prev === 'dealing' ? prev : 'awaiting_pick'));
    } else if (step === 'idle' || state === 'idle') {
      setSpreadState('idle');
      setSelectedIdx(null);
      setFlipped([false, false, false]);
      setCards([null, null, null]);
    } else if (step === 'settled') {
      setSpreadState('done');
      setFlipped([true, true, true]);
    }
  }, [step, state, fastMode]);

  const effectiveSelectedIdx = chosenIndex !== null && chosenIndex !== undefined ? chosenIndex : selectedIdx;

  // 2. Handle card selection by player (or auto-pick in fastMode / timeout)
  const handleCardClick = useCallback(
    (idx: number) => {
      if (spreadState !== 'awaiting_pick' || effectiveSelectedIdx !== null) return;
      sound.playCardSelect();
      setSelectedIdx(idx);
      onCardPick?.(idx);
    },
    [spreadState, effectiveSelectedIdx, onCardPick],
  );

  // 3. Fallback auto-pick if outcome is settled but player hasn't picked after delay
  useEffect(() => {
    if (
      (step === 'revealing' || state === 'revealed' || outcome !== null) &&
      spreadState === 'awaiting_pick' &&
      effectiveSelectedIdx === null
    ) {
      const autoTimer = setTimeout(
        () => {
          handleCardClick(1); // Auto-pick center card
        },
        fastMode ? 80 : 300,
      );
      return () => clearTimeout(autoTimer);
    }
  }, [step, state, outcome, spreadState, effectiveSelectedIdx, fastMode, handleCardClick]);

  // 4. Reveal sequence once a card is selected and outcome is ready
  useEffect(() => {
    const activeIdx = chosenIndex !== null && chosenIndex !== undefined ? chosenIndex : selectedIdx;
    if (activeIdx === null || !outcome) return;

    const isRevealTriggered =
      step === 'revealing' ||
      state === 'revealed' ||
      ((spreadState === 'awaiting_pick' || spreadState === 'dealing') && activeIdx !== null && outcome);

    if (!isRevealTriggered) return;
    if (spreadState === 'revealing' || spreadState === 'near_miss' || spreadState === 'done') return;

    // Populate actual card at selected slot and near-miss cards at unpicked slots
    const actualCard =
      outcome.card ||
      getCardForOutcome(outcome.tierIndex, outcome.roll, wager, outcome.randomness);
    const dummyCards = generateNearMissCards(outcome, wager);

    let dummyIndex = 0;
    const newCards: [DisplayCard, DisplayCard, DisplayCard] = [null as any, null as any, null as any];
    for (let i = 0; i < 3; i++) {
      if (i === activeIdx) {
        newCards[i] = actualCard;
      } else {
        newCards[i] = dummyCards[dummyIndex++];
      }
    }
    setCards(newCards);
    setSelectedIdx(activeIdx);

    // STEP A: Flip selected card forward immediately
    setSpreadState('revealing');
    setFlipped(prev => {
      const next = [...prev] as [boolean, boolean, boolean];
      next[activeIdx] = true;
      return next;
    });

    // Audio & particles for selected outcome
    if (outcome.tierIndex === 0) {
      sound.playMimic();
    } else if (outcome.tierIndex === 1) {
      sound.playSilver();
    } else if (outcome.tierIndex === 2) {
      sound.playGold();
    } else {
      sound.playLegendary();
    }

    if (outcome.won) {
      sound.playPitchShiftTally(outcome.multiplier);
    }

    // Spawn particle burst at selected card
    const canvas = canvasRef.current;
    if (canvas) {
      const xPercent = activeIdx === 0 ? 0.25 : activeIdx === 1 ? 0.5 : 0.75;
      spawnParticles(outcome.tierIndex, canvas.width * xPercent, canvas.height * 0.44);
    }

    // STEP B: Flip remaining 2 near-miss cards after 400ms (or 150ms in fastMode)
    const nearMissTimer = setTimeout(
      () => {
        setSpreadState('near_miss');
        setFlipped([true, true, true]);

        // If player lost (Tier 0) and one of the unpicked cards was Tier 3 (5.0x Jackpot), play sigh
        if (outcome.tierIndex === 0) {
          const hasJackpotMiss = dummyCards.some(c => c.tierIndex === 3);
          if (hasJackpotMiss) {
            sound.playNearMissSigh();
          }
        }

        const doneTimer = setTimeout(
          () => {
            setSpreadState('done');
          },
          fastMode ? 200 : 600,
        );

        return () => clearTimeout(doneTimer);
      },
      fastMode ? 150 : 400,
    );

    return () => clearTimeout(nearMissTimer);
  }, [step, state, chosenIndex, selectedIdx, outcome, wager, spreadState, fastMode, spawnParticles]);

  // Particle Canvas Render Loop
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const particles = particlesRef.current;

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.12; // gentle gravity
        p.alpha -= p.decay;

        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;

        if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === 'star') {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 0.8, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillRect(p.x - p.size, p.y - 1, p.size * 2, 2);
          ctx.fillRect(p.x - 1, p.y - p.size, 2, p.size * 2);
        } else {
          ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        }
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, []);

  // Sync canvas dimensions
  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current) return;
      const parent = canvasRef.current.parentElement;
      canvasRef.current.width =
        parent?.clientWidth && parent.clientWidth > 0 ? parent.clientWidth : 640;
      canvasRef.current.height =
        parent?.clientHeight && parent.clientHeight > 0 ? parent.clientHeight : 440;
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Mouse Move Parallax Tilt Handler
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>, cardIndex: number) => {
    if (spreadState !== 'awaiting_pick') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    const rx = -(y / (rect.height / 2)) * 14;
    const ry = (x / (rect.width / 2)) * 14;
    setTilt({ index: cardIndex, rx, ry });
  };

  const handleMouseLeave = () => {
    setTilt({ index: null, rx: 0, ry: 0 });
  };

  // Outcome banner styling
  const activePickIdx = chosenIndex !== null && chosenIndex !== undefined ? chosenIndex : selectedIdx;
  const chosenCard = activePickIdx !== null ? cards[activePickIdx] : null;
  const outcomeTier = chosenCard ? chosenCard.tierIndex : outcome ? outcome.tierIndex : 0;
  const badgeClass =
    outcomeTier === 0
      ? 'outcome-badge-mimic'
      : outcomeTier === 1
        ? 'outcome-badge-silver'
        : outcomeTier === 2
          ? 'outcome-badge-gold'
          : 'outcome-badge-legendary';

  return (
    <div className={`card-stage-container ${streak >= 3 ? 'streak-plasma-active' : ''}`}>
      {/* Background Particle Canvas */}
      <canvas ref={canvasRef} className="card-stage-canvas" />

      {/* STREAK TRACKER (RUNE RESONANCE) BANNER */}
      {streak >= 2 && (
        <div className={`streak-resonance-banner ${streak >= 3 ? 'streak-plasma' : ''}`}>
          <svg
            className="streak-flame-icon"
            viewBox="0 0 24 24"
            width="15"
            height="15"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
          </svg>
          <span className="streak-title">{streak}X STREAK RESONANCE</span>
          {streak >= 3 && <span className="streak-boost-tag">PLASMA ACTIVE</span>}
        </div>
      )}

      <div className="stage-inner">
        {/* 3-CARD BALATRO SPREAD VIEWPORT */}
        <div className="cards-spread">
          {[0, 1, 2].map(slotIndex => {
            const isFlipped = flipped[slotIndex];
            const isPicked = activePickIdx === slotIndex;
            const cardData = cards[slotIndex];
            const isAwaiting = spreadState === 'awaiting_pick';
            const isDealing = spreadState === 'dealing';

            // Calculate tilt transform
            const isTilted = tilt.index === slotIndex;
            let transformStyle = '';

            if (isFlipped) {
              transformStyle = isPicked
                ? 'perspective(1000px) rotateY(180deg) translateZ(12px) scale(1.03)'
                : 'perspective(1000px) rotateY(180deg) scale(0.96)';
            } else if (isTilted && isAwaiting) {
              transformStyle = `perspective(1000px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) translateZ(24px) scale(1.05)`;
            } else if (isAwaiting) {
              transformStyle = 'perspective(1000px) translateZ(6px)';
            }

            return (
              <div
                key={slotIndex}
                className={`card-slot-3d ${isAwaiting ? 'slot-awaiting' : ''}`}
                onMouseMove={e => handleMouseMove(e, slotIndex)}
                onMouseLeave={handleMouseLeave}
                onClick={() => handleCardClick(slotIndex)}
              >
                <div
                  className={`card-3d ${isFlipped ? 'flipped' : ''} ${
                    fastMode ? 'fast-flip' : ''
                  } ${isDealing ? 'card-dealing' : ''} ${isPicked ? 'card-picked' : ''} ${
                    isPicked && !isFlipped ? 'card-locked-in' : ''
                  } ${isFlipped && !isPicked ? 'card-unpicked' : ''}`}
                  style={{
                    transform: transformStyle || undefined,
                    animationDelay: `${slotIndex * 110}ms`,
                  }}
                >
                  {/* CARD BACK (MẶT LƯNG: VÒNG TRÒN MA THUẬT VÀNG CỔ) */}
                  <div className="card-face card-back">
                    <div className="card-back-border">
                      <div className="card-corner corner-tl">✦</div>
                      <div className="card-corner corner-tr">✦</div>
                      <div className="card-corner corner-bl">✦</div>
                      <div className="card-corner corner-br">✦</div>

                      <div className="card-back-mandala">
                        <svg className="mandala-svg" viewBox="0 0 100 100" fill="none">
                          <circle cx="50" cy="50" r="44" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 2" />
                          <circle cx="50" cy="50" r="38" stroke="#d97706" strokeWidth="1" />
                          <polygon points="50,14 62,40 90,40 68,56 76,82 50,66 24,82 32,56 10,40 38,40" stroke="#f59e0b" strokeWidth="1.2" fill="none" opacity="0.8" />
                          <circle cx="50" cy="50" r="18" stroke="#f59e0b" strokeWidth="1.5" />
                          <circle cx="50" cy="50" r="8" fill="#f59e0b" opacity="0.6" />
                        </svg>
                      </div>

                      <div className="card-back-title">
                        {isPicked && !isFlipped ? 'LOCKED IN' : isAwaiting ? 'PICK CARD' : 'ARCANA'}
                      </div>
                      <div className="card-back-sub">
                        {isPicked && !isFlipped
                          ? 'AWAITING FATE'
                          : slotIndex === 0
                            ? 'LEFT'
                            : slotIndex === 1
                              ? 'CENTER'
                              : 'RIGHT'}
                      </div>
                    </div>
                  </div>

                  {/* CARD FRONT (MẶT TRƯỚC: NGHỆ THUẬT TAROT & BADGES BALATRO) */}
                  <div
                    className={`card-face card-front card-tier-${cardData ? cardData.tierIndex : 0}`}
                  >
                    {cardData && cardData.tierIndex === 3 && <div className="card-foil-sheen" />}

                    {/* Header Bar */}
                    <div className="card-header-bar">
                      <span className="card-roman">{cardData?.roman ?? '✦'}</span>

                      <div className="header-badges-cluster">
                        {/* Pick Status Badge */}
                        <span className={`badge-pick-status ${isPicked ? 'pick-active' : 'pick-missed'}`}>
                          {isPicked ? 'YOUR PICK' : 'MISSED'}
                        </span>

                        {/* Balatro Edition Badge */}
                        {cardData && cardData.edition !== 'standard' && (
                          <span className={`card-edition-badge edition-${cardData.edition}`}>
                            {cardData.edition.toUpperCase()}
                          </span>
                        )}
                      </div>

                      <span className="card-multiplier-pill">
                        {cardData?.multiplierText ?? 'x0.0'}
                      </span>
                    </div>

                    {/* Center Artwork */}
                    <div className="card-artwork-box">
                      <div className="card-art-wrap">
                        {cardData && <CardArt iconType={cardData.iconType} tier={cardData.tierIndex} />}
                      </div>
                    </div>

                    {/* Footer Info */}
                    <div className="card-footer-info">
                      <div className="card-main-title">{cardData?.name ?? 'ARCANA'}</div>
                      <div className="card-sub-desc">{cardData?.subtitle ?? 'Turn of fate'}</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Card Pedestal / Magic Summoning Ground */}
        <div className={`card-pedestal ${spreadState === 'awaiting_pick' ? 'pedestal-pulse' : ''}`} />

        {/* Stage Status / Instructions Box */}
        <div className="stage-status-box">
          {spreadState === 'awaiting_pick' && (
            <div className="awaiting-pick-prompt">
              <span className="prompt-dot" />
              <span className="prompt-text">CHOOSE 1 OF 3 DESTINY CARDS</span>
            </div>
          )}

          {spreadState === 'revealing' && chosenCard && (
            <div className="opening-text">
              <span className="prompt-dot pulse" />
              REVEALING DESTINY...
            </div>
          )}

          {(spreadState === 'near_miss' || spreadState === 'done') && chosenCard && outcome && (
            <div className={`outcome-badge ${badgeClass}`}>
              <span className="badge-tag">
                {chosenCard.name} • {chosenCard.category}
              </span>
              <span className="badge-multiplier">
                {chosenCard.tierIndex === 3
                  ? 'x5.0 JACKPOT!'
                  : chosenCard.tierIndex === 2
                    ? 'x2.5 BIG WIN!'
                    : chosenCard.tierIndex === 1
                      ? 'x1.2 PROFIT'
                      : 'CURSED (x0.0)'}
              </span>
              <span className="badge-desc">{chosenCard.description}</span>
            </div>
          )}

          {spreadState === 'idle' && (
            <div className="idle-text">Set your wager and click Draw Card to begin</div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Procedural SVG Artwork for the 12 distinct Tarot Cards
 */
function CardArt({ iconType, tier }: { iconType: string; tier: number }) {
  const strokeColor =
    tier === 3 ? '#e879f9' : tier === 2 ? '#facc15' : tier === 1 ? '#cbd5e1' : '#f87171';
  const accentColor =
    tier === 3 ? '#38bdf8' : tier === 2 ? '#fbbf24' : tier === 1 ? '#94a3b8' : '#ef4444';

  switch (iconType) {
    case 'fool':
      return (
        <svg className="card-svg" viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="38" stroke={strokeColor} strokeWidth="1.5" strokeDasharray="3 3" />
          <path d="M22 78 Q38 65 52 74 T82 72" stroke={strokeColor} strokeWidth="2" fill="none" />
          <circle cx="65" cy="30" r="12" fill={accentColor} opacity="0.3" />
          <circle cx="68" cy="28" r="9" fill="#0d1219" />
          <line x1="38" y1="44" x2="48" y2="72" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
          <circle cx="48" cy="38" r="4" fill={strokeColor} />
          <path d="M42 50 L30 45" stroke={accentColor} strokeWidth="1.5" />
        </svg>
      );

    case 'hanged_man':
      return (
        <svg className="card-svg" viewBox="0 0 100 100" fill="none">
          <line x1="25" y1="20" x2="75" y2="20" stroke={strokeColor} strokeWidth="2.5" />
          <line x1="50" y1="20" x2="50" y2="40" stroke={accentColor} strokeWidth="1.5" />
          <line x1="50" y1="40" x2="50" y2="68" stroke={strokeColor} strokeWidth="2" />
          <circle cx="50" cy="74" r="5" stroke={accentColor} strokeWidth="1.5" />
          <line x1="36" y1="52" x2="64" y2="52" stroke={strokeColor} strokeWidth="2" />
          <path d="M50 48 L62 60" stroke={strokeColor} strokeWidth="1.8" />
          <circle cx="50" cy="50" r="32" stroke={accentColor} strokeWidth="1" strokeDasharray="2 4" opacity="0.6" />
        </svg>
      );

    case 'mimic':
      return (
        <svg className="card-svg" viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="36" stroke={strokeColor} strokeWidth="1.5" opacity="0.7" />
          <path d="M26 44 L32 54 L38 44 L44 54 L50 44 L56 54 L62 44 L68 54 L74 44" stroke={strokeColor} strokeWidth="2" fill="none" />
          <path d="M28 58 L34 48 L40 58 L46 48 L52 58 L58 48 L64 58 L70 48 L74 58" stroke={strokeColor} strokeWidth="2" fill="none" />
          <ellipse cx="50" cy="32" rx="10" ry="6" fill="#450a0a" stroke={strokeColor} strokeWidth="1.5" />
          <circle cx="50" cy="32" r="3" fill="#ef4444" />
        </svg>
      );

    case 'magician':
      return (
        <svg className="card-svg" viewBox="0 0 100 100" fill="none">
          <path d="M34 38 C24 38 24 54 36 54 C46 54 54 38 64 38 C76 38 76 54 64 54 C54 54 46 38 34 38 Z" stroke={strokeColor} strokeWidth="2" fill="none" />
          <circle cx="50" cy="50" r="38" stroke={accentColor} strokeWidth="1" strokeDasharray="4 2" />
          <polygon points="50,22 68,76 22,42 78,42 32,76" stroke={accentColor} strokeWidth="1.2" fill="none" opacity="0.6" />
          <circle cx="50" cy="50" r="4" fill={strokeColor} />
        </svg>
      );

    case 'hermit':
      return (
        <svg className="card-svg" viewBox="0 0 100 100" fill="none">
          <path d="M18 84 L46 38 L62 58 L82 84 Z" stroke={accentColor} strokeWidth="1.5" fill="none" />
          <rect x="56" y="32" width="10" height="14" rx="2" stroke={strokeColor} strokeWidth="1.5" />
          <circle cx="61" cy="39" r="2.5" fill="#facc15" />
          <line x1="61" y1="28" x2="61" y2="32" stroke={strokeColor} strokeWidth="1.5" />
          <line x1="61" y1="24" x2="61" y2="20" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="72" y1="35" x2="76" y2="34" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="50" y1="43" x2="46" y2="44" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    case 'empress':
      return (
        <svg className="card-svg" viewBox="0 0 100 100" fill="none">
          <path d="M30 68 L30 48 L42 56 L50 40 L58 56 L70 48 L70 68 Z" stroke={strokeColor} strokeWidth="1.8" fill="none" />
          <circle cx="50" cy="34" r="3" fill="#facc15" />
          <circle cx="30" cy="42" r="2.5" fill="#facc15" />
          <circle cx="70" cy="42" r="2.5" fill="#facc15" />
          <path d="M24 74 Q50 86 76 74" stroke={accentColor} strokeWidth="1.5" fill="none" />
          <circle cx="50" cy="58" r="6" fill={strokeColor} opacity="0.3" />
        </svg>
      );

    case 'sun':
      return (
        <svg className="card-svg" viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="22" stroke={strokeColor} strokeWidth="2" fill="rgba(245, 158, 11, 0.15)" />
          <circle cx="50" cy="50" r="14" fill="#fbbf24" opacity="0.4" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => {
            const rad = (deg * Math.PI) / 180;
            const x1 = 50 + Math.cos(rad) * 26;
            const y1 = 50 + Math.sin(rad) * 26;
            const x2 = 50 + Math.cos(rad) * 38;
            const y2 = 50 + Math.sin(rad) * 38;
            return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />;
          })}
        </svg>
      );

    case 'star':
      return (
        <svg className="card-svg" viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="38" stroke={accentColor} strokeWidth="1" strokeDasharray="3 3" opacity="0.7" />
          <polygon points="50,16 58,40 82,42 62,56 68,80 50,66 32,80 38,56 18,42 42,40" stroke={strokeColor} strokeWidth="1.8" fill="rgba(250, 204, 21, 0.2)" />
          <circle cx="50" cy="50" r="5" fill="#ffffff" />
        </svg>
      );

    case 'wheel':
      return (
        <svg className="card-svg" viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="36" stroke={strokeColor} strokeWidth="2" />
          <circle cx="50" cy="50" r="26" stroke={accentColor} strokeWidth="1.2" strokeDasharray="4 2" />
          <circle cx="50" cy="50" r="10" stroke={strokeColor} strokeWidth="1.5" />
          {[0, 60, 120, 180, 240, 300].map(deg => {
            const rad = (deg * Math.PI) / 180;
            const x1 = 50 + Math.cos(rad) * 10;
            const y1 = 50 + Math.sin(rad) * 10;
            const x2 = 50 + Math.cos(rad) * 36;
            const y2 = 50 + Math.sin(rad) * 36;
            return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke={strokeColor} strokeWidth="1.5" />;
          })}
        </svg>
      );

    case 'world':
      return (
        <svg className="card-svg" viewBox="0 0 100 100" fill="none">
          <ellipse cx="50" cy="50" rx="30" ry="38" stroke={strokeColor} strokeWidth="2" strokeDasharray="6 3" />
          <ellipse cx="50" cy="50" rx="22" ry="28" stroke={accentColor} strokeWidth="1" />
          <polygon points="50,30 55,45 70,50 55,55 50,70 45,55 30,50 45,45" fill={strokeColor} opacity="0.75" />
          <circle cx="50" cy="50" r="4" fill="#ffffff" />
        </svg>
      );

    case 'soul':
      return (
        <svg className="card-svg" viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="38" stroke={accentColor} strokeWidth="1" opacity="0.6" />
          <polygon points="50,18 78,50 50,82 22,50" stroke={strokeColor} strokeWidth="2" fill="rgba(192, 132, 252, 0.2)" />
          <polygon points="50,28 68,50 50,72 32,50" stroke={accentColor} strokeWidth="1.2" fill="none" />
          <line x1="22" y1="50" x2="78" y2="50" stroke={strokeColor} strokeWidth="1.2" />
          <line x1="50" y1="18" x2="50" y2="82" stroke={strokeColor} strokeWidth="1.2" />
          <circle cx="50" cy="50" r="5" fill="#ffffff" />
        </svg>
      );

    case 'destiny':
    default:
      return (
        <svg className="card-svg" viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="38" stroke={strokeColor} strokeWidth="2" />
          <ellipse cx="50" cy="50" rx="38" ry="16" stroke={accentColor} strokeWidth="1.2" />
          <ellipse cx="50" cy="50" rx="16" ry="38" stroke={accentColor} strokeWidth="1.2" />
          <circle cx="50" cy="50" r="14" fill="#581c87" stroke={strokeColor} strokeWidth="2" />
          <polygon points="50,42 53,48 60,50 53,52 50,58 47,52 40,50 47,48" fill="#facc15" />
          <circle cx="50" cy="50" r="3" fill="#ffffff" />
        </svg>
      );
  }
}

// Backwards-compatible export alias for any legacy imports
export const ChestStage = CardStage;
export type ChestAnimationState = CardAnimationState;

