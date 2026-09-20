import React, { useState } from 'react';
import type { Donation } from '../types';
import { CheckCircle, Share2, X, ShieldCheck, Copy, Check, Sparkles, Download } from 'lucide-react';
import { shareReceiptToWhatsApp, downloadReceiptPoster, type ReceiptPosterData } from '../utils/posterShare';

interface ReceiptModalProps {
  donation: Donation | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ donation, onClose }) => {
  if (!donation) return null;

  const [copied, setCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  const handleCopyToken = () => {
    if (donation.receiptToken) {
      const copyContent = donation.serialNumber
        ? `Token: ${donation.receiptToken} | Serial: #${donation.serialNumber}`
        : donation.receiptToken;
      navigator.clipboard.writeText(copyContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const rawPhone = (donation.whatsAppNumber || '').replace(/\D/g, '');
  const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;

  const posterUrl = `${window.location.origin}/poster?token=${encodeURIComponent(donation.receiptToken)}&name=${encodeURIComponent(donation.donorName)}&type=kit&kits=${donation.kitCount}&amount=${donation.totalAmount}&ward=${encodeURIComponent(donation.wardNumber?.toString() || '')}&panchayath=${encodeURIComponent(donation.panchayath || 'Madavoor')}${donation.serialNumber ? `&serial=${encodeURIComponent(donation.serialNumber.toString())}` : ''}`;

  const messageText =
    `*Ibada Kit Challenge — Kit Donation Receipt*\n\n` +
    `Assalamu Alaikum *${donation.donorName}*,\n` +
    `Thank you for your generous contribution of *${donation.kitCount} ${donation.kitCount === 1 ? 'Kit' : 'Kits'}* to the Ibada Kit Challenge! 🤲\n\n` +
    `• *Receipt Token:* ${donation.receiptToken}\n` +
    (donation.serialNumber ? `• *Serial No:* #${donation.serialNumber}\n` : '') +
    `• *Kits Contributed:* ${donation.kitCount}\n` +
    `• *Total Amount:* ₹${donation.totalAmount.toLocaleString('en-IN')}\n` +
    `• *Location:* Ward ${donation.wardNumber}, ${donation.panchayath}\n` +
    `• *Collected By:* ${donation.collectedByName || 'Volunteer'} (${donation.collectedByRole || 'Volunteer'})\n` +
    `• *Date:* ${new Date(donation.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}\n\n` +
    `📸 *Create Your Supporter Poster:*\n${posterUrl}\n\n` +
    `_May Allah reward your contribution manifold!_`;

  const waUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(messageText)}`;

  const posterData: ReceiptPosterData = {
    token: donation.receiptToken,
    serialNumber: donation.serialNumber,
    donorName: donation.donorName,
    type: 'kit',
    itemsDescription: `${donation.kitCount} ${donation.kitCount === 1 ? 'Ibada Kit' : 'Ibada Kits'}`,
    amount: donation.totalAmount,
    amountPaid: donation.totalAmount,
    balanceAmount: 0,
    paymentStatus: 'Completed',
    wardNumber: donation.wardNumber,
    panchayath: donation.panchayath || 'Madavoor',
    collectedByName: donation.collectedByName
  };

  const handleShareWhatsApp = async () => {
    try {
      setIsSharing(true);
      setShareFeedback(null);
      const res = await shareReceiptToWhatsApp(posterData, messageText, cleanPhone);
      if (res.method === 'download_and_whatsapp') {
        setShareFeedback('Receipt poster image downloaded! Opening WhatsApp chat...');
        setTimeout(() => setShareFeedback(null), 4000);
      }
    } catch {
      window.open(waUrl, '_blank');
    } finally {
      setIsSharing(false);
    }
  };

  const handleDownloadPoster = async () => {
    try {
      setIsSharing(true);
      await downloadReceiptPoster(posterData);
      setShareFeedback('Official Receipt Poster downloaded successfully!');
      setTimeout(() => setShareFeedback(null), 3500);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 'min(480px, 95vw)',
          width: '100%',
          margin: '0 auto',
          padding: 0,
          maxHeight: 'min(90dvh, 850px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
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

        {/* Badge Card Container (Scrollable) */}
        <div style={{
          padding: '20px clamp(16px, 4vw, 24px) max(20px, env(safe-area-inset-bottom))',
          overflowY: 'auto',
          flex: 1,
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain'
        }}>
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

            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#008A2E', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6 }}>
              Ibada Kit Challenge
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

            {/* Receipt Token & Serial with Copy Button */}
            <div style={{
              background: '#F1F5F9',
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              border: '1px solid var(--border-subtle)',
              marginBottom: 14,
              gap: 10
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'left' }}>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: 700 }}>
                    Receipt Token
                  </span>
                  <strong style={{ color: '#0F172A', letterSpacing: '0.05em', fontFamily: 'monospace', fontSize: '0.9rem' }}>
                    {donation.receiptToken}
                  </strong>
                </div>
                {donation.serialNumber && (
                  <div style={{ textAlign: 'left', borderLeft: '1px solid #CBD5E1', paddingLeft: 14 }}>
                    <span style={{ fontSize: '0.68rem', color: '#008A2E', textTransform: 'uppercase', display: 'block', fontWeight: 700 }}>
                      Serial No
                    </span>
                    <strong style={{ color: '#008A2E', letterSpacing: '0.05em', fontFamily: 'monospace', fontSize: '0.95rem' }}>
                      #{donation.serialNumber}
                    </strong>
                  </div>
                )}
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
                  flexShrink: 0,
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

          {/* Action Feedback if downloaded */}
          {shareFeedback && (
            <div style={{
              background: '#EBF7EE',
              color: '#008A2E',
              border: '1px solid #A5D6B8',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 12px',
              fontSize: '0.8rem',
              fontWeight: 700,
              marginTop: 12,
              textAlign: 'center'
            }}>
              {shareFeedback}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
            <button
              type="button"
              onClick={handleShareWhatsApp}
              disabled={isSharing}
              className="btn-primary"
              style={{
                flex: '1 1 180px',
                minHeight: 44,
                padding: '12px 16px',
                background: '#25D366',
                border: 'none',
                cursor: isSharing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontWeight: 800,
                color: '#FFFFFF',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 2px 6px rgba(37, 211, 102, 0.25)'
              }}
            >
              <Share2 size={18} />
              <span>{isSharing ? 'Preparing...' : 'Share via WhatsApp'}</span>
            </button>

            {/* <button
              type="button"
              onClick={handleDownloadPoster}
              disabled={isSharing}
              title="Download Receipt & Supporter Poster Image"
              style={{
                flex: '0 0 auto',
                minHeight: 44,
                padding: '12px 16px',
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                fontWeight: 700,
                fontSize: '0.86rem',
                color: '#334155',
                cursor: isSharing ? 'not-allowed' : 'pointer'
              }}
            >
              <Download size={17} color="#008A2E" />
              <span>Poster Image</span>
            </button> */}

            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              style={{
                flex: '0 0 auto',
                minHeight: 44,
                padding: '12px 18px',
                fontWeight: 700,
                borderRadius: 'var(--radius-md)'
              }}
            >
              Close
            </button>
          </div>

          {/* Direct link to Create Supporter Poster */}
          {/* <a
            href={posterUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              marginTop: 10,
              width: '100%',
              minHeight: 42,
              padding: '10px 14px',
              background: '#F0FDF4',
              color: '#008A2E',
              border: '1px solid #A5D6B8',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '0.84rem',
              transition: 'all 0.15s ease',
              boxSizing: 'border-box'
            }}
          >
            <Sparkles size={16} color="#D97706" />
            <span>Create Donor Supporter Poster</span>
          </a> */}
        </div>
      </div>
    </div>
  );
};
