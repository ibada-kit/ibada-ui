import React from 'react';
import type { Donation } from '../types';
import { CheckCircle, Share2, X, ShieldCheck } from 'lucide-react';

interface ReceiptModalProps {
  donation: Donation | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ donation, onClose }) => {
  if (!donation) return null;

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `🎉 Thank you ${donation.donorName} for supporting the Madavoor Relief Drive!\n\n` +
      `📦 Contributed: ${donation.kitCount} Relief Kits (₹${donation.totalAmount.toLocaleString('en-IN')})\n` +
      `🔖 Official Token: ${donation.receiptToken}\n` +
      `📍 Location: Ward ${donation.wardNumber}, ${donation.panchayath}\n\n` +
      `View your digital donor badge at: https://charity.madavoor.app/badge/${donation.receiptToken}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
        {/* Modal Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={20} color="var(--primary)" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Official Digital Receipt</h3>
          </div>
          <button onClick={onClose} className="btn-icon" style={{ width: 32, height: 32 }}>
            <X size={16} />
          </button>
        </div>

        {/* Badge Card Container */}
        <div style={{ padding: '24px' }}>
          <div style={{
            background: 'linear-gradient(145deg, rgba(6, 78, 59, 0.4) 0%, rgba(15, 23, 42, 0.9) 100%)',
            border: '2px solid rgba(16, 185, 129, 0.4)',
            borderRadius: 'var(--radius-lg)',
            padding: '28px 20px',
            textAlign: 'center',
            position: 'relative',
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              margin: '0 auto 12px auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(16, 185, 129, 0.6)'
            }}>
              <CheckCircle size={28} color="#ffffff" />
            </div>

            <span className="badge badge-emerald" style={{ marginBottom: 12 }}>
              Verified Donation Receipt
            </span>

            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, marginTop: 4, marginBottom: 4 }}>
              {donation.donorName}
            </h2>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              Ward {donation.wardNumber} • {donation.panchayath}
            </p>

            {/* Donation Stats Highlights */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
              margin: '20px 0',
              background: 'rgba(255, 255, 255, 0.04)',
              borderRadius: 'var(--radius-md)',
              padding: '16px'
            }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>
                  Kits Sponsored
                </span>
                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary-light)' }}>
                  {donation.kitCount} Kits
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>
                  Total Amount
                </span>
                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-gold)' }}>
                  ₹{donation.totalAmount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Token details */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.3)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              border: '1px dashed rgba(255, 255, 255, 0.15)'
            }}>
              <span>Receipt Token:</span>
              <strong style={{ color: '#ffffff', letterSpacing: '0.05em' }}>{donation.receiptToken}</strong>
            </div>

            <div style={{ marginTop: 12, fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              Recorded by {donation.collectedByName || 'Volunteer'} on{' '}
              {new Date(donation.timestamp).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </div>

          {/* Share Button */}
          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <button
              onClick={handleWhatsAppShare}
              className="btn-primary"
              style={{
                flex: 1,
                background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                boxShadow: '0 4px 14px rgba(37, 211, 102, 0.35)'
              }}
            >
              <Share2 size={16} />
              <span>Share to WhatsApp</span>
            </button>
            <button onClick={onClose} className="btn-secondary">
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
