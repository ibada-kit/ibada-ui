import React, { useState, useEffect } from 'react';
import { Building2, Award, MapPin, RefreshCw, PlusCircle, ShieldCheck } from 'lucide-react';
import { sponsorshipsApi, getCurrentUser } from '../services/api';
import type { SponsorshipLeaderboardResponse, User } from '../types';

interface SponsorshipLeaderboardViewProps {
  user?: User | null;
  onOpenSponsorshipModal?: () => void;
}

export const SponsorshipLeaderboardView: React.FC<SponsorshipLeaderboardViewProps> = ({
  user,
  onOpenSponsorshipModal
}) => {
  const effectiveUser = user ?? getCurrentUser();
  const isAuthenticated = !!effectiveUser;
  const isAdmin = effectiveUser?.role === 'Admin';

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
          Loading sponsorship leaderboard...
        </span>
      </div>
    );
  }

  return (
    <div>
      {/* 4 Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))',
        gap: 12,
        marginBottom: 20
      }}>
        {/* Card 1: Collected Amount */}
        <div className="glass-card" style={{ padding: '16px 18px', background: '#FFFFFF', minWidth: 0 }}>
          <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700, display: 'block' }}>
            Total Sponsorship Collected
          </span>
          <div style={{ fontSize: 'clamp(1.25rem, 3.5vw, 1.65rem)', fontWeight: 900, color: '#008A2E', marginTop: 4 }}>
            ₹{summary.totalPaidAmount.toLocaleString('en-IN')}
          </div>
          <span style={{ fontSize: '0.72rem', color: '#64748B', display: 'block', marginTop: 2 }}>
            Realized funds
          </span>
        </div>

        {/* Card 2: Committed Amount */}
        <div className="glass-card" style={{ padding: '16px 18px', background: '#FFFFFF', minWidth: 0 }}>
          <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700, display: 'block' }}>
            Total Committed
          </span>
          <div style={{ fontSize: 'clamp(1.25rem, 3.5vw, 1.65rem)', fontWeight: 900, color: '#2C82C9', marginTop: 4 }}>
            ₹{summary.totalCommittedAmount.toLocaleString('en-IN')}
          </div>
          <span style={{ fontSize: '0.72rem', color: '#64748B', display: 'block', marginTop: 2 }}>
            Across {summary.totalSponsorships} packages
          </span>
        </div>

        {/* Card 3: Pending Balance */}
        <div className="glass-card" style={{ padding: '16px 18px', background: '#FFFFFF', minWidth: 0 }}>
          <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700, display: 'block' }}>
            Pending Balance Amount
          </span>
          <div style={{ fontSize: 'clamp(1.25rem, 3.5vw, 1.65rem)', fontWeight: 900, color: summary.totalPendingBalance > 0 ? '#B91C1C' : '#0F172A', marginTop: 4 }}>
            ₹{summary.totalPendingBalance.toLocaleString('en-IN')}
          </div>
          <span style={{ fontSize: '0.72rem', color: '#64748B', display: 'block', marginTop: 2 }}>
            {summary.totalPendingBalance > 0 ? 'To be collected' : 'Fully settled'}
          </span>
        </div>

        {/* Card 4: Status Breakdown - 3-Column Equal Grid so items never truncate or overflow */}
        <div className="glass-card" style={{ padding: '16px 18px', background: '#FFFFFF', minWidth: 0, overflow: 'hidden' }}>
          <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700, display: 'block', whiteSpace: 'nowrap' }}>
            Packages Count by Status
          </span>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 6,
            marginTop: 8
          }}>
            <div style={{
              background: '#EBF7EE',
              borderRadius: 8,
              padding: '6px 4px',
              textAlign: 'center',
              border: '1px solid #A5D6B8'
            }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#008A2E', lineHeight: 1 }}>
                {summary.completedCount}
              </div>
              <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#008A2E', marginTop: 3, textTransform: 'uppercase' }}>
                Paid
              </div>
            </div>

            <div style={{
              background: '#FEF3C7',
              borderRadius: 8,
              padding: '6px 4px',
              textAlign: 'center',
              border: '1px solid #FDE68A'
            }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#B45309', lineHeight: 1 }}>
                {summary.partialCount}
              </div>
              <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#B45309', marginTop: 3, textTransform: 'uppercase' }}>
                Advance
              </div>
            </div>

            <div style={{
              background: '#EDF4FA',
              borderRadius: 8,
              padding: '6px 4px',
              textAlign: 'center',
              border: '1px solid #B8D4EE'
            }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#2C82C9', lineHeight: 1 }}>
                {summary.bookedCount}
              </div>
              <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#2C82C9', marginTop: 3, textTransform: 'uppercase' }}>
                Booked
              </div>
            </div>
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
            No sponsorships have been recorded so far for this drive.
            Be the first fundraiser or committee member to record a sponsorship!
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
              <span>Record First Sponsorship</span>
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

              {isAuthenticated && (
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
                  <span>{isAdmin ? 'All Sponsoring Firms' : `Ward ${effectiveUser?.wardNumber || ''} Sponsoring Firms`} ({data?.topSponsoringFirms?.length || 0})</span>
                </button>
              )}
            </div>

            <button
              onClick={loadLeaderboard}
              className="btn-secondary"
              style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
              title="Refresh leaderboard"
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
                <span>Fundraiser</span>
                <span className="col-ward">Ward</span>
                <span className="col-kits" style={{ textAlign: 'center' }}>Sponsorships</span>
                <span className="col-raised" style={{ textAlign: 'right' }}>Collected (₹)</span>
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
                    <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                      {c.role} • Ward {c.wardNumber || 'N/A'}
                      <span className="mobile-only-inline" style={{ color: '#2C82C9', fontWeight: 700 }}>
                        {' '}• {c.sponsorshipCount} {c.sponsorshipCount === 1 ? 'pkg' : 'pkgs'}
                      </span>
                    </div>
                  </div>

                  <div className="col-ward" style={{ fontWeight: 700, color: '#64748B', fontSize: '0.84rem' }}>
                    Ward {c.wardNumber}
                  </div>

                  <div className="col-kits" style={{ textAlign: 'center', fontWeight: 800, color: '#2C82C9' }}>
                    {c.sponsorshipCount}
                  </div>

                  <div className="col-raised" style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 900, color: '#008A2E', fontSize: '0.95rem' }}>
                      ₹{c.totalPaidAmount.toLocaleString('en-IN')}
                    </div>
                    {c.balanceAmount > 0 && (
                      <span style={{ fontSize: '0.68rem', color: '#B91C1C', fontWeight: 700 }}>
                        Bal: ₹{c.balanceAmount.toLocaleString('en-IN')}
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
                        {w.sponsorshipCount} {w.sponsorshipCount === 1 ? 'Sponsorship' : 'Sponsorships'}
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

          {/* Sub-Tab 3: Sponsoring Firms (Protected Access Model) */}
          {activeSubTab === 'firms' && isAuthenticated && (
            <div style={{ display: 'grid', gap: 12 }}>
              {/* Access Scope Banner */}
              <div style={{
                padding: '10px 16px',
                borderRadius: 'var(--radius-md)',
                background: isAdmin ? '#FEF3C7' : '#EDF4FA',
                border: isAdmin ? '1px solid #FCD34D' : '1px solid #B8D4EE',
                display: 'flex',
                alignItems: 'center',
                gap: 10
              }}>
                <ShieldCheck size={18} color={isAdmin ? '#B45309' : '#2C82C9'} />
                <div style={{ fontSize: '0.8rem', color: isAdmin ? '#92400E' : '#1E3A8A', fontWeight: 600 }}>
                  {isAdmin ? (
                    <span>Super Administrator: Viewing all sponsoring organizations across campaign wards.</span>
                  ) : (
                    <span>Restricted Access: Showing sponsoring firms collected in Ward {effectiveUser?.wardNumber || ''} by you and your ward members.</span>
                  )}
                </div>
              </div>

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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: '1 1 220px' }}>
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
                    <div style={{ minWidth: 0 }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', margin: 0, overflowWrap: 'break-word' }}>
                        {firm.firmName}
                      </h4>
                      <p style={{ fontSize: '0.76rem', color: '#64748B', margin: '2px 0 0 0' }}>
                        {firm.quantity}x {firm.itemName} • Collected by <strong>{firm.collectedByName || 'Field Lead'}</strong>
                        {firm.contactPerson && <> • Contact: {firm.contactPerson}</>}
                      </p>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0F172A' }}>
                      ₹{firm.totalAmount.toLocaleString('en-IN')}
                    </div>
                    {firm.balanceAmount > 0 ? (
                      <span style={{ fontSize: '0.7rem', color: '#B91C1C', fontWeight: 700, display: 'block' }}>
                        Paid: ₹{firm.amountPaid.toLocaleString('en-IN')} • Bal: ₹{firm.balanceAmount.toLocaleString('en-IN')}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.7rem', color: '#008A2E', fontWeight: 700, display: 'block' }}>
                        Paid in Full: ₹{firm.amountPaid.toLocaleString('en-IN')}
                      </span>
                    )}
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
                  {isAdmin
                    ? 'No firm sponsorships recorded yet.'
                    : `No firm sponsorships recorded yet for Ward ${effectiveUser?.wardNumber || ''}.`}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
