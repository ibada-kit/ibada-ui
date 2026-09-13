import React, { useState, useEffect } from 'react';
import { Building2, Award, MapPin, RefreshCw, PlusCircle } from 'lucide-react';
import { sponsorshipsApi } from '../services/api';
import type { SponsorshipLeaderboardResponse } from '../types';

interface SponsorshipLeaderboardViewProps {
  onOpenSponsorshipModal?: () => void;
}

export const SponsorshipLeaderboardView: React.FC<SponsorshipLeaderboardViewProps> = ({
  onOpenSponsorshipModal
}) => {
  const [data, setData] = useState<SponsorshipLeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'collectors' | 'wards' | 'firms'>('collectors');

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      const res = await sponsorshipsApi.getLeaderboard();
      setData(res);
    } catch (err) {
      console.warn('Could not load corporate leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const summary = data?.summary || {
    totalSponsorships: 0,
    totalCommittedAmount: 0,
    totalPaidAmount: 0,
    totalPendingBalance: 0,
    completedCount: 0,
    partialCount: 0,
    bookedCount: 0
  };

  const hasSponsorships = summary.totalSponsorships > 0 ||
    (data?.topCollectors && data.topCollectors.length > 0) ||
    (data?.topSponsoringFirms && data.topSponsoringFirms.length > 0);

  const getRankBadgeIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  if (loading && !data) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 20px',
        gap: 12
      }}>
        <RefreshCw size={28} className="animate-spin" color="#2C82C9" />
        <span style={{ color: '#64748B', fontSize: '0.9rem' }}>
          Loading corporate sponsorship leaderboard...
        </span>
      </div>
    );
  }

  return (
    <div>
      {/* 4 Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 14,
        marginBottom: 24
      }}>
        {/* Card 1: Collected Amount */}
        <div className="glass-card" style={{ padding: '18px 20px', background: '#FFFFFF' }}>
          <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700 }}>
            Total Corporate Funds Collected
          </span>
          <div style={{ fontSize: '1.7rem', fontWeight: 900, color: '#008A2E', marginTop: 4 }}>
            ₹{summary.totalPaidAmount.toLocaleString('en-IN')}
          </div>
          <span style={{ fontSize: '0.74rem', color: '#64748B', display: 'block', marginTop: 2 }}>
            Fully or partially realized funds
          </span>
        </div>

        {/* Card 2: Committed Amount */}
        <div className="glass-card" style={{ padding: '18px 20px', background: '#FFFFFF' }}>
          <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700 }}>
            Total Committed Sponsorships
          </span>
          <div style={{ fontSize: '1.7rem', fontWeight: 900, color: '#2C82C9', marginTop: 4 }}>
            ₹{summary.totalCommittedAmount.toLocaleString('en-IN')}
          </div>
          <span style={{ fontSize: '0.74rem', color: '#64748B', display: 'block', marginTop: 2 }}>
            Across {summary.totalSponsorships} packages
          </span>
        </div>

        {/* Card 3: Pending Balance */}
        <div className="glass-card" style={{ padding: '18px 20px', background: '#FFFFFF' }}>
          <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700 }}>
            Pending Balance Amount
          </span>
          <div style={{ fontSize: '1.7rem', fontWeight: 900, color: summary.totalPendingBalance > 0 ? '#B91C1C' : '#0F172A', marginTop: 4 }}>
            ₹{summary.totalPendingBalance.toLocaleString('en-IN')}
          </div>
          <span style={{ fontSize: '0.74rem', color: '#64748B', display: 'block', marginTop: 2 }}>
            To be collected from Booked & Advance
          </span>
        </div>

        {/* Card 4: Status Breakdown */}
        <div className="glass-card" style={{ padding: '18px 20px', background: '#FFFFFF' }}>
          <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700 }}>
            Packages Count by Status
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <span style={{
              fontSize: '0.78rem',
              fontWeight: 800,
              background: '#EBF7EE',
              color: '#008A2E',
              padding: '4px 8px',
              borderRadius: 6
            }}>
              {summary.completedCount} Paid
            </span>
            <span style={{
              fontSize: '0.78rem',
              fontWeight: 800,
              background: '#FEF3C7',
              color: '#B45309',
              padding: '4px 8px',
              borderRadius: 6
            }}>
              {summary.partialCount} Advance
            </span>
            <span style={{
              fontSize: '0.78rem',
              fontWeight: 800,
              background: '#EDF4FA',
              color: '#2C82C9',
              padding: '4px 8px',
              borderRadius: 6
            }}>
              {summary.bookedCount} Booked
            </span>
          </div>
        </div>
      </div>

      {/* Conditional Rendering: Zero State vs Populated Leaderboard */}
      {!hasSponsorships ? (
        /* ZERO SPONSORSHIPS COLLECTED YET FALLBACK */
        <div style={{
          background: '#FFFFFF',
          borderRadius: 'var(--radius-xl)',
          padding: '48px 24px',
          textAlign: 'center',
          border: '1px dashed #CBD5E1',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            background: '#F1F5F9',
            border: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
            color: '#64748B'
          }}>
            <Building2 size={32} />
          </div>

          <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0F172A', margin: '0 0 8px 0' }}>
            Zero sponsorships collected yet
          </h3>

          <p style={{ fontSize: '0.9rem', color: '#64748B', maxWidth: 480, margin: '0 auto 24px auto', lineHeight: 1.5 }}>
            No corporate or organization sponsorships have been recorded so far for this drive.
            Be the first fundraiser or committee member to record a business sponsorship!
          </p>

          {onOpenSponsorshipModal && (
            <button
              onClick={onOpenSponsorshipModal}
              className="btn-primary"
              style={{
                padding: '12px 24px',
                fontSize: '0.95rem',
                fontWeight: 800,
                background: '#2C82C9',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <PlusCircle size={18} />
              <span>Record First Corporate Sponsorship</span>
            </button>
          )}
        </div>
      ) : (
        /* POPULATED LEADERBOARD TABS */
        <div>
          {/* Sub-tabs strip */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <div className="tab-strip" style={{ background: '#FFFFFF', margin: 0 }}>
              <button
                onClick={() => setActiveSubTab('collectors')}
                className={`tab-strip-btn ${activeSubTab === 'collectors' ? 'active' : ''}`}
                style={{
                  background: activeSubTab === 'collectors' ? '#2C82C9' : 'transparent',
                  color: activeSubTab === 'collectors' ? '#FFFFFF' : '#64748B',
                  fontWeight: 700
                }}
              >
                <Award size={15} />
                <span>Top Collectors ({data?.topCollectors?.length || 0})</span>
              </button>

              <button
                onClick={() => setActiveSubTab('wards')}
                className={`tab-strip-btn ${activeSubTab === 'wards' ? 'active' : ''}`}
                style={{
                  background: activeSubTab === 'wards' ? '#2C82C9' : 'transparent',
                  color: activeSubTab === 'wards' ? '#FFFFFF' : '#64748B',
                  fontWeight: 700
                }}
              >
                <MapPin size={15} />
                <span>Top Wards ({data?.topWards?.length || 0})</span>
              </button>

              <button
                onClick={() => setActiveSubTab('firms')}
                className={`tab-strip-btn ${activeSubTab === 'firms' ? 'active' : ''}`}
                style={{
                  background: activeSubTab === 'firms' ? '#2C82C9' : 'transparent',
                  color: activeSubTab === 'firms' ? '#FFFFFF' : '#64748B',
                  fontWeight: 700
                }}
              >
                <Building2 size={15} />
                <span>Sponsoring Firms ({data?.topSponsoringFirms?.length || 0})</span>
              </button>
            </div>

            <button
              onClick={loadLeaderboard}
              className="btn-secondary"
              style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
              title="Refresh corporate leaderboard"
            >
              <RefreshCw size={14} />
              <span>Refresh</span>
            </button>
          </div>

          {/* Sub-Tab 1: Top Collectors */}
          {activeSubTab === 'collectors' && (
            <div className="glass-card" style={{ background: '#FFFFFF', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <div className="leaderboard-row leaderboard-header">
                <span>Rank</span>
                <span>Fundraiser Name</span>
                <span className="col-ward">Ward</span>
                <span style={{ textAlign: 'center' }}>Sponsorships</span>
                <span style={{ textAlign: 'right' }}>Collected (₹)</span>
              </div>

              {(data?.topCollectors || []).map((c, idx) => (
                <div
                  key={c.userId || idx}
                  className="leaderboard-row glass-card-interactive"
                  style={{ borderBottom: '1px solid var(--border-subtle)' }}
                >
                  <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                    {getRankBadgeIcon(c.position || idx + 1)}
                  </div>

                  <div>
                    <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.92rem' }}>
                      {c.name}
                    </div>
                    <span className="badge badge-blue" style={{ fontSize: '0.62rem', padding: '1px 5px', marginTop: 2 }}>
                      {c.role || 'Coordinator'}
                    </span>
                  </div>

                  <div className="col-ward">
                    <span className="badge badge-blue" style={{ fontSize: '0.65rem' }}>
                      Ward {c.wardNumber}
                    </span>
                  </div>

                  <div style={{ textAlign: 'center', fontWeight: 800, color: '#2C82C9', fontSize: '0.98rem' }}>
                    {c.sponsorshipCount} <span style={{ fontSize: '0.7rem', color: '#64748B', display: 'block' }}>packages</span>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 900, color: '#008A2E', fontSize: '1rem' }}>
                      ₹{c.totalPaidAmount.toLocaleString('en-IN')}
                    </div>
                    {c.balanceAmount > 0 && (
                      <span style={{ fontSize: '0.7rem', color: '#B91C1C', display: 'block' }}>
                        ₹{c.balanceAmount.toLocaleString('en-IN')} pending
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {(!data?.topCollectors || data.topCollectors.length === 0) && (
                <div style={{ padding: '32px', textAlign: 'center', color: '#64748B', fontSize: '0.88rem' }}>
                  No collector rankings available yet.
                </div>
              )}
            </div>
          )}

          {/* Sub-Tab 2: Top Wards */}
          {activeSubTab === 'wards' && (
            <div style={{ display: 'grid', gap: 14 }}>
              {(data?.topWards || []).map((w, idx) => (
                <div
                  key={w.wardNumber || idx}
                  className="glass-card"
                  style={{
                    padding: '18px 22px',
                    background: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: idx === 0 ? '#FEF3C7' : '#F1F5F9',
                      border: idx === 0 ? '1px solid #FCD34D' : '1px solid #E2E8F0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 900,
                      fontSize: '1rem',
                      color: idx === 0 ? '#92400E' : '#0F172A'
                    }}>
                      #{w.position || idx + 1}
                    </div>
                    <div>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                        {w.wardName || `Ward ${w.wardNumber}`}
                      </h4>
                      <span style={{ fontSize: '0.76rem', color: '#64748B' }}>
                        {w.sponsorshipCount} Corporate {w.sponsorshipCount === 1 ? 'Sponsorship' : 'Sponsorships'}
                      </span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#008A2E' }}>
                      ₹{w.totalPaidAmount.toLocaleString('en-IN')}
                    </div>
                    <span style={{ fontSize: '0.74rem', color: '#64748B' }}>
                      Committed: ₹{w.totalCommittedAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              ))}

              {(!data?.topWards || data.topWards.length === 0) && (
                <div style={{ padding: '32px', textAlign: 'center', color: '#64748B', fontSize: '0.88rem' }}>
                  No ward sponsorship data logged yet.
                </div>
              )}
            </div>
          )}

          {/* Sub-Tab 3: Sponsoring Firms */}
          {activeSubTab === 'firms' && (
            <div style={{ display: 'grid', gap: 12 }}>
              {(data?.topSponsoringFirms || []).map((firm, idx) => (
                <div
                  key={idx}
                  className="glass-card"
                  style={{
                    padding: '16px 20px',
                    background: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 42,
                      height: 42,
                      borderRadius: 12,
                      background: '#EDF4FA',
                      border: '1px solid #B8D4EE',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#2C82C9',
                      flexShrink: 0
                    }}>
                      <Building2 size={20} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                        {firm.firmName}
                      </h4>
                      <p style={{ fontSize: '0.76rem', color: '#64748B', margin: '2px 0 0 0' }}>
                        {firm.quantity}x {firm.itemName} • Collected by <strong>{firm.collectedByName || 'Field Lead'}</strong>
                      </p>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0F172A' }}>
                      ₹{firm.totalAmount.toLocaleString('en-IN')}
                    </div>
                    <span style={{
                      display: 'inline-block',
                      marginTop: 2,
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '2px 7px',
                      borderRadius: 9999,
                      background: firm.paymentStatus === 'Completed' ? '#EBF7EE' : firm.paymentStatus === 'Partial' ? '#FEF3C7' : '#EDF4FA',
                      color: firm.paymentStatus === 'Completed' ? '#008A2E' : firm.paymentStatus === 'Partial' ? '#B45309' : '#2C82C9',
                      border: firm.paymentStatus === 'Completed' ? '1px solid #A5D6B8' : firm.paymentStatus === 'Partial' ? '1px solid #FCD34D' : '1px solid #B8D4EE'
                    }}>
                      {firm.paymentStatus}
                    </span>
                  </div>
                </div>
              ))}

              {(!data?.topSponsoringFirms || data.topSponsoringFirms.length === 0) && (
                <div style={{ padding: '32px', textAlign: 'center', color: '#64748B', fontSize: '0.88rem' }}>
                  No firm sponsorships recorded yet.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
