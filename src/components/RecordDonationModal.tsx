import React, { useState } from 'react';
import type { Donation, SponsorshipRecord } from '../types';
import { donationsApi, KIT_UNIT_RATE } from '../services/api';
import confetti from 'canvas-confetti';
import { X, Heart, RefreshCw, AlertCircle, Sparkles, Building2 } from 'lucide-react';
import { SponsorshipForm } from './SponsorshipForm';

interface RecordDonationModalProps {
  onClose: () => void;
  onDonationRecorded: (donation: Donation) => void;
  onSponsorshipRecorded?: (sponsorship: SponsorshipRecord) => void;
}

export const RecordDonationModal: React.FC<RecordDonationModalProps> = ({
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

  const totalAmount = kitCount * KIT_UNIT_RATE;

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

    try {
      setLoading(true);
      const newDonation = await donationsApi.recordDonation({
        donorName: donorName.trim(),
        whatsAppNumber: `+91 ${cleanPhone.slice(-10)}`,
        kitCount
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
                  onClick={() => setKitCount(num)}
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
                onChange={(e) => setKitCount(Math.max(1, parseInt(e.target.value) || 1))}
              />
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                @ ₹500 each
              </span>
            </div>
          </div>

          {/* Live Total Calculation Card */}
          <div style={{
            background: '#F8FAFC',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            marginBottom: 24,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
                Total Donation Amount
              </span>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#256CAA' }}>
                ₹{totalAmount.toLocaleString('en-IN')}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className="badge badge-emerald">
                {kitCount} Relief {kitCount === 1 ? 'Kit' : 'Kits'}
              </span>
            </div>
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              id="btn-submit-donation"
              type="submit"
              className="btn-primary"
              style={{ flex: 1, padding: '13px' }}
              disabled={loading}
            >
              {loading ? (
                <RefreshCw size={18} className="animate-spin" />
              ) : (
                <>
                  <Sparkles size={17} />
                  <span>Generate Receipt & Submit</span>
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

