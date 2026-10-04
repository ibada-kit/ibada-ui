import React, { useEffect } from 'react';
import type { Donation } from '../types';
import { X, ShieldCheck } from 'lucide-react';
import { OfficialReceiptSlip } from './OfficialReceiptSlip';

interface ReceiptModalProps {
  donation: Donation | null;
  onClose: () => void;
  onOpenPayBalance?: (donation: Donation) => void;
  onOpenPoster?: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ donation, onClose, onOpenPayBalance, onOpenPoster }) => {
  useEffect(() => {
    if (!donation) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [donation]);

  if (!donation) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 'min(500px, 95vw)',
          width: '100%',
          margin: '0 auto',
          padding: 0,
          maxHeight: 'min(92dvh, 880px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '14px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#FFFFFF'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={20} color="#008A2E" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Official Donation Receipt
            </h3>
          </div>
          <button onClick={onClose} className="btn-icon" style={{ width: 32, height: 32 }} aria-label="Close modal">
            <X size={16} />
          </button>
        </div>

        {/* Modal Body: Renders Official Slip with WhatsApp share & Download actions */}
        <div style={{
          padding: '12px clamp(10px, 2.5vw, 16px) max(16px, env(safe-area-inset-bottom))',
          overflowY: 'auto',
          flex: 1,
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain'
        }}>
          <OfficialReceiptSlip donation={donation} showActions={true} onOpenPayBalance={onOpenPayBalance} onOpenPoster={onOpenPoster} />
        </div>
      </div>
    </div>
  );
};
