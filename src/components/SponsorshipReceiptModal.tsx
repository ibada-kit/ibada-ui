import React, { useState } from 'react';
import { X, Copy, Check, Share2, Building2, CheckCircle2, Clock, Bookmark, CreditCard, Sparkles } from 'lucide-react';
import type { SponsorshipRecord } from '../types';

interface SponsorshipReceiptModalProps {
  sponsorship: SponsorshipRecord;
  onClose: () => void;
  onOpenPayBalance?: (sponsorship: SponsorshipRecord) => void;
}

export const SponsorshipReceiptModal: React.FC<SponsorshipReceiptModalProps> = ({
  sponsorship,
  onClose,
  onOpenPayBalance
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyToken = () => {
    navigator.clipboard.writeText(sponsorship.receiptToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const cleanPhone = (sponsorship.mobileNumber || '').replace(/\D/g, '');
  const rawItems = sponsorship.items || (() => {
    if (sponsorship.itemsJson) {
      try {
        return JSON.parse(sponsorship.itemsJson);
      } catch {
        return null;
      }
    }
    return null;
  })();

  const parsedItems = Array.isArray(rawItems) && rawItems.length > 0
    ? rawItems.map((it: any) => ({
        itemId: it.itemId || it.ItemId || '',
        name: it.name || it.Name || 'Sponsored Package',
        unitPrice: Number(it.unitPrice ?? it.UnitPrice) || 0,
        quantity: Number(it.quantity ?? it.Quantity) || 1,
        subtotal: Number(it.subtotal ?? it.Subtotal) || ((Number(it.quantity ?? it.Quantity) || 1) * (Number(it.unitPrice ?? it.UnitPrice) || 0))
      }))
    : null;

  const itemsDescription = parsedItems && parsedItems.length > 0
    ? parsedItems.map((it) => `${it.quantity}x ${it.name}`).join(', ')
    : `${sponsorship.quantity}x ${sponsorship.itemName}`;

  const posterUrl = `${window.location.origin}/poster?token=${encodeURIComponent(sponsorship.receiptToken)}&name=${encodeURIComponent(sponsorship.donorName)}&type=sponsorship&item=${encodeURIComponent(itemsDescription)}&amount=${sponsorship.totalAmount}&status=${encodeURIComponent(sponsorship.paymentStatus)}&panchayath=${encodeURIComponent(sponsorship.panchayath || 'Madavoor')}`;

  const shareMessage = `*Ibada Kit Challenge — Sponsorship Receipt*%0A%0A` +
    `Dear *${sponsorship.donorName}*,%0A` +
    `Thank you for your generous sponsorship of *${itemsDescription}* to the Ibada Kit Challenge.%0A%0A` +
    `• *Receipt Token:* ${sponsorship.receiptToken}%0A` +
    `• *Total Committed:* ₹${sponsorship.totalAmount.toLocaleString('en-IN')}%0A` +
    `• *Amount Paid:* ₹${sponsorship.amountPaid.toLocaleString('en-IN')}%0A` +
    `• *Balance Remaining:* ₹${sponsorship.balanceAmount.toLocaleString('en-IN')}%0A` +
    `• *Status:* ${sponsorship.paymentStatus}%0A` +
    `• *Collected By:* ${sponsorship.collectedByName || 'Field Coordinator'}%0A%0A` +
    `📸 *Create Your Supporter Poster:*%0A${posterUrl}%0A%0A` +
    `_May Allah reward your contribution manifold!_`;

  const waUrl = `https://wa.me/${cleanPhone}?text=${shareMessage}`;

  const getStatusBadge = () => {
    switch (sponsorship.paymentStatus) {
      case 'Completed':
        return (
          <span style={{
            background: '#EBF7EE',
            color: '#008A2E',
            border: '1px solid #A5D6B8',
            fontSize: '0.78rem',
            fontWeight: 800,
            padding: '4px 10px',
            borderRadius: 9999,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5
          }}>
            <CheckCircle2 size={14} /> Fully Paid
          </span>
        );
      case 'Partial':
        return (
          <span style={{
            background: '#FEF3C7',
            color: '#B45309',
            border: '1px solid #FCD34D',
            fontSize: '0.78rem',
            fontWeight: 800,
            padding: '4px 10px',
            borderRadius: 9999,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5
          }}>
            <Clock size={14} /> Advance Paid (₹{sponsorship.balanceAmount.toLocaleString('en-IN')} pending)
          </span>
        );
      default:
        return (
          <span style={{
            background: '#EDF4FA',
            color: '#2C82C9',
            border: '1px solid #B8D4EE',
            fontSize: '0.78rem',
            fontWeight: 800,
            padding: '4px 10px',
            borderRadius: 9999,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5
          }}>
            <Bookmark size={14} /> Reserved / Booked
          </span>
        );
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 'min(540px, 95vw)',
          width: '100%',
          margin: '0 auto',
          padding: 0,
          maxHeight: 'min(90dvh, 850px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header Ribbon (Pinned) */}
        <div style={{
          background: 'linear-gradient(135deg, #008A2E 0%, #2C82C9 100%)',
          color: '#FFFFFF',
          padding: '18px clamp(16px, 4vw, 24px)',
          position: 'relative',
          flexShrink: 0
        }}>
          <button
            onClick={onClose}
            className="btn-icon"
            style={{
              position: 'absolute',
              top: 14,
              right: 14,
              background: 'rgba(255,255,255,0.15)',
              color: '#FFFFFF',
              border: 'none',
              width: 32,
              height: 32
            }}
          >
            <X size={16} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Building2 size={24} />
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800, opacity: 0.9 }}>
              Ibada Kit Challenge • Official Sponsorship Receipt
            </span>
          </div>

          <h3 style={{ fontSize: '1.35rem', fontWeight: 900, margin: 0 }}>
            {sponsorship.donorName}
          </h3>
          {sponsorship.contactPerson && (
            <span style={{ fontSize: '0.82rem', opacity: 0.9 }}>
              Attn: {sponsorship.contactPerson}
            </span>
          )}
        </div>

        {/* Receipt Content (Scrollable Container) */}
        <div style={{
          padding: '18px clamp(14px, 4vw, 24px) max(20px, env(safe-area-inset-bottom))',
          overflowY: 'auto',
          flex: 1,
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain'
        }}>
          {/* Token Card */}
          <div style={{
            background: '#F8FAFC',
            border: '1px dashed #CBD5E1',
            borderRadius: 'var(--radius-lg)',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 18
          }}>
            <div>
              <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 700, color: '#64748B' }}>
                Receipt Token
              </span>
              <div style={{ fontSize: '1.2rem', fontFamily: 'monospace', fontWeight: 900, color: '#2C82C9' }}>
                {sponsorship.receiptToken}
              </div>
            </div>

            <button
              onClick={handleCopyToken}
              className="btn-secondary"
              style={{
                padding: '6px 12px',
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                gap: 5
              }}
            >
              {copied ? <Check size={14} color="#008A2E" /> : <Copy size={14} />}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>

          {/* Status & Package Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <span style={{ fontSize: '0.7rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>
                Payment Status
              </span>
              <div style={{ marginTop: 3 }}>
                {getStatusBadge()}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.7rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>
                Payment Term
              </span>
              <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0F172A' }}>
                {sponsorship.paymentOption} ({sponsorship.paymentMode || 'Cash'})
              </span>
            </div>
          </div>

          {/* Line Items Box */}
          <div style={{
            borderTop: '1px solid #E2E8F0',
            borderBottom: '1px solid #E2E8F0',
            padding: '14px 0',
            marginBottom: 16
          }}>
            {parsedItems && parsedItems.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Sponsored Items ({parsedItems.length} {parsedItems.length === 1 ? 'item' : 'items'} • {sponsorship.quantity} total units)
                </span>
                {parsedItems.map((item: any, idx: number) => (
                  <div key={item.itemId || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.88rem', display: 'block' }}>
                        {item.name}
                      </span>
                      <span style={{ fontSize: '0.74rem', color: '#64748B' }}>
                        {item.quantity} {item.quantity === 1 ? 'unit' : 'units'} × ₹{item.unitPrice.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <span style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.92rem' }}>
                      ₹{item.subtotal.toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px dashed #CBD5E1', marginTop: 4 }}>
                  <span style={{ fontWeight: 800, color: '#334155', fontSize: '0.86rem' }}>Total Committed:</span>
                  <span style={{ fontWeight: 900, color: '#0F172A', fontSize: '1.05rem' }}>₹{sponsorship.totalAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <div>
                  <span style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.94rem' }}>
                    {sponsorship.itemName}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'block' }}>
                    Quantity: {sponsorship.quantity} × ₹{sponsorship.itemPrice.toLocaleString('en-IN')}
                  </span>
                </div>
                <span style={{ fontWeight: 900, color: '#0F172A', fontSize: '1.05rem' }}>
                  ₹{sponsorship.totalAmount.toLocaleString('en-IN')}
                </span>
              </div>
            )}

            {/* Financial summary breakdown */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', marginTop: 10, color: '#475569' }}>
              <span>Amount Paid:</span>
              <span style={{ fontWeight: 800, color: '#008A2E' }}>
                ₹{sponsorship.amountPaid.toLocaleString('en-IN')}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', marginTop: 4, color: '#475569' }}>
              <span>Balance Pending:</span>
              <span style={{ fontWeight: 800, color: sponsorship.balanceAmount > 0 ? '#B91C1C' : '#64748B' }}>
                ₹{sponsorship.balanceAmount.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Collector & Timestamp info */}
          <div style={{ fontSize: '0.76rem', color: '#64748B', marginBottom: 20 }}>
            <div>Collected By: <strong>{sponsorship.collectedByName}</strong> ({sponsorship.collectedByRole || 'Coordinator'})</div>
            <div>Mobile / WhatsApp: {sponsorship.mobileNumber}</div>
            <div>Panchayath: {sponsorship.panchayath} • Ward {sponsorship.wardNumber}</div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
              style={{
                flex: '1 1 180px',
                minHeight: 44,
                padding: '12px 16px',
                background: '#25D366',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                textDecoration: 'none',
                fontWeight: 800,
                fontSize: '0.92rem',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 2px 6px rgba(37, 211, 102, 0.25)'
              }}
            >
              <Share2 size={18} />
              <span>Share via WhatsApp</span>
            </a>

            {sponsorship.balanceAmount > 0 && onOpenPayBalance && (
              <button
                onClick={() => {
                  onClose();
                  onOpenPayBalance(sponsorship);
                }}
                className="btn-primary"
                style={{
                  flex: '1 1 140px',
                  minHeight: 44,
                  padding: '12px 16px',
                  background: '#2C82C9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  fontWeight: 800,
                  fontSize: '0.92rem',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: '0 2px 6px rgba(44, 130, 201, 0.25)'
                }}
              >
                <CreditCard size={18} />
                <span>Pay Balance</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="btn-secondary"
              style={{
                flex: '0 0 auto',
                minHeight: 44,
                padding: '12px 20px',
                fontWeight: 700,
                fontSize: '0.92rem',
                borderRadius: 'var(--radius-md)'
              }}
            >
              Close
            </button>
          </div>

          {/* Direct link to Create Supporter Poster */}
          <a
            href={posterUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              marginTop: 10,
              width: '100%',
              minHeight: 42,
              padding: '10px 14px',
              background: '#EDF4FA',
              color: '#2C82C9',
              border: '1px solid #B8D4EE',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '0.86rem',
              transition: 'all 0.15s ease',
              boxSizing: 'border-box'
            }}
          >
            <Sparkles size={16} color="#D97706" />
            <span>Create Sponsor Supporter Poster</span>
          </a>
        </div>
      </div>
    </div>
  );
};
