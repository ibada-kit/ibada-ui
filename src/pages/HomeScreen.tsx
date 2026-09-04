import React, { useState, useEffect, useMemo } from 'react';
import type { User, WeeklyMetrics, LeaderboardEntry, WardLeaderboardEntry, Donation } from '../types';
import { donationsApi } from '../services/api';
import {
  Trophy,
  TrendingUp,
  Package,
  Users,
  Award,
  Search,
  CheckCircle,
  ExternalLink,
  Sparkles,
  MapPin,
  RefreshCw,
  Eye
} from 'lucide-react';

interface HomeScreenProps {
  user: User | null;
  onOpenRecordModal: () => void;
  onViewReceipt: (donation: Donation) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  user,
  onOpenRecordModal,
  onViewReceipt
}) => {
  const [metrics, setMetrics] = useState<WeeklyMetrics | null>(null);
  const [volunteers, setVolunteers] = useState<LeaderboardEntry[]>([]);
  const [wards, setWards] = useState<WardLeaderboardEntry[]>([]);
  const [recentDonations, setRecentDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);

  // Leaderboard Tab & Filter
  const [activeTab, setActiveTab] = useState<'volunteers' | 'wards' | 'recent'>('volunteers');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWard, setSelectedWard] = useState<string>('all');
  
  // Admin-specific view filter (Admin can switch between All, Volunteers Only, or Coordinators Only)
  const [adminRoleFilter, setAdminRoleFilter] = useState<'all' | 'Volunteer' | 'Coordinator'>('all');

  const loadData = async () => {
    try {
      setLoading(true);
      const [m, v, w, d] = await Promise.all([
        donationsApi.getWeeklyMetrics(),
        donationsApi.getVolunteerLeaderboard(user?.role),
        donationsApi.getWardLeaderboard(),
        donationsApi.getRecentDonations(user?.role)
      ]);
      setMetrics(m);
      setVolunteers(v);
      setWards(w);
      setRecentDonations(d);
    } catch (err) {
      console.error('Failed to load home screen data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.role]);

  // Role-based scoping logic:
  // 1. Volunteer: Can see ONLY other volunteers
  // 2. Coordinator: Can see volunteers data
  // 3. Admin: Can see coordinators and volunteers data
  const scopedVolunteers = useMemo(() => {
    const role = user?.role || 'Volunteer';

    if (role === 'Volunteer') {
      return volunteers.filter((v) => v.role === 'Volunteer');
    } else if (role === 'Coordinator') {
      return volunteers.filter((v) => v.role === 'Volunteer');
    } else {
      // Admin
      if (adminRoleFilter === 'all') {
        return volunteers.filter((v) => v.role === 'Volunteer' || v.role === 'Coordinator');
      }
      return volunteers.filter((v) => v.role === adminRoleFilter);
    }
  }, [volunteers, user?.role, adminRoleFilter]);

  // Filter by search and ward, then re-rank sequentially
  const rankedVolunteers = useMemo(() => {
    const filtered = scopedVolunteers.filter((vol) => {
      const matchesSearch = vol.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesWard = selectedWard === 'all' || vol.wardNumber.toString() === selectedWard;
      return matchesSearch && matchesWard;
    });

    // Re-assign ranks 1, 2, 3... based on current filtered view
    return filtered.map((vol, index) => ({
      ...vol,
      dynamicRank: index + 1
    }));
  }, [scopedVolunteers, searchQuery, selectedWard]);

  // Top 3 Podium derived from the role-scoped, ranked list
  const top3 = rankedVolunteers.slice(0, 3);

  // Scoped Recent Donations:
  // Volunteers see only donations logged by Volunteers
  // Coordinators see donations logged by Volunteers
  // Admin sees donations logged by both Coordinators and Volunteers
  const scopedRecentDonations = useMemo(() => {
    const role = user?.role || 'Volunteer';
    if (role === 'Admin') {
      return recentDonations;
    }
    // Volunteers and Coordinators see volunteers data
    return recentDonations.filter((d) => d.collectedByRole === 'Volunteer' || !d.collectedByRole);
  }, [recentDonations, user?.role]);

  // Calculate Progress %
  const progressPercentage = metrics
    ? Math.min(100, Math.round((metrics.totalKits / metrics.targetKits) * 1000) / 10)
    : 0;

  if (loading && !metrics) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        gap: 12
      }}>
        <RefreshCw size={28} className="animate-spin" color="var(--primary)" />
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Loading weekly metrics & leaderboard...
        </span>
      </div>
    );
  }

  return (
    <main style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px 80px 20px' }}>
      
      {/* =========================================================================
          SECTION 1: TOTAL COLLECTED DONATIONS THIS WEEK
      ========================================================================= */}
      <section style={{ marginBottom: 36 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 12
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="badge badge-emerald">Week 3 Current Drive</span>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                {metrics ? `${metrics.startDate} – ${metrics.endDate}` : 'Current Week'}
              </span>
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: 4, letterSpacing: '-0.02em' }}>
              Weekly Donation Overview
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#34d399',
              padding: '6px 12px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.82rem',
              fontWeight: 600
            }}>
              <TrendingUp size={15} />
              +{metrics?.growthPercentage || 24.5}% vs last week
            </span>
          </div>
        </div>

        {/* Hero Banner with Big Stats */}
        <div className="glass-card" style={{
          padding: '32px 28px',
          background: 'linear-gradient(135deg, rgba(6, 78, 59, 0.35) 0%, rgba(15, 23, 42, 0.85) 60%)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Subtle Ambient Glow */}
          <div style={{
            position: 'absolute',
            top: -50,
            right: -50,
            width: 250,
            height: 250,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 28,
            alignItems: 'center'
          }}>
            {/* Primary Total Metrics */}
            <div>
              <span style={{
                fontSize: '0.82rem',
                textTransform: 'uppercase',
                fontWeight: 700,
                color: 'var(--text-secondary)',
                letterSpacing: '0.06em',
                display: 'block',
                marginBottom: 4
              }}>
                Total Funds Collected This Week
              </span>
              <div style={{
                fontSize: '3rem',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                color: '#ffffff',
                lineHeight: 1.1,
                display: 'flex',
                alignItems: 'baseline',
                gap: 8
              }}>
                <span style={{ color: 'var(--accent-gold)' }}>₹</span>
                <span>{metrics?.totalAmount.toLocaleString('en-IN') || '0'}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 12 }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'rgba(255, 255, 255, 0.08)',
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  color: 'var(--primary-light)'
                }}>
                  <Package size={18} color="var(--primary)" />
                  <span>{metrics?.totalKits || 0} Relief Kits</span>
                </div>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Fixed rate of ₹500/Kit
                </span>
              </div>
            </div>

            {/* Target Progress Bar & Daily Breakdown */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.25)',
              padding: '20px 22px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
                <div>
                  <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Weekly Campaign Target
                  </span>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                    {metrics?.totalKits} / {metrics?.targetKits} Kits ({progressPercentage}%)
                  </div>
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--accent-gold)', fontWeight: 600 }}>
                  Target: ₹{metrics?.targetAmount.toLocaleString('en-IN')}
                </span>
              </div>

              {/* Progress bar */}
              <div className="progress-container" style={{ marginBottom: 12 }}>
                <div className="progress-fill" style={{ width: `${progressPercentage}%` }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                <span>{metrics ? metrics.targetKits - metrics.totalKits : 0} kits needed to hit weekly goal</span>
                <span style={{ color: 'var(--primary-light)', fontWeight: 600 }}>{progressPercentage}% Achieved</span>
              </div>

              {/* Daily Velocity Mini-Graph */}
              <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                  Daily Kit Collections (Mon - Sun)
                </span>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 44 }}>
                  {metrics?.dailyBreakdown.map((d, i) => {
                    const maxKits = 120;
                    const heightPercent = Math.min(100, Math.max(15, (d.kits / maxKits) * 100));
                    return (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <div
                          title={`${d.day}: ${d.kits} kits (₹${d.amount.toLocaleString('en-IN')})`}
                          style={{
                            width: '100%',
                            height: `${heightPercent}%`,
                            background: i === 4 ? 'var(--primary)' : 'rgba(255, 255, 255, 0.15)',
                            borderRadius: 3,
                            transition: 'all 0.3s ease'
                          }}
                        />
                        <span style={{ fontSize: '0.66rem', color: i === 4 ? '#ffffff' : 'var(--text-muted)', fontWeight: i === 4 ? 700 : 400 }}>
                          {d.day}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Highlight Summary Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginTop: 18
        }}>
          {/* Card 1: Donors */}
          <div className="glass-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'rgba(56, 189, 248, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#38bdf8'
            }}>
              <Users size={22} />
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                Donors Participated
              </span>
              <div style={{ fontSize: '1.35rem', fontWeight: 800 }}>
                {metrics?.donorsCount || 0} Families
              </div>
            </div>
          </div>

          {/* Card 2: Average Kits */}
          <div className="glass-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'rgba(245, 158, 11, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-gold)'
            }}>
              <Sparkles size={22} />
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                Average Kits / Donor
              </span>
              <div style={{ fontSize: '1.35rem', fontWeight: 800 }}>
                {metrics ? (metrics.totalKits / (metrics.donorsCount || 1)).toFixed(1) : '3.0'} Kits
              </div>
            </div>
          </div>

          {/* Card 3: Top Ward */}
          <div className="glass-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'rgba(168, 85, 247, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#c084fc'
            }}>
              <Trophy size={22} />
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                Leading Ward
              </span>
              <div style={{ fontSize: '1.35rem', fontWeight: 800 }}>
                Ward {wards[0]?.wardNumber || 4} - {wards[0]?.wardName.split(' ')[0] || 'Kakkad'}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 2: WEEKLY LEADERBOARD WITH ROLE-BASED SCOPING
      ========================================================================= */}
      <section>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 16
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Trophy size={20} color="var(--accent-gold)" />
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                Weekly Leaderboard
              </h2>
            </div>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              Recognizing outstanding fundraisers & community campaign contributors
            </p>
          </div>

          {/* Tab Switcher */}
          <div style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.05)',
            padding: 4,
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)'
          }}>
            <button
              id="tab-btn-volunteers"
              onClick={() => setActiveTab('volunteers')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: activeTab === 'volunteers' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'volunteers' ? '#ffffff' : 'var(--text-secondary)',
                fontSize: '0.84rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <Award size={15} />
              <span>
                {user?.role === 'Admin' ? 'Fundraisers (Coordinators & Volunteers)' : 'Volunteers'}
              </span>
            </button>

            <button
              id="tab-btn-wards"
              onClick={() => setActiveTab('wards')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: activeTab === 'wards' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'wards' ? '#ffffff' : 'var(--text-secondary)',
                fontSize: '0.84rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <MapPin size={15} />
              <span>Top Wards</span>
            </button>

            <button
              id="tab-btn-recent"
              onClick={() => setActiveTab('recent')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: activeTab === 'recent' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'recent' ? '#ffffff' : 'var(--text-secondary)',
                fontSize: '0.84rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <CheckCircle size={15} />
              <span>Recent Donors</span>
            </button>
          </div>
        </div>

        {/* Role-Based Data Scope Banner */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          padding: '12px 18px',
          borderRadius: 'var(--radius-md)',
          background: user?.role === 'Admin'
            ? 'rgba(245, 158, 11, 0.1)'
            : user?.role === 'Coordinator'
            ? 'rgba(56, 189, 248, 0.1)'
            : 'rgba(16, 185, 129, 0.1)',
          border: user?.role === 'Admin'
            ? '1px solid rgba(245, 158, 11, 0.3)'
            : user?.role === 'Coordinator'
            ? '1px solid rgba(56, 189, 248, 0.3)'
            : '1px solid rgba(16, 185, 129, 0.3)',
          marginBottom: 20
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Eye size={18} color={user?.role === 'Admin' ? 'var(--accent-gold)' : user?.role === 'Coordinator' ? '#38bdf8' : 'var(--primary)'} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              {user?.role === 'Volunteer' && (
                <>Volunteer Access Mode: You can see only other volunteers' data.</>
              )}
              {user?.role === 'Coordinator' && (
                <>Coordinator Access Mode: You have visibility into all field volunteers' data.</>
              )}
              {user?.role === 'Admin' && (
                <>Administrator Access Mode: Full visibility across both coordinators and field volunteers.</>
              )}
            </span>
          </div>

          {/* Admin-only quick role filter buttons */}
          {user?.role === 'Admin' && activeTab === 'volunteers' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginRight: 4 }}>Filter View:</span>
              <button
                id="filter-admin-all"
                onClick={() => setAdminRoleFilter('all')}
                style={{
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: adminRoleFilter === 'all' ? '1px solid var(--accent-gold)' : '1px solid var(--border-subtle)',
                  background: adminRoleFilter === 'all' ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                  color: adminRoleFilter === 'all' ? '#fbbf24' : 'var(--text-secondary)',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                All (Coordinators & Volunteers)
              </button>
              <button
                id="filter-admin-volunteers"
                onClick={() => setAdminRoleFilter('Volunteer')}
                style={{
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: adminRoleFilter === 'Volunteer' ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                  background: adminRoleFilter === 'Volunteer' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                  color: adminRoleFilter === 'Volunteer' ? '#34d399' : 'var(--text-secondary)',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Volunteers Only
              </button>
              <button
                id="filter-admin-coordinators"
                onClick={() => setAdminRoleFilter('Coordinator')}
                style={{
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: adminRoleFilter === 'Coordinator' ? '1px solid #38bdf8' : '1px solid var(--border-subtle)',
                  background: adminRoleFilter === 'Coordinator' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                  color: adminRoleFilter === 'Coordinator' ? '#7dd3fc' : 'var(--text-secondary)',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Coordinators Only
              </button>
            </div>
          )}
        </div>

        {/* TAB 1: VOLUNTEERS / FUNDRAISERS LEADERBOARD */}
        {activeTab === 'volunteers' && (
          <div>
            {/* Top 3 Podium Visual */}
            {top3.length >= 3 && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 16,
                marginBottom: 28,
                alignItems: 'end'
              }}>
                {/* 2nd Place */}
                <div className="glass-card" style={{
                  padding: '24px 16px',
                  textAlign: 'center',
                  background: 'linear-gradient(180deg, rgba(148, 163, 184, 0.15) 0%, rgba(18, 26, 42, 0.7) 100%)',
                  border: '1px solid rgba(148, 163, 184, 0.3)'
                }}>
                  <div style={{
                    width: 46,
                    height: 46,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #94a3b8, #64748b)',
                    margin: '0 auto 10px auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem',
                    fontWeight: 800,
                    color: '#ffffff',
                    boxShadow: '0 4px 14px rgba(148, 163, 184, 0.4)'
                  }}>
                    🥈 2
                  </div>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{top3[1]?.name}</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
                    Ward {top3[1]?.wardNumber} • {top3[1]?.role}
                  </p>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary-light)' }}>
                    {top3[1]?.kitsCollected} Kits
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--accent-gold)', fontWeight: 600 }}>
                    ₹{top3[1]?.totalAmount.toLocaleString('en-IN')}
                  </div>
                </div>

                {/* 1st Place - Champion */}
                <div className="glass-card" style={{
                  padding: '30px 18px',
                  textAlign: 'center',
                  background: 'linear-gradient(180deg, rgba(245, 158, 11, 0.2) 0%, rgba(18, 26, 42, 0.85) 100%)',
                  border: '2px solid rgba(245, 158, 11, 0.5)',
                  transform: 'translateY(-8px)',
                  boxShadow: '0 12px 30px rgba(245, 158, 11, 0.2)'
                }}>
                  <div style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    margin: '0 auto 12px auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    fontWeight: 800,
                    color: '#ffffff',
                    boxShadow: '0 6px 20px rgba(245, 158, 11, 0.6)'
                  }}>
                    👑 1
                  </div>
                  <span className="badge badge-gold" style={{ marginBottom: 6 }}>
                    Drive Champion
                  </span>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: 4 }}>{top3[0]?.name}</h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 10 }}>
                    Ward {top3[0]?.wardNumber} • {top3[0]?.role}
                  </p>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary-light)' }}>
                    {top3[0]?.kitsCollected} Kits
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--accent-gold)', fontWeight: 700 }}>
                    ₹{top3[0]?.totalAmount.toLocaleString('en-IN')}
                  </div>
                </div>

                {/* 3rd Place */}
                <div className="glass-card" style={{
                  padding: '22px 16px',
                  textAlign: 'center',
                  background: 'linear-gradient(180deg, rgba(180, 83, 9, 0.15) 0%, rgba(18, 26, 42, 0.7) 100%)',
                  border: '1px solid rgba(180, 83, 9, 0.3)'
                }}>
                  <div style={{
                    width: 46,
                    height: 46,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #b45309, #78350f)',
                    margin: '0 auto 10px auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem',
                    fontWeight: 800,
                    color: '#ffffff',
                    boxShadow: '0 4px 14px rgba(180, 83, 9, 0.4)'
                  }}>
                    🥉 3
                  </div>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{top3[2]?.name}</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
                    Ward {top3[2]?.wardNumber} • {top3[2]?.role}
                  </p>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary-light)' }}>
                    {top3[2]?.kitsCollected} Kits
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--accent-gold)', fontWeight: 600 }}>
                    ₹{top3[2]?.totalAmount.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            )}

            {/* Filter & Search Bar */}
            <div style={{
              display: 'flex',
              gap: 12,
              marginBottom: 16,
              flexWrap: 'wrap'
            }}>
              <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
                <Search size={17} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  id="search-volunteer"
                  className="input-field"
                  style={{ paddingLeft: 40 }}
                  placeholder="Search by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div style={{ minWidth: 160 }}>
                <select
                  id="filter-ward"
                  className="input-field"
                  value={selectedWard}
                  onChange={(e) => setSelectedWard(e.target.value)}
                >
                  <option value="all">All Wards</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((w) => (
                    <option key={w} value={w.toString()}>Ward {w}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Detailed Rankings List */}
            <div className="glass-card" style={{ overflow: 'hidden' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '60px 2fr 1.2fr 1fr 1.2fr',
                padding: '14px 20px',
                background: 'rgba(255, 255, 255, 0.03)',
                borderBottom: '1px solid var(--border-subtle)',
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                letterSpacing: '0.04em'
              }}>
                <span>Rank</span>
                <span>Name</span>
                <span>Ward & Role</span>
                <span style={{ textAlign: 'center' }}>Kits</span>
                <span style={{ textAlign: 'right' }}>Total Raised</span>
              </div>

              {rankedVolunteers.map((vol) => {
                const isCurrentUser = user && vol.name.toLowerCase() === user.fullName.toLowerCase();
                return (
                  <div
                    key={vol.id}
                    className="glass-card-interactive"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '60px 2fr 1.2fr 1fr 1.2fr',
                      padding: '16px 20px',
                      alignItems: 'center',
                      borderBottom: '1px solid var(--border-subtle)',
                      background: isCurrentUser ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
                      borderLeft: isCurrentUser ? '3px solid var(--primary)' : 'none'
                    }}
                  >
                    {/* Rank */}
                    <div>
                      {vol.dynamicRank === 1 ? (
                        <span style={{ fontSize: '1.2rem' }}>🥇</span>
                      ) : vol.dynamicRank === 2 ? (
                        <span style={{ fontSize: '1.2rem' }}>🥈</span>
                      ) : vol.dynamicRank === 3 ? (
                        <span style={{ fontSize: '1.2rem' }}>🥉</span>
                      ) : (
                        <span style={{
                          fontWeight: 700,
                          fontSize: '0.92rem',
                          color: 'var(--text-muted)',
                          paddingLeft: 4
                        }}>
                          #{vol.dynamicRank}
                        </span>
                      )}
                    </div>

                    {/* Member Info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: vol.role === 'Coordinator'
                          ? 'linear-gradient(135deg, #38bdf8, #6366f1)'
                          : 'linear-gradient(135deg, #10b981, #0ea5e9)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.85rem'
                      }}>
                        {vol.name.charAt(0)}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{vol.name}</span>
                          {isCurrentUser && (
                            <span className="badge badge-emerald" style={{ fontSize: '0.62rem', padding: '1px 6px' }}>
                              You
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {vol.donationsCount} donations logged
                        </span>
                      </div>
                    </div>

                    {/* Ward & Role */}
                    <div>
                      <span className="badge badge-blue" style={{ fontSize: '0.7rem' }}>
                        Ward {vol.wardNumber}
                      </span>
                      <span className={`badge ${vol.role === 'Coordinator' ? 'badge-purple' : 'badge-emerald'}`} style={{ fontSize: '0.66rem', marginLeft: 6, padding: '2px 6px' }}>
                        {vol.role}
                      </span>
                    </div>

                    {/* Kits */}
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary-light)' }}>
                        {vol.kitsCollected}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block' }}>
                        kits
                      </span>
                    </div>

                    {/* Total Raised */}
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--accent-gold)' }}>
                        ₹{vol.totalAmount.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                );
              })}

              {rankedVolunteers.length === 0 && (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                  No members found matching the selected filters.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: WARDS COMPETITION */}
        {activeTab === 'wards' && (
          <div style={{ display: 'grid', gap: 16 }}>
            {wards.map((ward) => (
              <div key={ward.wardNumber} className="glass-card" style={{ padding: '22px 24px' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 14,
                  flexWrap: 'wrap',
                  gap: 12
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: ward.rank === 1 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      border: ward.rank === 1 ? '1px solid rgba(245, 158, 11, 0.5)' : '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '1rem',
                      color: ward.rank === 1 ? 'var(--accent-gold)' : 'var(--text-primary)'
                    }}>
                      #{ward.rank}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                        Ward {ward.wardNumber} — {ward.wardName}
                      </h3>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {ward.volunteerCount} Active Field Volunteers
                      </p>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-gold)' }}>
                      ₹{ward.totalAmount.toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: '0.84rem', color: 'var(--primary-light)', fontWeight: 600 }}>
                      {ward.kitsCollected} / {ward.targetKits} Kits ({ward.progressPercentage}%)
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="progress-container" style={{ height: 10 }}>
                  <div
                    className="progress-fill"
                    style={{
                      width: `${Math.min(100, ward.progressPercentage)}%`,
                      background: ward.rank === 1
                        ? 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)'
                        : undefined
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: RECENT DONATIONS FEED */}
        {activeTab === 'recent' && (
          <div style={{ display: 'grid', gap: 12 }}>
            {scopedRecentDonations.map((don) => (
              <div
                key={don.donationId}
                className="glass-card glass-card-interactive"
                style={{
                  padding: '18px 22px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 14
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: 'rgba(16, 185, 129, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--primary)'
                  }}>
                    <Package size={22} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>{don.donorName}</h4>
                    <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                      Ward {don.wardNumber}, {don.panchayath} • Logged by{' '}
                      <strong>{don.collectedByName || 'Volunteer'}</strong>
                      {don.collectedByRole && (
                        <span className={`badge ${don.collectedByRole === 'Coordinator' ? 'badge-blue' : 'badge-emerald'}`} style={{ fontSize: '0.62rem', marginLeft: 6, padding: '1px 6px' }}>
                          {don.collectedByRole}
                        </span>
                      )}
                    </p>
                    <span style={{
                      fontSize: '0.72rem',
                      color: 'var(--text-muted)',
                      letterSpacing: '0.04em',
                      fontFamily: 'monospace'
                    }}>
                      Token: {don.receiptToken}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-gold)' }}>
                      ₹{don.totalAmount.toLocaleString('en-IN')}
                    </div>
                    <span className="badge badge-emerald" style={{ fontSize: '0.72rem' }}>
                      {don.kitCount} Kits Sponsored
                    </span>
                  </div>

                  <button
                    onClick={() => onViewReceipt(don)}
                    className="btn-secondary"
                    style={{ padding: '8px 14px', fontSize: '0.82rem' }}
                  >
                    <span>View Badge</span>
                    <ExternalLink size={14} />
                  </button>
                </div>
              </div>
            ))}

            {scopedRecentDonations.length === 0 && (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                No donations found in your view scope.
              </div>
            )}
          </div>
        )}
      </section>

      {/* Quick Floating Action on Mobile */}
      <div style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 40
      }}>
        <button
          id="btn-floating-record"
          onClick={onOpenRecordModal}
          className="btn-primary"
          style={{
            padding: '14px 22px',
            borderRadius: 'var(--radius-full)',
            boxShadow: '0 8px 25px rgba(16, 185, 129, 0.5)'
          }}
        >
          <Package size={20} />
          <span>Record Donation</span>
        </button>
      </div>

    </main>
  );
};
