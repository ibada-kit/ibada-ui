import React, { useState } from 'react';
import { Package, User, CheckCircle, AlertCircle, RefreshCw, Building2, Clock, BookmarkCheck, GraduationCap, Plus, Minus } from 'lucide-react';
import { donationsApi, getKitUnitPrice } from '../services/api';
import type { Donation, SponsorshipRecord, PaymentOption, PaymentMode } from '../types';
import { SponsorshipForm } from './SponsorshipForm';
import { SponsorshipReceiptModal } from './SponsorshipReceiptModal';
import { ReceiptModal } from './ReceiptModal';
import { CollectBalanceModal } from './CollectBalanceModal';

interface DonationFormProps {
  kitPrice?: number;
  initialMode?: 'kit' | 'sponsorship';
  onSuccess?: (donation: Donation) => void;
  onSponsorshipSuccess?: (sponsorship: SponsorshipRecord) => void;
  onCancel?: () => void;
}

export const DonationForm: React.FC<DonationFormProps> = ({
  kitPrice = getKitUnitPrice(),
  initialMode = 'kit',
  onSuccess,
  onSponsorshipSuccess,
  onCancel
}) => {
  const [formMode, setFormMode] = useState<'kit' | 'sponsorship'>(initialMode);
  const [activeSponsorshipReceipt, setActiveSponsorshipReceipt] = useState<SponsorshipRecord | null>(null);
  const [activeDonationReceipt, setActiveDonationReceipt] = useState<Donation | null>(null);
  const [balanceDonationToCollect, setBalanceDonationToCollect] = useState<Donation | null>(null);

  const [donorName, setDonorName] = useState('');
  const [whatsAppNumber, setWhatsAppNumber] = useState('');
  const [generalKitCount, setGeneralKitCount] = useState<number>(1);
  const [studentKitCount, setStudentKitCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Payment Terms & Booking State (same as Sponsorship)
  const [paymentOption, setPaymentOption] = useState<PaymentOption>('PayFull');
  const [initialAmountPaid, setInitialAmountPaid] = useState<number>(1 * kitPrice);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash');
  const [transactionReference, setTransactionReference] = useState('');
  const [notes, setNotes] = useState('');
  const [showExtraDetails, setShowExtraDetails] = useState(false);

  const totalKits = (Number(generalKitCount) || 0) + (Number(studentKitCount) || 0);
  const totalAmount = totalKits * kitPrice;
  const balanceAmount = paymentOption === 'Book' ? totalAmount : Math.max(0, totalAmount - (initialAmountPaid || 0));

  const handleUpdateKits = (newGeneral: number, newStudent: number) => {
    const clampedGeneral = Math.max(0, Math.min(1000, Math.floor(newGeneral || 0)));
    const clampedStudent = Math.max(0, Math.min(1000, Math.floor(newStudent || 0)));
    setGeneralKitCount(clampedGeneral);
    setStudentKitCount(clampedStudent);

    const newTotal = (clampedGeneral + clampedStudent) * kitPrice;
    if (paymentOption === 'PayFull') {
      setInitialAmountPaid(newTotal);
    } else if (paymentOption === 'Advance') {
      if (initialAmountPaid > newTotal || initialAmountPaid === 0) {
        setInitialAmountPaid(Math.round(newTotal * 0.5));
      }
    } else if (paymentOption === 'Book') {
      setInitialAmountPaid(0);
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

    const cleanPhone = whatsAppNumber.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit WhatsApp number.');
      return;
    }

    if (!donorName.trim()) {
      setError('Donor name is required.');
      return;
    }

    if (totalKits < 1) {
      setError('Donation must include at least 1 kit (General or Student Ibada Kit).');
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
      const kitStyle = (generalKitCount > 0 && studentKitCount > 0)
        ? 'Mixed'
        : (studentKitCount > 0 ? 'Student' : 'General');

      const donation = await donationsApi.recordDonation({
        donorName: donorName.trim(),
        whatsAppNumber: `+91${cleanPhone.slice(-10)}`,
        kitCount: totalKits,
        generalKitCount,
        studentKitCount,
        kitStyle,
        totalAmount,
        paymentOption,
        initialAmountPaid: paymentOption === 'PayFull' ? totalAmount : (paymentOption === 'Book' ? 0 : initialAmountPaid),
        balanceAmount: paymentOption === 'PayFull' ? 0 : (paymentOption === 'Book' ? totalAmount : balanceAmount),
        paymentMode,
        transactionReference: transactionReference.trim() || undefined,
        notes: notes.trim() || undefined
      });

      setActiveDonationReceipt(donation);
      if (onSuccess) onSuccess(donation);

      // Reset form
      setDonorName('');
      setWhatsAppNumber('');
      setGeneralKitCount(1);
      setStudentKitCount(0);
      setPaymentOption('PayFull');
      setInitialAmountPaid(kitPrice);
      setPaymentMode('Cash');
      setTransactionReference('');
      setNotes('');
      setShowExtraDetails(false);
    } catch (err: any) {
      setError(err.message || 'Failed to record donation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 620, margin: '0 auto', width: '100%' }}>
      {/* Top Toggle Switcher: Same Form Container, Switch between Kit Donation & Sponsorship */}
      <div style={{
        display: 'flex',
        background: '#FFFFFF',
        padding: '4px',
        borderRadius: 'var(--radius-xl)',
        marginBottom: 16,
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-sm)',
        gap: 6
      }}>
        <button
          id="btn-switch-kit-donation"
          type="button"
          onClick={() => setFormMode('kit')}
          style={{
            flex: 1,
            minWidth: 0,
            padding: '10px clamp(8px, 2.5vw, 14px)',
            borderRadius: 'var(--radius-lg)',
            border: formMode === 'kit' ? '1px solid #A5D6B8' : 'none',
            background: formMode === 'kit' ? '#EBF7EE' : 'transparent',
            color: formMode === 'kit' ? '#008A2E' : '#64748B',
            fontWeight: 800,
            fontSize: 'clamp(0.8rem, 2.8vw, 0.88rem)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap'
          }}
        >
          <Package size={17} style={{ flexShrink: 0 }} />
          <span>Relief Kit Donation</span>
        </button>

        <button
          id="btn-switch-sponsorship"
          type="button"
          onClick={() => setFormMode('sponsorship')}
          style={{
            flex: 1,
            minWidth: 0,
            padding: '10px clamp(8px, 2.5vw, 14px)',
            borderRadius: 'var(--radius-lg)',
            border: formMode === 'sponsorship' ? '1px solid #B8D4EE' : 'none',
            background: formMode === 'sponsorship' ? '#EDF4FA' : 'transparent',
            color: formMode === 'sponsorship' ? '#2C82C9' : '#64748B',
            fontWeight: 800,
            fontSize: 'clamp(0.8rem, 2.8vw, 0.88rem)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap'
          }}
        >
          <Building2 size={17} style={{ flexShrink: 0 }} />
          <span>Sponsorship</span>
        </button>
      </div>

      {formMode === 'sponsorship' ? (
        <SponsorshipForm
          onSuccess={(spon) => {
            setActiveSponsorshipReceipt(spon);
            if (onSponsorshipSuccess) onSponsorshipSuccess(spon);
          }}
          onCancel={onCancel}
        />
      ) : (
        <div style={{
          background: '#FFFFFF',
          borderRadius: 'var(--radius-xl)',
          padding: '24px clamp(14px, 4vw, 22px)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)',
          width: '100%'
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            paddingBottom: 16,
            marginBottom: 20,
            borderBottom: '1px solid var(--border-subtle)'
          }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: '#EBF7EE',
              border: '1px solid #A5D6B8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#008A2E'
            }}>
              <Package size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Record Kit Donation
              </h2>
              <span style={{ fontSize: '0.82rem', color: '#2C82C9', fontWeight: 600 }}>
                Rate: ₹{kitPrice.toLocaleString('en-IN')} / Relief Kit
              </span>
            </div>
          </div>

          {/* Error Alert */}
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

          <form onSubmit={handleSubmit}>
            {/* Donor Full Name */}
            <div style={{ marginBottom: 16 }}>
              <label style={{
                display: 'block',
                fontSize: '0.76rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#334155',
                marginBottom: 6
              }}>
                Donor Full Name
              </label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                <input
                  type="text"
                  required
                  className="input-field"
                  style={{ paddingLeft: 42 }}
                  placeholder="e.g. Abdul Rahman"
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                />
              </div>
            </div>

            {/* WhatsApp Mobile Number */}
            <div style={{ marginBottom: 18 }}>
              <label style={{
                display: 'block',
                fontSize: '0.76rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#334155',
                marginBottom: 6
              }}>
                WhatsApp Phone Number
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
                  value={whatsAppNumber}
                  onChange={(e) => setWhatsAppNumber(e.target.value)}
                />
              </div>
              <span style={{ fontSize: '0.72rem', color: '#64748B', display: 'block', marginTop: 4 }}>
                Digital receipt card will be sent automatically to this number.
              </span>
            </div>

            {/* Kit Type & Quantity Selector */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                <label style={{
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#334155',
                  margin: 0
                }}>
                  Select Ibada Kits *
                </label>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: totalKits > 0 ? '#008A2E' : '#94A3B8',
                  background: totalKits > 0 ? '#EBF7EE' : '#F1F5F9',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  border: `1px solid ${totalKits > 0 ? '#A5D6B8' : '#CBD5E1'}`
                }}>
                  Rate: ₹{kitPrice.toLocaleString('en-IN')} each
                </span>
              </div>

              {/* Two Kit Cards: General Ibada Kit & Student Ibada Kit */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 10 }}>
                {/* General Ibada Kit Card */}
                <div style={{
                  background: generalKitCount > 0 ? '#F0FDF4' : '#FFFFFF',
                  border: generalKitCount > 0 ? '2px solid #22C55E' : '1.5px solid #E2E8F0',
                  borderRadius: 'var(--radius-lg)',
                  padding: '12px 14px',
                  transition: 'all 0.15s ease',
                  boxShadow: generalKitCount > 0 ? '0 2px 8px rgba(34, 197, 94, 0.12)' : 'none'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: generalKitCount > 0 ? '#DCFCE7' : '#F1F5F9',
                        color: generalKitCount > 0 ? '#16A34A' : '#64748B',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Package size={17} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 800, color: generalKitCount > 0 ? '#0F172A' : '#334155' }}>
                          General Ibada Kit
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                          Family & community relief
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTop: '1px solid #E2E8F0' }}>
                    <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#008A2E' }}>
                      ₹{kitPrice.toLocaleString('en-IN')} / kit
                    </span>

                    {/* Stepper Counter */}
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      border: generalKitCount > 0 ? '1.5px solid #22C55E' : '1px solid #CBD5E1',
                      borderRadius: 'var(--radius-md)',
                      background: '#FFFFFF',
                      overflow: 'hidden'
                    }}>
                      <button
                        type="button"
                        onClick={() => handleUpdateKits(generalKitCount - 1, studentKitCount)}
                        disabled={generalKitCount <= 0}
                        style={{
                          width: 30,
                          height: 30,
                          border: 'none',
                          background: generalKitCount > 0 ? '#F1F5F9' : '#F8FAFC',
                          color: generalKitCount > 0 ? '#0F172A' : '#CBD5E1',
                          cursor: generalKitCount > 0 ? 'pointer' : 'not-allowed',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Decrease General Kits"
                      >
                        <Minus size={14} />
                      </button>
                      <input
                        type="number"
                        min="0"
                        max="1000"
                        value={generalKitCount}
                        onChange={(e) => {
                          const parsed = parseInt(e.target.value, 10);
                          handleUpdateKits(isNaN(parsed) ? 0 : parsed, studentKitCount);
                        }}
                        style={{
                          width: 44,
                          height: 30,
                          border: 'none',
                          borderLeft: '1px solid #E2E8F0',
                          borderRight: '1px solid #E2E8F0',
                          textAlign: 'center',
                          fontWeight: 800,
                          fontSize: '0.86rem',
                          color: '#0F172A',
                          outline: 'none',
                          MozAppearance: 'textfield'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdateKits(generalKitCount + 1, studentKitCount)}
                        style={{
                          width: 30,
                          height: 30,
                          border: 'none',
                          background: '#F1F5F9',
                          color: '#0F172A',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Increase General Kits"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Student Ibada Kit Card */}
                <div style={{
                  background: studentKitCount > 0 ? '#F0F9FF' : '#FFFFFF',
                  border: studentKitCount > 0 ? '2px solid #0284C7' : '1.5px solid #E2E8F0',
                  borderRadius: 'var(--radius-lg)',
                  padding: '12px 14px',
                  transition: 'all 0.15s ease',
                  boxShadow: studentKitCount > 0 ? '0 2px 8px rgba(2, 132, 199, 0.12)' : 'none'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: studentKitCount > 0 ? '#E0F2FE' : '#F1F5F9',
                        color: studentKitCount > 0 ? '#0284C7' : '#64748B',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <GraduationCap size={18} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 800, color: studentKitCount > 0 ? '#0F172A' : '#334155' }}>
                          Student Ibada Kit
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                          Student & education kit
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTop: '1px solid #E2E8F0' }}>
                    <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#0284C7' }}>
                      ₹{kitPrice.toLocaleString('en-IN')} / kit
                    </span>

                    {/* Stepper Counter */}
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      border: studentKitCount > 0 ? '1.5px solid #0284C7' : '1px solid #CBD5E1',
                      borderRadius: 'var(--radius-md)',
                      background: '#FFFFFF',
                      overflow: 'hidden'
                    }}>
                      <button
                        type="button"
                        onClick={() => handleUpdateKits(generalKitCount, studentKitCount - 1)}
                        disabled={studentKitCount <= 0}
                        style={{
                          width: 30,
                          height: 30,
                          border: 'none',
                          background: studentKitCount > 0 ? '#F1F5F9' : '#F8FAFC',
                          color: studentKitCount > 0 ? '#0F172A' : '#CBD5E1',
                          cursor: studentKitCount > 0 ? 'pointer' : 'not-allowed',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Decrease Student Kits"
                      >
                        <Minus size={14} />
                      </button>
                      <input
                        type="number"
                        min="0"
                        max="1000"
                        value={studentKitCount}
                        onChange={(e) => {
                          const parsed = parseInt(e.target.value, 10);
                          handleUpdateKits(generalKitCount, isNaN(parsed) ? 0 : parsed);
                        }}
                        style={{
                          width: 44,
                          height: 30,
                          border: 'none',
                          borderLeft: '1px solid #E2E8F0',
                          borderRight: '1px solid #E2E8F0',
                          textAlign: 'center',
                          fontWeight: 800,
                          fontSize: '0.86rem',
                          color: '#0F172A',
                          outline: 'none',
                          MozAppearance: 'textfield'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdateKits(generalKitCount, studentKitCount + 1)}
                        style={{
                          width: 30,
                          height: 30,
                          border: 'none',
                          background: '#F1F5F9',
                          color: '#0F172A',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Increase Student Kits"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Total Amount Summary Box */}
            <div style={{
              background: '#F4F9FD',
              border: '1px solid #B8D4EE',
              borderRadius: 'var(--radius-lg)',
              padding: '16px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 10,
              marginBottom: 20
            }}>
              <div>
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700 }}>
                  Total Kit Donation Value
                </span>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#008A2E', lineHeight: 1.1, marginTop: 2 }}>
                  ₹{totalAmount.toLocaleString('en-IN')}
                </div>
              </div>
              <div style={{
                background: '#FFFFFF',
                border: '1px solid #7BCC53',
                color: '#008A2E',
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                fontWeight: 800,
                fontSize: '0.82rem'
              }}>
                {totalKits} {totalKits === 1 ? 'Kit' : 'Kits'}{' '}
                {generalKitCount > 0 && studentKitCount > 0
                  ? `(${generalKitCount} Gen + ${studentKitCount} Stu)`
                  : studentKitCount > 0
                    ? `(Student Kit)`
                    : `(General Kit)`}
              </div>
            </div>

            {/* Glowing Payment Option Selector (Pay Full, Advance, Book) */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#334155'
                }}>
                  Payment Terms & Booking
                </label>
                <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>
                  {paymentOption === 'PayFull' ? 'Full upfront settlement' : paymentOption === 'Advance' ? 'Upfront deposit with balance' : 'Zero advance kit reservation'}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {/* 1. Pay Full Card */}
                <button
                  type="button"
                  id="btn-kit-payfull"
                  onClick={() => handlePaymentOptionChange('PayFull')}
                  style={{
                    padding: '12px 6px',
                    borderRadius: 'var(--radius-lg)',
                    border: paymentOption === 'PayFull' ? '2.5px solid #008A2E' : '1px solid #CBD5E1',
                    background: paymentOption === 'PayFull' ? '#EBF7EE' : '#FFFFFF',
                    color: paymentOption === 'PayFull' ? '#008A2E' : '#334155',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 5,
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: paymentOption === 'PayFull' ? '0 0 14px rgba(0, 138, 46, 0.3)' : 'none',
                    position: 'relative'
                  }}
                >
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: paymentOption === 'PayFull' ? '#008A2E' : '#E2E8F0',
                    color: paymentOption === 'PayFull' ? '#FFFFFF' : '#475569',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <CheckCircle size={15} />
                  </div>
                  <span style={{ fontWeight: 800, fontSize: '0.84rem' }}>Pay Full</span>
                  <span style={{ fontSize: '0.68rem', color: paymentOption === 'PayFull' ? '#0F5132' : '#64748B', fontWeight: 600 }}>
                    100% Upfront
                  </span>
                </button>

                {/* 2. Advance Card */}
                <button
                  type="button"
                  id="btn-kit-advance"
                  onClick={() => handlePaymentOptionChange('Advance')}
                  style={{
                    padding: '12px 6px',
                    borderRadius: 'var(--radius-lg)',
                    border: paymentOption === 'Advance' ? '2.5px solid #D97706' : '1px solid #CBD5E1',
                    background: paymentOption === 'Advance' ? '#FEF3C7' : '#FFFFFF',
                    color: paymentOption === 'Advance' ? '#B45309' : '#334155',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 5,
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: paymentOption === 'Advance' ? '0 0 14px rgba(217, 119, 6, 0.35)' : 'none',
                    position: 'relative'
                  }}
                >
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: paymentOption === 'Advance' ? '#D97706' : '#E2E8F0',
                    color: paymentOption === 'Advance' ? '#FFFFFF' : '#475569',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Clock size={15} />
                  </div>
                  <span style={{ fontWeight: 800, fontSize: '0.84rem' }}>Advance</span>
                  <span style={{ fontSize: '0.68rem', color: paymentOption === 'Advance' ? '#78350F' : '#64748B', fontWeight: 600 }}>
                    Partial Advance
                  </span>
                </button>

                {/* 3. Book Card */}
                <button
                  type="button"
                  id="btn-kit-book"
                  onClick={() => handlePaymentOptionChange('Book')}
                  style={{
                    padding: '12px 6px',
                    borderRadius: 'var(--radius-lg)',
                    border: paymentOption === 'Book' ? '2.5px solid #2C82C9' : '1px solid #CBD5E1',
                    background: paymentOption === 'Book' ? '#EDF4FA' : '#FFFFFF',
                    color: paymentOption === 'Book' ? '#2C82C9' : '#334155',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 5,
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: paymentOption === 'Book' ? '0 0 14px rgba(44, 130, 201, 0.35)' : 'none',
                    position: 'relative'
                  }}
                >
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: paymentOption === 'Book' ? '#2C82C9' : '#E2E8F0',
                    color: paymentOption === 'Book' ? '#FFFFFF' : '#475569',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <BookmarkCheck size={15} />
                  </div>
                  <span style={{ fontWeight: 800, fontSize: '0.84rem' }}>Booking</span>
                  <span style={{ fontSize: '0.68rem', color: paymentOption === 'Book' ? '#1E3A8A' : '#64748B', fontWeight: 600 }}>
                    Reserve Kits
                  </span>
                </button>
              </div>
            </div>

            {/* Dynamic Amount Paid / Balance Row (If Advance or Book) */}
            {paymentOption !== 'PayFull' && (
              <div style={{
                padding: '14px 16px',
                borderRadius: 'var(--radius-lg)',
                background: paymentOption === 'Advance' ? '#FFFBEB' : '#F4F9FD',
                border: paymentOption === 'Advance' ? '1.5px solid #FDE68A' : '1.5px solid #B8D4EE',
                boxShadow: paymentOption === 'Advance' ? '0 2px 10px rgba(253, 230, 138, 0.3)' : '0 2px 10px rgba(184, 212, 238, 0.3)',
                marginBottom: 20
              }}>
                {paymentOption === 'Advance' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'center' }}>
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        color: '#92400E',
                        textTransform: 'uppercase',
                        marginBottom: 4
                      }}>
                        Advance Paid Now (₹) *
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
                        onKeyDown={(e) => {
                          if (['.', ',', 'e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
                        }}
                        style={{
                          fontWeight: 800,
                          fontSize: '1.05rem',
                          color: '#92400E',
                          background: '#FFFFFF'
                        }}
                        placeholder="0"
                      />
                    </div>

                    <div style={{
                      textAlign: 'right',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: '#FFFFFF',
                      border: '1px solid rgba(0,0,0,0.06)'
                    }}>
                      <span style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 800, textTransform: 'uppercase' }}>
                        Remaining Balance
                      </span>
                      <div style={{ fontSize: '1.25rem', fontWeight: 900, color: balanceAmount > 0 ? '#B91C1C' : '#008A2E' }}>
                        ₹{balanceAmount.toLocaleString('en-IN')}
                      </div>
                      <span style={{ fontSize: '0.68rem', color: '#64748B' }}>
                        Total: ₹{totalAmount.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                ) : (
                  /* Booking Option: No initial paid amount field! Full balance amount filled */
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 12
                  }}>
                    <div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        color: '#1D4ED8',
                        textTransform: 'uppercase',
                        marginBottom: 3
                      }}>
                        <BookmarkCheck size={16} />
                        <span>Booking Reservation (Zero Advance)</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 500 }}>
                        No upfront payment collected. Total donation value will be recorded as balance due.
                      </div>
                    </div>

                    <div style={{
                      textAlign: 'right',
                      padding: '8px 14px',
                      borderRadius: 'var(--radius-md)',
                      background: '#FFFFFF',
                      border: '1.5px solid #B8D4EE',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      minWidth: 150
                    }}>
                      <span style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 800, textTransform: 'uppercase', display: 'block' }}>
                        Balance Amount Due
                      </span>
                      <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#B91C1C', lineHeight: 1.1 }}>
                        ₹{totalAmount.toLocaleString('en-IN')}
                      </div>
                      <span style={{ fontSize: '0.68rem', color: '#64748B' }}>
                        Total: ₹{totalAmount.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Payment Mode Selector */}
            <div style={{ marginBottom: 18 }}>
              <label style={{
                display: 'block',
                fontSize: '0.76rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#334155',
                marginBottom: 6
              }}>
                Payment Mode
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                {(['Cash', 'UPI', 'BankTransfer', 'Cheque'] as PaymentMode[]).map((mode) => (
                  <button
                    type="button"
                    key={mode}
                    onClick={() => setPaymentMode(mode)}
                    style={{
                      padding: '9px 2px',
                      borderRadius: 'var(--radius-md)',
                      border: paymentMode === mode ? '2px solid #008A2E' : '1px solid #CBD5E1',
                      background: paymentMode === mode ? '#EBF7EE' : '#FFFFFF',
                      color: paymentMode === mode ? '#008A2E' : '#475569',
                      fontWeight: 800,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {mode === 'BankTransfer' ? 'Bank' : mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Reference & Notes toggle */}
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
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <span>{showExtraDetails ? '− Hide Reference / Notes' : '+ Add Transaction Reference / Notes (Optional)'}</span>
              </button>

              {showExtraDetails && (
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="UPI Reference, Cheque No, Transaction ID (Optional)"
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

            {/* Submit Actions */}
            <div style={{ display: 'flex', gap: 10 }}>
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="btn-secondary"
                  style={{ flex: 1, padding: '13px' }}
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{
                  flex: 2,
                  padding: '14px',
                  fontSize: '1rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  background: paymentOption === 'Advance' ? '#D97706' : paymentOption === 'Book' ? '#2C82C9' : '#008A2E'
                }}
              >
                {loading ? (
                  <RefreshCw size={20} className="animate-spin" />
                ) : (
                  <span>
                    {paymentOption === 'PayFull'
                      ? `Pay Full ₹${totalAmount.toLocaleString('en-IN')} & Register`
                      : paymentOption === 'Advance'
                        ? `Pay Advance ₹${(initialAmountPaid || 0).toLocaleString('en-IN')} & Register`
                        : `Book Kits & Register (${initialAmountPaid ? `₹${initialAmountPaid.toLocaleString('en-IN')} Paid` : 'Pay Later'})`}
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Kit Donation Receipt Modal */}
      {activeDonationReceipt && (
        <ReceiptModal
          donation={activeDonationReceipt}
          onClose={() => setActiveDonationReceipt(null)}
          onOpenPayBalance={(don) => {
            setBalanceDonationToCollect(don);
            setActiveDonationReceipt(null);
          }}
        />
      )}

      {/* Kit Donation Balance Collection Modal */}
      {balanceDonationToCollect && (
        <CollectBalanceModal
          donation={balanceDonationToCollect}
          onClose={() => setBalanceDonationToCollect(null)}
          onDonationPaymentRecorded={(updated) => {
            setBalanceDonationToCollect(null);
            setActiveDonationReceipt(updated);
            if (onSuccess) onSuccess(updated);
          }}
        />
      )}

      {/* Corporate Sponsorship Receipt Modal */}
      {activeSponsorshipReceipt && (
        <SponsorshipReceiptModal
          sponsorship={activeSponsorshipReceipt}
          onClose={() => setActiveSponsorshipReceipt(null)}
        />
      )}
    </div>
  );
};

