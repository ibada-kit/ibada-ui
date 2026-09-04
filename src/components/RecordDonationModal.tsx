import React, { useState } from 'react';
import type { Donation } from '../types';
import { donationsApi } from '../services/api';
import { KIT_UNIT_RATE } from '../services/mockData';
import confetti from 'canvas-confetti';
import { X, Heart, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';

interface RecordDonationModalProps {
  onClose: () => void;
  onDonationRecorded: (donation: Donation) => void;
}

export const RecordDonationModal: React.FC<RecordDonationModalProps> = ({
  onClose,
  onDonationRecorded
}) => {
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
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
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
              background: 'rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)'
            }}>
              <Heart size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Record Kit Donation</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                ₹500 per relief food & essential kit
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon" style={{ width: 32, height: 32 }}>
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fca5a5',
              fontSize: '0.84rem',
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
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRight: 'none',
                borderRadius: 'var(--radius-md) 0 0 var(--radius-md)',
                color: 'var(--text-secondary)',
                fontSize: '0.9rem'
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
                    border: kitCount === num ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                    background: kitCount === num ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                    color: kitCount === num ? 'var(--primary-light)' : 'var(--text-primary)',
                    fontWeight: 600,
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
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            marginBottom: 24,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                Total Donation Amount
              </span>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-gold)' }}>
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
      </div>
    </div>
  );
};
