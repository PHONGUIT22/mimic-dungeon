import { PAYTABLE } from '../lib/mimic';
import {
  ArcanaEyeIcon,
  CloseIcon,
  TierVoidIcon,
  TierSilverIcon,
  TierGoldIcon,
  TierDestinyIcon,
} from './Icons';

export function PaytableModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ArcanaEyeIcon size={20} style={{ color: 'var(--accent-gold)' }} />
            <h2 className="font-heading" style={{ fontSize: '18px', fontWeight: 800, color: '#fff' }}>
              Arcana Fate: Paytable & Rules
            </h2>
          </div>
          <button onClick={onClose} className="modal-close-btn" title="Close">
            <CloseIcon size={14} />
          </button>
        </div>

        <div className="modal-body">
          <p>
            In <strong style={{ color: '#fff' }}>Arcana Fate</strong>, each round draws a mystical fate card resolved instantly on-chain using 32-byte VRF randomness with cryptographic <strong>Rejection Sampling</strong> to guarantee 100% uniform distributions and zero modulo bias.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {PAYTABLE.map(tier => (
              <div
                key={tier.tier}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  border: `1px solid ${tier.color}40`,
                  background: 'var(--bg-inset)',
                  boxShadow: `0 0 12px ${tier.color}15`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '4px',
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: `1px solid ${tier.color}50`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: tier.color,
                    }}
                  >
                    {tier.tierIndex === 3 ? (
                      <TierDestinyIcon size={16} />
                    ) : tier.tierIndex === 2 ? (
                      <TierGoldIcon size={16} />
                    ) : tier.tierIndex === 1 ? (
                      <TierSilverIcon size={16} />
                    ) : (
                      <TierVoidIcon size={16} />
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span className="font-heading" style={{ fontSize: '13px', fontWeight: 800, color: '#fff' }}>
                      {tier.name}
                    </span>
                    <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{tier.description}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '15px', fontWeight: 800, color: tier.color }}>
                    {tier.multiplierText}
                  </span>
                  <span style={{ fontFamily: 'monospace', fontSize: '10.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {tier.probabilityText}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              borderRadius: '6px',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-inset)',
              padding: '10px 14px',
            }}
          >
            <h3 style={{ fontFamily: 'monospace', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent-gold)' }}>
              Theoretical RTP Formula:
            </h3>
            <p style={{ marginTop: '4px', fontFamily: 'monospace', fontSize: '11px', color: '#94a3b8' }}>
              RTP = (50% × 0) + (30% × 1.2) + (16% × 2.5) + (4% × 5.0)
            </p>
            <p style={{ marginTop: '2px', fontFamily: 'monospace', fontSize: '11px', fontWeight: 700, color: 'var(--accent-success)' }}>
              RTP = 0.00 + 0.36 + 0.40 + 0.20 = 96.00% (Certified)
            </p>
          </div>

          <div
            style={{
              borderRadius: '6px',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-inset)',
              padding: '10px 14px',
              fontSize: '11px',
              color: 'var(--text-muted)',
            }}
          >
            <strong style={{ color: 'var(--text-secondary)' }}>Unbiased Rejection Sampling:</strong> Bytes from VRF are mapped onto [0, 99]. Any byte &ge; 200 is discarded (<span style={{ fontFamily: 'monospace', color: '#f59e0b' }}>SAMPLE_REJECT = 200</span>), ensuring equal 2/200 probability for every integer in [0, 99].
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px' }}>
          <button
            onClick={onClose}
            style={{
              borderRadius: '4px',
              background: '#212b39',
              border: '1px solid var(--border-medium)',
              padding: '8px 18px',
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
