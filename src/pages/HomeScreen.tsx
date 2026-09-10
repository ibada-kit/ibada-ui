import React, { useState, useEffect, useMemo } from 'react';
import type { User, WeeklyMetrics, LeaderboardEntry, WardLeaderboardEntry, Donation } from '../types';
import { donationsApi, KIT_UNIT_RATE } from '../services/api';
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
import { DailyCollectionsChart } from '../components/DailyCollectionsChart';

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
  
  // Admin-specific view filter (Admin can switch between All, Ward Committee, Coordinators, or Volunteers)
  const [adminRoleFilter, setAdminRoleFilter] = useState<'all' | 'Volunteer' | 'Coordinator' | 'WardCommittee'>('all');

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
  // 3. WardCommittee: Can see volunteers and ward committee data
  // 4. Admin: Can see all roles (Ward Committee, Coordinator, Volunteer) with full filtering
  const scopedVolunteers = useMemo(() => {
    const role = user?.role || 'Volunteer';

    if (role === 'Volunteer' || role === 'Coordinator') {
      return volunteers.filter((v) => v.role === 'Volunteer');
    } else if (role === 'WardCommittee') {
      return volunteers.filter((v) => v.role === 'Volunteer' || v.role === 'WardCommittee');
    } else {
      // Admin
      if (adminRoleFilter === 'all') {
        return volunteers;
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
  // Volunteers and Coordinators see donations logged by Volunteers
  // Ward Committees see donations logged by Volunteers & Ward Committees
  // Admin sees all donations with role-based filtering, ward filtering, and search
  const scopedRecentDonations = useMemo(() => {
    const role = user?.role || 'Volunteer';
    let list = recentDonations;

    if (role === 'Volunteer' || role === 'Coordinator') {
      list = recentDonations.filter((d) => d.collectedByRole === 'Volunteer' || !d.collectedByRole);
    } else if (role === 'WardCommittee') {
      list = recentDonations.filter((d) => d.collectedByRole === 'Volunteer' || d.collectedByRole === 'WardCommittee' || !d.collectedByRole);
    } else if (role === 'Admin') {
      if (adminRoleFilter !== 'all') {
        list = recentDonations.filter((d) => d.collectedByRole === adminRoleFilter);
      }
    }

    return list.filter((don) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        don.donorName.toLowerCase().includes(q) ||
        (don.collectedByName && don.collectedByName.toLowerCase().includes(q)) ||
        (don.receiptToken && don.receiptToken.toLowerCase().includes(q));
      const matchesWard = selectedWard === 'all' || don.wardNumber.toString() === selectedWard;
      return matchesSearch && matchesWard;
    });
  }, [recentDonations, user?.role, adminRoleFilter, searchQuery, selectedWard]);

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
    <main style={{
      maxWidth: 1200,
      margin: '0 auto',
      padding: '14px clamp(10px, 3vw, 16px) calc(90px + var(--safe-area-bottom)) clamp(10px, 3vw, 16px)',
      width: '100%'
    }}>
      
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
              <span className="badge badge-emerald">Madavoor Relief Drive</span>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                {metrics ? `${metrics.startDate} – ${metrics.endDate}` : 'Current Week'}
              </span>
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: 4, letterSpacing: '-0.02em' }}>
              Weekly Donation Overview
            </h2>
          </div>

          {metrics?.growthPercentage && metrics.growthPercentage > 0 ? (
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
                +{metrics.growthPercentage}% vs last week
              </span>
            </div>
          ) : null}
        </div>

        {/* Hero Banner with Big Stats */}
        <div className="glass-card" style={{
          padding: '24px clamp(14px, 4vw, 26px)',
          background: '#FFFFFF',
          border: '1px solid var(--border-subtle)',
          position: 'relative',
          overflow: 'hidden'
        }}>
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
                letterSpacing: '0.05em',
                display: 'block',
                marginBottom: 4
              }}>
                Total Funds Collected This Week
              </span>
              <div style={{
                fontSize: '2.8rem',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                color: '#0F172A',
                lineHeight: 1.1,
                display: 'flex',
                alignItems: 'baseline',
                gap: 6
              }}>
                <span style={{ color: '#256CAA' }}>₹</span>
                <span>{metrics?.totalAmount.toLocaleString('en-IN') || '0'}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 12 }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: '#EBF7F0',
                  border: '1px solid #A5D6B8',
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  color: '#1E6B3E'
                }}>
                  <Package size={18} color="#42B06F" />
                  <span>{metrics?.totalKits || 0} Relief Kits</span>
                </div>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Fixed rate of {KIT_UNIT_RATE}/Kit
                </span>
              </div>
            </div>

            {/* Target Progress Bar or Organization Overview */}
            {user?.role === 'Admin' ? (
              <div style={{
                background: '#F8FAFC',
                padding: '18px 20px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
                      Live Organization Collections
                    </span>
                    <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0F172A', marginTop: 2 }}>
                      {metrics?.totalKits || 0} Kits Distributed
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
                      Total Donors
                    </span>
                    <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#256CAA', marginTop: 2 }}>
                      {metrics?.donorsCount || 0}
                    </div>
                  </div>
                </div>

                {/* Interactive Daily Kit Collections (Mon - Sun) */}
                <DailyCollectionsChart
                  metrics={metrics}
                  donations={recentDonations}
                  onViewReceipt={onViewReceipt}
                />
              </div>
            ) : (metrics?.targetKits ?? 0) > 0 ? (
              <div style={{
                background: '#F8FAFC',
                padding: '18px 20px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
                  <div>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
                      Weekly Campaign Target
                    </span>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>
                      {metrics?.totalKits} / {metrics?.targetKits} Kits ({progressPercentage}%)
                    </div>
                  </div>
                  <span style={{ fontSize: '0.82rem', color: '#256CAA', fontWeight: 700 }}>
                    Target: ₹{metrics?.targetAmount.toLocaleString('en-IN')}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="progress-container" style={{ marginBottom: 12 }}>
                  <div className="progress-fill" style={{ width: `${progressPercentage}%` }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  <span>{Math.max(0, (metrics?.targetKits || 0) - (metrics?.totalKits || 0))} kits needed to hit weekly goal</span>
                  <span style={{ color: 'var(--primary-light)', fontWeight: 600 }}>{progressPercentage}% Achieved</span>
                </div>

                {/* Interactive Daily Kit Collections (Mon - Sun) */}
                <DailyCollectionsChart
                  metrics={metrics}
                  donations={recentDonations}
                  onViewReceipt={onViewReceipt}
                />
              </div>
            ) : (
              <div style={{
                background: '#F8FAFC',
                padding: '18px 20px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
                      Current Collections
                    </span>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', marginTop: 2 }}>
                      {metrics?.totalKits || 0} Kits Collected
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
                      Donors
                    </span>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#256CAA', marginTop: 2 }}>
                      {metrics?.donorsCount || 0}
                    </div>
                  </div>
                </div>
              </div>
            )}
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
              background: '#EDF4FA',
              border: '1px solid #B8D4EE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#256CAA'
            }}>
              <Users size={22} />
            </div>
            <div>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
                Donors Participated
              </span>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A' }}>
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
              background: '#EBF7F0',
              border: '1px solid #A5D6B8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#1E6B3E'
            }}>
              <Sparkles size={22} />
            </div>
            <div>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
                Average Kits / Donor
              </span>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A' }}>
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
              background: '#FEF3C7',
              border: '1px solid #FCD34D',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#92400E'
            }}>
              <Trophy size={22} />
            </div>
            <div>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
                Leading Ward
              </span>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A' }}>
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
          <div className="tab-strip" style={{ maxWidth: '100%', background: '#FFFFFF' }}>
            <button
              id="tab-btn-volunteers"
              onClick={() => setActiveTab('volunteers')}
              className="tab-strip-btn"
              style={{
                background: activeTab === 'volunteers' ? '#008A2E' : 'transparent',
                color: activeTab === 'volunteers' ? '#ffffff' : 'var(--text-secondary)',
                fontWeight: 700
              }}
            >
              <Award size={15} />
              <span>
                {user?.role === 'Admin' ? 'Fundraisers (All Roles)' : 'Volunteers'}
              </span>
            </button>

            <button
              id="tab-btn-wards"
              onClick={() => setActiveTab('wards')}
              className="tab-strip-btn"
              style={{
                background: activeTab === 'wards' ? '#2C82C9' : 'transparent',
                color: activeTab === 'wards' ? '#ffffff' : 'var(--text-secondary)',
                fontWeight: 700
              }}
            >
              <MapPin size={15} />
              <span>Top Wards</span>
            </button>

            <button
              id="tab-btn-recent"
              onClick={() => setActiveTab('recent')}
              className="tab-strip-btn"
              style={{
                background: activeTab === 'recent' ? '#2C82C9' : 'transparent',
                color: activeTab === 'recent' ? '#ffffff' : 'var(--text-secondary)',
                fontWeight: 700
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
            ? '#FEF3C7'
            : user?.role === 'Coordinator'
            ? '#EDF4FA'
            : '#EBF7F0',
          border: user?.role === 'Admin'
            ? '1px solid #FCD34D'
            : user?.role === 'Coordinator'
            ? '1px solid #B8D4EE'
            : '1px solid #A5D6B8',
          marginBottom: 20
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Eye size={18} color={user?.role === 'Admin' ? '#92400E' : user?.role === 'Coordinator' ? '#256CAA' : '#1E6B3E'} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: user?.role === 'Admin' ? '#92400E' : user?.role === 'Coordinator' ? '#256CAA' : '#1E6B3E' }}>
              {user?.role === 'Volunteer' && (
                <>Volunteer Access Mode: You can see only other volunteers' data.</>
              )}
              {user?.role === 'Coordinator' && (
                <>Coordinator Access Mode: You have visibility into all field volunteers' data.</>
              )}
              {user?.role === 'Admin' && (
                <>Administrator Access Mode: Full visibility across Ward Committee leads, coordinators, and field volunteers.</>
              )}
            </span>
          </div>

          {/* Admin-only quick role filter buttons */}
          {user?.role === 'Admin' && (activeTab === 'volunteers' || activeTab === 'recent') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginRight: 4, fontWeight: 600 }}>Filter View:</span>
              <button
                id="filter-admin-all"
                onClick={() => setAdminRoleFilter('all')}
                style={{
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: adminRoleFilter === 'all' ? '1px solid #B45309' : '1px solid var(--border-subtle)',
                  background: adminRoleFilter === 'all' ? '#FDE68A' : '#FFFFFF',
                  color: adminRoleFilter === 'all' ? '#78350F' : 'var(--text-secondary)',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                All Roles
              </button>
              <button
                id="filter-admin-wardcommittee"
                onClick={() => setAdminRoleFilter('WardCommittee')}
                style={{
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: adminRoleFilter === 'WardCommittee' ? '1px solid #7C3AED' : '1px solid var(--border-subtle)',
                  background: adminRoleFilter === 'WardCommittee' ? '#F5F3FF' : '#FFFFFF',
                  color: adminRoleFilter === 'WardCommittee' ? '#6D28D9' : 'var(--text-secondary)',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Ward Committee
              </button>
              <button
                id="filter-admin-coordinators"
                onClick={() => setAdminRoleFilter('Coordinator')}
                style={{
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: adminRoleFilter === 'Coordinator' ? '1px solid #256CAA' : '1px solid var(--border-subtle)',
                  background: adminRoleFilter === 'Coordinator' ? '#EDF4FA' : '#FFFFFF',
                  color: adminRoleFilter === 'Coordinator' ? '#256CAA' : 'var(--text-secondary)',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Coordinators Only
              </button>
              <button
                id="filter-admin-volunteers"
                onClick={() => setAdminRoleFilter('Volunteer')}
                style={{
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: adminRoleFilter === 'Volunteer' ? '1px solid #42B06F' : '1px solid var(--border-subtle)',
                  background: adminRoleFilter === 'Volunteer' ? '#EBF7F0' : '#FFFFFF',
                  color: adminRoleFilter === 'Volunteer' ? '#1E6B3E' : 'var(--text-secondary)',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Volunteers Only
              </button>
            </div>
          )}
        </div>

        {/* TAB 1: VOLUNTEERS / FUNDRAISERS LEADERBOARD */}
        {activeTab === 'volunteers' && (
          <div>
            {/* Top 3 Podium Visual */}
            {top3.length >= 3 && (
              <div className="podium-grid">
                {/* 2nd Place */}
                <div className="glass-card" style={{
                  padding: '24px 16px',
                  textAlign: 'center',
                  background: '#FFFFFF',
                  border: '1px solid #CBD5E1'
                }}>
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: '#E2E8F0',
                    margin: '0 auto 10px auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem',
                    fontWeight: 800,
                    color: '#475569'
                  }}>
                    🥈 2
                  </div>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0F172A' }}>{top3[1]?.name}</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
                    Ward {top3[1]?.wardNumber} • {top3[1]?.role === 'WardCommittee' ? 'Ward Committee' : top3[1]?.role}
                  </p>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#008A2E' }}>
                    {top3[1]?.kitsCollected} Kits
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#2C82C9', fontWeight: 700 }}>
                    ₹{top3[1]?.totalAmount.toLocaleString('en-IN')}
                  </div>
                </div>

                {/* 1st Place - Champion */}
                <div className="glass-card podium-champion" style={{
                  padding: '28px 18px',
                  textAlign: 'center',
                  background: '#FFFFFF',
                  border: '2px solid #F59E0B',
                  transform: 'translateY(-6px)',
                  boxShadow: '0 8px 20px rgba(0, 0, 0, 0.06)'
                }}>
                  <div style={{
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    background: '#FEF3C7',
                    border: '1px solid #FCD34D',
                    margin: '0 auto 12px auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.4rem',
                    fontWeight: 800,
                    color: '#92400E'
                  }}>
                    👑 1
                  </div>
                  <span className="badge badge-gold" style={{ marginBottom: 6 }}>
                   Champion
                  </span>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: 4, color: '#0F172A' }}>{top3[0]?.name}</h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 10 }}>
                    Ward {top3[0]?.wardNumber} • {top3[0]?.role === 'WardCommittee' ? 'Ward Committee' : top3[0]?.role}
                  </p>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#008A2E' }}>
                    {top3[0]?.kitsCollected} Kits
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#2C82C9', fontWeight: 800 }}>
                    ₹{top3[0]?.totalAmount.toLocaleString('en-IN')}
                  </div>
                </div>

                {/* 3rd Place */}
                <div className="glass-card" style={{
                  padding: '22px 16px',
                  textAlign: 'center',
                  background: '#FFFFFF',
                  border: '1px solid #CBD5E1'
                }}>
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: '#FEF3C7',
                    margin: '0 auto 10px auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem',
                    fontWeight: 800,
                    color: '#92400E'
                  }}>
                    🥉 3
                  </div>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0F172A' }}>{top3[2]?.name}</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
                    Ward {top3[2]?.wardNumber} • {top3[2]?.role === 'WardCommittee' ? 'Ward Committee' : top3[2]?.role}
                  </p>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#008A2E' }}>
                    {top3[2]?.kitsCollected} Kits
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#2C82C9', fontWeight: 700 }}>
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
              <div className="leaderboard-row leaderboard-header">
                <span>#</span>
                <span>Name</span>
                <span>Ward</span>
                <span style={{ textAlign: 'center' }}>Kits</span>
                <span style={{ textAlign: 'right' }}>Raised</span>
              </div>

              {rankedVolunteers.map((vol) => {
                const isCurrentUser = user && vol.name.toLowerCase() === user.fullName.toLowerCase();
                return (
                  <div
                    key={vol.id}
                    className="leaderboard-row glass-card-interactive"
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      background: isCurrentUser ? '#EBF7F0' : '#FFFFFF',
                      borderLeft: isCurrentUser ? '3px solid #42B06F' : 'none'
                    }}
                  >
                    {/* Rank */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
                      {vol.dynamicRank === 1 ? (
                        <span style={{ fontSize: '1.15rem' }}>🥇</span>
                      ) : vol.dynamicRank === 2 ? (
                        <span style={{ fontSize: '1.15rem' }}>🥈</span>
                      ) : vol.dynamicRank === 3 ? (
                        <span style={{ fontSize: '1.15rem' }}>🥉</span>
                      ) : (
                        <span style={{
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          color: 'var(--text-muted)'
                        }}>
                          #{vol.dynamicRank}
                        </span>
                      )}
                    </div>

                    {/* Member Info: No avatar icon, wrapping name, and user role badge */}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                        <span style={{
                          fontWeight: 700,
                          fontSize: '0.88rem',
                          lineHeight: 1.25,
                          wordBreak: 'break-word',
                          color: '#0F172A'
                        }}>
                          {vol.name}
                        </span>
                        {isCurrentUser && (
                          <span className="badge badge-emerald" style={{ fontSize: '0.58rem', padding: '1px 4px' }}>
                            You
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 5, marginTop: 3 }}>
                        <span className={`badge ${vol.role === 'Coordinator' ? 'badge-blue' : vol.role === 'WardCommittee' ? 'badge-purple' : 'badge-emerald'}`} style={{ fontSize: '0.62rem', padding: '1px 5px' }}>
                          {vol.role === 'WardCommittee' ? 'Ward Comm.' : vol.role}
                        </span>
                        <span style={{
                          fontSize: '0.68rem',
                          color: 'var(--text-secondary)'
                        }}>
                          • {vol.donationsCount} logs
                        </span>
                      </div>
                    </div>

                    {/* Ward & Role */}
                    <div style={{ minWidth: 0 }}>
                      <span className="badge badge-blue" style={{ fontSize: '0.65rem', padding: '2px 5px' }}>
                        W{vol.wardNumber}
                      </span>
                    </div>

                    {/* Kits */}
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: '0.98rem', fontWeight: 800, color: '#42B06F' }}>
                        {vol.kitsCollected}
                      </span>
                      <span style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', display: 'block' }}>
                        kits
                      </span>
                    </div>

                    {/* Total Raised */}
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#256CAA', whiteSpace: 'nowrap' }}>
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
              <div key={ward.wardNumber} className="glass-card" style={{ padding: '22px 24px', background: '#FFFFFF' }}>
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
                      background: ward.rank === 1 ? '#FEF3C7' : '#F1F5F9',
                      border: ward.rank === 1 ? '1px solid #FCD34D' : '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '1rem',
                      color: ward.rank === 1 ? '#92400E' : 'var(--text-primary)'
                    }}>
                      #{ward.rank}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0F172A' }}>
                        Ward {ward.wardNumber} — {ward.wardName}
                      </h3>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {ward.volunteerCount} Active Field Volunteers
                      </p>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#256CAA' }}>
                      ₹{ward.totalAmount.toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: '0.84rem', color: '#1E6B3E', fontWeight: 700 }}>
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
                      background: ward.rank === 1 ? '#D97706' : '#42B06F'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: RECENT DONATIONS FEED */}
        {activeTab === 'recent' && (
          <div>
            {/* Filter & Search Bar for Recent Donors */}
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
                  id="search-recent"
                  className="input-field"
                  style={{ paddingLeft: 40 }}
                  placeholder="Search donor name, receipt token, or collector..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div style={{ minWidth: 160 }}>
                <select
                  id="filter-ward-recent"
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

            <div style={{ display: 'grid', gap: 12 }}>
              {scopedRecentDonations.map((don) => (
                <div
                  key={don.donationId}
                  className="glass-card glass-card-interactive"
                  style={{
                    padding: '18px 22px',
                    background: '#FFFFFF',
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
                      background: '#EBF7F0',
                      border: '1px solid #A5D6B8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#1E6B3E'
                    }}>
                      <Package size={22} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A' }}>{don.donorName}</h4>
                      <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                        Ward {don.wardNumber}, {don.panchayath} • Logged by{' '}
                        <strong>{don.collectedByName || 'Volunteer'}</strong>
                        {don.collectedByRole && (
                          <span className={`badge ${don.collectedByRole === 'Coordinator' ? 'badge-blue' : don.collectedByRole === 'WardCommittee' ? 'badge-purple' : 'badge-emerald'}`} style={{ fontSize: '0.62rem', marginLeft: 6, padding: '1px 6px' }}>
                            {don.collectedByRole === 'WardCommittee' ? 'Ward Comm.' : don.collectedByRole}
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
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#256CAA' }}>
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
          </div>
        )}
      </section>

      {/* Quick Floating Action on Mobile with PWA Safe Area */}
      <div className="pwa-floating-btn">
        <button
          id="btn-floating-record"
          onClick={onOpenRecordModal}
          className="btn-primary"
          style={{
            padding: '13px 20px',
            borderRadius: 'var(--radius-full)',
            boxShadow: '0 8px 25px rgba(16, 185, 129, 0.5)'
          }}
        >
          <Package size={19} />
          <span>Record Donation</span>
        </button>
      </div>

    </main>
  );
};
