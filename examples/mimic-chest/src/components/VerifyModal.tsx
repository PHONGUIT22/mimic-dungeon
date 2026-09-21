import { useState, useCallback } from 'react';
import { formatUnits } from 'viem';
import { type HistoryItem, PAYTABLE, getCardForOutcome } from '../lib/mimic';
import {
  ShieldIcon,
  CloseIcon,
  CheckIcon,
  CopyIcon,
  TierVoidIcon,
  TierSilverIcon,
  TierGoldIcon,
  TierDestinyIcon,
} from './Icons';

export interface VerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: HistoryItem | null;
  decimals?: number;
  symbol?: string;
}

function formatTokenAmount(amount: bigint, decimals: number): string {
  const isNegative = amount < 0n;
  const abs = isNegative ? -amount : amount;
  const raw = formatUnits(abs, decimals);
  const [intPart, decPart = ''] = raw.split('.');
  const formattedDec = (decPart.slice(0, 4) + '00').slice(0, 2);
  return `${isNegative ? '-' : ''}${intPart}.${formattedDec}`;
}

export function VerifyModal({
  isOpen,
  onClose,
  item,
  decimals = 18,
  symbol = 'TEST',
}: VerifyModalProps) {
  const [copiedSeed, setCopiedSeed] = useState(false);
  const [copiedSession, setCopiedSession] = useState(false);

  const handleCopySeed = useCallback(() => {
    if (!item?.outcome.randomness) return;
    navigator.clipboard.writeText(item.outcome.randomness);
    setCopiedSeed(true);
    setTimeout(() => setCopiedSeed(false), 1800);
  }, [item?.outcome.randomness]);

  const handleCopySession = useCallback(() => {
    const sessionStr = item?.sessionId || item?.sessionKey;
    if (!sessionStr) return;
    navigator.clipboard.writeText(sessionStr);
    setCopiedSession(true);
    setTimeout(() => setCopiedSession(false), 1800);
  }, [item?.sessionId, item?.sessionKey]);

  if (!isOpen || !item) return null;

  const { outcome, wager, sessionKey, sessionId, timestamp } = item;
  const card =
    outcome.card ||
    getCardForOutcome(outcome.tierIndex, outcome.roll, wager, outcome.randomness);

  const tierInfo = PAYTABLE[outcome.tierIndex] || PAYTABLE[0];
  const netProfit = outcome.payout - wager;
  const isProfitPositive = netProfit > 0n;
  const isProfitZero = netProfit === 0n;

  const dateStr = timestamp
    ? new Date(timestamp).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : 'Recent Session';

  const truncatedRandomness =
    outcome.randomness && outcome.randomness.length > 20
      ? `${outcome.randomness.slice(0, 10)}...${outcome.randomness.slice(-10)}`
      : outcome.randomness || '0x';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card verify-modal-card"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '560px' }}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldIcon size={20} style={{ color: '#38bdf8' }} />
            <div>
              <h2
                className="font-heading"
                style={{ fontSize: '16px', fontWeight: 800, color: '#fff', letterSpacing: '0.5px' }}
              >
                PROVABLY FAIR VERIFICATION
              </h2>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                ON-CHAIN CRYPTOGRAPHIC PROOF
              </span>
            </div>
          </div>
          <button onClick={onClose} className="modal-close-btn" title="Close">
            <CloseIcon size={14} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ gap: '12px', padding: '12px 0' }}>
          {/* Outcome Hero Banner */}
          <div
            className="verify-hero-banner"
            style={{
              padding: '12px 14px',
              borderRadius: '6px',
              background: 'var(--bg-inset)',
              border: `1px solid ${tierInfo.color}45`,
              boxShadow: `0 0 12px ${tierInfo.color}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '6px',
                  background: '#1a2230',
                  border: `1px solid ${tierInfo.color}60`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: tierInfo.color,
                  flexShrink: 0,
                }}
              >
                {outcome.tierIndex === 3 ? (
                  <TierDestinyIcon size={20} />
                ) : outcome.tierIndex === 2 ? (
                  <TierGoldIcon size={20} />
                ) : outcome.tierIndex === 1 ? (
                  <TierSilverIcon size={20} />
                ) : (
                  <TierVoidIcon size={20} />
                )}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="font-heading" style={{ fontSize: '14px', fontWeight: 800, color: '#fff' }}>
                    {card.name}
                  </span>
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '10px',
                      padding: '1px 5px',
                      borderRadius: '3px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: tierInfo.color,
                      fontWeight: 800,
                    }}
                  >
                    ROMAN {card.roman}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {card.subtitle} • {tierInfo.name}
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: '16px',
                  fontWeight: 900,
                  color: tierInfo.color,
                  display: 'block',
                }}
              >
                {outcome.multiplier > 0 ? `x${outcome.multiplier.toFixed(2)}` : '0.00x'}
              </span>
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: isProfitZero
                    ? 'var(--text-muted)'
                    : isProfitPositive
                      ? 'var(--accent-success)'
                      : 'var(--accent-danger)',
                }}
              >
                {isProfitPositive ? '+' : ''}
                {formatTokenAmount(netProfit, decimals)} {symbol}
              </span>
            </div>
          </div>

          {/* Financials & Session Summary */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '6px',
            }}
          >
            <div className="verify-stat-tile">
              <span className="verify-tile-title">Wager</span>
              <span className="verify-tile-value">
                {formatTokenAmount(wager, decimals)} {symbol}
              </span>
            </div>
            <div className="verify-stat-tile">
              <span className="verify-tile-title">Payout</span>
              <span
                className="verify-tile-value"
                style={{ color: outcome.won ? 'var(--accent-success)' : 'var(--text-secondary)' }}
              >
                {formatTokenAmount(outcome.payout, decimals)} {symbol}
              </span>
            </div>
            <div className="verify-stat-tile">
              <span className="verify-tile-title">Timestamp</span>
              <span className="verify-tile-value" style={{ fontSize: '10px' }}>
                {dateStr}
              </span>
            </div>
          </div>

          {/* VRF Randomness Seed Section */}
          <div
            style={{
              background: 'var(--bg-inset)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'monospace', fontSize: '10px', fontWeight: 800, color: 'var(--accent-tech)' }}>
                VRF RANDOMNESS SEED (BYTES32)
              </span>
              <span style={{ fontFamily: 'monospace', fontSize: '9px', color: 'var(--text-muted)' }}>
                Direct from Pyth / Chainlink VRF
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#0d1219',
                border: '1px solid var(--border-subtle)',
                borderRadius: '4px',
                padding: '6px 10px',
                gap: '8px',
              }}
            >
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  color: '#e2e8f0',
                  wordBreak: 'break-all',
                }}
                title={outcome.randomness}
              >
                {truncatedRandomness}
              </span>
              <button
                type="button"
                onClick={handleCopySeed}
                className="btn-copy"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px',
                  borderRadius: '3px',
                  background: copiedSeed ? 'var(--accent-success)' : '#212b39',
                  border: '1px solid var(--border-medium)',
                  color: copiedSeed ? '#000' : '#fff',
                  fontFamily: 'monospace',
                  fontSize: '10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'all 0.15s',
                }}
              >
                {copiedSeed ? (
                  <>
                    <CheckIcon size={10} /> COPIED
                  </>
                ) : (
                  <>
                    <CopyIcon size={10} /> COPY
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Rejection Sampling Proof & Paytable Brackets */}
          <div
            style={{
              background: 'var(--bg-inset)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontFamily: 'monospace', fontSize: '10px', fontWeight: 800, color: 'var(--accent-tech)' }}>
                  REJECTION SAMPLING PROOF
                </span>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '9px',
                    padding: '1px 5px',
                    borderRadius: '3px',
                    background: 'rgba(56, 189, 248, 0.15)',
                    color: 'var(--accent-tech)',
                    fontWeight: 700,
                  }}
                >
                  SAMPLE_REJECT = 200
                </span>
              </div>
              <div
                style={{
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  fontWeight: 900,
                  color: tierInfo.color,
                }}
              >
                ROLL: {outcome.roll} / 100
              </div>
            </div>

            {/* 4 Paytable Brackets with Active Highlight */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {[
                { range: '[00 - 49]', prob: '50.0%', tier: '0.00× (The Void)', tierIdx: 0, color: '#ef4444' },
                { range: '[50 - 79]', prob: '30.0%', tier: '1.20× (Silver Rune)', tierIdx: 1, color: '#cbd5e1' },
                { range: '[80 - 95]', prob: '16.0%', tier: '2.50× (Golden Sun)', tierIdx: 2, color: '#f59e0b' },
                { range: '[96 - 99]', prob: '04.0%', tier: '5.00× (Wheel of Destiny)', tierIdx: 3, color: '#c084fc' },
              ].map(bracket => {
                const isMatched = outcome.tierIndex === bracket.tierIdx;
                return (
                  <div
                    key={bracket.range}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '4px 8px',
                      borderRadius: '3px',
                      background: isMatched ? 'rgba(56, 189, 248, 0.12)' : 'rgba(0, 0, 0, 0.25)',
                      border: isMatched ? `1px solid ${bracket.color}` : '1px solid transparent',
                      fontSize: '10px',
                      fontFamily: 'monospace',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: isMatched ? '#fff' : 'var(--text-muted)', fontWeight: isMatched ? 800 : 500 }}>
                        {bracket.range}
                      </span>
                      <span style={{ color: bracket.color, fontWeight: isMatched ? 800 : 600 }}>
                        {bracket.tier}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{bracket.prob}</span>
                      {isMatched && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            color: 'var(--accent-action)',
                            fontWeight: 900,
                            fontSize: '9px',
                            padding: '1px 5px',
                            background: 'rgba(0, 231, 1, 0.15)',
                            borderRadius: '2px',
                          }}
                        >
                          <CheckIcon size={10} /> MATCH
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Session Identification */}
          {(sessionId || sessionKey) && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 10px',
                borderRadius: '4px',
                background: 'var(--bg-inset)',
                border: '1px solid var(--border-subtle)',
                fontSize: '10px',
                fontFamily: 'monospace',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                <span style={{ color: 'var(--text-muted)' }}>Session:</span>
                <span
                  style={{ color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}
                  title={sessionId || sessionKey}
                >
                  {sessionId || sessionKey}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopySession}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  padding: '2px 6px',
                  borderRadius: '2px',
                  background: copiedSession ? 'var(--accent-success)' : '#212b39',
                  border: '1px solid var(--border-medium)',
                  color: copiedSession ? '#000' : '#fff',
                  fontSize: '9px',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                {copiedSession ? <CheckIcon size={10} /> : <CopyIcon size={10} />}
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: '10px',
                fontWeight: 800,
                color: 'var(--accent-action)',
                background: 'rgba(0, 231, 1, 0.1)',
                border: '1px solid rgba(0, 231, 1, 0.3)',
                padding: '3px 8px',
                borderRadius: '3px',
                letterSpacing: '0.5px',
              }}
            >
              PROVABLY FAIR CERTIFIED ON-CHAIN
            </span>
          </div>

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
