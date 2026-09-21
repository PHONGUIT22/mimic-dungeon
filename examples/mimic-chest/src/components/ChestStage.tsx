import { useEffect, useRef } from 'react';
import type { MimicOutcome } from '../lib/mimic';
import { sound } from '../lib/audio';

export type CardAnimationState = 'idle' | 'opening' | 'revealed';

export function CardStage({
  state,
  outcome,
  fastMode,
}: {
  state: CardAnimationState;
  outcome: MimicOutcome | null;
  fastMode: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Play card audio and trigger particles
  useEffect(() => {
    if (state === 'opening') {
      sound.playCardDraw();
      const timer = setTimeout(() => sound.playCardFlip(), fastMode ? 100 : 380);
      return () => clearTimeout(timer);
    } else if (state === 'revealed' && outcome) {
      // Play tier-specific sound
      if (outcome.tierIndex === 0) {
        sound.playMimic();
      } else if (outcome.tierIndex === 1) {
        sound.playSilver();
      } else if (outcome.tierIndex === 2) {
        sound.playGold();
      } else {
        sound.playLegendary();
      }

      // Spawn celestial particle burst
      spawnParticles(outcome.tierIndex);
    }
  }, [state, outcome, fastMode]);

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

  const spawnParticles = (tierIndex: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const count = tierIndex === 3 ? 120 : tierIndex === 2 ? 80 : tierIndex === 1 ? 55 : 45;
    const colors =
      tierIndex === 3
        ? ['#c084fc', '#f472b6', '#38bdf8', '#facc15', '#ffffff', '#e879f9'] // Mythic Hologram
        : tierIndex === 2
          ? ['#fbbf24', '#f59e0b', '#d97706', '#fef08a', '#ffffff', '#34d399'] // Solar Gold
          : tierIndex === 1
            ? ['#94a3b8', '#cbd5e1', '#e2e8f0', '#38bdf8', '#ffffff'] // Silver Rune
            : ['#ef4444', '#b91c1c', '#7f1d1d', '#a855f7', '#1e1b4b']; // The Void / Cursed

    const newParticles = [];
    const originX = canvas.width / 2;
    const originY = canvas.height * 0.44;

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
        shape: (tierIndex === 3 ? 'star' : Math.random() > 0.5 ? 'circle' : 'square') as
          | 'circle'
          | 'star'
          | 'square',
      });
    }
    particlesRef.current = newParticles;
  };

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
      canvasRef.current.width = parent?.clientWidth && parent.clientWidth > 0 ? parent.clientWidth : 600;
      canvasRef.current.height = parent?.clientHeight && parent.clientHeight > 0 ? parent.clientHeight : 460;
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const tier = outcome?.tierIndex ?? 0;
  const isFlipped = state === 'revealed' && outcome !== null;

  const badgeClass =
    tier === 3
      ? 'outcome-badge-legendary'
      : tier === 2
        ? 'outcome-badge-gold'
        : tier === 1
          ? 'outcome-badge-silver'
          : 'outcome-badge-mimic';

  return (
    <div className="card-stage-container">
      {/* Background ambient particles canvas */}
      <canvas ref={canvasRef} className="card-stage-canvas" />

      {/* Center 3D Card Scene */}
      <div className="stage-inner">
        <div className="card-scene">
          <div
            className={`card-3d ${isFlipped ? 'flipped' : ''} ${state === 'opening' ? 'card-drawing' : ''} ${fastMode ? 'fast-flip' : ''}`}
          >
            {/* ==================================================================== */}
            {/* 1. CARD BACK (ÚP MẶT: VÒNG TRÒN MA THUẬT CỔ TỰ) */}
            {/* ==================================================================== */}
            <div className="card-face card-back">
              {/* Outer Golden Border & Inset Frame */}
              <div className="card-back-border">
                <div className="card-corner corner-tl">✦</div>
                <div className="card-corner corner-tr">✦</div>
                <div className="card-corner corner-bl">✦</div>
                <div className="card-corner corner-br">✦</div>

                {/* Mystic Summoning Mandala SVG */}
                <div className="card-back-mandala">
                  <svg viewBox="0 0 200 200" className="mandala-svg">
                    <defs>
                      <linearGradient id="goldStroke" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#fde047" />
                        <stop offset="50%" stopColor="#d97706" />
                        <stop offset="100%" stopColor="#78350f" />
                      </linearGradient>
                      <radialGradient id="arcaneCore" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#c084fc" stopOpacity="0.8" />
                        <stop offset="40%" stopColor="#7e22ce" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                      </radialGradient>
                    </defs>

                    {/* Ambient Core Glow */}
                    <circle cx="100" cy="100" r="85" fill="url(#arcaneCore)" />

                    {/* Outer Runic Rings */}
                    <circle cx="100" cy="100" r="88" fill="none" stroke="url(#goldStroke)" strokeWidth="2.5" />
                    <circle cx="100" cy="100" r="82" fill="none" stroke="url(#goldStroke)" strokeWidth="1" strokeDasharray="3,3" />
                    <circle cx="100" cy="100" r="70" fill="none" stroke="url(#goldStroke)" strokeWidth="1.5" />

                    {/* Sacred Octagram (Overlapping Squares) */}
                    <rect x="52" y="52" width="96" height="96" fill="none" stroke="url(#goldStroke)" strokeWidth="1.5" />
                    <rect x="52" y="52" width="96" height="96" fill="none" stroke="url(#goldStroke)" strokeWidth="1.5" transform="rotate(45 100 100)" />

                    {/* Inner Celestial Hexagram Star */}
                    <polygon points="100,42 148,128 52,128" fill="none" stroke="#fcd34d" strokeWidth="1.5" />
                    <polygon points="100,158 52,72 148,72" fill="none" stroke="#fcd34d" strokeWidth="1.5" />

                    {/* Center All-Seeing Eye / Cosmic Seal */}
                    <circle cx="100" cy="100" r="22" fill="#090d16" stroke="url(#goldStroke)" strokeWidth="2" />
                    <circle cx="100" cy="100" r="9" fill="#fcd34d" />
                    <polygon points="100,82 104,95 117,100 104,105 100,118 96,105 83,100 96,95" fill="#ffffff" />
                  </svg>
                </div>

                <div className="card-back-title">ARCANA FATE</div>
                <div className="card-back-sub">CHAIN VERIFIED VRF</div>
              </div>
            </div>

            {/* ==================================================================== */}
            {/* 2. CARD FRONT (LẬT MẶT: 4 BẬC ĐỊNH MỆNH) */}
            {/* ==================================================================== */}
            <div className={`card-face card-front card-tier-${tier}`}>
              {/* Foil Shimmer Overlay (Active on Tier 3 or all wins) */}
              <div className="card-foil-sheen" />

              {/* Top Banner: Arcana Number & Name */}
              <div className="card-header-bar">
                <span className="card-roman">
                  {tier === 3 ? 'XXI' : tier === 2 ? 'XIX' : tier === 1 ? 'VII' : '0'}
                </span>
                <span className="card-category">
                  {tier === 3 ? 'MYTHIC ARCANA' : tier === 2 ? 'MAJOR ARCANA' : tier === 1 ? 'LESSER ARCANA' : 'CURSED VOID'}
                </span>
                <span className="card-multiplier-pill">
                  {tier === 3 ? '5.00×' : tier === 2 ? '2.50×' : tier === 1 ? '1.20×' : '0.00×'}
                </span>
              </div>

              {/* Center Crest / Artwork */}
              <div className="card-artwork-box">
                {tier === 0 ? (
                  /* TIER 0: THE VOID / CURSED CARD (x0.0) */
                  <div className="card-art-wrap art-void">
                    <svg viewBox="0 0 160 160" className="card-svg">
                      <defs>
                        <radialGradient id="voidAura" cx="50%" cy="50%" r="50%">
                          <stop offset="0%" stopColor="#7f1d1d" stopOpacity="0.9" />
                          <stop offset="50%" stopColor="#450a0a" stopOpacity="0.5" />
                          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                        </radialGradient>
                      </defs>
                      <circle cx="80" cy="80" r="70" fill="url(#voidAura)" />
                      {/* Cursed Skull */}
                      <path
                        d="M 50 60 C 50 35, 110 35, 110 60 C 110 75, 100 82, 98 94 L 62 94 C 60 82, 50 75, 50 60 Z"
                        fill="#180303"
                        stroke="#ef4444"
                        strokeWidth="3.5"
                      />
                      {/* Teeth */}
                      <rect x="66" y="94" width="6" height="12" fill="#ef4444" />
                      <rect x="76" y="94" width="8" height="14" fill="#ef4444" />
                      <rect x="88" y="94" width="6" height="12" fill="#ef4444" />
                      {/* Glowing Eyes */}
                      <circle cx="68" cy="62" r="9" fill="#991b1b" />
                      <circle cx="68" cy="62" r="4" fill="#ffedd5" />
                      <circle cx="92" cy="62" r="9" fill="#991b1b" />
                      <circle cx="92" cy="62" r="4" fill="#ffedd5" />
                      {/* Dark Spikes */}
                      <polygon points="80,18 84,32 76,32" fill="#ef4444" />
                      <polygon points="40,35 52,44 46,32" fill="#ef4444" />
                      <polygon points="120,35 114,32 108,44" fill="#ef4444" />
                    </svg>
                  </div>
                ) : tier === 1 ? (
                  /* TIER 1: SILVER RUNE (x1.2) */
                  <div className="card-art-wrap art-silver">
                    <svg viewBox="0 0 160 160" className="card-svg">
                      <defs>
                        <linearGradient id="silverSheen" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#ffffff" />
                          <stop offset="50%" stopColor="#cbd5e1" />
                          <stop offset="100%" stopColor="#64748b" />
                        </linearGradient>
                        <radialGradient id="silverHalo" cx="50%" cy="50%" r="50%">
                          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.5" />
                          <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
                        </radialGradient>
                      </defs>
                      <circle cx="80" cy="80" r="72" fill="url(#silverHalo)" />
                      {/* Double Silver Rune Circle */}
                      <circle cx="80" cy="80" r="62" fill="none" stroke="url(#silverSheen)" strokeWidth="3" />
                      <circle cx="80" cy="80" r="54" fill="none" stroke="url(#silverSheen)" strokeWidth="1" strokeDasharray="4,4" />
                      {/* Sacred Silver Glyph */}
                      <polygon points="80,30 118,105 42,105" fill="none" stroke="url(#silverSheen)" strokeWidth="3" />
                      <line x1="80" y1="30" x2="80" y2="130" stroke="url(#silverSheen)" strokeWidth="3" />
                      <line x1="52" y1="78" x2="108" y2="78" stroke="url(#silverSheen)" strokeWidth="3" />
                      <circle cx="80" cy="80" r="14" fill="#0f172a" stroke="#38bdf8" strokeWidth="2.5" />
                      <circle cx="80" cy="80" r="5" fill="#e0f2fe" />
                    </svg>
                  </div>
                ) : tier === 2 ? (
                  /* TIER 2: GOLDEN SUN (x2.5) */
                  <div className="card-art-wrap art-gold">
                    <svg viewBox="0 0 160 160" className="card-svg">
                      <defs>
                        <linearGradient id="sunGold" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#fef08a" />
                          <stop offset="40%" stopColor="#f59e0b" />
                          <stop offset="100%" stopColor="#b45309" />
                        </linearGradient>
                        <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
                          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.8" />
                          <stop offset="60%" stopColor="#d97706" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#451a03" stopOpacity="0" />
                        </radialGradient>
                      </defs>
                      <circle cx="80" cy="80" r="74" fill="url(#sunGlow)" />
                      {/* Radiant Sunburst Rays */}
                      <g stroke="url(#sunGold)" strokeWidth="3">
                        <line x1="80" y1="12" x2="80" y2="30" />
                        <line x1="80" y1="130" x2="80" y2="148" />
                        <line x1="12" y1="80" x2="30" y2="80" />
                        <line x1="130" y1="80" x2="148" y2="80" />
                        <line x1="32" y1="32" x2="45" y2="45" />
                        <line x1="115" y1="115" x2="128" y2="128" />
                        <line x1="32" y1="128" x2="45" y2="115" />
                        <line x1="115" y1="45" x2="128" y2="32" />
                      </g>
                      {/* Golden Solar Disc */}
                      <circle cx="80" cy="80" r="42" fill="url(#sunGold)" stroke="#78350f" strokeWidth="3" />
                      <circle cx="80" cy="80" r="32" fill="#451a03" stroke="#fef08a" strokeWidth="2" />
                      {/* Emerald Heart Gem */}
                      <polygon points="80,62 94,76 80,98 66,76" fill="#10b981" stroke="#ecfdf5" strokeWidth="2" />
                    </svg>
                  </div>
                ) : (
                  /* TIER 3: WHEEL OF DESTINY (x5.0 JACKPOT) */
                  <div className="card-art-wrap art-destiny">
                    <svg viewBox="0 0 160 160" className="card-svg">
                      <defs>
                        <linearGradient id="destinyCosmic" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#f472b6" />
                          <stop offset="50%" stopColor="#a855f7" />
                          <stop offset="100%" stopColor="#38bdf8" />
                        </linearGradient>
                        <radialGradient id="destinyPulse" cx="50%" cy="50%" r="50%">
                          <stop offset="0%" stopColor="#ffffff" />
                          <stop offset="35%" stopColor="#d8b4fe" />
                          <stop offset="70%" stopColor="#7e22ce" />
                          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                        </radialGradient>
                      </defs>
                      <circle cx="80" cy="80" r="76" fill="url(#destinyPulse)" />
                      {/* Rotating Celestial Astrolabe Ring */}
                      <circle cx="80" cy="80" r="64" fill="none" stroke="url(#destinyCosmic)" strokeWidth="3.5" />
                      <circle cx="80" cy="80" r="54" fill="none" stroke="#facc15" strokeWidth="2" strokeDasharray="6,4" />
                      {/* 8-Spoke Wheel of Fate */}
                      <g stroke="url(#destinyCosmic)" strokeWidth="2.5">
                        <line x1="80" y1="16" x2="80" y2="144" />
                        <line x1="16" y1="80" x2="144" y2="80" />
                        <line x1="35" y1="35" x2="125" y2="125" />
                        <line x1="35" y1="125" x2="125" y2="35" />
                      </g>
                      {/* Center Core Eye of Destiny */}
                      <circle cx="80" cy="80" r="22" fill="#1e1b4b" stroke="#f472b6" strokeWidth="3" />
                      <polygon points="80,68 84,77 93,80 84,83 80,92 76,83 67,80 76,77" fill="#facc15" />
                      <circle cx="80" cy="80" r="5" fill="#ffffff" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Bottom Card Title & Name */}
              <div className="card-footer-info">
                <div className="card-main-title">
                  {tier === 3
                    ? 'WHEEL OF DESTINY'
                    : tier === 2
                      ? 'THE GOLDEN SUN'
                      : tier === 1
                        ? 'THE SILVER RUNE'
                        : 'THE VOID CURSE'}
                </div>
                <div className="card-sub-desc">
                  {tier === 3
                    ? '★ MYTHIC JACKPOT ★'
                    : tier === 2
                      ? 'SOLAR BLESSING'
                      : tier === 1
                        ? 'GLYPH OF PROSPERITY'
                        : 'DEVOURED BY SHADOWS'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card Mystical Pedestal Aura Shadow */}
        <div className={`card-pedestal ${state === 'opening' ? 'pedestal-pulse' : ''}`} />

        {/* Outcome Status / Description Box */}
        <div className="stage-status-box">
          {isFlipped && outcome && (
            <div className={`outcome-badge ${badgeClass}`}>
              <span className="badge-tag">{outcome.name}</span>
              <span className="badge-multiplier">
                {tier === 3
                  ? 'x5.0 JACKPOT!'
                  : tier === 2
                    ? 'x2.5 BIG WIN!'
                    : tier === 1
                      ? 'x1.2 PROFIT'
                      : 'CURSED (x0.0)'}
              </span>
              <span className="badge-desc">{outcome.description}</span>
            </div>
          )}

          {state === 'opening' && (
            <div className="opening-text">
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
              DRAWING FATE CARD...
            </div>
          )}

          {state === 'idle' && (
            <div className="idle-text">Choose wager and click Draw Card</div>
          )}
        </div>
      </div>
    </div>
  );
}

// Backwards-compatible export alias for any legacy imports
export const ChestStage = CardStage;
export type ChestAnimationState = CardAnimationState;

