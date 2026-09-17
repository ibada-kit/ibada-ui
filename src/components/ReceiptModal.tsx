import React, { useState } from 'react';
import type { Donation } from '../types';
import { CheckCircle, Share2, X, ShieldCheck, Copy, Check } from 'lucide-react';

interface ReceiptModalProps {
  donation: Donation | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ donation, onClose }) => {
  if (!donation) return null;

  const [copied, setCopied] = useState(false);

  const handleCopyToken = () => {
    if (donation.receiptToken) {
      navigator.clipboard.writeText(donation.receiptToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const rawPhone = (donation.whatsAppNumber || '').replace(/\D/g, '');
  const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;

  const shareMessage =
    `*Madavoor Relief Drive — Kit Donation Receipt*%0A%0A` +
    `Assalamu Alaikum *${donation.donorName}*,%0A` +
    `Thank you for your generous contribution of *${donation.kitCount} ${donation.kitCount === 1 ? 'Relief Kit' : 'Relief Kits'}* to the Madavoor Relief Campaign! 🤲%0A%0A` +
    `• *Receipt Token:* ${donation.receiptToken}%0A` +
    `• *Kits Contributed:* ${donation.kitCount}%0A` +
    `• *Total Amount:* ₹${donation.totalAmount.toLocaleString('en-IN')}%0A` +
    `• *Location:* Ward ${donation.wardNumber}, ${donation.panchayath}%0A` +
    `• *Collected By:* ${donation.collectedByName || 'Volunteer'} (${donation.collectedByRole || 'Volunteer'})%0A` +
    `• *Date:* ${new Date(donation.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}%0A%0A` +
    `_May Allah reward your contribution manifold!_`;

  const waUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${shareMessage}`
    : `https://api.whatsapp.com/send?text=${shareMessage}`;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
        {/* Modal Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={20} color="#008A2E" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Official Digital Receipt
            </h3>
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
            padding: '24px 20px',
            textAlign: 'center',
            position: 'relative',
            boxShadow: 'var(--shadow-md)'
          }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: '#EBF7EE',
              border: '2px solid #42B06F',
              margin: '0 auto 12px auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CheckCircle size={28} color="#008A2E" />
            </div>

            <span className="badge badge-emerald" style={{ marginBottom: 12 }}>
              Verified Donation Receipt
            </span>

            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, marginTop: 4, marginBottom: 4, color: '#0F172A' }}>
              {donation.donorName}
            </h2>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: 0 }}>
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
                <span style={{ fontSize: '1.45rem', fontWeight: 800, color: '#008A2E' }}>
                  {donation.kitCount} {donation.kitCount === 1 ? 'Kit' : 'Kits'}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: 700 }}>
                  Total Amount
                </span>
                <span style={{ fontSize: '1.45rem', fontWeight: 800, color: '#2C82C9' }}>
                  ₹{donation.totalAmount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Receipt Token with Copy Button */}
            <div style={{
              background: '#F1F5F9',
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              border: '1px solid var(--border-subtle)',
              marginBottom: 14
            }}>
              <div style={{ textAlign: 'left' }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: 700 }}>
                  Receipt Token
                </span>
                <strong style={{ color: '#0F172A', letterSpacing: '0.05em', fontFamily: 'monospace', fontSize: '0.9rem' }}>
                  {donation.receiptToken}
                </strong>
              </div>
              <button
                type="button"
                onClick={handleCopyToken}
                style={{
                  background: copied ? '#EBF7EE' : '#FFFFFF',
                  color: copied ? '#008A2E' : '#64748B',
                  border: copied ? '1px solid #A5D6B8' : '1px solid #CBD5E1',
                  padding: '5px 10px',
                  borderRadius: 6,
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  transition: 'all 0.15s ease'
                }}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textAlign: 'left', lineHeight: 1.5 }}>
              <div>Recorded By: <strong>{donation.collectedByName || 'Volunteer'}</strong> ({donation.collectedByRole || 'Volunteer'})</div>
              {donation.whatsAppNumber && <div>WhatsApp: <strong>{donation.whatsAppNumber}</strong></div>}
              <div>Date: {new Date(donation.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          </div>

          {/* Action Buttons: WhatsApp Share & Close (Same as Sponsorship) */}
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
              style={{
                flex: 1,
                padding: '12px',
                background: '#25D366',
                borderColor: '#20BA5C',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                textDecoration: 'none',
                fontWeight: 800,
                color: '#FFFFFF'
              }}
            >
              <Share2 size={16} />
              <span>Share via WhatsApp</span>
            </a>
            <button onClick={onClose} className="btn-secondary" style={{ padding: '12px 18px' }}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
