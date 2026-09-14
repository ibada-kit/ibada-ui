import React, { useState, useEffect } from 'react';
import { Building2, User, CheckCircle, AlertCircle, RefreshCw, IndianRupee, Clock, Check } from 'lucide-react';
import { sponsorshipsApi } from '../services/api';
import type { SponsorshipItem, SponsorshipRecord, PaymentOption, PaymentMode } from '../types';
import { SpinEditNumberInput } from './SpinEditNumberInput';

interface SponsorshipFormProps {
  onSuccess?: (sponsorship: SponsorshipRecord) => void;
  onCancel?: () => void;
  hideHeader?: boolean;
}

export const SponsorshipForm: React.FC<SponsorshipFormProps> = ({
  onSuccess,
  onCancel,
  hideHeader = false
}) => {
  // Catalog Packages (Loaded live from server)
  const [packages, setPackages] = useState<SponsorshipItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>('');

  // Form Fields
  const [donorName, setDonorName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [paymentOption, setPaymentOption] = useState<PaymentOption>('PayFull');
  const [initialAmountPaid, setInitialAmountPaid] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash');
  const [transactionReference, setTransactionReference] = useState('');
  const [notes, setNotes] = useState('');

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordedRecord, setRecordedRecord] = useState<SponsorshipRecord | null>(null);

  // Load active catalog items from API
  useEffect(() => {
    let isMounted = true;
    sponsorshipsApi.getItems()
      .then((items) => {
        if (isMounted && items && items.length > 0) {
          setPackages(items);
          setSelectedItemId((prev) => items.find(i => i.itemId === prev) ? prev : items[0].itemId);
          setInitialAmountPaid((prev) => prev > 0 ? prev : items[0].itemPrice);
        }
      })
      .catch((err) => console.warn('Could not load packages from server:', err));

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedPackage = packages.find(p => p.itemId === selectedItemId) || packages[0] || null;
  const unitPrice = selectedPackage?.itemPrice || 0;
  const totalAmount = Math.max(0, quantity * unitPrice);

  const handleSelectPackage = (itemId: string) => {
    setSelectedItemId(itemId);
    const pkg = packages.find(p => p.itemId === itemId);
    const price = pkg?.itemPrice || 5000;
    const newTotal = quantity * price;
    if (paymentOption === 'PayFull') {
      setInitialAmountPaid(newTotal);
    } else if (paymentOption === 'Advance' && initialAmountPaid > newTotal) {
      setInitialAmountPaid(Math.round(newTotal * 0.5));
    }
  };

  const handleQuantityChange = (newQty: number) => {
    setQuantity(newQty);
    const newTotal = newQty * unitPrice;
    if (paymentOption === 'PayFull') {
      setInitialAmountPaid(newTotal);
    } else if (paymentOption === 'Advance' && initialAmountPaid > newTotal) {
      setInitialAmountPaid(Math.round(newTotal * 0.5));
    }
  };

  // Synchronize initial payment when payment option changes
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

  const balanceAmount = Math.max(0, totalAmount - (initialAmountPaid || 0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setRecordedRecord(null);

    if (!donorName.trim()) {
      setError('Please enter the organization or firm name.');
      return;
    }

    const cleanPhone = mobileNumber.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit WhatsApp number.');
      return;
    }

    if (quantity < 1) {
      setError('Please select at least 1 sponsorship item.');
      return;
    }

    if (!selectedPackage) {
      setError('Please select a valid sponsorship package item.');
      return;
    }

    // Validate payment options
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
        setError(`Booking amount cannot exceed total sponsorship amount (₹${totalAmount.toLocaleString('en-IN')}).`);
        return;
      }
    }

    try {
      setSubmitting(true);
      const payload = {
        donorName: donorName.trim(),
        contactPerson: contactPerson.trim() || undefined,
        mobileNumber: `+91${cleanPhone.slice(-10)}`,
        itemId: selectedPackage.itemId,
        quantity: Math.floor(quantity),
        paymentOption,
        initialAmountPaid: paymentOption === 'PayFull' ? totalAmount : initialAmountPaid,
        paymentMode,
        transactionReference: transactionReference.trim() || undefined,
        notes: notes.trim() || undefined
      };

      const result = await sponsorshipsApi.acceptSponsorship(payload);
      setRecordedRecord(result);
      if (onSuccess) onSuccess(result);

      // Reset form
      setDonorName('');
      setContactPerson('');
      setMobileNumber('');
      setQuantity(1);
      setPaymentOption('PayFull');
      setTransactionReference('');
      setNotes('');
    } catch (err: any) {
      setError(err.message || 'Failed to record sponsorship.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      background: '#FFFFFF',
      borderRadius: 'var(--radius-xl)',
      padding: hideHeader ? '0' : '22px clamp(14px, 4vw, 20px)',
      border: hideHeader ? 'none' : '1px solid var(--border-subtle)',
      boxShadow: hideHeader ? 'none' : 'var(--shadow-sm)',
      maxWidth: 620,
      margin: '0 auto',
      width: '100%'
    }}>
      {/* Header (Optional / Skipped inside modal to avoid duplicate headers) */}
      {!hideHeader && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          paddingBottom: 16,
          marginBottom: 18,
          borderBottom: '1px solid var(--border-subtle)'
        }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: '#EDF4FA',
            border: '1px solid #B8D4EE',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#2C82C9',
            flexShrink: 0
          }}>
            <Building2 size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: 'clamp(1.05rem, 3vw, 1.2rem)', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Accept Sponsorship
              </h2>
              <span style={{
                background: '#EBF7EE',
                color: '#008A2E',
                border: '1px solid #A5D6B8',
                fontSize: '0.62rem',
                fontWeight: 800,
                padding: '2px 6px',
                borderRadius: 'var(--radius-full)'
              }}>
                Instant Receipt
              </span>
            </div>
            <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600, display: 'block', marginTop: 2 }}>
              Record customized sponsorship packages with full, advance, or booking terms
            </span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 14px',
          borderRadius: 'var(--radius-md)',
          background: '#FEF2F2',
          border: '1px solid #FECACA',
          color: '#B91C1C',
          fontSize: '0.84rem',
          fontWeight: 600,
          marginBottom: 16
        }}>
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Success Notification */}
      {recordedRecord && (
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          padding: '14px 16px',
          borderRadius: 'var(--radius-md)',
          background: '#EBF7EE',
          border: '1px solid #A5D6B8',
          color: '#008A2E',
          fontSize: '0.86rem',
          marginBottom: 18
        }}>
          <CheckCircle size={20} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <span style={{ fontWeight: 800 }}>Sponsorship Registered!</span>
            <div style={{ fontSize: '0.78rem', color: '#334155', marginTop: 3 }}>
              Receipt No: <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#008A2E' }}>{recordedRecord.receiptToken}</span>
              {' '}• Registered for {recordedRecord.donorName}.
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Organization / Firm Name */}
        <div style={{ marginBottom: 14 }}>
          <label style={{
            display: 'block',
            fontSize: '0.76rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#334155',
            marginBottom: 6
          }}>
            Firm / Organization Name *
          </label>
          <div style={{ position: 'relative' }}>
            <Building2 size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            <input
              type="text"
              required
              className="input-field"
              style={{ paddingLeft: 42 }}
              placeholder="e.g. Al-Noor Trading LLC / Malabar Builders"
              value={donorName}
              onChange={(e) => setDonorName(e.target.value)}
            />
          </div>
        </div>

        {/* WhatsApp Mobile Number & Contact Person */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 16 }}>
          {/* WhatsApp Phone Number */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.76rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#334155',
              marginBottom: 6
            }}>
              WhatsApp Phone Number *
            </label>
            <div style={{ display: 'flex' }}>
              <span style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0 12px',
                background: '#F4F9FD',
                border: '1px solid #CBD5E1',
                borderRight: 'none',
                borderRadius: 'var(--radius-md) 0 0 var(--radius-md)',
                color: '#334155',
                fontSize: '0.88rem',
                fontWeight: 700
              }}>
                🇮🇳 +91
              </span>
              <input
                type="tel"
                required
                className="input-field"
                style={{ borderRadius: '0 var(--radius-md) var(--radius-md) 0' }}
                maxLength={13}
                placeholder="98471 23456"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
              />
            </div>
          </div>

          {/* Contact Representative */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.76rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#334155',
              marginBottom: 6
            }}>
              Contact Person (Optional)
            </label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input
                type="text"
                className="input-field"
                style={{ paddingLeft: 42 }}
                placeholder="e.g. Faisal (Director / Manager)"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Sponsor Item Selection & Quantity (Spin Edit Stepper Control - Clean & Non-complex) */}
        <div style={{
          background: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: 'var(--radius-lg)',
          padding: '14px 16px',
          marginBottom: 16
        }}>
          {/* Step 1: Pick Package Item */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{
                fontSize: '0.76rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#334155'
              }}>
                Select Sponsor Item *
              </label>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#008A2E' }}>
                ₹{unitPrice.toLocaleString('en-IN')} / unit
              </span>
            </div>

            <select
              className="input-field"
              value={selectedItemId}
              onChange={(e) => handleSelectPackage(e.target.value)}
              disabled={packages.length === 0}
              style={{
                fontSize: '0.92rem',
                fontWeight: 700,
                color: '#0F172A',
                background: '#FFFFFF',
                cursor: packages.length === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              {packages.length === 0 ? (
                <option value="">Loading packages...</option>
              ) : (
                packages.map((pkg) => (
                  <option key={pkg.itemId} value={pkg.itemId}>
                    {pkg.name} — ₹{pkg.itemPrice.toLocaleString('en-IN')} per package
                  </option>
                ))
              )}
            </select>
            {selectedPackage?.description && (
              <span style={{ fontSize: '0.74rem', color: '#64748B', display: 'block', marginTop: 4 }}>
                {selectedPackage.description}
              </span>
            )}
          </div>

          {/* Step 2: Quantity */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{
                fontSize: '0.76rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#334155'
              }}>
                Quantity *
              </label>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <SpinEditNumberInput
                value={quantity}
                onChange={handleQuantityChange}
                min={1}
                max={2000}
                step={1}
                quickValues={[1, 2, 5, 10]}
                unitLabel={quantity === 1 ? 'pkg' : 'pkgs'}
              />

              <div style={{
                fontSize: '0.95rem',
                fontWeight: 800,
                color: '#0F172A',
                background: '#FFFFFF',
                padding: '8px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid #CBD5E1',
                flexGrow: 1,
                textAlign: 'right'
              }}>
                <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, display: 'block' }}>
                  Total Committed
                </span>
                ₹{totalAmount.toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        </div>

        {/* Payment Terms Option */}
        <div style={{ marginBottom: 16 }}>
          <label style={{
            display: 'block',
            fontSize: '0.76rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#334155',
            marginBottom: 8
          }}>
            Payment Option *
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {/* 1. PayFull */}
            <button
              type="button"
              onClick={() => handlePaymentOptionChange('PayFull')}
              style={{
                padding: '10px 8px',
                borderRadius: 'var(--radius-lg)',
                cursor: 'pointer',
                border: paymentOption === 'PayFull' ? '2.5px solid #008A2E' : '1px solid #CBD5E1',
                background: paymentOption === 'PayFull' ? '#EBF7EE' : '#FFFFFF',
                color: paymentOption === 'PayFull' ? '#008A2E' : '#334155',
                textAlign: 'center',
                transition: 'all 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 800, fontSize: '0.84rem' }}>
                {paymentOption === 'PayFull' && <Check size={14} strokeWidth={3} />}
                <span>Pay Full</span>
              </div>
              <span style={{
                fontSize: '0.66rem',
                fontWeight: 800,
                background: paymentOption === 'PayFull' ? '#008A2E' : '#E2E8F0',
                color: paymentOption === 'PayFull' ? '#FFFFFF' : '#475569',
                padding: '2px 6px',
                borderRadius: 'var(--radius-full)'
              }}>
                100% Paid
              </span>
            </button>

            {/* 2. Advance */}
            <button
              type="button"
              onClick={() => handlePaymentOptionChange('Advance')}
              style={{
                padding: '10px 8px',
                borderRadius: 'var(--radius-lg)',
                cursor: 'pointer',
                border: paymentOption === 'Advance' ? '2.5px solid #D97706' : '1px solid #CBD5E1',
                background: paymentOption === 'Advance' ? '#FEF3C7' : '#FFFFFF',
                color: paymentOption === 'Advance' ? '#B45309' : '#334155',
                textAlign: 'center',
                transition: 'all 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 800, fontSize: '0.84rem' }}>
                <Clock size={14} strokeWidth={2.5} />
                <span>Advance</span>
              </div>
              <span style={{
                fontSize: '0.66rem',
                fontWeight: 800,
                background: paymentOption === 'Advance' ? '#D97706' : '#E2E8F0',
                color: paymentOption === 'Advance' ? '#FFFFFF' : '#475569',
                padding: '2px 6px',
                borderRadius: 'var(--radius-full)'
              }}>
                Partial Payment
              </span>
            </button>

            {/* 3. Book */}
            <button
              type="button"
              onClick={() => handlePaymentOptionChange('Book')}
              style={{
                padding: '10px 8px',
                borderRadius: 'var(--radius-lg)',
                cursor: 'pointer',
                border: paymentOption === 'Book' ? '2.5px solid #2C82C9' : '1px solid #CBD5E1',
                background: paymentOption === 'Book' ? '#EDF4FA' : '#FFFFFF',
                color: paymentOption === 'Book' ? '#2C82C9' : '#334155',
                textAlign: 'center',
                transition: 'all 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 800, fontSize: '0.84rem' }}>
                <IndianRupee size={14} strokeWidth={2.5} />
                <span>Book / Reserve</span>
              </div>
              <span style={{
                fontSize: '0.66rem',
                fontWeight: 800,
                background: paymentOption === 'Book' ? '#2C82C9' : '#E2E8F0',
                color: paymentOption === 'Book' ? '#FFFFFF' : '#475569',
                padding: '2px 6px',
                borderRadius: 'var(--radius-full)'
              }}>
                Pay Later
              </span>
            </button>
          </div>
        </div>

        {/* Dynamic Amount Paid / Balance Row (If Advance or Book) */}
        {paymentOption !== 'PayFull' && (
          <div style={{
            background: paymentOption === 'Advance' ? '#FFFBEB' : '#F4F9FD',
            border: paymentOption === 'Advance' ? '1px solid #FDE68A' : '1px solid #B8D4EE',
            borderRadius: 'var(--radius-lg)',
            padding: '14px',
            marginBottom: 16,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
            alignItems: 'center'
          }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.74rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#334155',
                marginBottom: 6
              }}>
                {paymentOption === 'Advance' ? 'Advance Paid Now (₹) *' : 'Initial Paid Amount (₹)'}
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className="input-field"
                value={initialAmountPaid}
                onChange={(e) => {
                  const clean = e.target.value.replace(/\D/g, '');
                  if (clean === '') {
                    setInitialAmountPaid(0);
                  } else {
                    const parsed = parseInt(clean, 10);
                    setInitialAmountPaid(Math.min(totalAmount, parsed));
                  }
                }}
                onKeyDown={(e) => {
                  if (['.', ',', 'e', 'E', '+', '-'].includes(e.key)) {
                    e.preventDefault();
                  }
                }}
                placeholder={paymentOption === 'Book' ? '0' : '5000'}
                style={{
                  fontWeight: 800,
                  fontSize: '1.05rem',
                  color: '#0F172A',
                  background: '#FFFFFF'
                }}
              />
            </div>

            <div style={{
              background: '#FFFFFF',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid #E2E8F0'
            }}>
              <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
                Remaining Balance Due
              </span>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: balanceAmount > 0 ? '#B91C1C' : '#008A2E' }}>
                ₹{balanceAmount.toLocaleString('en-IN')}
              </div>
              <span style={{ fontSize: '0.7rem', color: '#64748B' }}>
                {balanceAmount > 0 ? 'Collectable in follow-up' : 'All cleared'}
              </span>
            </div>
          </div>
        )}

        {/* Payment Mode Pills */}
        <div style={{ marginBottom: 16 }}>
          <label style={{
            display: 'block',
            fontSize: '0.74rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#334155',
            marginBottom: 6
          }}>
            Payment Method
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {(['Cash', 'UPI', 'BankTransfer', 'Cheque'] as PaymentMode[]).map((mode) => (
              <button
                type="button"
                key={mode}
                onClick={() => setPaymentMode(mode)}
                style={{
                  padding: '8px 4px',
                  borderRadius: 'var(--radius-md)',
                  border: paymentMode === mode ? '1.5px solid #2C82C9' : '1px solid #CBD5E1',
                  background: paymentMode === mode ? '#EDF4FA' : '#FFFFFF',
                  color: paymentMode === mode ? '#2C82C9' : '#475569',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  textAlign: 'center'
                }}
              >
                {mode === 'BankTransfer' ? 'Bank' : mode}
              </button>
            ))}
          </div>
        </div>

        {/* Optional Reference for UPI/Cheque/Bank */}
        {paymentMode !== 'Cash' && (
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block',
              fontSize: '0.74rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#334155',
              marginBottom: 6
            }}>
              {paymentMode} Reference / Transaction ID (Optional)
            </label>
            <input
              type="text"
              className="input-field"
              placeholder={`e.g. ${paymentMode === 'UPI' ? 'UPI Ref / UTR No.' : paymentMode === 'Cheque' ? 'Cheque No. & Bank' : 'NEFT / IMPS Ref'}`}
              value={transactionReference}
              onChange={(e) => setTransactionReference(e.target.value)}
            />
          </div>
        )}

        {/* Summary Footer Box */}
        <div style={{
          background: '#F4F9FD',
          border: '1px solid #B8D4EE',
          borderRadius: 'var(--radius-lg)',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
          marginBottom: 18
        }}>
          <div>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700 }}>
              Amount Paid Now
            </span>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#008A2E', lineHeight: 1.1 }}>
              ₹{(paymentOption === 'PayFull' ? totalAmount : initialAmountPaid).toLocaleString('en-IN')}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700 }}>
              Total Commitment
            </span>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
              ₹{totalAmount.toLocaleString('en-IN')}
            </div>
            {balanceAmount > 0 && (
              <span style={{ fontSize: '0.72rem', color: '#B91C1C', fontWeight: 700 }}>
                Balance: ₹{balanceAmount.toLocaleString('en-IN')}
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="btn-secondary"
              style={{ flex: 1, padding: '12px' }}
            >
              Cancel
            </button>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary"
            style={{
              flex: 2,
              padding: '13px',
              fontSize: '0.96rem',
              fontWeight: 800,
              background: '#2C82C9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }}
          >
            {submitting ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                <span>Recording Sponsorship...</span>
              </>
            ) : (
              <>
                <Building2 size={18} />
                <span>Accept Sponsorship</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
