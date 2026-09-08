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
            background: '#FFFFFF',
            border: '2px solid #A5D6B8',
            borderRadius: 'var(--radius-lg)',
            padding: '28px 20px',
            textAlign: 'center',
            position: 'relative',
            boxShadow: 'var(--shadow-md)'
          }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: '#EBF7F0',
              border: '2px solid #42B06F',
              margin: '0 auto 12px auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CheckCircle size={28} color="#42B06F" />
            </div>

            <span className="badge badge-emerald" style={{ marginBottom: 12 }}>
              Verified Donation Receipt
            </span>

            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, marginTop: 4, marginBottom: 4, color: '#0F172A' }}>
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
              background: '#F8FAFC',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '16px'
            }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: 700 }}>
                  Kits Sponsored
                </span>
                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#42B06F' }}>
                  {donation.kitCount} Kits
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: 700 }}>
                  Total Amount
                </span>
                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#256CAA' }}>
                  ₹{donation.totalAmount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Token details */}
            <div style={{
              background: '#F1F5F9',
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              border: '1px solid var(--border-subtle)'
            }}>
              <span>Receipt Token:</span>
              <strong style={{ color: '#0F172A', letterSpacing: '0.05em' }}>{donation.receiptToken}</strong>
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
                background: '#25D366',
                borderColor: '#20BA5C'
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
