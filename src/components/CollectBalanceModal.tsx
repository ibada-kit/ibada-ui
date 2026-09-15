import React, { useState } from 'react';
import { X, CreditCard, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { sponsorshipsApi } from '../services/api';
import type { SponsorshipRecord, PaymentMode } from '../types';

interface CollectBalanceModalProps {
  sponsorship: SponsorshipRecord;
  onClose: () => void;
  onPaymentRecorded: (updated: SponsorshipRecord) => void;
}

export const CollectBalanceModal: React.FC<CollectBalanceModalProps> = ({
  sponsorship,
  onClose,
  onPaymentRecorded
}) => {
  const [amountToPay, setAmountToPay] = useState<number>(sponsorship.balanceAmount);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash');
  const [transactionReference, setTransactionReference] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (amountToPay <= 0) {
      setError('Payment amount must be greater than ₹0.');
      return;
    }

    if (amountToPay > sponsorship.balanceAmount) {
      setError(`Payment amount cannot exceed remaining balance (₹${sponsorship.balanceAmount.toLocaleString('en-IN')}).`);
      return;
    }

    try {
      setSubmitting(true);
      const updated = await sponsorshipsApi.updatePayment(
        sponsorship.receiptToken,
        {
          amountToPay,
          paymentMode,
          transactionReference: transactionReference.trim() || undefined,
          notes: notes.trim() || undefined
        },
        sponsorship.panchayath
      );

      onPaymentRecorded(updated);
    } catch (err: any) {
      setError(err.message || 'Failed to update payment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1150 }}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 'min(480px, 95vw)', width: '100%', margin: '0 auto', padding: 0 }}>
        {/* Header */}
        <div style={{
          padding: '18px 22px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: '#FEF3C7',
              border: '1px solid #FCD34D',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#B45309'
            }}>
              <CreditCard size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Collect Outstanding Balance
              </h3>
              <span style={{ fontSize: '0.74rem', color: '#64748B' }}>
                Receipt No: <strong style={{ fontFamily: 'monospace' }}>{sponsorship.receiptToken}</strong>
              </span>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon" style={{ width: 32, height: 32 }}>
            <X size={16} />
          </button>
        </div>

        {/* Content & Form */}
        <form onSubmit={handleSubmit} style={{ padding: '22px' }}>
          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              color: '#B91C1C',
              fontSize: '0.84rem',
              fontWeight: 600,
              marginBottom: 16
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Firm & Balance Info Card */}
          <div style={{
            background: '#FFFBEB',
            border: '1px solid #FDE68A',
            borderRadius: 'var(--radius-lg)',
            padding: '14px 16px',
            marginBottom: 18
          }}>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#92400E', fontWeight: 800 }}>
              {sponsorship.donorName}
            </span>
            <div style={{ fontSize: '0.85rem', color: '#78350F', marginTop: 2 }}>
              {sponsorship.quantity}x {sponsorship.itemName}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, borderTop: '1px dashed #FCD34D', paddingTop: 10 }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#78350F' }}>Total / Paid</span>
                <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#78350F' }}>
                  ₹{sponsorship.totalAmount.toLocaleString('en-IN')} / ₹{sponsorship.amountPaid.toLocaleString('en-IN')}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.7rem', color: '#92400E', fontWeight: 800, textTransform: 'uppercase' }}>
                  Pending Balance
                </span>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#B91C1C' }}>
                  ₹{sponsorship.balanceAmount.toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          </div>

          {/* Amount to Pay Input */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase' }}>
                Amount to Collect (₹) *
              </label>
              <button
                type="button"
                onClick={() => setAmountToPay(sponsorship.balanceAmount)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2C82C9',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                Pay Full Remaining
              </button>
            </div>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              required
              className="input-field"
              value={amountToPay}
              onChange={(e) => {
                const clean = e.target.value.replace(/\D/g, '');
                setAmountToPay(clean === '' ? 0 : Math.min(sponsorship.balanceAmount, parseInt(clean, 10)));
              }}
              onKeyDown={(e) => {
                if (['.', ',', 'e', 'E', '+', '-'].includes(e.key)) {
                  e.preventDefault();
                }
              }}
              style={{ fontWeight: 800, fontSize: '1.1rem' }}
            />
          </div>

          {/* Payment Mode */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: 6 }}>
              Payment Mode *
            </label>
            <select
              className="input-field"
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
            >
              <option value="Cash">Cash</option>
              <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
              <option value="BankTransfer">Bank Transfer (NEFT / IMPS)</option>
              <option value="Cheque">Cheque</option>
            </select>
          </div>

          {/* Reference */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: 6 }}>
              Transaction Reference / Cheque No (Optional)
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. UPI Reference / Cheque number"
              value={transactionReference}
              onChange={(e) => setTransactionReference(e.target.value)}
            />
          </div>

          {/* Notes / Remarks */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: 6 }}>
              Payment Remarks (Optional)
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Cleared 2nd installment"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Submit Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              style={{ flex: 1, padding: '12px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || amountToPay <= 0 || amountToPay > sponsorship.balanceAmount}
              className="btn-primary"
              style={{
                flex: 2,
                padding: '12px',
                fontWeight: 800,
                background: '#008A2E',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8
              }}
            >
              {submitting ? (
                <RefreshCw size={18} className="animate-spin" />
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  <span>Record ₹{amountToPay.toLocaleString('en-IN')} Payment</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
