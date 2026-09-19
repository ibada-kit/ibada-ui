import React, { useState, useEffect } from 'react';
import { Building2, Award, MapPin, RefreshCw, PlusCircle, ShieldCheck, Package, CheckCircle2, Clock, Bookmark } from 'lucide-react';
import { sponsorshipsApi, getCurrentUser } from '../services/api';
import type { SponsorshipLeaderboardResponse, User } from '../types';
import { ScrollableTabStrip } from './ScrollableTabStrip';

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
  const isWardCommittee = effectiveUser?.role === 'WardCommittee';
  const isGeneralCoordinator = effectiveUser?.role === 'Coordinator' && (!effectiveUser?.wardNumber || Number(effectiveUser?.wardNumber) === 0);
  const isCoordinator = effectiveUser?.role === 'Coordinator';
  const canViewItemBreakdown = isAdmin || isWardCommittee || isGeneralCoordinator || isCoordinator;

  const [data, setData] = useState<SponsorshipLeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'collectors' | 'wards' | 'firms' | 'items'>('collectors');

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
    totalIndividualItems: 0,
    totalCommittedAmount: 0,
    totalPaidAmount: 0,
    totalPendingBalance: 0,
    completedCount: 0,
    partialCount: 0,
    bookedCount: 0
  };

  const itemBreakdown = data?.itemBreakdown || [];
  const totalIndividualItems = summary.totalIndividualItems || itemBreakdown.reduce((sum, it) => sum + (it.totalQuantity || 0), 0);

  const hasSponsorships = summary.totalSponsorships > 0 ||
    (data?.topCollectors && data.topCollectors.length > 0) ||
    (data?.topSponsoringFirms && data.topSponsoringFirms.length > 0) ||
    itemBreakdown.length > 0;

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
            Across {summary.totalSponsorships} {summary.totalSponsorships === 1 ? 'package' : 'packages'}
            {canViewItemBreakdown && totalIndividualItems > 0 ? ` • ${totalIndividualItems} Total Items` : ''}
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

      {/* Privileged Overview: Individual Sponsor Items & Counts Banner */}
      {canViewItemBreakdown && itemBreakdown.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #F8FAFC 0%, #EDF4FA 100%)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid #B8D4EE',
          padding: '12px 16px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: '#2C82C9',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Package size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0F172A' }}>
                Total Individual Items: <span style={{ color: '#008A2E', fontWeight: 900 }}>{totalIndividualItems} Units</span> across {itemBreakdown.length} package types
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                {isAdmin
                  ? 'All campaign sponsorships'
                  : isGeneralCoordinator
                  ? 'Campaign-wide coordinator scope'
                  : `Ward ${effectiveUser?.wardNumber || ''} scope`}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {itemBreakdown.slice(0, 3).map((it, idx) => (
                <span
                  key={it.itemId || idx}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: 'var(--radius-full)',
                    padding: '3px 10px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    color: '#334155',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5
                  }}
                >
                  <span style={{ color: '#2C82C9', fontWeight: 800 }}>{it.totalQuantity}x</span>
                  <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {it.itemName}
                  </span>
                </span>
              ))}
              {itemBreakdown.length > 3 && (
                <span style={{
                  background: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: 'var(--radius-full)',
                  padding: '3px 8px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: '#64748B'
                }}>
                  +{itemBreakdown.length - 3} more
                </span>
              )}
            </div>

            <button
              onClick={() => setActiveSubTab('items')}
              className="btn-secondary"
              style={{
                padding: '6px 12px',
                fontSize: '0.76rem',
                fontWeight: 800,
                background: activeSubTab === 'items' ? '#2C82C9' : '#FFFFFF',
                color: activeSubTab === 'items' ? '#FFFFFF' : '#2C82C9',
                borderColor: '#B8D4EE'
              }}
            >
              {activeSubTab === 'items' ? 'Viewing Items' : 'View Items'}
            </button>
          </div>
        </div>
      )}

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
            <div style={{ flex: '1 1 auto', minWidth: 0, maxWidth: '100%' }}>
              <ScrollableTabStrip activeKey={activeSubTab} style={{ background: '#FFFFFF', margin: 0 }}>
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
                    <span>{isAdmin ? 'All Sponsoring Firms' : isGeneralCoordinator ? 'Campaign Sponsoring Firms' : `Ward ${effectiveUser?.wardNumber || ''} Sponsoring Firms`} ({data?.topSponsoringFirms?.length || 0})</span>
                  </button>
                )}

                {canViewItemBreakdown && (
                  <button
                    onClick={() => setActiveSubTab('items')}
                    className={`tab-strip-btn ${activeSubTab === 'items' ? 'active' : ''}`}
                    style={{
                      background: activeSubTab === 'items' ? '#2C82C9' : 'transparent',
                      color: activeSubTab === 'items' ? '#FFFFFF' : '#64748B',
                      fontWeight: 700
                    }}
                  >
                    <Package size={15} />
                    <span>Item Breakdown ({itemBreakdown.length} items • {totalIndividualItems} units)</span>
                  </button>
                )}
              </ScrollableTabStrip>
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
                      <div style={{ fontSize: '0.76rem', color: '#64748B', margin: '2px 0 0 0' }}>
                        {firm.itemName.includes('x ') ? (
                          <>
                            <span style={{
                              background: '#EDF4FA',
                              color: '#2C82C9',
                              border: '1px solid #B8D4EE',
                              padding: '1px 6px',
                              borderRadius: 4,
                              fontSize: '0.7rem',
                              fontWeight: 800,
                              marginRight: 6
                            }}>
                              {firm.quantity} Total Items
                            </span>
                            <span>{firm.itemName}</span>
                          </>
                        ) : (
                          <span>{firm.quantity}x {firm.itemName}</span>
                        )}
                        <span> • Collected by <strong>{firm.collectedByName || 'Field Lead'}</strong></span>
                        {firm.contactPerson && <span> • Contact: {firm.contactPerson}</span>}
                      </div>
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

          {/* SUB-TAB 4: INDIVIDUAL SPONSOR ITEMS & COUNTS BREAKDOWN */}
          {activeSubTab === 'items' && (
            <div>
              {/* Scope & Role Header Banner */}
              <div style={{
                background: '#F0FDF4',
                border: '1px solid #BBF7D0',
                borderRadius: 'var(--radius-lg)',
                padding: '14px 18px',
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 10
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: '#166534', fontWeight: 600 }}>
                  <ShieldCheck size={18} color="#16A34A" />
                  {isAdmin ? (
                    <span>Super Administrator View: Full breakdown of every individual sponsored item & kit count across all campaign wards.</span>
                  ) : isGeneralCoordinator ? (
                    <span>Campaign Coordinator View: Full breakdown of every individual sponsored item across the entire campaign.</span>
                  ) : (
                    <span>Ward Committee Lead View: Showing individual sponsored items and unit counts for Ward {effectiveUser?.wardNumber || ''}.</span>
                  )}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#166534', fontWeight: 800 }}>
                  Total: {totalIndividualItems} units ({summary.totalSponsorships} packages)
                </div>
              </div>

              {/* Items List Grid */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {itemBreakdown.map((item, idx) => (
                  <div
                    key={item.itemId || idx}
                    className="glass-card"
                    style={{
                      padding: '18px 20px',
                      background: '#FFFFFF',
                      borderRadius: 'var(--radius-lg)',
                      border: '1px solid var(--border-subtle)',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 14,
                      marginBottom: 12
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                        <div style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          background: '#EBF7EE',
                          border: '1px solid #A5D6B8',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#008A2E',
                          flexShrink: 0
                        }}>
                          <Package size={22} />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                              {item.itemName}
                            </h4>
                            <span style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              color: '#64748B',
                              background: '#F1F5F9',
                              padding: '2px 8px',
                              borderRadius: 9999
                            }}>
                              ₹{item.unitPrice.toLocaleString('en-IN')} / unit
                            </span>
                          </div>
                          <span style={{ fontSize: '0.74rem', color: '#64748B', display: 'block', marginTop: 3 }}>
                            Included in {item.sponsorshipsCount} {item.sponsorshipsCount === 1 ? 'sponsorship package' : 'sponsorship packages'}
                          </span>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{
                          fontSize: 'clamp(1.2rem, 3.5vw, 1.45rem)',
                          fontWeight: 900,
                          color: '#008A2E'
                        }}>
                          {item.totalQuantity} <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#64748B' }}>{item.totalQuantity === 1 ? 'unit' : 'units'}</span>
                        </div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A' }}>
                          ₹{item.totalAmount.toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>

                    {/* Status Pill Badges Row */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 8,
                      paddingTop: 10,
                      borderTop: '1px solid #F1F5F9',
                      fontSize: '0.76rem'
                    }}>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{
                          background: '#EBF7EE',
                          color: '#008A2E',
                          border: '1px solid #A5D6B8',
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}>
                          <CheckCircle2 size={12} /> {item.completedQuantity} Fully Paid
                        </span>

                        {item.partialQuantity > 0 && (
                          <span style={{
                            background: '#FEF3C7',
                            color: '#B45309',
                            border: '1px solid #FDE68A',
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          }}>
                            <Clock size={12} /> {item.partialQuantity} Advance Paid
                          </span>
                        )}

                        {item.bookedQuantity > 0 && (
                          <span style={{
                            background: '#EDF4FA',
                            color: '#2C82C9',
                            border: '1px solid #B8D4EE',
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          }}>
                            <Bookmark size={12} /> {item.bookedQuantity} Booked
                          </span>
                        )}
                      </div>

                      <div style={{ color: '#64748B', fontWeight: 600 }}>
                        Realized: <strong style={{ color: '#008A2E' }}>₹{item.amountPaid.toLocaleString('en-IN')}</strong>
                        {item.balanceAmount > 0 && (
                          <span style={{ marginLeft: 6, color: '#B91C1C' }}>
                            • Pending: <strong>₹{item.balanceAmount.toLocaleString('en-IN')}</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {itemBreakdown.length === 0 && (
                  <div style={{
                    padding: '40px 20px',
                    textAlign: 'center',
                    background: '#FFFFFF',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px dashed #CBD5E1',
                    color: '#64748B'
                  }}>
                    <Package size={32} style={{ margin: '0 auto 10px auto', opacity: 0.6 }} />
                    <p style={{ margin: 0, fontWeight: 700 }}>No individual sponsor items recorded in this scope yet.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
