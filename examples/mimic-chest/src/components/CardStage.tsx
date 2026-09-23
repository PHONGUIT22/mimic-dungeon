import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  type MimicOutcome,
  type DisplayCard,
  type CardEdition,
  type RoundStep,
  getCardForOutcome,
  generateNearMissCards,
  getDarkOracleQuote,
} from '../lib/mimic';
import { sound } from '../lib/audio';
import { ProceduralSigil } from './ProceduralSigil';

// 18 Deterministic Ambient Floating Dust Motes / Spirit Embers
const DUST_MOTES = [
  { left: 8, top: 18, size: 3, delay: 0, duration: 6.2, opacity: 0.65, colorType: 'gold' },
  { left: 16, top: 62, size: 2.5, delay: -1.8, duration: 7.5, opacity: 0.5, colorType: 'cyan' },
  { left: 24, top: 34, size: 3.5, delay: -3.2, duration: 5.8, opacity: 0.7, colorType: 'purple' },
  { left: 32, top: 78, size: 2, delay: -4.5, duration: 8.0, opacity: 0.45, colorType: 'gold' },
  { left: 42, top: 15, size: 3, delay: -0.9, duration: 6.8, opacity: 0.6, colorType: 'white' },
  { left: 48, top: 55, size: 4, delay: -2.4, duration: 5.5, opacity: 0.75, colorType: 'gold' },
  { left: 56, top: 82, size: 2.5, delay: -5.1, duration: 7.2, opacity: 0.55, colorType: 'cyan' },
  { left: 64, top: 22, size: 3, delay: -1.3, duration: 6.4, opacity: 0.65, colorType: 'purple' },
  { left: 72, top: 68, size: 2, delay: -3.7, duration: 8.5, opacity: 0.4, colorType: 'gold' },
  { left: 80, top: 40, size: 3.5, delay: -2.1, duration: 5.9, opacity: 0.7, colorType: 'white' },
  { left: 88, top: 85, size: 2.5, delay: -4.8, duration: 7.0, opacity: 0.5, colorType: 'cyan' },
  { left: 92, top: 28, size: 3, delay: -0.5, duration: 6.6, opacity: 0.6, colorType: 'gold' },
  { left: 12, top: 44, size: 2, delay: -2.8, duration: 7.8, opacity: 0.45, colorType: 'purple' },
  { left: 28, top: 88, size: 3, delay: -5.5, duration: 6.1, opacity: 0.65, colorType: 'gold' },
  { left: 68, top: 12, size: 2.5, delay: -1.6, duration: 8.2, opacity: 0.5, colorType: 'cyan' },
  { left: 84, top: 58, size: 3.5, delay: -4.1, duration: 5.6, opacity: 0.75, colorType: 'gold' },
  { left: 38, top: 38, size: 2, delay: -3.0, duration: 7.4, opacity: 0.5, colorType: 'white' },
  { left: 76, top: 74, size: 2.5, delay: -0.8, duration: 6.9, opacity: 0.6, colorType: 'purple' },
];

export type CardAnimationState = 'idle' | 'opening' | 'revealed';

export type SpreadState =
  | 'idle'
  | 'dealing'
  | 'awaiting_pick'
  | 'squeezing'
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
  onScreenShake?: () => void;
}

/**
 * Ornate Guilloche / Celtic Filigree Corner Bracket for Occult Tarot Card Back
 */
function CornerFiligree({ className }: { className: string }) {
  return (
    <svg className={`corner-filigree-svg ${className}`} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M2 2h26M2 2v26"
        stroke="#fde047"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M5 5h18c-3 0-6 3-6 6 0 5-5 8-8 8-3 0-4-3-4-6V5z"
        stroke="#d97706"
        strokeWidth="0.9"
        fill="rgba(245, 158, 11, 0.08)"
      />
      <path
        d="M5 5v18c0-3 3-6 6-6 5 0 8-5 8-8 0-3-3-4-6-4H5z"
        stroke="#d97706"
        strokeWidth="0.9"
      />
      <circle cx="8" cy="8" r="1.6" fill="#fde047" />
      <circle cx="20" cy="5" r="1" fill="#f59e0b" />
      <circle cx="5" cy="20" r="1" fill="#f59e0b" />
      <polygon points="12,12 14,10 16,12 14,14" fill="#fde047" />
    </svg>
  );
}

/**
 * Layered Arcane Astrolabe / Hermetic Metatron Sacred Geometry Mandala
 * Center emblem: Sol & Luna (Sun & Moon Occult Dualism) with All-Seeing Eye core
 */
function TarotMandalaAstrolabe() {
  return (
    <svg className="mandala-svg" viewBox="0 0 200 200" fill="none">
      <defs>
        {/* Rich Gilded Foil Metallic Gradient */}
        <linearGradient id="astrolabeGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="25%" stopColor="#f59e0b" />
          <stop offset="50%" stopColor="#d97706" />
          <stop offset="75%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#78350f" />
        </linearGradient>

        <linearGradient id="astrolabeGoldLight" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#fef9c3" />
          <stop offset="50%" stopColor="#fde047" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>

        <radialGradient id="sunAura" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(254, 240, 138, 0.45)" />
          <stop offset="40%" stopColor="rgba(245, 158, 11, 0.2)" />
          <stop offset="85%" stopColor="rgba(217, 119, 6, 0.05)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>

      {/* Layer 1: Ambient Solar Aura Glow */}
      <circle cx="100" cy="100" r="95" fill="url(#sunAura)" />

      {/* Layer 2: Outermost Gilded Edge Ring with Cardinal Accent Diamonds */}
      <circle cx="100" cy="100" r="95" stroke="url(#astrolabeGold)" strokeWidth="1.5" />
      <circle cx="100" cy="100" r="92" stroke="#d97706" strokeWidth="0.8" />

      {/* 4 Cardinal Diamond Jewels on Outer Ring */}
      <polygon points="100,2 103,5 100,8 97,5" fill="#fef08a" />
      <polygon points="100,192 103,195 100,198 97,195" fill="#fef08a" />
      <polygon points="2,100 5,97 8,100 5,103" fill="#fef08a" />
      <polygon points="192,100 195,97 198,100 195,103" fill="#fef08a" />

      {/* 4 Diagonal Cardinal Accent Pips */}
      <circle cx="33" cy="33" r="2" fill="#f59e0b" />
      <circle cx="167" cy="33" r="2" fill="#f59e0b" />
      <circle cx="33" cy="167" r="2" fill="#f59e0b" />
      <circle cx="167" cy="167" r="2" fill="#f59e0b" />

      {/* Layer 3: Dashed Astrological Degree Dial */}
      <circle
        cx="100"
        cy="100"
        r="88"
        stroke="#f59e0b"
        strokeWidth="1.2"
        strokeDasharray="2 3.5"
        opacity="0.9"
      />

      {/* Layer 4: Astronomical 12-Zodiac Tick Ring */}
      <circle cx="100" cy="100" r="82" stroke="url(#astrolabeGold)" strokeWidth="1" />
      <circle
        cx="100"
        cy="100"
        r="78"
        stroke="#d97706"
        strokeWidth="0.8"
        strokeDasharray="1 7"
        opacity="0.75"
      />

      {/* 12 Astrolabe Radial Ray Division Ticks (from r=82 to r=88) */}
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(deg => {
        const rad = (deg * Math.PI) / 180;
        const x1 = (100 + 82 * Math.cos(rad)).toFixed(2);
        const y1 = (100 + 82 * Math.sin(rad)).toFixed(2);
        const x2 = (100 + 88 * Math.cos(rad)).toFixed(2);
        const y2 = (100 + 88 * Math.sin(rad)).toFixed(2);
        return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#fde047" strokeWidth="1" />;
      })}

      {/* Layer 5: Sacred Geometry — Interlocking Octagram (Nested 45° Squares) */}
      <polygon
        points="100,24 176,100 100,176 24,100"
        stroke="url(#astrolabeGold)"
        strokeWidth="1.2"
        fill="rgba(245, 158, 11, 0.03)"
      />
      <polygon
        points="46,46 154,46 154,154 46,154"
        stroke="url(#astrolabeGold)"
        strokeWidth="1.2"
        fill="rgba(245, 158, 11, 0.03)"
      />

      {/* Secondary Inner Hexagram Lines */}
      <polygon
        points="100,32 159,134 41,134"
        stroke="#f59e0b"
        strokeWidth="0.9"
        opacity="0.8"
      />
      <polygon
        points="100,168 159,66 41,66"
        stroke="#f59e0b"
        strokeWidth="0.9"
        opacity="0.8"
      />

      {/* Layer 6: Mid-Sanctuary Beaded Circle */}
      <circle cx="100" cy="100" r="54" stroke="url(#astrolabeGold)" strokeWidth="1.2" />
      <circle
        cx="100"
        cy="100"
        r="50"
        stroke="#fde047"
        strokeWidth="0.9"
        strokeDasharray="1.5 2.5"
        opacity="0.85"
      />
      <circle cx="100" cy="100" r="46" stroke="#d97706" strokeWidth="0.8" />

      {/* 8 Alchemical Pips on Sanctuary Perimeter */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => {
        const rad = (deg * Math.PI) / 180;
        const cx = (100 + 48 * Math.cos(rad)).toFixed(2);
        const cy = (100 + 48 * Math.sin(rad)).toFixed(2);
        return <circle key={deg} cx={cx} cy={cy} r="1.4" fill="#fef08a" />;
      })}

      {/* Layer 7: Central Occult Focal Emblem — SOL & LUNA (Sun & Moon Occult Dualism) */}
      {/* 16 Solar Flare Rays (Alternating straight and flame bursts) */}
      <g className="mandala-solar-rays">
        {[0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5, 180, 202.5, 225, 247.5, 270, 292.5, 315, 337.5].map((deg, i) => {
          const isMajor = i % 2 === 0;
          const len = isMajor ? 44 : 38;
          const rad = (deg * Math.PI) / 180;
          const x2 = (100 + len * Math.cos(rad)).toFixed(2);
          const y2 = (100 + len * Math.sin(rad)).toFixed(2);
          const base1 = ((deg - 5) * Math.PI) / 180;
          const base2 = ((deg + 5) * Math.PI) / 180;
          const bx1 = (100 + 26 * Math.cos(base1)).toFixed(2);
          const by1 = (100 + 26 * Math.sin(base1)).toFixed(2);
          const bx2 = (100 + 26 * Math.cos(base2)).toFixed(2);
          const by2 = (100 + 26 * Math.sin(base2)).toFixed(2);
          return (
            <polygon
              key={deg}
              points={`${bx1},${by1} ${x2},${y2} ${bx2},${by2}`}
              fill={isMajor ? 'url(#astrolabeGoldLight)' : '#d97706'}
              opacity={isMajor ? 0.95 : 0.75}
            />
          );
        })}
      </g>

      {/* Radiant Sun Disk */}
      <circle cx="100" cy="100" r="26" fill="url(#astrolabeGold)" />
      <circle cx="100" cy="100" r="24" fill="#1b0d2a" />

      {/* Crescent Moon (Luna) Embracing the Solar Core */}
      <path
        d="M 100,76 A 24,24 0 0,1 100,124 A 18,18 0 0,0 100,76 Z"
        fill="url(#astrolabeGoldLight)"
        filter="drop-shadow(0 0 3px rgba(254, 240, 138, 0.7))"
      />

      {/* Central Mystical Eye of Providence / 8-pointed Alchemical Star */}
      <polygon
        points="100,88 103,97 112,100 103,103 100,112 97,103 88,100 97,97"
        fill="#fef08a"
      />
      <polygon
        points="100,92 102,98 108,100 102,102 100,108 98,102 92,100 98,98"
        fill="#b45309"
      />
      <circle cx="100" cy="100" r="2.5" fill="#fef08a" />
      <circle cx="100" cy="100" r="1.2" fill="#1b0d2a" />
    </svg>
  );
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
  onScreenShake,
}: CardStageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 3-Card spread internal state
  const [spreadState, setSpreadState] = useState<SpreadState>('idle');
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [squeezingTier, setSqueezingTier] = useState<number | null>(null);
  const [cards, setCards] = useState<[DisplayCard | null, DisplayCard | null, DisplayCard | null]>([
    null,
    null,
    null,
  ]);
  const [flipped, setFlipped] = useState<[boolean, boolean, boolean]>([false, false, false]);

  // Multiplier scoring tally & screen shake state
  const [tallyMultiplier, setTallyMultiplier] = useState<number | null>(null);
  const [isTallying, setIsTallying] = useState(false);
  const [isTallyDone, setIsTallyDone] = useState(false);
  const [editionTriggered, setEditionTriggered] = useState(false);

  // Dark Oracle Prophecies for Altar Foot (Task 3.1 - Rotates every 12s)
  const ALTAR_FOOT_PROPHECIES = useMemo(
    () => [
      'The stars align in solar gold tonight...',
      'Beware the thirteenth seal; the Void hungers...',
      'Destiny smiles upon those who dare the third card...',
      'Silver threads weave through the shadows of the altar...',
      'The ancient unmaker slumbers, waiting for the bold...',
      'The celestial wheel turns eternal; fortune favors the resolute...',
      'A single spark of ether can awaken the sleeping vault...',
      'Listen closely: the cards whisper secrets only the daring hear...',
    ],
    [],
  );
  const [altarOracleIdx, setAltarOracleIdx] = useState(0);
  const [altarOracleFade, setAltarOracleFade] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setAltarOracleFade(false);
      setTimeout(() => {
        setAltarOracleIdx(prev => (prev + 1) % ALTAR_FOOT_PROPHECIES.length);
        setAltarOracleFade(true);
      }, 450);
    }, 12000);
    return () => clearInterval(timer);
  }, [ALTAR_FOOT_PROPHECIES.length]);

  // Mouse 3D Parallax tilt tracking & Dynamic Balatro Foil cursor reflection
  const [tilt, setTilt] = useState<{
    index: number | null;
    rx: number;
    ry: number;
    angle: number;
    posX: number;
    posY: number;
  }>({
    index: null,
    rx: 0,
    ry: 0,
    angle: 115,
    posX: 50,
    posY: 50,
  });

  // Audio chime trigger on streak progression (Rune Resonance)
  const prevStreakRef = useRef(streak);
  useEffect(() => {
    if (streak > prevStreakRef.current && streak > 0) {
      sound.playRuneResonance(streak);
    }
    prevStreakRef.current = streak;
  }, [streak]);

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
  const animIdRef = useRef<number | null>(null);

  const startParticleLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (animIdRef.current !== null) return; // Loop is already actively running

    const render = () => {
      const particles = particlesRef.current;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (particles.length === 0) {
        animIdRef.current = null;
        return; // Terminate loop when idle to avoid frame lag during draw
      }

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

      animIdRef.current = requestAnimationFrame(render);
    };

    animIdRef.current = requestAnimationFrame(render);
  }, []);

  const spawnParticles = useCallback((tierIndex: number, originX: number, originY: number, edition?: CardEdition) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const isPolychrome = edition === 'polychrome';
    const isHolo = edition === 'holo';

    const baseCount = isPolychrome ? 160 : tierIndex === 3 ? 130 : tierIndex === 2 ? 85 : tierIndex === 1 ? 55 : 45;
    const count = Math.round(baseCount * (streak >= 3 ? 1.6 : 1.0));

    const polyColors = ['#f43f5e', '#fb923c', '#facc15', '#4ade80', '#38bdf8', '#a855f7', '#ec4899', '#ffffff'];
    const holoColors = ['#38bdf8', '#c084fc', '#818cf8', '#e0e7ff', '#3b82f6', '#ffffff'];

    const colors =
      isPolychrome
        ? polyColors
        : isHolo
          ? holoColors
          : tierIndex === 3
            ? ['#c084fc', '#f472b6', '#38bdf8', '#facc15', '#ffffff', '#e879f9', '#fbbf24']
            : tierIndex === 2
              ? ['#fbbf24', '#f59e0b', '#d97706', '#fef08a', '#ffffff', '#34d399']
              : tierIndex === 1
                ? ['#94a3b8', '#cbd5e1', '#e2e8f0', '#38bdf8', '#ffffff']
                : ['#ef4444', '#b91c1c', '#7f1d1d', '#a855f7', '#1e1b4b'];

    const newParticles = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * (isPolychrome || tierIndex === 3 ? 10 : 7) + 2;
      newParticles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (tierIndex > 0 || isPolychrome ? 2.5 : 0),
        size: Math.random() * 5 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        decay: Math.random() * 0.018 + 0.012,
        shape: (isPolychrome || isHolo || tierIndex === 3 || streak >= 3 ? 'star' : Math.random() > 0.5 ? 'circle' : 'square') as
          | 'circle'
          | 'star'
          | 'square',
      });
    }
    particlesRef.current = newParticles;
    startParticleLoop();
  }, [streak, startParticleLoop]);

  // 1. Transition into 'dealing' when a new wager begins (state === 'opening')
  // Sync selectedIdx if chosenIndex is provided from props
  useEffect(() => {
    if (chosenIndex !== undefined && chosenIndex !== null) {
      setSelectedIdx(chosenIndex);
    } else {
      setSelectedIdx(null);
    }
  }, [chosenIndex]);

  // 1. Synchronize lifecycle step transitions
  useEffect(() => {
    if (step === 'opening_session' || state === 'opening') {
      setSpreadState('dealing');
      setSelectedIdx(null);
      setFlipped([false, false, false]);
      setCards([null, null, null]);
      setTallyMultiplier(null);
      setIsTallying(false);
      setIsTallyDone(false);
      setEditionTriggered(false);
      sound.playDealWhoosh();

      const dealTimer = setTimeout(
        () => {
          setSpreadState('awaiting_pick');
        },
        fastMode ? 120 : 360,
      );

      return () => clearTimeout(dealTimer);
    } else if (step === 'awaiting_pick') {
      // Force awaiting_pick to avoid being stuck in 'dealing' if timer hasn't fired
      setSpreadState('awaiting_pick');
    } else if (step === 'idle' || state === 'idle') {
      setSpreadState('idle');
      setSelectedIdx(null);
      setFlipped([false, false, false]);
      setCards([null, null, null]);
      setTallyMultiplier(null);
      setIsTallying(false);
      setIsTallyDone(false);
      setEditionTriggered(false);
    } else if (step === 'settled') {
      setSpreadState('done');
      setFlipped([true, true, true]);
    }
  }, [step, state, fastMode]);

  const effectiveSelectedIdx = chosenIndex !== null && chosenIndex !== undefined ? chosenIndex : selectedIdx;

  // 2. Handle card selection by player
  const handleCardClick = useCallback(
    (idx: number) => {
      if (!((step === 'awaiting_pick' || spreadState === 'awaiting_pick') && effectiveSelectedIdx === null)) return;
      sound.playCardSelect();
      setSelectedIdx(idx);
      onCardPick?.(idx);
    },
    [step, spreadState, effectiveSelectedIdx, onCardPick],
  );

  // 3. Reveal sequence once a card is selected and outcome is ready
  useEffect(() => {
    const activeIdx = chosenIndex !== null && chosenIndex !== undefined ? chosenIndex : selectedIdx;
    if (activeIdx === null || !outcome) return;

    // Do not re-trigger if already in squeezing, revealing, or completed state
    if (
      spreadState === 'squeezing' ||
      spreadState === 'revealing' ||
      spreadState === 'near_miss' ||
      spreadState === 'done'
    ) {
      return;
    }

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

    // STEP A: Slow Peek / Squeeze Suspense Phase (~400ms window as per Task 2.1)
    // The selected card lifts, edges seep tier-specific aura glow, with an escalating rising-pitch tension synth!
    setSpreadState('squeezing');
    setSqueezingTier(outcome.tierIndex);
    sound.playCardSqueeze(outcome.tierIndex);

    const timers: Array<ReturnType<typeof setTimeout>> = [];
    const squeezeDuration = fastMode ? 80 : 400;

    const squeezeTimer = setTimeout(() => {
      setSqueezingTier(null);
      setSpreadState('revealing');
      setFlipped(prev => {
        const next = [...prev] as [boolean, boolean, boolean];
        next[activeIdx] = true;
        return next;
      });

      // Base Audio for selected outcome
      if (outcome.tierIndex === 0) {
        sound.playMimic();
      } else if (outcome.tierIndex === 1) {
        sound.playSilver();
      } else if (outcome.tierIndex === 2) {
        sound.playGold();
      } else {
        sound.playLegendary();
      }

      // Spawn particle burst at selected card
      const canvas = canvasRef.current;
      if (canvas) {
        const xPercent = activeIdx === 0 ? 0.25 : activeIdx === 1 ? 0.5 : 0.75;
        spawnParticles(outcome.tierIndex, canvas.width * xPercent, canvas.height * 0.44, actualCard?.edition);
      }

      const isEditionCard = actualCard?.edition && actualCard.edition !== 'standard';

      if (isEditionCard) {
        // Trigger edition visual & audio effects
        const editionTimer = setTimeout(() => {
          setEditionTriggered(true);
          onScreenShake?.();

          if (actualCard.edition === 'foil') {
            sound.playFoilTing();
          } else if (actualCard.edition === 'holo') {
            sound.playHoloTing();
          } else if (actualCard.edition === 'polychrome') {
            sound.playPolychromeChime();
          }
        }, fastMode ? 100 : 220);
        timers.push(editionTimer);

        // Scoring tally for winning outcomes with streak pitch overdrive
        if (outcome.won && outcome.multiplier > 0) {
          setTallyMultiplier(1.0);
          setIsTallying(true);
          setIsTallyDone(false);

          sound.playPitchShiftTally(
            outcome.multiplier,
            (_stepIndex, currentMult, isFinal) => {
              setTallyMultiplier(currentMult);
              if (isFinal) {
                setIsTallying(false);
                setIsTallyDone(true);
                onScreenShake?.();
              }
            },
            fastMode,
            1.0,
            streak >= 3 ? 4 : streak === 2 ? 2 : 0,
          );
        } else {
          setTallyMultiplier(0);
          setIsTallying(false);
          setIsTallyDone(true);
        }

        const nearMissDelay = fastMode ? 200 : (outcome.tierIndex === 0 ? 350 : 500);
        const nearMissTimer = setTimeout(() => {
          setSpreadState('near_miss');
          setFlipped([true, true, true]);

          if (outcome.tierIndex === 0) {
            const hasJackpotMiss = dummyCards.some(c => c.tierIndex === 3);
            if (hasJackpotMiss) {
              sound.playNearMissSigh();
            }
          }

          const doneTimer = setTimeout(() => {
            setSpreadState('done');
          }, fastMode ? 150 : 500);
          timers.push(doneTimer);
        }, nearMissDelay);
        timers.push(nearMissTimer);
      } else {
        // Standard Edition Card
        if (outcome.won && outcome.multiplier > 0) {
          setTallyMultiplier(1.0);
          setIsTallying(true);
          setIsTallyDone(false);

          sound.playPitchShiftTally(
            outcome.multiplier,
            (_stepIndex, currentMult, isFinal) => {
              setTallyMultiplier(currentMult);
              if (isFinal) {
                setIsTallying(false);
                setIsTallyDone(true);
                onScreenShake?.();
              }
            },
            fastMode,
            1.0,
            streak >= 3 ? 4 : streak === 2 ? 2 : 0,
          );
        } else {
          setTallyMultiplier(0);
          setIsTallying(false);
          setIsTallyDone(true);
        }

        // Flip remaining 2 near-miss cards (350ms for The Void x0.0 loss, or 450ms after tally)
        const delayTime = fastMode ? 150 : outcome.tierIndex === 0 ? 350 : 450;
        const nearMissTimer = setTimeout(() => {
          setSpreadState('near_miss');
          setFlipped([true, true, true]);

          if (outcome.tierIndex === 0) {
            const hasJackpotMiss = dummyCards.some(c => c.tierIndex === 3);
            if (hasJackpotMiss) {
              sound.playNearMissSigh();
            }
          }

          const doneTimer = setTimeout(() => {
            setSpreadState('done');
          }, fastMode ? 150 : 500);
          timers.push(doneTimer);
        }, delayTime);
        timers.push(nearMissTimer);
      }
    }, squeezeDuration);
    timers.push(squeezeTimer);

    return () => {
      timers.forEach(t => clearTimeout(t));
    };
  }, [step, state, chosenIndex, selectedIdx, outcome, wager, spreadState, fastMode, spawnParticles, onScreenShake]);

  // Clean up active particle animation frame on unmount
  useEffect(() => {
    return () => {
      if (animIdRef.current !== null) {
        cancelAnimationFrame(animIdRef.current);
        animIdRef.current = null;
      }
    };
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

  // Mouse Move Parallax Tilt Handler (Desktop) & Dynamic Balatro Foil Reflection
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>, cardIndex: number) => {
    if (spreadState === 'dealing' || spreadState === 'squeezing') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    // Natural, subtle 3D tilt (capped at 6.5 deg) for realistic, weighted physical card feel
    const rx = Number((-(y / (rect.height / 2)) * 6.5).toFixed(2));
    const ry = Number(((x / (rect.width / 2)) * 6.5).toFixed(2));
    const angle = Math.round((Math.atan2(y, x) * 180) / Math.PI + 90);
    const posX = Math.max(0, Math.min(100, Math.round(50 + (x / rect.width) * 55)));
    const posY = Math.max(0, Math.min(100, Math.round(50 + (y / rect.height) * 55)));
    setTilt({ index: cardIndex, rx, ry, angle, posX, posY });
  };

  const handleMouseLeave = () => {
    setTilt({ index: null, rx: 0, ry: 0, angle: 115, posX: 50, posY: 50 });
  };

  // Touch Move Parallax Tilt Handler (Mobile)
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>, cardIndex: number) => {
    if (spreadState === 'dealing' || spreadState === 'squeezing') return;
    const touch = e.touches[0];
    if (!touch) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = touch.clientX - rect.left - rect.width / 2;
    const y = touch.clientY - rect.top - rect.height / 2;
    const rx = Number((-(y / (rect.height / 2)) * 6.5).toFixed(2));
    const ry = Number(((x / (rect.width / 2)) * 6.5).toFixed(2));
    const angle = Math.round((Math.atan2(y, x) * 180) / Math.PI + 90);
    const posX = Math.max(0, Math.min(100, Math.round(50 + (x / rect.width) * 55)));
    const posY = Math.max(0, Math.min(100, Math.round(50 + (y / rect.height) * 55)));
    setTilt({ index: cardIndex, rx, ry, angle, posX, posY });
  };

  const handleTouchEnd = () => {
    setTilt({ index: null, rx: 0, ry: 0, angle: 115, posX: 50, posY: 50 });
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
    <div className={`card-stage-container occult-tabletop ${streak >= 3 ? 'streak-plasma-active' : ''}`}>
      {/* VELVET TABLETOP WITH GOLD-EMBROIDERED RUNIC BORDER */}
      <div className="tabletop-velvet-cloth" aria-hidden="true">
        <div className="tabletop-runic-border">
          <span className="corner-knot corner-knot-tl">✦ ᚱ ✦</span>
          <span className="corner-knot corner-knot-tr">✦ ᛟ ✦</span>
          <span className="corner-knot corner-knot-bl">✦ ᛞ ✦</span>
          <span className="corner-knot corner-knot-br">✦ ᛊ ✦</span>
        </div>
      </div>

      {/* 18 AMBIENT FLOATING DUST MOTES / SPIRIT EMBERS */}
      <div className="tabletop-dust-container" aria-hidden="true">
        {DUST_MOTES.map((mote, i) => (
          <div
            key={i}
            className={`dust-mote dust-mote-${mote.colorType}`}
            style={{
              left: `${mote.left}%`,
              top: `${mote.top}%`,
              width: `${mote.size}px`,
              height: `${mote.size}px`,
              animationDelay: `${mote.delay}s`,
              animationDuration: `${mote.duration}s`,
              opacity: mote.opacity,
            }}
          />
        ))}
      </div>

      {/* OCCULT CANDLE - LEFT CORNER */}
      <div className="occult-candle candle-left" aria-hidden="true">
        <div className="candle-halo" />
        <div className="candle-smoke" />
        <div className="candle-flame">
          <div className="flame-inner" />
        </div>
        <div className="candle-wick" />
        <div className="candle-wax">
          <div className="wax-drip drip-1" />
          <div className="wax-drip drip-2" />
        </div>
        <div className="candle-stand" />
      </div>

      {/* OCCULT CANDLE - RIGHT CORNER */}
      <div className="occult-candle candle-right" aria-hidden="true">
        <div className="candle-halo" />
        <div className="candle-smoke" />
        <div className="candle-flame">
          <div className="flame-inner" />
        </div>
        <div className="candle-wick" />
        <div className="candle-wax">
          <div className="wax-drip drip-1" />
          <div className="wax-drip drip-2" />
        </div>
        <div className="candle-stand" />
      </div>

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
            const cardData =
              cards[slotIndex] ||
              (isPicked && outcome
                ? outcome.card || getCardForOutcome(outcome.tierIndex, outcome.roll, wager, outcome.randomness)
                : null);
            const isAwaiting = spreadState === 'awaiting_pick';
            const isDealing = spreadState === 'dealing';
            const isSqueezing = spreadState === 'squeezing' && isPicked;
            const isOtherSqueezing = spreadState === 'squeezing' && !isPicked;

            // Calculate tilt transform without breaking preserve-3d
            const isTilted = tilt.index === slotIndex;
            let transformStyle = '';

            if (isFlipped) {
              if (isTilted) {
                const baseScale = isPicked ? 1.04 : 1.02;
                transformStyle = `rotateX(${tilt.rx}deg) rotateY(${180 - tilt.ry}deg) translateY(-5px) scale(${baseScale})`;
              } else {
                transformStyle = isPicked
                  ? 'rotateY(180deg) scale(1.03)'
                  : 'rotateY(180deg) scale(0.97)';
              }
            } else if (isSqueezing) {
              transformStyle = 'translateY(-24px) scale(1.08)';
            } else if (isOtherSqueezing) {
              transformStyle = 'translateY(6px) scale(0.93)';
            } else if (isTilted && isAwaiting) {
              transformStyle = `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) translateY(-5px) scale(1.02)`;
            } else if (isAwaiting) {
              transformStyle = 'rotateY(0deg)';
            }

            return (
              <div
                key={slotIndex}
                className={`card-slot-3d ${isAwaiting ? 'slot-awaiting' : ''} ${isPicked ? 'slot-picked' : ''} ${
                  isSqueezing ? `slot-squeezing squeeze-tier-${squeezingTier ?? 0}` : ''
                } ${isOtherSqueezing ? 'slot-squeeze-dimmed' : ''} ${
                  isFlipped && cardData?.edition === 'polychrome' ? 'slot-polychrome' : ''
                } ${isFlipped && cardData?.edition === 'holo' ? 'slot-holo' : ''}`}
                onMouseMove={e => handleMouseMove(e, slotIndex)}
                onMouseLeave={handleMouseLeave}
                onTouchMove={e => handleTouchMove(e, slotIndex)}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
                onClick={() => handleCardClick(slotIndex)}
              >
                <div
                  className={`card-3d ${isFlipped ? 'flipped' : ''} ${isTilted ? 'is-tilting' : ''} ${
                    fastMode ? 'fast-flip' : ''
                  } ${isDealing ? 'card-dealing' : ''} ${isPicked ? 'card-picked' : ''} ${
                    isSqueezing ? `card-squeezing squeeze-card-tier-${squeezingTier ?? 0}` : ''
                  } ${
                    isFlipped && !isPicked ? 'card-unpicked' : ''
                  }`}
                  style={{
                    transform: transformStyle || undefined,
                    animationDelay: `${slotIndex * 110}ms`,
                    ...(isTilted
                      ? ({
                          '--foil-angle': `${tilt.angle}deg`,
                          '--foil-pos-x': `${tilt.posX}%`,
                          '--foil-pos-y': `${tilt.posY}%`,
                          '--shadow-x': `${(-tilt.ry * 1.5).toFixed(1)}px`,
                          '--shadow-y': `${(18 + tilt.rx * 1.2).toFixed(1)}px`,
                        } as React.CSSProperties)
                      : {}),
                  }}
                >
                  {/* CARD BACK (MẶT LƯNG: VÒNG TRÒN MA THUẬT VÀNG CỔ) */}
                  <div className={`card-face card-back ${isSqueezing ? `back-squeezing back-squeeze-tier-${squeezingTier ?? 0}` : ''}`}>
                    {/* Squeeze Suspense Aura Effect - Edge seeping glow before card flip */}
                    {isSqueezing && squeezingTier !== null && (
                      <div className={`card-squeeze-aura-effect aura-tier-${squeezingTier}`}>
                        <div className="aura-smoke" />
                        <div className="aura-rays" />
                        <div className="aura-border-flare" />
                        <div className="aura-inner-glow" />
                      </div>
                    )}
                    <div className="card-back-border">
                      {/* 4 Guilloche Celtic / Baroque Filigree Corner Brackets */}
                      <CornerFiligree className="corner-tl" />
                      <CornerFiligree className="corner-tr" />
                      <CornerFiligree className="corner-bl" />
                      <CornerFiligree className="corner-br" />

                      {/* Top Occult Celestial Sigil Header */}
                      <div className="card-back-top-header" aria-hidden="true">
                        <span className="top-header-flourish">✦ ☉ ✦</span>
                      </div>

                      {/* Expanded Central Sacred Geometry Mandala Astrolabe */}
                      <div className="card-back-mandala">
                        <TarotMandalaAstrolabe />
                      </div>

                      {/* Bottom Classical Hermetic Typography */}
                      <div className="card-back-footer">
                        <div className="card-back-title">
                          ARCANA
                        </div>
                        <div className="card-back-divider" aria-hidden="true">
                          <span className="divider-line" />
                          <span className="divider-glyph">◈</span>
                          <span className="divider-line" />
                        </div>
                        <div className="card-back-sub">
                          TAROT OF FATE
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CARD FRONT (90s VINTAGE FANTASY TCG / RPG TABLETOP AESTHETIC) */}
                  <div
                    className={`card-face card-front tcg-card-frame tcg-frame-tier-${
                      cardData ? cardData.tierIndex : 0
                    } card-edition-${cardData ? cardData.edition : 'standard'} ${
                      cardData?.edition === 'polychrome' ? 'is-polychrome' : ''
                    } ${cardData?.edition === 'holo' ? 'is-holo' : ''} ${
                      cardData?.edition === 'foil' ? 'is-foil' : ''
                    }`}
                  >
                    {/* Dynamic Edition Sheen Overlays */}
                    <div className="card-specular-glare" />
                    {cardData?.edition === 'polychrome' && <div className="card-polychrome-sheen" />}
                    {cardData?.edition === 'holo' && <div className="card-holo-sheen" />}
                    {(cardData?.edition === 'foil' || cardData?.tierIndex === 3) && <div className="card-foil-sheen" />}

                    {/* Outer Embossed Metallic Pinstripe */}
                    <div className="tcg-frame-pinstripe">
                      {/* Inner Aged Parchment / Ivory Art Inlay Plate */}
                      <div className="tcg-parchment-plate">
                        {/* Antique Plate Corner Filigrees */}
                        <div className="card-plate-corner plate-corner-tl">✦</div>
                        <div className="card-plate-corner plate-corner-tr">✦</div>
                        <div className="card-plate-corner plate-corner-bl">✦</div>
                        <div className="card-plate-corner plate-corner-br">✦</div>
                        {/* Top RPG Crest & Badges Header */}
                        <div className="tcg-top-header">
                          {/* Circular Embossed Crest Medallion */}
                          <div className={`tcg-crest-emblem crest-tier-${cardData ? cardData.tierIndex : 0}`}>
                            <span className="crest-numeral">{cardData?.roman ?? '✦'}</span>
                          </div>

                          {/* Pick & Edition Badges Cluster */}
                          <div className="tcg-badges-cluster">
                            <span className={`badge-pick-status ${isPicked ? 'pick-active' : 'pick-missed'}`}>
                              {isPicked ? 'YOUR PICK' : 'MISSED'}
                            </span>
                            {cardData && cardData.edition !== 'standard' && (
                              <span className={`card-edition-badge edition-${cardData.edition}`}>
                                {cardData.edition === 'polychrome' ? '★ POLYCHROME ★' : cardData.edition.toUpperCase()}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Center Vintage Fantasy Art Window */}
                        <div className="tcg-art-window">
                          <div className={`tcg-art-frame-inner art-tier-${cardData ? cardData.tierIndex : 0}`}>
                            {cardData && (
                              <ProceduralSigil
                                seed={cardData.sigilSeed ?? cardData.roll ?? slotIndex}
                                tier={cardData.tierIndex}
                                className="card-svg"
                              />
                            )}
                          </div>
                        </div>

                        {/* Floating Balatro Edition Modifier Popup */}
                        {isPicked && editionTriggered && cardData && cardData.edition !== 'standard' && cardData.editionBonus && (
                          <div className={`edition-modifier-popup edition-popup-${cardData.edition}`}>
                            <span className="edition-pop-icon">
                              {cardData.edition === 'polychrome' ? '★' : cardData.edition === 'holo' ? '✦' : '✧'}
                            </span>
                            <span className="edition-pop-text">{cardData.editionBonus.bonusText}</span>
                            <span className="edition-pop-icon">
                              {cardData.edition === 'polychrome' ? '★' : cardData.edition === 'holo' ? '✦' : '✧'}
                            </span>
                          </div>
                        )}

                        {/* Near-Miss / Missed Jackpot Stamp for The Void (x0.0) loss */}
                        {isFlipped && !isPicked && outcome?.tierIndex === 0 && cardData && cardData.tierIndex === 3 && (
                          <div className="near-miss-stamp">
                            <div className="stamp-inner">
                              <span className="stamp-stars">★ ★ ★</span>
                              <span className="stamp-main">SO CLOSE!</span>
                              <span className="stamp-sub">MISSED JACKPOT</span>
                            </div>
                          </div>
                        )}

                        {/* Flaming Polychrome Edition Banner */}
                        {cardData?.edition === 'polychrome' && (
                          <div className="polychrome-fire-banner">
                            <span className="fire-text">★ POLYCHROME EDITION ★</span>
                          </div>
                        )}

                        {/* Bottom Medieval Gothic Ribbon Banner */}
                        <div className="tcg-gothic-banner">
                          <div className="tcg-banner-main">
                            <div className="tcg-card-title" title={cardData?.name ?? 'ARCANA'}>
                              {cardData?.name ?? 'ARCANA'}
                            </div>

                            {/* Large Prominent Multiplier Pill */}
                            <div
                              className={`tcg-multiplier-shield shield-tier-${cardData ? cardData.tierIndex : 0} ${
                                isPicked && isTallying ? 'tally-counting' : ''
                              } ${isPicked && isTallyDone ? 'tally-final' : ''} ${
                                isPicked && editionTriggered && cardData?.edition !== 'standard'
                                  ? `edition-active-pill edition-pill-${cardData?.edition}`
                                  : ''
                              }`}
                            >
                              <span className="shield-val">
                                {isPicked && isTallying && tallyMultiplier !== null
                                  ? `x${tallyMultiplier.toFixed(1)}`
                                  : (cardData?.multiplierText ?? 'x0.0')}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pentagram Rune Resonance Circle (Under the Cards) */}
        <RuneResonanceCircle streak={streak} isAwaiting={spreadState === 'awaiting_pick'} />

        {/* Stage Status / Instructions Box */}
        <div className="stage-status-box">
          {spreadState === 'awaiting_pick' && (
            <div className="awaiting-pick-prompt">
              <span className="prompt-dot" />
              <span className="prompt-text">CHOOSE YOUR CARD</span>
            </div>
          )}

          {spreadState === 'squeezing' && (
            <div className={`opening-text squeeze-suspense-banner tier-${squeezingTier ?? 0}`}>
              <span className="prompt-dot pulse" />
              {squeezingTier === 3
                ? '★ DESTINY PEEKING... ★'
                : squeezingTier === 2
                  ? '✦ GOLDEN FLAME PEEKING... ✦'
                  : squeezingTier === 1
                    ? '✧ SILVER ESSENCE RISING... ✧'
                    : '◈ VOID CORRUPTION SENSING... ◈'}
            </div>
          )}

          {spreadState === 'revealing' && chosenCard && (
            <div className="opening-text">
              <span className="prompt-dot pulse" />
              REVEALING DESTINY...
            </div>
          )}

          {(spreadState === 'near_miss' || spreadState === 'done') && chosenCard && outcome && flipped[activePickIdx ?? 0] && (
            <>
              {chosenCard.tierIndex === 3 && (
                <>
                  <div className="jackpot-stage-flash" aria-hidden="true" />
                  <div className="jackpot-cosmic-rays" aria-hidden="true" />
                </>
              )}
              <div className={`outcome-badge ${badgeClass} ${chosenCard.tierIndex === 3 ? 'is-jackpot-badge' : ''}`}>
                <span className="badge-tag">
                  {chosenCard.name} • {chosenCard.category}
                </span>
                <span className={`badge-multiplier ${chosenCard.tierIndex === 3 ? 'jackpot-text-burst' : chosenCard.tierIndex === 2 ? 'gold-win-text' : ''}`}>
                  {chosenCard.tierIndex === 3
                    ? '★ x5.0 JACKPOT! ★'
                    : chosenCard.tierIndex === 2
                      ? '✦ x2.5 BIG WIN! ✦'
                      : chosenCard.tierIndex === 1
                        ? 'x1.2 PROFIT'
                        : 'CURSED (x0.0)'}
                </span>
                <span className="badge-desc">{chosenCard.description}</span>

                {/* DARK ORACLE PROPHECY MICRO-COPY */}
                <div className={`dark-oracle-prophecy oracle-tier-${chosenCard.tierIndex}`}>
                  <span className="oracle-quote-glyph">“</span>
                  <span className="oracle-quote-content">
                    {getDarkOracleQuote(
                      chosenCard.tierIndex,
                      chosenCard.sigilSeed ?? outcome.roll ?? outcome.randomness,
                    )}
                  </span>
                  <span className="oracle-quote-glyph">”</span>
                </div>
              </div>
            </>
          )}

          {spreadState === 'idle' && (
            <div className="idle-text">Set your wager and click Draw Card to begin</div>
          )}
        </div>

        {/* ALTAR FOOT ORACLE PROPHECIES (Atmospheric rotating micro-copy every 12s) */}
        <div className="altar-foot-whisper-container">
          <div className={`altar-foot-whisper ${altarOracleFade ? 'visible' : 'hidden'}`}>
            <span className="altar-whisper-glyph">◈</span>
            <span className="altar-whisper-text">{ALTAR_FOOT_PROPHECIES[altarOracleIdx]}</span>
            <span className="altar-whisper-glyph">◈</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Rune Resonance Pentagram Sigil Circle
 * Interactive 5-Seal Pentagram Matrix with 3D Tabletop Perspective
 * - Streak 1: Seal 1 awakens with ethereal cyan-gold ring.
 * - Streak 2: Seal 2 erupts in blazing golden flame.
 * - Streak 3+: Entire matrix rotates in continuous 'FATE SURGE' plasma overdrive!
 */
export function RuneResonanceCircle({
  streak = 0,
  isAwaiting = false,
}: {
  streak?: number;
  isAwaiting?: boolean;
}) {
  const isSurge = streak >= 3;
  const isSeal1 = streak >= 1;
  const isSeal2 = streak >= 2;

  return (
    <div className="rune-resonance-stage-circle">
      <div className={`pentagram-svg-pad ${isSurge ? 'fate-surge-active' : ''} ${isAwaiting ? 'awaiting-pulse' : ''}`}>
        <svg className="pentagram-svg" viewBox="0 0 280 280" fill="none">
          <defs>
            <radialGradient id="sigilCoreGlow" cx="50%" cy="50%" r="50%">
              <stop
                offset="0%"
                stopColor={isSurge ? '#c084fc' : isSeal2 ? '#f59e0b' : isSeal1 ? '#38bdf8' : '#d97706'}
                stopOpacity={isSurge ? 0.6 : isSeal1 ? 0.4 : 0.15}
              />
              <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="pentagramLineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={isSurge ? '#e879f9' : isSeal2 ? '#fbbf24' : isSeal1 ? '#38bdf8' : '#b45309'} />
              <stop offset="50%" stopColor={isSurge ? '#38bdf8' : isSeal2 ? '#f59e0b' : isSeal1 ? '#94a3b8' : '#78350f'} />
              <stop offset="100%" stopColor={isSurge ? '#facc15' : isSeal2 ? '#d97706' : isSeal1 ? '#cbd5e1' : '#451a03'} />
            </linearGradient>
          </defs>

          {/* Core Ambient Radial Glow Disc */}
          <circle cx="140" cy="140" r="105" fill="url(#sigilCoreGlow)" />

          {/* Outer Ring Inscriptions */}
          <circle
            cx="140"
            cy="140"
            r="126"
            stroke={isSurge ? '#c084fc' : isSeal2 ? '#f59e0b' : isSeal1 ? '#94a3b8' : '#78350f'}
            strokeWidth="1.5"
            strokeDasharray="4 6"
            opacity={isSurge ? 0.9 : 0.6}
          />
          <circle
            cx="140"
            cy="140"
            r="114"
            stroke={isSurge ? '#e879f9' : isSeal2 ? '#fbbf24' : isSeal1 ? '#cbd5e1' : '#92400e'}
            strokeWidth="1"
            opacity={isSurge ? 0.95 : 0.7}
          />
          <circle
            cx="140"
            cy="140"
            r="98"
            stroke={isSurge ? '#38bdf8' : isSeal2 ? '#f59e0b' : '#78350f'}
            strokeWidth="1.2"
            strokeDasharray="2 4"
            opacity={0.7}
          />

          {/* Pentagram 5-Point Star Geometry */}
          <polygon
            points="140,42 197.6,219.3 46.8,109.7 233.2,109.7 82.4,219.3"
            stroke="url(#pentagramLineGrad)"
            strokeWidth={isSurge ? 2.5 : isSeal2 ? 2 : isSeal1 ? 1.8 : 1.2}
            fill={isSurge ? 'rgba(168, 85, 247, 0.08)' : isSeal2 ? 'rgba(245, 158, 11, 0.06)' : 'none'}
            className={isSurge ? 'molten-star-lines' : ''}
          />

          {/* Inner Inscribed Hexagon / Circle */}
          <circle
            cx="140"
            cy="140"
            r="38"
            stroke={isSurge ? '#e879f9' : isSeal2 ? '#fbbf24' : '#78350f'}
            strokeWidth="1.5"
            opacity={0.8}
          />

          {/* Center Mystic Arcana Eye / Glyph */}
          <circle
            cx="140"
            cy="140"
            r="14"
            fill={isSurge ? '#f5d0fe' : isSeal2 ? '#fef08a' : isSeal1 ? '#e0f2fe' : '#92400e'}
            opacity={isSurge ? 0.9 : isSeal1 ? 0.7 : 0.4}
            className={isSurge ? 'center-core-pulse' : ''}
          />
          <circle
            cx="140"
            cy="140"
            r="6"
            fill={isSurge ? '#7e22ce' : isSeal2 ? '#b45309' : '#0f172a'}
          />

          {/* 5 Runic Nodes on the Vertices */}
          {/* Node 0: Top (✦ Seal of Ether) */}
          <g className={`sigil-node node-0 ${isSeal1 ? 'node-active node-seal-1' : 'node-dormant'}`}>
            <circle cx="140" cy="42" r={isSeal1 ? 12 : 9} className="node-glow-ring" />
            <circle cx="140" cy="42" r={isSeal1 ? 8 : 6} className="node-core" />
            <text x="140" y="45.5" textAnchor="middle" className="node-glyph">✦</text>
          </g>

          {/* Node 1: Top-Right (ᚠ Seal of Wealth) */}
          <g className={`sigil-node node-1 ${isSeal2 ? 'node-active node-seal-2' : 'node-dormant'}`}>
            <circle cx="233.2" cy="109.7" r={isSeal2 ? 12 : 9} className="node-glow-ring" />
            <circle cx="233.2" cy="109.7" r={isSeal2 ? 8 : 6} className="node-core" />
            <text x="233.2" y="113.2" textAnchor="middle" className="node-glyph">ᚠ</text>
          </g>

          {/* Node 2: Bottom-Right (ᛊ Seal of Sun) */}
          <g className={`sigil-node node-2 ${isSurge ? 'node-active node-seal-3' : 'node-dormant'}`}>
            <circle cx="197.6" cy="219.3" r={isSurge ? 12 : 9} className="node-glow-ring" />
            <circle cx="197.6" cy="219.3" r={isSurge ? 8 : 6} className="node-core" />
            <text x="197.6" y="222.8" textAnchor="middle" className="node-glyph">ᛊ</text>
          </g>

          {/* Node 3: Bottom-Left (ᛞ Seal of Destiny) */}
          <g className={`sigil-node node-3 ${isSurge ? 'node-active node-seal-4' : 'node-dormant'}`}>
            <circle cx="82.4" cy="219.3" r={isSurge ? 12 : 9} className="node-glow-ring" />
            <circle cx="82.4" cy="219.3" r={isSurge ? 8 : 6} className="node-core" />
            <text x="82.4" y="222.8" textAnchor="middle" className="node-glyph">ᛞ</text>
          </g>

          {/* Node 4: Top-Left (ᚱ Seal of Journey) */}
          <g className={`sigil-node node-4 ${isSurge ? 'node-active node-seal-5' : 'node-dormant'}`}>
            <circle cx="46.8" cy="109.7" r={isSurge ? 12 : 9} className="node-glow-ring" />
            <circle cx="46.8" cy="109.7" r={isSurge ? 8 : 6} className="node-core" />
            <text x="46.8" y="113.2" textAnchor="middle" className="node-glyph">ᚱ</text>
          </g>
        </svg>
      </div>

      <div className={`resonance-circle-status status-tier-${isSurge ? 'surge' : streak}`}>
        {streak === 0 && '✦ PENTAGRAM SIGIL CIRCLE • DORMANT ✦'}
        {streak === 1 && '✧ SEAL I RESONATING • 1X RESONANCE ✧'}
        {streak === 2 && '✦ SEAL II BLAZING • 2X RESONANCE ✦'}
        {streak >= 3 && `◈ FATE SURGE ACTIVE • ${streak}X RESONANCE OVERDRIVE ◈`}
      </div>
    </div>
  );
}

/**
 * Procedural SVG Artwork for the 12 distinct Tarot Cards
 */
export function CardArt({
  iconType,
  tier,
  seed,
}: {
  iconType: string;
  tier: number;
  seed?: number | string;
}) {
  if (iconType === 'sigil' || seed !== undefined) {
    return <ProceduralSigil seed={seed ?? iconType} tier={tier} className="card-svg" />;
  }

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

