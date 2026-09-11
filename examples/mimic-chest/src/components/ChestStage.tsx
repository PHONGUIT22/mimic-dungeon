import { useEffect, useRef } from 'react';
import type { MimicOutcome } from '../lib/mimic';
import { sound } from '../lib/audio';

export type ChestAnimationState = 'idle' | 'opening' | 'revealed';

export function ChestStage({
  state,
  outcome,
  fastMode,
}: {
  state: ChestAnimationState;
  outcome: MimicOutcome | null;
  fastMode: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Play audio and handle particles when state changes
  useEffect(() => {
    if (state === 'opening') {
      sound.playChestShake();
      const timer = setTimeout(() => sound.playChestOpen(), fastMode ? 100 : 400);
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

      // Spawn canvas particles
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

    const count = tierIndex === 3 ? 120 : tierIndex === 2 ? 80 : tierIndex === 1 ? 50 : 40;
    const colors =
      tierIndex === 3
        ? ['#c084fc', '#f472b6', '#38bdf8', '#facc15', '#ffffff'] // Legendary Rainbow
        : tierIndex === 2
          ? ['#fbbf24', '#f59e0b', '#d97706', '#fef08a', '#ffffff'] // Gold
          : tierIndex === 1
            ? ['#94a3b8', '#cbd5e1', '#e2e8f0', '#60a5fa', '#ffffff'] // Silver
            : ['#ef4444', '#b91c1c', '#7f1d1d', '#991b1b', '#450a0a']; // Mimic blood/fire

    const newParticles = [];
    const originX = canvas.width / 2;
    const originY = canvas.height * 0.45;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * (tierIndex === 3 ? 10 : 7) + 2;
      newParticles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (tierIndex > 0 ? 3 : 0),
        size: Math.random() * 6 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        decay: Math.random() * 0.02 + 0.012,
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
        p.vy += 0.14; // gravity
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

  // Update canvas size to match client bounds safely
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
  const isRevealed = state === 'revealed' && outcome !== null;

  const badgeClass =
    tier === 3
      ? 'outcome-badge-legendary'
      : tier === 2
        ? 'outcome-badge-gold'
        : tier === 1
          ? 'outcome-badge-silver'
          : 'outcome-badge-mimic';

  return (
    <div className="chest-stage-container">
      {/* Background ambient particles canvas */}
      <canvas ref={canvasRef} className="chest-stage-canvas" />

      {/* Center Stage & Visual */}
      <div className="stage-inner">
        <div className={state === 'opening' ? 'animate-chest-vibrate' : ''}>
          {/* Main Chest Graphic Box */}
          <div className="chest-graphic-box">
            {!isRevealed ? (
              /* CLOSED CHEST (Idle & Opening) */
              <svg
                viewBox="0 0 200 170"
                className="chest-svg"
              >
                <defs>
                  <linearGradient id="lidGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#92400e" />
                    <stop offset="50%" stopColor="#78350f" />
                    <stop offset="100%" stopColor="#451a03" />
                  </linearGradient>
                  <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#78350f" />
                    <stop offset="100%" stopColor="#290e02" />
                  </linearGradient>
                  <linearGradient id="ironBand" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#fef08a" />
                    <stop offset="50%" stopColor="#b45309" />
                    <stop offset="100%" stopColor="#78350f" />
                  </linearGradient>
                </defs>

                {/* Lid */}
                <path
                  d="M 20 70 C 20 28, 60 18, 100 18 C 140 18, 180 28, 180 70 Z"
                  fill="url(#lidGrad)"
                  stroke="#1c0a00"
                  strokeWidth="4"
                />
                {/* Chest Body */}
                <rect
                  x="24"
                  y="70"
                  width="152"
                  height="85"
                  rx="6"
                  fill="url(#bodyGrad)"
                  stroke="#1c0a00"
                  strokeWidth="4"
                />

                {/* Iron Bands */}
                <rect x="44" y="21" width="16" height="134" fill="url(#ironBand)" stroke="#1c0a00" strokeWidth="2" />
                <rect x="140" y="21" width="16" height="134" fill="url(#ironBand)" stroke="#1c0a00" strokeWidth="2" />

                {/* Rivets */}
                <circle cx="52" cy="35" r="3" fill="#fef08a" />
                <circle cx="52" cy="65" r="3" fill="#fef08a" />
                <circle cx="52" cy="95" r="3" fill="#fef08a" />
                <circle cx="52" cy="125" r="3" fill="#fef08a" />

                <circle cx="148" cy="35" r="3" fill="#fef08a" />
                <circle cx="148" cy="65" r="3" fill="#fef08a" />
                <circle cx="148" cy="95" r="3" fill="#fef08a" />
                <circle cx="148" cy="125" r="3" fill="#fef08a" />

                {/* Center Lock Plate */}
                <rect x="84" y="60" width="32" height="34" rx="4" fill="url(#ironBand)" stroke="#1c0a00" strokeWidth="3" />
                <circle cx="100" cy="74" r="5" fill="#1c0a00" />
                <polygon points="98,75 102,75 101,84 99,84" fill="#1c0a00" />

                {/* Faint Red Glimmer in Keyhole (Mimic hint) */}
                <circle cx="100" cy="74" r="2.5" fill="#ef4444" opacity={state === 'opening' ? 1 : 0.4} />
              </svg>
            ) : tier === 0 ? (
              /* TIER 0: MIMIC MONSTER (x0) */
              <div className="animate-mimic-chomp" style={{ display: 'flex', justifyContent: 'center' }}>
                <svg
                  viewBox="0 0 220 200"
                  className="chest-svg"
                >
                  <defs>
                    <radialGradient id="mimicEye" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#ffedd5" />
                      <stop offset="40%" stopColor="#ef4444" />
                      <stop offset="100%" stopColor="#7f1d1d" />
                    </radialGradient>
                  </defs>

                  {/* Open Upper Lid */}
                  <path
                    d="M 20 45 C 30 -5, 170 -5, 180 45 Z"
                    fill="#581c87"
                    stroke="#2e1065"
                    strokeWidth="4"
                  />
                  {/* Lower Base */}
                  <rect x="25" y="110" width="150" height="65" rx="6" fill="#3b0764" stroke="#2e1065" strokeWidth="4" />

                  {/* Deep Monster Throat */}
                  <ellipse cx="100" cy="80" rx="65" ry="38" fill="#180202" />

                  {/* Glowing Evil Eyes */}
                  <circle cx="65" cy="35" r="11" fill="url(#mimicEye)" />
                  <ellipse cx="65" cy="35" rx="3" ry="8" fill="#000" />

                  <circle cx="135" cy="35" r="11" fill="url(#mimicEye)" />
                  <ellipse cx="135" cy="35" rx="3" ry="8" fill="#000" />

                  {/* Monster Tongue */}
                  <path
                    d="M 85 85 C 75 125, 125 130, 115 155 C 105 130, 105 105, 100 85 Z"
                    fill="#ec4899"
                    stroke="#be185d"
                    strokeWidth="2"
                  />

                  {/* Razor Sharp Top Teeth */}
                  <polygon points="35,45 45,45 40,75" fill="#fef08a" />
                  <polygon points="50,45 62,45 56,80" fill="#fef08a" />
                  <polygon points="68,45 80,45 74,75" fill="#fef08a" />
                  <polygon points="86,45 98,45 92,85" fill="#fef08a" />
                  <polygon points="104,45 116,45 110,85" fill="#fef08a" />
                  <polygon points="122,45 134,45 128,75" fill="#fef08a" />
                  <polygon points="140,45 152,45 146,80" fill="#fef08a" />
                  <polygon points="158,45 168,45 163,75" fill="#fef08a" />

                  {/* Razor Sharp Bottom Teeth */}
                  <polygon points="35,115 45,115 40,85" fill="#fef08a" />
                  <polygon points="52,115 64,115 58,80" fill="#fef08a" />
                  <polygon points="72,115 84,115 78,85" fill="#fef08a" />
                  <polygon points="92,115 108,115 100,75" fill="#fef08a" />
                  <polygon points="116,115 128,115 122,85" fill="#fef08a" />
                  <polygon points="136,115 148,115 142,80" fill="#fef08a" />
                  <polygon points="156,115 166,115 161,85" fill="#fef08a" />
                </svg>
              </div>
            ) : tier === 1 ? (
              /* TIER 1: SILVER CHEST (x1.2) */
              <div className="animate-relic-ascend" style={{ display: 'flex', justifyContent: 'center' }}>
                <svg
                  viewBox="0 0 200 170"
                  className="chest-svg"
                >
                  <defs>
                    <linearGradient id="silverLid" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f1f5f9" />
                      <stop offset="50%" stopColor="#94a3b8" />
                      <stop offset="100%" stopColor="#475569" />
                    </linearGradient>
                    <linearGradient id="silverGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="100%" stopColor="#0284c7" />
                    </linearGradient>
                  </defs>

                  {/* Open Lid */}
                  <polygon points="20,55 180,55 170,10 30,10" fill="url(#silverLid)" stroke="#334155" strokeWidth="3" />
                  {/* Chest Base */}
                  <rect x="25" y="70" width="150" height="80" rx="6" fill="#334155" stroke="#1e293b" strokeWidth="3" />

                  {/* Overflowing Silver Treasures */}
                  <circle cx="60" cy="65" r="14" fill="url(#silverLid)" stroke="#475569" strokeWidth="2" />
                  <circle cx="85" cy="60" r="16" fill="url(#silverLid)" stroke="#475569" strokeWidth="2" />
                  <circle cx="115" cy="58" r="15" fill="url(#silverLid)" stroke="#475569" strokeWidth="2" />
                  <circle cx="140" cy="65" r="14" fill="url(#silverLid)" stroke="#475569" strokeWidth="2" />

                  {/* Silver Goblet in center */}
                  <path d="M 88 45 L 112 45 L 105 65 L 95 65 Z" fill="url(#silverGlow)" stroke="#fff" strokeWidth="1" />
                  <rect x="98" y="65" width="4" height="12" fill="#fff" />
                  <ellipse cx="100" cy="78" rx="10" ry="3" fill="#fff" />
                </svg>
              </div>
            ) : tier === 2 ? (
              /* TIER 2: GOLD CHEST (x2.5) */
              <div className="animate-relic-ascend" style={{ display: 'flex', justifyContent: 'center' }}>
                <svg
                  viewBox="0 0 200 170"
                  className="chest-svg"
                >
                  <defs>
                    <linearGradient id="goldLid" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fef08a" />
                      <stop offset="50%" stopColor="#eab308" />
                      <stop offset="100%" stopColor="#854d0e" />
                    </linearGradient>
                    <linearGradient id="gemGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#34d399" />
                      <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                  </defs>

                  {/* Open Lid */}
                  <polygon points="15,50 185,50 175,8 25,8" fill="url(#goldLid)" stroke="#713f12" strokeWidth="3" />
                  {/* Chest Base */}
                  <rect x="25" y="70" width="150" height="80" rx="6" fill="#713f12" stroke="#451a03" strokeWidth="3" />

                  {/* Golden Bars Stack */}
                  <polygon points="45,65 95,65 85,55 35,55" fill="#fde047" stroke="#854d0e" strokeWidth="1" />
                  <polygon points="105,65 155,65 145,55 95,55" fill="#fde047" stroke="#854d0e" strokeWidth="1" />
                  <polygon points="70,50 120,50 110,40 60,40" fill="#fef08a" stroke="#854d0e" strokeWidth="1" />

                  {/* Radiant Emerald Gem */}
                  <polygon points="100,22 115,35 100,48 85,35" fill="url(#gemGrad)" stroke="#ecfdf5" strokeWidth="2" />
                </svg>
              </div>
            ) : (
              /* TIER 3: LEGENDARY RELIC (x5.0 JACKPOT) */
              <div className="animate-relic-ascend" style={{ display: 'flex', justifyContent: 'center' }}>
                <svg
                  viewBox="0 0 220 190"
                  className="chest-svg"
                >
                  <defs>
                    <linearGradient id="mythicGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#f472b6" />
                      <stop offset="50%" stopColor="#a855f7" />
                      <stop offset="100%" stopColor="#6366f1" />
                    </linearGradient>
                    <radialGradient id="orbCore" cx="40%" cy="40%" r="60%">
                      <stop offset="0%" stopColor="#ffffff" />
                      <stop offset="35%" stopColor="#c084fc" />
                      <stop offset="70%" stopColor="#9333ea" />
                      <stop offset="100%" stopColor="#3b0764" />
                    </radialGradient>
                  </defs>

                  {/* Open Base */}
                  <polygon points="20,60 200,60 185,15 35,15" fill="url(#mythicGrad)" stroke="#3b0764" strokeWidth="3" />
                  <rect x="30" y="78" width="160" height="75" rx="6" fill="#2e1065" stroke="#1e1b4b" strokeWidth="3" />

                  {/* Floating Cosmic Orb of Power */}
                  <g className="animate-float-bob">
                    <circle cx="110" cy="38" r="26" fill="url(#orbCore)" stroke="#f472b6" strokeWidth="3" />
                    <ellipse cx="110" cy="38" rx="38" ry="12" fill="none" stroke="#facc15" strokeWidth="2.5" />
                    <ellipse cx="110" cy="38" rx="46" ry="16" fill="none" stroke="#67e8f9" strokeWidth="1.5" strokeDasharray="5,5" />
                  </g>
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* Pedestal Shadow */}
        <div className="chest-pedestal" />

        {/* Outcome Status / Description */}
        <div className="stage-status-box">
          {isRevealed && outcome && (
            <div className={`outcome-badge ${badgeClass}`}>
              <span className="badge-tag">{outcome.name}</span>
              <span className="badge-multiplier">
                {tier === 3
                  ? 'x5.0 JACKPOT!'
                  : tier === 2
                    ? 'x2.5 BIG WIN!'
                    : tier === 1
                      ? 'x1.2 PROFIT'
                      : 'DEVOURED (x0)'}
              </span>
              <span className="badge-desc">{outcome.description}</span>
            </div>
          )}

          {state === 'opening' && (
            <div className="opening-text">
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
              OPENING CHEST...
            </div>
          )}

          {state === 'idle' && (
            <div className="idle-text">Select your wager and click Open Chest</div>
          )}
        </div>
      </div>
    </div>
  );
}
