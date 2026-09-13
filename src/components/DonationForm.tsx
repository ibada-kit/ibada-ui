import React, { useState } from 'react';
import { Package, User, CheckCircle, AlertCircle, RefreshCw, Building2 } from 'lucide-react';
import { donationsApi } from '../services/api';
import type { Donation, SponsorshipRecord } from '../types';
import { SponsorshipForm } from './SponsorshipForm';
import { SponsorshipReceiptModal } from './SponsorshipReceiptModal';

interface DonationFormProps {
  kitPrice?: number;
  initialMode?: 'kit' | 'sponsorship';
  onSuccess?: (donation: Donation) => void;
  onSponsorshipSuccess?: (sponsorship: SponsorshipRecord) => void;
  onCancel?: () => void;
}

export const DonationForm: React.FC<DonationFormProps> = ({
  kitPrice = 1000,
  initialMode = 'kit',
  onSuccess,
  onSponsorshipSuccess,
  onCancel
}) => {
  const [formMode, setFormMode] = useState<'kit' | 'sponsorship'>(initialMode);
  const [activeSponsorshipReceipt, setActiveSponsorshipReceipt] = useState<SponsorshipRecord | null>(null);

  const [donorName, setDonorName] = useState('');
  const [whatsAppNumber, setWhatsAppNumber] = useState('');
  const [kitCount, setKitCount] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordedDonation, setRecordedDonation] = useState<Donation | null>(null);

  const totalAmount = kitCount * kitPrice;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setRecordedDonation(null);

    const cleanPhone = whatsAppNumber.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit WhatsApp number.');
      return;
    }

    if (!donorName.trim()) {
      setError('Donor name is required.');
      return;
    }

    try {
      setLoading(true);
      const donation = await donationsApi.recordDonation({
        donorName: donorName.trim(),
        whatsAppNumber: `+91${cleanPhone.slice(-10)}`,
        kitCount: Number(kitCount)
      });

      setRecordedDonation(donation);
      if (onSuccess) onSuccess(donation);

      // Reset form
      setDonorName('');
      setWhatsAppNumber('');
      setKitCount(1);
    } catch (err: any) {
      setError(err.message || 'Failed to record donation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 620, margin: '0 auto', width: '100%' }}>
      {/* Top Toggle Switcher: Same Form Container, Switch between Kit Donation & Corporate Sponsorship */}
      <div style={{
        display: 'flex',
        background: '#FFFFFF',
        padding: '5px',
        borderRadius: 'var(--radius-xl)',
        marginBottom: 18,
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
            padding: '11px 14px',
            borderRadius: 'var(--radius-lg)',
            border: formMode === 'kit' ? '1px solid #A5D6B8' : 'none',
            background: formMode === 'kit' ? '#EBF7EE' : 'transparent',
            color: formMode === 'kit' ? '#008A2E' : '#64748B',
            fontWeight: 800,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transition: 'all 0.15s ease'
          }}
        >
          <Package size={17} />
          <span>Relief Kit Donation</span>
        </button>

        <button
          id="btn-switch-sponsorship"
          type="button"
          onClick={() => setFormMode('sponsorship')}
          style={{
            flex: 1,
            padding: '11px 14px',
            borderRadius: 'var(--radius-lg)',
            border: formMode === 'sponsorship' ? '1px solid #B8D4EE' : 'none',
            background: formMode === 'sponsorship' ? '#EDF4FA' : 'transparent',
            color: formMode === 'sponsorship' ? '#2C82C9' : '#64748B',
            fontWeight: 800,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transition: 'all 0.15s ease'
          }}
        >
          <Building2 size={17} />
          <span>Corporate Sponsorship</span>
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

      {/* Success Alert */}
      {recordedDonation && (
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
            <span style={{ fontWeight: 800 }}>Donation Registered Successfully!</span>
            <div style={{ fontSize: '0.78rem', color: '#334155', marginTop: 3 }}>
              Receipt Token: <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#008A2E' }}>{recordedDonation.receiptToken}</span>
              {' '}• WhatsApp receipt triggered for {recordedDonation.whatsAppNumber}.
            </div>
          </div>
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

        {/* Kit Count Selector with Quick Pills */}
        <div style={{ marginBottom: 20 }}>
          <label style={{
            display: 'block',
            fontSize: '0.76rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#334155',
            marginBottom: 8
          }}>
            Number of Relief Kits
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 10 }}>
            {[1, 2, 5, 10].map((count) => (
              <button
                type="button"
                key={count}
                onClick={() => setKitCount(count)}
                style={{
                  padding: '10px 2px',
                  minHeight: 44,
                  borderRadius: 'var(--radius-md)',
                  border: kitCount === count ? '2px solid #008A2E' : '1px solid var(--border-subtle)',
                  background: kitCount === count ? '#EBF7EE' : '#F4F9FD',
                  color: kitCount === count ? '#008A2E' : '#334155',
                  fontWeight: 800,
                  fontSize: 'clamp(0.78rem, 2.8vw, 0.88rem)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {count} {count === 1 ? 'Kit' : 'Kits'}
              </button>
            ))}
          </div>

          <input
            type="number"
            min={1}
            max={1000}
            required
            className="input-field"
            value={kitCount}
            onChange={(e) => setKitCount(Math.max(1, parseInt(e.target.value) || 1))}
            placeholder="Custom Kit Count"
          />
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
          marginBottom: 22
        }}>
          <div>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700 }}>
              Total Contribution Amount
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
            {kitCount} Relief {kitCount === 1 ? 'Kit' : 'Kits'}
          </div>
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
              background: '#008A2E'
            }}
          >
            {loading ? (
              <RefreshCw size={20} className="animate-spin" />
            ) : (
              <span>Submit & Send Receipt</span>
            )}
          </button>
        </div>
      </form>
        </div>
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

