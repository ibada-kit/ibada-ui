import React, { useState } from 'react';
import type { Donation, SponsorshipRecord, PaymentOption, PaymentMode } from '../types';
import { donationsApi, getKitUnitPrice } from '../services/api';
import confetti from 'canvas-confetti';
import { X, Heart, RefreshCw, AlertCircle, Sparkles, Building2, CheckCircle, Clock, BookmarkCheck } from 'lucide-react';
import { SponsorshipForm } from './SponsorshipForm';

interface RecordDonationModalProps {
  kitPrice?: number;
  onClose: () => void;
  onDonationRecorded: (donation: Donation) => void;
  onSponsorshipRecorded?: (sponsorship: SponsorshipRecord) => void;
}

export const RecordDonationModal: React.FC<RecordDonationModalProps> = ({
  kitPrice = getKitUnitPrice(),
  onClose,
  onDonationRecorded,
  onSponsorshipRecorded
}) => {
  const [formMode, setFormMode] = useState<'kit' | 'sponsorship'>('kit');
  const [donorName, setDonorName] = useState('');
  const [whatsAppNumber, setWhatsAppNumber] = useState('');
  const [kitCount, setKitCount] = useState<number>(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Payment Terms
  const [paymentOption, setPaymentOption] = useState<PaymentOption>('PayFull');
  const [initialAmountPaid, setInitialAmountPaid] = useState<number>(2 * kitPrice);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash');
  const [transactionReference, setTransactionReference] = useState('');
  const [notes, setNotes] = useState('');
  const [showExtraDetails, setShowExtraDetails] = useState(false);

  const totalAmount = kitCount * kitPrice;
  const balanceAmount = Math.max(0, totalAmount - (initialAmountPaid || 0));

  const handleKitCountChange = (newCount: number) => {
    const clamped = Math.max(1, Math.min(1000, newCount));
    setKitCount(clamped);
    const newTotal = clamped * kitPrice;
    if (paymentOption === 'PayFull') {
      setInitialAmountPaid(newTotal);
    } else if (paymentOption === 'Advance') {
      if (initialAmountPaid > newTotal || initialAmountPaid === 0) {
        setInitialAmountPaid(Math.round(newTotal * 0.5));
      }
    } else if (paymentOption === 'Book') {
      if (initialAmountPaid > newTotal) {
        setInitialAmountPaid(0);
      }
    }
  };

  const handlePaymentOptionChange = (option: PaymentOption) => {
    setPaymentOption(option);
    if (option === 'PayFull') {
      setInitialAmountPaid(totalAmount);
    } else if (option === 'Book') {
      setInitialAmountPaid(0);
    } else if (option === 'Advance') {
      setInitialAmountPaid(Math.round(totalAmount * 0.5));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!donorName.trim()) {
      setError('Please provide the donor name or family name.');
      return;
    }

    const cleanPhone = whatsAppNumber.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Please provide a valid 10-digit WhatsApp number.');
      return;
    }

    if (kitCount < 1) {
      setError('Donation must include at least 1 kit.');
      return;
    }

    if (paymentOption === 'Advance') {
      if (!initialAmountPaid || initialAmountPaid <= 0) {
        setError('Advance payment requires an upfront paid amount greater than ₹0.');
        return;
      }
      if (initialAmountPaid >= totalAmount) {
        setError(`Advance amount (₹${initialAmountPaid.toLocaleString('en-IN')}) cannot be equal to or greater than total (₹${totalAmount.toLocaleString('en-IN')}). Choose "Pay Full" for full payment.`);
        return;
      }
    } else if (paymentOption === 'Book') {
      if (initialAmountPaid > totalAmount) {
        setError(`Booking amount cannot exceed total donation amount (₹${totalAmount.toLocaleString('en-IN')}).`);
        return;
      }
    }

    try {
      setLoading(true);
      const newDonation = await donationsApi.recordDonation({
        donorName: donorName.trim(),
        whatsAppNumber: `+91 ${cleanPhone.slice(-10)}`,
        kitCount,
        totalAmount,
        paymentOption,
        initialAmountPaid: paymentOption === 'PayFull' ? totalAmount : initialAmountPaid,
        paymentMode,
        transactionReference: transactionReference.trim() || undefined,
        notes: notes.trim() || undefined
      });

      // Celebration Confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {
        // ignore if not supported
      }

      onDonationRecorded(newDonation);
    } catch (err: any) {
      setError(err.message || 'Failed to record donation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600, padding: 0 }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px',
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
              background: formMode === 'kit' ? '#EBF7F0' : '#EDF4FA',
              border: formMode === 'kit' ? '1px solid #A5D6B8' : '1px solid #B8D4EE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: formMode === 'kit' ? '#42B06F' : '#2C82C9'
            }}>
              {formMode === 'kit' ? <Heart size={20} /> : <Building2 size={20} />}
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                {formMode === 'kit' ? 'Record Kit Donation' : 'Record Sponsorship'}
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                {formMode === 'kit' ? '₹1,000 per relief food & essential kit' : 'Special sponsorship packages & flexible terms'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon" style={{ width: 32, height: 32 }}>
            <X size={16} />
          </button>
        </div>

        {/* Top Button Switcher: Kit Donation vs Sponsorship */}
        <div style={{ padding: '14px 20px 0 20px' }}>
          <div style={{
            display: 'flex',
            background: '#F1F5F9',
            padding: 4,
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            gap: 6
          }}>
            <button
              id="modal-btn-switch-kit"
              type="button"
              onClick={() => setFormMode('kit')}
              style={{
                flex: 1,
                minWidth: 0,
                padding: '9px clamp(6px, 2vw, 12px)',
                borderRadius: 'var(--radius-md)',
                border: formMode === 'kit' ? '1px solid #A5D6B8' : 'none',
                background: formMode === 'kit' ? '#EBF7EE' : 'transparent',
                color: formMode === 'kit' ? '#008A2E' : '#64748B',
                fontWeight: 800,
                fontSize: 'clamp(0.78rem, 2.5vw, 0.84rem)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap'
              }}
            >
              <Heart size={15} style={{ flexShrink: 0 }} />
              <span>Kit Donation</span>
            </button>

            <button
              id="modal-btn-switch-sponsorship"
              type="button"
              onClick={() => setFormMode('sponsorship')}
              style={{
                flex: 1,
                minWidth: 0,
                padding: '9px clamp(6px, 2vw, 12px)',
                borderRadius: 'var(--radius-md)',
                border: formMode === 'sponsorship' ? '1px solid #B8D4EE' : 'none',
                background: formMode === 'sponsorship' ? '#EDF4FA' : 'transparent',
                color: formMode === 'sponsorship' ? '#2C82C9' : '#64748B',
                fontWeight: 800,
                fontSize: 'clamp(0.78rem, 2.5vw, 0.84rem)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap'
              }}
            >
              <Building2 size={15} style={{ flexShrink: 0 }} />
              <span>Sponsorship</span>
            </button>
          </div>
        </div>

        {formMode === 'sponsorship' ? (
          <div style={{ padding: '16px 20px 20px 20px' }}>
            <SponsorshipForm
              hideHeader={true}
              onSuccess={(spon) => {
                if (onSponsorshipRecorded) {
                  onSponsorshipRecorded(spon);
                }
                onClose();
              }}
              onCancel={onClose}
            />
          </div>
        ) : (
          /* Form Body */
          <form onSubmit={handleSubmit} style={{ padding: '20px 24px 24px 24px' }}>

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
              marginBottom: 18
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Donor Name */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Donor / Family Name *
            </label>
            <input
              id="input-donor-name"
              type="text"
              className="input-field"
              placeholder="e.g. C.P. Moidu Haji / Dr. Faisal"
              value={donorName}
              onChange={(e) => setDonorName(e.target.value)}
              required
            />
          </div>

          {/* WhatsApp Number */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Donor's WhatsApp Number (For instant digital receipt) *
            </label>
            <div style={{ display: 'flex' }}>
              <span style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0 12px',
                background: '#F8FAFC',
                border: '1px solid #CBD5E1',
                borderRight: 'none',
                borderRadius: 'var(--radius-md) 0 0 var(--radius-md)',
                color: 'var(--text-secondary)',
                fontSize: '0.9rem',
                fontWeight: 600
              }}>
                +91
              </span>
              <input
                id="input-donor-phone"
                type="tel"
                className="input-field"
                style={{ borderRadius: '0 var(--radius-md) var(--radius-md) 0' }}
                placeholder="98471 23456"
                value={whatsAppNumber}
                onChange={(e) => setWhatsAppNumber(e.target.value)}
                maxLength={13}
                required
              />
            </div>
          </div>

          {/* Kit Quantity Selector */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Select Number of Kits
            </label>
            
            {/* Quick preset chips */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              {[1, 2, 5, 10, 20].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKitCountChange(num)}
                  style={{
                    flex: 1,
                    padding: '8px 4px',
                    borderRadius: 'var(--radius-sm)',
                    border: kitCount === num ? '1px solid #42B06F' : '1px solid var(--border-subtle)',
                    background: kitCount === num ? '#EBF7F0' : '#FFFFFF',
                    color: kitCount === num ? '#1E6B3E' : 'var(--text-primary)',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {num} {num === 1 ? 'Kit' : 'Kits'}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                id="input-kit-count"
                type="number"
                min="1"
                max="500"
                className="input-field"
                value={kitCount}
                onChange={(e) => handleKitCountChange(parseInt(e.target.value) || 1)}
              />
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                @ ₹{kitPrice.toLocaleString('en-IN')} each
              </span>
            </div>
          </div>

          {/* Live Total Calculation Card */}
          <div style={{
            background: '#F8FAFC',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            marginBottom: 20,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
                Total Kit Donation Value
              </span>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#008A2E' }}>
                ₹{totalAmount.toLocaleString('en-IN')}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className="badge badge-emerald">
                {kitCount} Relief {kitCount === 1 ? 'Kit' : 'Kits'}
              </span>
            </div>
          </div>

          {/* Glowing Payment Option Selector (Pay Full, Advance, Book) */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8 }}>
              Payment Terms & Booking
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {/* Pay Full */}
              <button
                type="button"
                onClick={() => handlePaymentOptionChange('PayFull')}
                style={{
                  padding: '10px 6px',
                  borderRadius: 'var(--radius-md)',
                  border: paymentOption === 'PayFull' ? '2px solid #008A2E' : '1px solid #CBD5E1',
                  background: paymentOption === 'PayFull' ? '#EBF7EE' : '#FFFFFF',
                  color: paymentOption === 'PayFull' ? '#008A2E' : '#334155',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  cursor: 'pointer',
                  boxShadow: paymentOption === 'PayFull' ? '0 0 12px rgba(0, 138, 46, 0.25)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <CheckCircle size={15} />
                <span style={{ fontWeight: 800, fontSize: '0.82rem' }}>Pay Full</span>
                <span style={{ fontSize: '0.66rem', color: paymentOption === 'PayFull' ? '#0F5132' : '#64748B' }}>100% Upfront</span>
              </button>

              {/* Advance */}
              <button
                type="button"
                onClick={() => handlePaymentOptionChange('Advance')}
                style={{
                  padding: '10px 6px',
                  borderRadius: 'var(--radius-md)',
                  border: paymentOption === 'Advance' ? '2px solid #D97706' : '1px solid #CBD5E1',
                  background: paymentOption === 'Advance' ? '#FEF3C7' : '#FFFFFF',
                  color: paymentOption === 'Advance' ? '#B45309' : '#334155',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  cursor: 'pointer',
                  boxShadow: paymentOption === 'Advance' ? '0 0 12px rgba(217, 119, 6, 0.3)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <Clock size={15} />
                <span style={{ fontWeight: 800, fontSize: '0.82rem' }}>Advance</span>
                <span style={{ fontSize: '0.66rem', color: paymentOption === 'Advance' ? '#78350F' : '#64748B' }}>Partial Deposit</span>
              </button>

              {/* Book */}
              <button
                type="button"
                onClick={() => handlePaymentOptionChange('Book')}
                style={{
                  padding: '10px 6px',
                  borderRadius: 'var(--radius-md)',
                  border: paymentOption === 'Book' ? '2px solid #2C82C9' : '1px solid #CBD5E1',
                  background: paymentOption === 'Book' ? '#EDF4FA' : '#FFFFFF',
                  color: paymentOption === 'Book' ? '#2C82C9' : '#334155',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  cursor: 'pointer',
                  boxShadow: paymentOption === 'Book' ? '0 0 12px rgba(44, 130, 201, 0.3)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <BookmarkCheck size={15} />
                <span style={{ fontWeight: 800, fontSize: '0.82rem' }}>Booking</span>
                <span style={{ fontSize: '0.66rem', color: paymentOption === 'Book' ? '#1E3A8A' : '#64748B' }}>Reserve Kits</span>
              </button>
            </div>
          </div>

          {/* Dynamic Initial Amount / Balance for Advance or Book */}
          {paymentOption !== 'PayFull' && (
            <div style={{
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              background: paymentOption === 'Advance' ? '#FFFBEB' : '#F4F9FD',
              border: paymentOption === 'Advance' ? '1px solid #FDE68A' : '1px solid #B8D4EE',
              marginBottom: 20
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, alignItems: 'center' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: paymentOption === 'Advance' ? '#92400E' : '#1D4ED8', textTransform: 'uppercase', marginBottom: 4 }}>
                    {paymentOption === 'Advance' ? 'Advance Paid (₹) *' : 'Initial Paid (₹)'}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="input-field"
                    value={initialAmountPaid || ''}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/\D/g, '');
                      setInitialAmountPaid(clean === '' ? 0 : parseInt(clean, 10));
                    }}
                    style={{ fontWeight: 800, fontSize: '1rem', background: '#FFFFFF' }}
                    placeholder="0"
                  />
                </div>
                <div style={{ textAlign: 'right', padding: '8px', background: '#FFFFFF', borderRadius: 8, border: '1px solid rgba(0,0,0,0.06)' }}>
                  <span style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 800, textTransform: 'uppercase' }}>
                    Remaining Balance
                  </span>
                  <div style={{ fontSize: '1.2rem', fontWeight: 900, color: balanceAmount > 0 ? '#B91C1C' : '#008A2E' }}>
                    ₹{balanceAmount.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Payment Mode */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 6 }}>
              Payment Mode
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {(['Cash', 'UPI', 'BankTransfer', 'Cheque'] as PaymentMode[]).map((mode) => (
                <button
                  type="button"
                  key={mode}
                  onClick={() => setPaymentMode(mode)}
                  style={{
                    padding: '8px 2px',
                    borderRadius: 'var(--radius-sm)',
                    border: paymentMode === mode ? '1.5px solid #008A2E' : '1px solid #CBD5E1',
                    background: paymentMode === mode ? '#EBF7EE' : '#FFFFFF',
                    color: paymentMode === mode ? '#008A2E' : '#475569',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    cursor: 'pointer'
                  }}
                >
                  {mode === 'BankTransfer' ? 'Bank' : mode}
                </button>
              ))}
            </div>
          </div>

          {/* Optional Reference & Remarks Toggle */}
          <div style={{ marginBottom: 20 }}>
            <button
              type="button"
              onClick={() => setShowExtraDetails(!showExtraDetails)}
              style={{
                background: 'none',
                border: 'none',
                color: '#2C82C9',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer',
                padding: 0
              }}
            >
              {showExtraDetails ? '− Hide Reference / Remarks' : '+ Add Transaction Reference / Remarks (Optional)'}
            </button>

            {showExtraDetails && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="UPI Ref ID, Cheque No, Transaction ID (Optional)"
                  value={transactionReference}
                  onChange={(e) => setTransactionReference(e.target.value)}
                />
                <input
                  type="text"
                  className="input-field"
                  placeholder="Payment Remarks / Notes (Optional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              id="btn-submit-donation"
              type="submit"
              className="btn-primary"
              style={{
                flex: 1,
                padding: '13px',
                background: paymentOption === 'Advance' ? '#D97706' : paymentOption === 'Book' ? '#2C82C9' : '#008A2E'
              }}
              disabled={loading}
            >
              {loading ? (
                <RefreshCw size={18} className="animate-spin" />
              ) : (
                <>
                  <Sparkles size={17} />
                  <span>
                    {paymentOption === 'PayFull'
                      ? `Pay Full ₹${totalAmount.toLocaleString('en-IN')} & Submit`
                      : paymentOption === 'Advance'
                        ? `Pay Advance ₹${(initialAmountPaid || 0).toLocaleString('en-IN')} & Submit`
                        : `Book Kits (${initialAmountPaid ? `₹${initialAmountPaid.toLocaleString('en-IN')} Paid` : 'Pay Later'})`}
                  </span>
                </>
              )}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
};

