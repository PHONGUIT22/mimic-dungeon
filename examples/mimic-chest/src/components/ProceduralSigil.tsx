import React, { useMemo } from 'react';

export interface ProceduralSigilProps {
  seed: number | string;
  tier?: 'void' | 'silver' | 'gold' | 'destiny' | number;
  className?: string;
  size?: number | string;
}

/**
 * Deterministic integer hash from seed (number or hex string).
 */
export function hashSeed(seed: number | string): number {
  if (typeof seed === 'number') {
    return Math.abs(Math.floor(seed));
  }
  if (!seed) return 0;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Procedural Sacred Sigil SVG Component
 * Generates an infinite variety of sacred geometric sigils deterministically from a seed:
 * - Outer regular rotating polygon (3, 4, 6, 8, 12 sides) or orbital dashed rings
 * - Internal sacred geometric mesh (Merkaba, intersecting petals, Metatron diagonals, concentric labyrinth)
 * - Central mystical core glyph (concentric rings, crescent moon, sacred eye, radiant starburst)
 * - 3 to 8 orbital satellite nodes revolving around the perimeter
 * - Pure SVG vector rendering with zero external assets, stroke-current inheritance
 */
export function ProceduralSigil({
  seed,
  tier,
  className = '',
  size = '100%',
}: ProceduralSigilProps) {
  const numSeed = useMemo(() => hashSeed(seed), [seed]);

  // Derive Tier color if explicitly specified, otherwise inherit via currentColor
  const tierColor = useMemo(() => {
    if (tier === undefined || tier === null) return undefined;
    if (tier === 0 || tier === 'void') return '#f87171'; // Red / Crimson Void
    if (tier === 1 || tier === 'silver') return '#93c5fd'; // Luminous Silver-Cyan
    if (tier === 2 || tier === 'gold') return '#fbbf24'; // Radiant Golden Sun
    if (tier === 3 || tier === 'destiny') return '#f0abfc'; // Mythic Prismatic Orchid
    return undefined;
  }, [tier]);

  // Geometry calculations
  const {
    outerPolygonPoints,
    outerType,
    meshRotation,
    meshType,
    coreType,
    satellites,
  } = useMemo(() => {
    const s = numSeed;

    // 1. Outer Geometry (seed % 6)
    // 0: Triangle, 1: Square, 2: Hexagon, 3: Octagon, 4: Dodecagon, 5: Orbital Rings
    const outT = s % 6;
    let polygonSides = 0;
    if (outT === 0) polygonSides = 3;
    else if (outT === 1) polygonSides = 4;
    else if (outT === 2) polygonSides = 6;
    else if (outT === 3) polygonSides = 8;
    else if (outT === 4) polygonSides = 12;

    let polyPts = '';
    if (polygonSides > 0) {
      const radius = polygonSides === 12 ? 40 : polygonSides === 8 ? 39 : 38;
      const angleOffset = (((s * 19) % 360) * Math.PI) / 180;
      const ptsArr: string[] = [];
      for (let i = 0; i < polygonSides; i++) {
        const theta = angleOffset + (i * 2 * Math.PI) / polygonSides;
        const x = (50 + radius * Math.cos(theta)).toFixed(2);
        const y = (50 + radius * Math.sin(theta)).toFixed(2);
        ptsArr.push(`${x},${y}`);
      }
      polyPts = ptsArr.join(' ');
    }

    // 2. Sacred Mesh
    const mRot = (s * 17) % 360;
    const mType = Math.floor(s / 7) % 4;

    // 3. Core Glyph
    const cType = Math.floor(s / 37) % 4;

    // 4. Satellite Nodes (3 to 8 dots)
    const nodeCount = 3 + (s % 6);
    const satRadius = 40 + ((s * 7) % 5);
    const satAngleOffset = (((s * 43) % 360) * Math.PI) / 180;
    const satArr: Array<{ x: string; y: string; r: number; filled: boolean }> = [];

    for (let i = 0; i < nodeCount; i++) {
      const theta = satAngleOffset + (i * 2 * Math.PI) / nodeCount;
      const x = (50 + satRadius * Math.cos(theta)).toFixed(2);
      const y = (50 + satRadius * Math.sin(theta)).toFixed(2);
      satArr.push({
        x,
        y,
        r: 2.2 + ((s + i * 3) % 2) * 0.8,
        filled: (s + i) % 2 === 0,
      });
    }

    return {
      outerPolygonPoints: polyPts,
      outerType: outT,
      meshRotation: mRot,
      meshType: mType,
      coreType: cType,
      satellites: satArr,
    };
  }, [numSeed]);

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`procedural-sigil stroke-current fill-none ${className}`}
      style={tierColor ? { color: tierColor } : undefined}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Definitions for radiant glow filter & gradients */}
      <defs>
        <radialGradient id={`core-glow-${numSeed % 1000}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.5" />
          <stop offset="60%" stopColor="currentColor" stopOpacity="0.15" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
        <filter id={`sigil-glow-${numSeed % 1000}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="1.2" floodColor="currentColor" floodOpacity="0.8" />
          <feDropShadow dx="0" dy="0" stdDeviation="3.0" floodColor="currentColor" floodOpacity="0.4" />
        </filter>
      </defs>

      {/* Subtle background glow core */}
      <circle cx="50" cy="50" r="34" fill={`url(#core-glow-${numSeed % 1000})`} stroke="none" />

      <g filter={`url(#sigil-glow-${numSeed % 1000})`}>
        {/* Outermost containment boundary rings */}
        <circle cx="50" cy="50" r="46" stroke="currentColor" strokeWidth="1.8" opacity="0.6" />
        <circle
          cx="50"
          cy="50"
          r="44"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeDasharray="3 3"
          opacity="0.85"
        />

        {/* 1. OUTER GEOMETRY */}
        {outerType < 5 ? (
          <>
            <polygon
              points={outerPolygonPoints}
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinejoin="round"
              opacity="0.95"
            />
            {/* Inscribed concentric geometry for added depth */}
            {outerType === 0 && (
              // Nested inverted triangle (Merkaba outline)
              <polygon
                points={outerPolygonPoints
                  .split(' ')
                  .map(pt => {
                    const [x, y] = pt.split(',').map(Number);
                    return `${(100 - x).toFixed(2)},${(100 - y).toFixed(2)}`;
                  })
                  .join(' ')}
                stroke="currentColor"
                strokeWidth="2.0"
                strokeDasharray="4 2"
                opacity="0.75"
              />
            )}
            {outerType === 1 && (
              // Inscribed 45-deg rotated diamond
              <polygon
                points="50,22 78,50 50,78 22,50"
                stroke="currentColor"
                strokeWidth="2.0"
                strokeDasharray="3 2"
                opacity="0.7"
              />
            )}
          </>
        ) : (
          // Case 5: Tri-orbital dashed concentric rings
          <>
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeDasharray="6 3"
              opacity="0.95"
            />
            <circle
              cx="50"
              cy="50"
              r="34"
              stroke="currentColor"
              strokeWidth="2.0"
              strokeDasharray="3 3"
              opacity="0.75"
            />
            <circle
              cx="50"
              cy="50"
              r="28"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeDasharray="4 2"
              opacity="0.65"
            />
          </>
        )}

        {/* 2. SACRED MESH (Internal Geometry with rotation) */}
        <g transform={`rotate(${meshRotation} 50 50)`}>
          {meshType === 0 && (
            // Sacred Hexagram & Inner Hexagon (Merkaba matrix)
            <>
              <polygon points="50,18 78,66 22,66" stroke="currentColor" strokeWidth="2.2" opacity="0.9" />
              <polygon points="50,82 78,34 22,34" stroke="currentColor" strokeWidth="2.2" opacity="0.9" />
              <circle cx="50" cy="50" r="18" stroke="currentColor" strokeWidth="1.8" strokeDasharray="3 3" opacity="0.75" />
              <line x1="50" y1="18" x2="50" y2="82" stroke="currentColor" strokeWidth="1.4" opacity="0.55" />
              <line x1="22" y1="34" x2="78" y2="66" stroke="currentColor" strokeWidth="1.4" opacity="0.55" />
              <line x1="22" y1="66" x2="78" y2="34" stroke="currentColor" strokeWidth="1.4" opacity="0.55" />
            </>
          )}

          {meshType === 1 && (
            // Seed of Life (6 Intersecting Arc Petals)
            <>
              <circle cx="50" cy="50" r="16" stroke="currentColor" strokeWidth="2.2" opacity="0.85" />
              <path d="M50,34 A16,16 0 0,0 50,66 A16,16 0 0,0 50,34" stroke="currentColor" strokeWidth="2.0" opacity="0.7" />
              <path d="M36,42 A16,16 0 0,0 64,58 A16,16 0 0,0 36,42" stroke="currentColor" strokeWidth="2.0" opacity="0.7" />
              <path d="M36,58 A16,16 0 0,0 64,42 A16,16 0 0,0 36,58" stroke="currentColor" strokeWidth="2.0" opacity="0.7" />
              <circle cx="50" cy="50" r="26" stroke="currentColor" strokeWidth="1.8" strokeDasharray="4 2" opacity="0.65" />
            </>
          )}

          {meshType === 2 && (
            // Metatron Crystalline Cross & Diagonals
            <>
              <line x1="20" y1="20" x2="80" y2="80" stroke="currentColor" strokeWidth="1.8" opacity="0.7" />
              <line x1="20" y1="80" x2="80" y2="20" stroke="currentColor" strokeWidth="1.8" opacity="0.7" />
              <line x1="50" y1="16" x2="50" y2="84" stroke="currentColor" strokeWidth="1.8" opacity="0.7" />
              <line x1="16" y1="50" x2="84" y2="50" stroke="currentColor" strokeWidth="1.8" opacity="0.7" />
              <polygon points="50,24 76,50 50,76 24,50" stroke="currentColor" strokeWidth="2.2" opacity="0.85" />
              <circle cx="50" cy="50" r="20" stroke="currentColor" strokeWidth="1.8" strokeDasharray="3 3" opacity="0.65" />
            </>
          )}

          {meshType === 3 && (
            // Concentric Labyrinth / Octagram Chords
            <>
              <polygon points="26,26 74,26 74,74 26,74" stroke="currentColor" strokeWidth="2.2" opacity="0.85" />
              <polygon points="50,16 84,50 50,84 16,50" stroke="currentColor" strokeWidth="2.2" opacity="0.85" />
              <circle cx="50" cy="50" r="22" stroke="currentColor" strokeWidth="2.0" opacity="0.75" />
              <circle cx="50" cy="50" r="14" stroke="currentColor" strokeWidth="1.8" strokeDasharray="3 2" opacity="0.65" />
              <line x1="26" y1="50" x2="74" y2="50" stroke="currentColor" strokeWidth="1.4" opacity="0.5" />
              <line x1="50" y1="26" x2="50" y2="74" stroke="currentColor" strokeWidth="1.4" opacity="0.5" />
            </>
          )}
        </g>

        {/* 3. CORE GLYPH */}
        {coreType === 0 && (
          // Concentric Cosmic Rings & Focal Spark
          <g>
            <circle cx="50" cy="50" r="13" stroke="currentColor" strokeWidth="2.4" opacity="0.95" />
            <circle cx="50" cy="50" r="8" stroke="currentColor" strokeWidth="2.0" strokeDasharray="3 2" opacity="0.9" />
            <circle cx="50" cy="50" r="4" fill="currentColor" opacity="0.95" stroke="none" />
            <circle cx="50" cy="50" r="1.8" fill="#ffffff" stroke="none" />
          </g>
        )}

        {coreType === 1 && (
          // Mystical Crescent Moon & Star Spark
          <g>
            <path
              d="M50,37 A13,13 0 0,0 50,63 A10,10 0 0,1 50,37 Z"
              fill="currentColor"
              fillOpacity="0.35"
              stroke="currentColor"
              strokeWidth="2.2"
            />
            {/* Inner 4-point star */}
            <path
              d="M54,50 L56,46 L57,50 L61,51 L57,52 L56,56 L55,52 L51,51 Z"
              fill="currentColor"
              stroke="none"
              opacity="1"
            />
          </g>
        )}

        {coreType === 2 && (
          // Sacred All-Seeing Eye of Providence
          <g>
            <path
              d="M35,50 Q50,37 65,50 Q50,63 35,50 Z"
              stroke="currentColor"
              strokeWidth="2.4"
              fill="currentColor"
              fillOpacity="0.25"
            />
            <circle cx="50" cy="50" r="6" stroke="currentColor" strokeWidth="2.0" />
            <circle cx="50" cy="50" r="3" fill="currentColor" stroke="none" />
            <circle cx="51.2" cy="49" r="1" fill="#ffffff" stroke="none" />
            {/* Radiant eyelid eyelashes */}
            <line x1="50" y1="33" x2="50" y2="36" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <line x1="42" y1="36" x2="44" y2="39" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <line x1="58" y1="36" x2="56" y2="39" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </g>
        )}

        {coreType === 3 && (
          // Radiant Sunburst / Energy Rays
          <g>
            <circle cx="50" cy="50" r="6" stroke="currentColor" strokeWidth="2.4" opacity="1" />
            <circle cx="50" cy="50" r="3" fill="currentColor" stroke="none" />
            {/* 8 Radial beams */}
            <line x1="50" y1="42" x2="50" y2="34" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            <line x1="50" y1="58" x2="50" y2="66" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            <line x1="42" y1="50" x2="34" y2="50" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            <line x1="58" y1="50" x2="66" y2="50" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            <line x1="44" y1="44" x2="38" y2="38" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <line x1="56" y1="56" x2="62" y2="62" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <line x1="44" y1="56" x2="38" y2="62" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <line x1="56" y1="44" x2="62" y2="38" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </g>
        )}

        {/* 4. SATELLITE NODES */}
        <g>
          {satellites.map((sat, idx) => (
            <React.Fragment key={idx}>
              <circle
                cx={sat.x}
                cy={sat.y}
                r={sat.r}
                fill={sat.filled ? 'currentColor' : '#0a0a0f'}
                stroke="currentColor"
                strokeWidth="2.0"
                opacity="0.95"
              />
              <circle
                cx={sat.x}
                cy={sat.y}
                r={sat.r + 2.0}
                stroke="currentColor"
                strokeWidth="1.0"
                strokeDasharray="2 2"
                opacity="0.65"
              />
            </React.Fragment>
          ))}
        </g>
      </g>
    </svg>
  );
}
