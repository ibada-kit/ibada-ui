import React, { useState, useEffect } from 'react';
import type { Donation, SponsorshipRecord } from '../types';
import { donationsApi, sponsorshipsApi } from '../services/api';
import { OfficialReceiptSlip } from '../components/OfficialReceiptSlip';
import { OfficialSponsorshipSlip } from '../components/OfficialSponsorshipSlip';
import { ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';

interface PublicReceiptViewProps {
  token: string;
}

/**
 * PublicReceiptView
 * Strictly one-directional, standalone public receipt viewer for donors.
 * Contains ZERO application management interfaces (no navbar, no login screen, no dashboards).
 */
export const PublicReceiptView: React.FC<PublicReceiptViewProps> = ({ token }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [donation, setDonation] = useState<Donation | null>(null);
  const [sponsorship, setSponsorship] = useState<SponsorshipRecord | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing receipt token.');
      setLoading(false);
      return;
    }

    const cleanToken = token.trim();
    setLoading(true);
    setError(null);

    if (cleanToken.toUpperCase().startsWith('SPON-')) {
      sponsorshipsApi.getSponsorshipByToken(cleanToken)
        .then((spon) => {
          if (spon) {
            setSponsorship(spon);
          } else {
            setError(`Official sponsorship receipt "${cleanToken}" not found.`);
          }
        })
        .catch(() => setError('Failed to retrieve receipt from server.'))
        .finally(() => setLoading(false));
    } else {
      donationsApi.getPublicReceipt(cleanToken)
        .then((don) => {
          if (don) {
            setDonation(don);
          } else {
            setError(`Official donation receipt "${cleanToken}" not found.`);
          }
        })
        .catch(() => setError('Failed to retrieve receipt from server.'))
        .finally(() => setLoading(false));
    }
  }, [token]);

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'linear-gradient(180deg, #F0FDF4 0%, #F8FAFC 35%, #F1F5F9 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '20px 14px 40px 14px',
      fontFamily: 'inherit',
      color: '#0F172A'
    }}>
      {/* 1. Header: Verified Official Organization Banner */}
      <header style={{
        width: '100%',
        maxWidth: 440,
        textAlign: 'center',
        marginBottom: 16
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: '#DCFCE7',
          border: '1px solid #86EFAC',
          color: '#166534',
          padding: '5px 14px',
          borderRadius: 9999,
          fontSize: '0.78rem',
          fontWeight: 800,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          marginBottom: 8,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}>
          <ShieldCheck size={16} color="#16a34a" />
          <span>Official Verified Receipt</span>
        </div>

        <h1 style={{
          fontSize: 'clamp(1.1rem, 4vw, 1.35rem)',
          fontWeight: 900,
          color: '#064E3B',
          margin: '4px 0 2px 0',
          letterSpacing: '-0.01em'
        }}>
          Shihab Thangal Centre
        </h1>
        <p style={{
          fontSize: '0.78rem',
          color: '#047857',
          fontWeight: 700,
          margin: 0
        }}>
          Social Welfare Complex • IUML Madavoor Panchayat
        </p>
      </header>

      {/* 2. Body State Handling */}
      {loading && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 280,
          gap: 12,
          color: '#059669'
        }}>
          <Loader2 size={36} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155' }}>
            Loading verified digital receipt...
          </span>
        </div>
      )}

      {error && !loading && (
        <div style={{
          width: '100%',
          maxWidth: 420,
          background: '#FEF2F2',
          border: '1px solid #FECACA',
          borderRadius: 14,
          padding: '24px 20px',
          textAlign: 'center',
          marginTop: 20
        }}>
          <AlertCircle size={36} color="#DC2626" style={{ margin: '0 auto 10px auto' }} />
          <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#991B1B', margin: '0 0 6px 0' }}>
            Receipt Not Available
          </h2>
          <p style={{ fontSize: '0.84rem', color: '#B91C1C', margin: 0, lineHeight: 1.4 }}>
            {error}
          </p>
          <p style={{ fontSize: '0.76rem', color: '#64748B', marginTop: 12 }}>
            Please check the link provided on WhatsApp or contact your ward coordinator.
          </p>
        </div>
      )}

      {/* 3. The Official Receipt Slip (Kit Donation) */}
      {!loading && donation && (
        <main style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: 440
        }}>
          <OfficialReceiptSlip donation={donation} showActions={true} />
        </main>
      )}

      {/* 4. The Official Receipt Slip (Corporate Sponsorship) */}
      {!loading && sponsorship && (
        <main style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: 440
        }}>
          <OfficialSponsorshipSlip sponsorship={sponsorship} showActions={true} />
        </main>
      )}
    </div>
  );
};
