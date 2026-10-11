import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Trophy,
  Medal,
  Award,
  Package,
  Users,
  UserCheck,
  RefreshCw,
  Search,
  ShieldCheck,
  Flame,
  ArrowUpDown,
  MapPin,
  Building,
  X
} from 'lucide-react';
import type { PublicWardsResponse, PublicWardRank, PublicVolunteerRank } from '../types';
import { donationsApi } from '../services/api';
import './PublicWardsView.css';

export const PublicWardsView: React.FC = () => {
  const [data, setData] = useState<PublicWardsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'wards' | 'volunteers'>('wards');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'kits' | 'donors' | 'sponsors' | 'wardNum' | 'progress'>('kits');
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [selectedWard, setSelectedWard] = useState<PublicWardRank | null>(null);
  const [selectedVolunteer, setSelectedVolunteer] = useState<PublicVolunteerRank | null>(null);

  // 1. STRICT NAVIGATION BLOCK: Trap browser back navigation
  useEffect(() => {
    window.history.pushState(null, '', window.location.href);

    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      window.history.pushState(null, '', window.location.href);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // 2. Fetch authoritative data from backend
  const fetchWardsData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const response = await donationsApi.getPublicWardsLeaderboard();
      setData(response);
      setLastRefreshed(new Date());
      setError(null);
    } catch (err: any) {
      console.error('Failed to load public leaderboard:', err);
      if (!isSilent) {
        setError('Unable to load standings. Please try refreshing.');
      }
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWardsData();
  }, [fetchWardsData]);

  // 3. Silent auto-refresh in background every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchWardsData(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchWardsData]);

  // 6. Sort & Filter logic for Wards (Strictly separating Donors and Sponsors)
  const sortedWards = useMemo(() => {
    if (!data?.wards) return [];
    const list = [...data.wards];

    switch (sortBy) {
      case 'donors':
        return list.sort((a, b) => (b.donorsCount || 0) - (a.donorsCount || 0) || b.totalKitsCollected - a.totalKitsCollected);
      case 'sponsors':
        return list.sort((a, b) => (b.sponsorsCount || 0) - (a.sponsorsCount || 0) || b.totalKitsCollected - a.totalKitsCollected);
      case 'wardNum':
        return list.sort((a, b) => a.wardNumber - b.wardNumber);
      case 'progress':
        return list.sort((a, b) => b.achievementPercentage - a.achievementPercentage);
      case 'kits':
      default:
        return list.sort((a, b) => b.totalKitsCollected - a.totalKitsCollected || a.wardNumber - b.wardNumber);
    }
  }, [data, sortBy]);

  const displayedWards = useMemo(() => {
    if (!searchQuery.trim()) return sortedWards;
    const q = searchQuery.toLowerCase().trim();
    return sortedWards.filter(
      (w) =>
        w.wardName.toLowerCase().includes(q) ||
        w.wardLeadName.toLowerCase().includes(q) ||
        w.wardNumber.toString() === q ||
        `ward ${w.wardNumber}`.includes(q)
    );
  }, [sortedWards, searchQuery]);

  const topWard = useMemo(() => {
    if (!data?.wards || data.wards.length === 0) return null;
    return [...data.wards].sort((a, b) => b.totalKitsCollected - a.totalKitsCollected)[0];
  }, [data]);

  // 7. Volunteers List & Filter logic (Top 10 Volunteers)
  const top10Volunteers = useMemo(() => {
    return data?.topVolunteers || [];
  }, [data]);

  const displayedVolunteers = useMemo(() => {
    if (!searchQuery.trim()) return top10Volunteers;
    const q = searchQuery.toLowerCase().trim();
    return top10Volunteers.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.wardName.toLowerCase().includes(q) ||
        v.wardLeadName.toLowerCase().includes(q) ||
        (v.wardNumber > 0 && `ward ${v.wardNumber}`.includes(q))
    );
  }, [top10Volunteers, searchQuery]);

  const topVolunteer = useMemo(() => {
    if (!top10Volunteers || top10Volunteers.length === 0) return null;
    return top10Volunteers[0];
  }, [top10Volunteers]);

  return (
    <div className="public-kiosk-page">
      {/* KIOSK HEADER: Locked, no navbar, no back button */}
      <header className="kiosk-header">
        <div className="kiosk-header-inner">
          {/* Branding */}
          <div className="kiosk-brand">
            <div className="kiosk-logo-badge">
              <div className="kiosk-logo-inner">
                <Trophy size={24} />
              </div>
            </div>
            <div>
              <div className="kiosk-tagline-pill">
                <span className="pulse-dot" />
                <span>Live Campaign Kiosk</span>
              </div>
              <h1 className="kiosk-title">
                Community Kit Challenge Scoreboard
              </h1>
              <p className="kiosk-subtitle">
                Official Live Standings • Relief Kits & Sponsorships
              </p>
            </div>
          </div>

          {/* Header Action Controls: Refresh only */}
          <div className="kiosk-actions">
            <button
              type="button"
              onClick={() => fetchWardsData(false)}
              disabled={loading}
              className="kiosk-btn"
              title="Refresh Data Now"
            >
              <RefreshCw size={15} className={loading ? 'spin-icon' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="kiosk-main">
        {/* VIEW SWITCHER: Wards Scoreboard vs Top 10 Volunteers */}
        <div className="main-view-switcher-bar">
          <div className="view-switch-nav">
            <button
              type="button"
              onClick={() => {
                setActiveView('wards');
                setSearchQuery('');
              }}
              className={`view-tab-btn ${activeView === 'wards' ? 'active' : ''}`}
            >
              <Building size={18} />
              <span>Wards Leaderboard</span>
              <span className="view-tab-badge">{data?.wards?.length || 0}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveView('volunteers');
                setSearchQuery('');
              }}
              className={`view-tab-btn ${activeView === 'volunteers' ? 'active' : ''}`}
            >
              <Users size={18} />
              <span>Top 10 Volunteers</span>
              <span className="view-tab-badge">{top10Volunteers.length}</span>
            </button>
          </div>
        </div>

        {/* ========================================================
            TAB 1: WARDS LEADERBOARD VIEW
            ======================================================== */}
        {activeView === 'wards' && (
          <>
            {/* KPI SUMMARY CARDS: Kits, Donors & Sponsors strictly distinct */}
            <div className="kpi-grid">
              {/* Total Kits Sponsored */}
              <div className="kpi-card kpi-kits">
                <div>
                  <div className="kpi-label">Total Kits Sponsored</div>
                  <div className="kpi-value-row">
                    <span className="kpi-value">
                      {(data?.totalKitsCollected || 0).toLocaleString()}
                    </span>
                    <span className="kpi-unit">Kits</span>
                  </div>
                  <div className="kpi-subtext">Across all active campaign wards</div>
                </div>
                <div className="kpi-icon-bubble">
                  <Package size={28} />
                </div>
              </div>

              {/* Kit Donors Count (Strictly Individual Kit Donors) */}
              <div className="kpi-card kpi-donors">
                <div>
                  <div className="kpi-label">Kit Donors</div>
                  <div className="kpi-value-row">
                    <span className="kpi-value">
                      {(data?.totalDonors || 0).toLocaleString()}
                    </span>
                    <span className="kpi-unit">Donors</span>
                  </div>
                  <div className="kpi-subtext">Individual relief kit contributors</div>
                </div>
                <div className="kpi-icon-bubble">
                  <Users size={28} />
                </div>
              </div>

              {/* Corporate Item Sponsors Count (Strictly Sponsors) */}
              <div className="kpi-card kpi-sponsors">
                <div>
                  <div className="kpi-label">Item Sponsors</div>
                  <div className="kpi-value-row">
                    <span className="kpi-value">
                      {(data?.totalSponsors || 0).toLocaleString()}
                    </span>
                    <span className="kpi-unit">Sponsors</span>
                  </div>
                  <div className="kpi-subtext">Firms & corporate item sponsors</div>
                </div>
                <div className="kpi-icon-bubble">
                  <Award size={28} />
                </div>
              </div>

              {/* Rank #1 Ward Banner */}
              <div className="kpi-card kpi-leader">
                <div>
                  <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Flame size={14} />
                    <span>Rank #1 Leading Ward</span>
                  </div>
                  <div className="kpi-value-row">
                    <span className="kpi-value" style={{ fontSize: '1.75rem' }}>
                      {topWard ? `Ward ${topWard.wardNumber}` : 'Loading...'}
                    </span>
                    {topWard && (
                      <span className="kpi-unit" style={{ color: '#D97706' }}>
                        {topWard.wardName}
                      </span>
                    )}
                  </div>
                  <div className="kpi-subtext">
                    {topWard ? `${topWard.totalKitsCollected.toLocaleString()} Kits • Lead: ${topWard.wardLeadName}` : 'Computing totals...'}
                  </div>
                </div>
                <div className="kpi-icon-bubble">
                  <Trophy size={28} />
                </div>
              </div>
            </div>

            {/* CONTROLS: Count Pill, Search & Sort */}
            <div className="filter-bar">
              <div className="filter-summary-pill">
                <span className="summary-count">{displayedWards.length}</span>
                <span>{displayedWards.length === 1 ? 'Ward' : 'Wards'} Ranked</span>
              </div>

              <div className="filter-controls-right">
                {/* Sort Selector: Kits, Donors, Sponsors, Target % */}
                <div className="sort-box">
                  <ArrowUpDown size={14} className="sort-icon" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="sort-select"
                    aria-label="Sort wards"
                  >
                    <option value="kits">Sort: Highest Kits</option>
                    <option value="donors">Sort: Most Donors</option>
                    <option value="sponsors">Sort: Most Sponsors</option>
                    <option value="progress">Sort: Target %</option>
                    <option value="wardNum">Sort: Ward Number</option>
                  </select>
                </div>

                {/* Instant Search Box */}
                <div className="search-box">
                  <Search size={15} className="search-icon" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search ward or lead name..."
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="search-clear-btn"
                      title="Clear search"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* LOADING INDICATOR */}
            {loading && !data && (
              <div className="kiosk-state-card">
                <RefreshCw size={36} className="spin-icon" style={{ color: '#008A2E', margin: '0 auto 16px' }} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A' }}>Loading Ward Standings...</h3>
                <p style={{ fontSize: '0.85rem', color: '#64748B', marginTop: 4 }}>
                  Connecting to live campaign tally
                </p>
              </div>
            )}

            {/* ERROR MESSAGE */}
            {error && (
              <div className="kiosk-error-card">
                <p style={{ color: '#DC2626', fontWeight: 700 }}>{error}</p>
                <button
                  type="button"
                  onClick={() => fetchWardsData(false)}
                  className="kiosk-btn"
                  style={{ marginTop: 12, background: '#DC2626', color: '#FFFFFF', border: 'none' }}
                >
                  Retry
                </button>
              </div>
            )}

            {/* NO RESULTS */}
            {!loading && displayedWards.length === 0 && (
              <div className="kiosk-state-card">
                <p style={{ color: '#334155', fontSize: '1.1rem', fontWeight: 700 }}>No wards matched your search</p>
                <p style={{ color: '#64748B', fontSize: '0.85rem', marginTop: 6 }}>Try clearing your search query</p>
              </div>
            )}

            {/* WARDS CARDS GRID: Kit Counts, Donors & Sponsors Distinctly Displayed */}
            <div className="wards-grid">
              {displayedWards.map((ward) => {
                const isRank1 = ward.position === 1;
                const isRank2 = ward.position === 2;
                const isRank3 = ward.position === 3;
                const rankClass = isRank1 ? 'rank-1' : isRank2 ? 'rank-2' : isRank3 ? 'rank-3' : 'rank-other';
                const progress = ward.achievementPercentage || (ward.targetKits > 0 ? Math.round((ward.totalKitsCollected / ward.targetKits) * 100) : 0);

                return (
                  <div
                    key={ward.wardNumber}
                    className={`ward-card ${rankClass}`}
                    onClick={() => setSelectedWard(ward)}
                    title="Click for full ward details"
                  >
                    <div>
                      {/* Card Header: Rank & Total Kits Count Pill */}
                      <div className="ward-card-header">
                        <div className="ward-rank-box">
                          <div className="rank-badge-icon">
                            {isRank1 ? (
                              <Trophy size={22} style={{ color: '#D97706' }} />
                            ) : isRank2 ? (
                              <Medal size={22} style={{ color: '#475569' }} />
                            ) : isRank3 ? (
                              <Award size={22} style={{ color: '#EA580C' }} />
                            ) : (
                              <span>#{ward.position}</span>
                            )}
                          </div>
                          <div>
                            <div className="rank-tag">
                              {isRank1 ? 'Gold • Rank 1' : isRank2 ? 'Silver • Rank 2' : isRank3 ? 'Bronze • Rank 3' : `Rank #${ward.position}`}
                            </div>
                          </div>
                        </div>

                        {/* Total Kits Collected Pill (Strictly Kit Count) */}
                        <div className="kit-pill">
                          <div className="kit-pill-val">
                            <Package size={18} />
                            <span>{ward.totalKitsCollected.toLocaleString()}</span>
                          </div>
                          <div className="kit-pill-label">Kits Sponsored</div>
                        </div>
                      </div>

                      {/* Ward Title */}
                      <h3 className="ward-name-title">{ward.wardName}</h3>
                      <div className="ward-number-sub">Ward {ward.wardNumber}</div>

                      {/* Metrics Box: Ward Lead, Donors Count & Sponsors Count */}
                      <div className="metrics-box">
                        {/* Ward Lead */}
                        <div className="metric-row">
                          <div className="metric-label">
                            <UserCheck size={15} style={{ color: '#0284C7' }} />
                            <span>Ward Lead:</span>
                          </div>
                          <div className="metric-value-bold" title={ward.wardLeadName}>
                            {ward.wardLeadName || 'Ward Committee Lead'}
                          </div>
                        </div>

                        {/* Kit Donors Count */}
                        <div className="metric-row">
                          <div className="metric-label">
                            <Users size={15} style={{ color: '#008A2E' }} />
                            <span>Kit Donors:</span>
                          </div>
                          <div className="metric-value-highlight">
                            {ward.donorsCount.toLocaleString()} Donors
                          </div>
                        </div>

                        {/* Item Sponsors Count */}
                        <div className="metric-row">
                          <div className="metric-label">
                            <Award size={15} style={{ color: '#D97706' }} />
                            <span>Item Sponsors:</span>
                          </div>
                          <div className="metric-value-bold" style={{ color: ward.sponsorsCount > 0 ? '#D97706' : '#64748B' }}>
                            {ward.sponsorsCount.toLocaleString()} Sponsors
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Kit Target Progress Bar */}
                    <div>
                      <div className="progress-section">
                        <div className="progress-header">
                          <span className="progress-target-text">
                            Target: <strong>{ward.targetKits > 0 ? ward.targetKits.toLocaleString() : 'Not Set'}</strong> Kits
                          </span>
                          <span className="progress-pct-text">{progress}% Met</span>
                        </div>
                        <div className="progress-track">
                          <div
                            className={`progress-bar-fill ${isRank1 ? 'gold' : ''}`}
                            style={{ width: `${Math.min(100, Math.max(4, progress))}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ========================================================
            TAB 2: TOP 10 VOLUNTEERS VIEW
            ======================================================== */}
        {activeView === 'volunteers' && (
          <>
            {/* KPI SUMMARY CARDS FOR VOLUNTEERS */}
            <div className="kpi-grid">
              {/* Total Volunteer Kits */}
              <div className="kpi-card kpi-kits">
                <div>
                  <div className="kpi-label">Top 10 Volunteers Kits</div>
                  <div className="kpi-value-row">
                    <span className="kpi-value">
                      {top10Volunteers.reduce((sum, v) => sum + v.totalKitsCollected, 0).toLocaleString()}
                    </span>
                    <span className="kpi-unit">Kits</span>
                  </div>
                  <div className="kpi-subtext">Sponsored by top 10 fundraisers</div>
                </div>
                <div className="kpi-icon-bubble">
                  <Package size={28} />
                </div>
              </div>

              {/* Total Active Fundraisers */}
              <div className="kpi-card kpi-donors">
                <div>
                  <div className="kpi-label">Top Volunteer Fundraisers</div>
                  <div className="kpi-value-row">
                    <span className="kpi-value">
                      {top10Volunteers.length}
                    </span>
                    <span className="kpi-unit">Ranked</span>
                  </div>
                  <div className="kpi-subtext">Community field volunteers</div>
                </div>
                <div className="kpi-icon-bubble">
                  <Users size={28} />
                </div>
              </div>

              {/* Rank #1 Volunteer */}
              <div className="kpi-card kpi-leader">
                <div>
                  <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Flame size={14} />
                    <span>Rank #1 Top Volunteer</span>
                  </div>
                  <div className="kpi-value-row">
                    <span className="kpi-value" style={{ fontSize: '1.65rem' }}>
                      {topVolunteer ? topVolunteer.name : 'Loading...'}
                    </span>
                    {topVolunteer && (
                      <span className="kpi-unit" style={{ color: '#D97706' }}>
                        {topVolunteer.wardNumber > 0 ? `Ward ${topVolunteer.wardNumber}` : 'General'}
                      </span>
                    )}
                  </div>
                  <div className="kpi-subtext">
                    {topVolunteer ? `${topVolunteer.totalKitsCollected.toLocaleString()} Kits Sponsored • Lead: ${topVolunteer.wardLeadName}` : 'Computing standings...'}
                  </div>
                </div>
                <div className="kpi-icon-bubble">
                  <Award size={28} />
                </div>
              </div>
            </div>

            {/* CONTROLS: Count Pill & Search */}
            <div className="filter-bar">
              <div className="filter-summary-pill">
                <span className="summary-count">{displayedVolunteers.length}</span>
                <span>{displayedVolunteers.length === 1 ? 'Volunteer' : 'Volunteers'} Listed (Top 10)</span>
              </div>

              <div className="filter-controls-right">
                <div className="search-box">
                  <Search size={15} className="search-icon" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search volunteer, ward, or lead..."
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="search-clear-btn"
                      title="Clear search"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* LOADING STATE */}
            {loading && !data && (
              <div className="kiosk-state-card">
                <RefreshCw size={36} className="spin-icon" style={{ color: '#008A2E', margin: '0 auto 16px' }} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A' }}>Loading Volunteer Standings...</h3>
                <p style={{ fontSize: '0.85rem', color: '#64748B', marginTop: 4 }}>
                  Retrieving top fundraiser tallies
                </p>
              </div>
            )}

            {/* NO VOLUNTEERS */}
            {!loading && displayedVolunteers.length === 0 && (
              <div className="kiosk-state-card">
                <p style={{ color: '#334155', fontSize: '1.1rem', fontWeight: 700 }}>No volunteers matched your search</p>
                <p style={{ color: '#64748B', fontSize: '0.85rem', marginTop: 6 }}>Try clearing your search query</p>
              </div>
            )}

            {/* VOLUNTEERS CARDS GRID: Top 10 with Ward, Ward Lead, Donors & Sponsors */}
            <div className="wards-grid">
              {displayedVolunteers.map((vol) => {
                const isRank1 = vol.position === 1;
                const isRank2 = vol.position === 2;
                const isRank3 = vol.position === 3;
                const rankClass = isRank1 ? 'rank-1' : isRank2 ? 'rank-2' : isRank3 ? 'rank-3' : 'rank-other';
                const progress = vol.achievementPercentage || (vol.targetKits > 0 ? Math.round((vol.totalKitsCollected / vol.targetKits) * 100) : 0);

                return (
                  <div
                    key={vol.userId || vol.position}
                    className={`ward-card ${rankClass}`}
                    onClick={() => setSelectedVolunteer(vol)}
                    title="Click for full volunteer details"
                  >
                    <div>
                      {/* Card Header: Rank & Total Kits Count Pill */}
                      <div className="ward-card-header">
                        <div className="ward-rank-box">
                          <div className="rank-badge-icon">
                            {isRank1 ? (
                              <Trophy size={22} style={{ color: '#D97706' }} />
                            ) : isRank2 ? (
                              <Medal size={22} style={{ color: '#475569' }} />
                            ) : isRank3 ? (
                              <Award size={22} style={{ color: '#EA580C' }} />
                            ) : (
                              <span>#{vol.position}</span>
                            )}
                          </div>
                          <div>
                            <div className="rank-tag">
                              {isRank1 ? 'Gold • Rank 1' : isRank2 ? 'Silver • Rank 2' : isRank3 ? 'Bronze • Rank 3' : `Rank #${vol.position}`}
                            </div>
                          </div>
                        </div>

                        {/* Total Kits Sponsored Pill (Strictly Kit Count) */}
                        <div className="kit-pill">
                          <div className="kit-pill-val">
                            <Package size={18} />
                            <span>{vol.totalKitsCollected.toLocaleString()}</span>
                          </div>
                          <div className="kit-pill-label">Kits Sponsored</div>
                        </div>
                      </div>

                      {/* Volunteer Name */}
                      <h3 className="ward-name-title">{vol.name}</h3>
                      <div className="volunteer-role-sub">
                        <span className="role-tag">{vol.role || 'Volunteer'}</span>
                        <span className="standing-tag">Rank #{vol.position} of Top 10</span>
                      </div>

                      {/* Metrics Box: Ward, Ward Lead, Donors & Sponsors */}
                      <div className="metrics-box">
                        {/* Assigned Ward */}
                        <div className="metric-row">
                          <div className="metric-label">
                            <MapPin size={15} style={{ color: '#008A2E' }} />
                            <span>Assigned Ward:</span>
                          </div>
                          <div className="metric-value-bold">
                            {vol.wardNumber > 0 ? `Ward ${vol.wardNumber} • ${vol.wardName}` : 'No Ward Assigned'}
                          </div>
                        </div>

                        {/* Ward Committee Lead */}
                        <div className="metric-row">
                          <div className="metric-label">
                            <UserCheck size={15} style={{ color: '#0284C7' }} />
                            <span>Ward Lead:</span>
                          </div>
                          <div className="metric-value-bold" title={vol.wardLeadName}>
                            {vol.wardNumber > 0 ? (vol.wardLeadName || 'No Ward Lead') : 'No Ward Lead'}
                          </div>
                        </div>

                        {/* Kit Donors Count */}
                        <div className="metric-row">
                          <div className="metric-label">
                            <Users size={15} style={{ color: '#008A2E' }} />
                            <span>Kit Donors:</span>
                          </div>
                          <div className="metric-value-highlight">
                            {vol.donorsCount.toLocaleString()} Donors
                          </div>
                        </div>

                        {/* Item Sponsors Count */}
                        <div className="metric-row">
                          <div className="metric-label">
                            <Award size={15} style={{ color: '#D97706' }} />
                            <span>Item Sponsors:</span>
                          </div>
                          <div className="metric-value-bold" style={{ color: vol.sponsorsCount > 0 ? '#D97706' : '#64748B' }}>
                            {vol.sponsorsCount.toLocaleString()} Sponsors
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar (if target is set) */}
                    <div>
                      {vol.targetKits > 0 && (
                        <div className="progress-section">
                          <div className="progress-header">
                            <span className="progress-target-text">
                              Target: <strong>{vol.targetKits.toLocaleString()}</strong> Kits
                            </span>
                            <span className="progress-pct-text">{progress}% Met</span>
                          </div>
                          <div className="progress-track">
                            <div
                              className={`progress-bar-fill ${isRank1 ? 'gold' : ''}`}
                              style={{ width: `${Math.min(100, Math.max(4, progress))}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>

      {/* QUICK WARD DETAILS MODAL */}
      {selectedWard && (
        <div className="ward-modal-overlay" onClick={() => setSelectedWard(null)}>
          <div className="ward-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="kiosk-logo-badge" style={{ width: 40, height: 40 }}>
                  <div className="kiosk-logo-inner">
                    <Trophy size={18} />
                  </div>
                </div>
                <div>
                  <h3 className="modal-title">{selectedWard.wardName}</h3>
                  <p className="modal-subtitle">Ward {selectedWard.wardNumber} • Standing #{selectedWard.position}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedWard(null)}
                className="modal-close-btn"
                title="Close dialog"
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-grid-stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              <div className="modal-stat-box green">
                <div className="modal-stat-label">Kits</div>
                <div className="modal-stat-value">
                  {selectedWard.totalKitsCollected.toLocaleString()}
                </div>
              </div>
              <div className="modal-stat-box blue">
                <div className="modal-stat-label">Donors</div>
                <div className="modal-stat-value">
                  {selectedWard.donorsCount.toLocaleString()}
                </div>
              </div>
              <div className="modal-stat-box gold">
                <div className="modal-stat-label">Sponsors</div>
                <div className="modal-stat-value">
                  {selectedWard.sponsorsCount.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="modal-details-card">
              <div className="modal-detail-row">
                <span className="modal-detail-lbl">Ward Committee Lead:</span>
                <span className="modal-detail-val">{selectedWard.wardLeadName || 'Assigned Lead'}</span>
              </div>
              <div className="modal-detail-row">
                <span className="modal-detail-lbl">Field Volunteers:</span>
                <span className="modal-detail-val" style={{ color: '#008A2E' }}>{selectedWard.volunteerCount} Volunteers</span>
              </div>
              <div className="modal-detail-row">
                <span className="modal-detail-lbl">Target Achievement:</span>
                <span className="modal-detail-val" style={{ color: '#D97706' }}>{selectedWard.achievementPercentage}%</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedWard(null)}
              className="kiosk-btn"
              style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
            >
              <span>Close</span>
            </button>
          </div>
        </div>
      )}

      {/* QUICK VOLUNTEER DETAILS MODAL */}
      {selectedVolunteer && (
        <div className="ward-modal-overlay" onClick={() => setSelectedVolunteer(null)}>
          <div className="ward-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="kiosk-logo-badge" style={{ width: 40, height: 40 }}>
                  <div className="kiosk-logo-inner">
                    <Award size={18} />
                  </div>
                </div>
                <div>
                  <h3 className="modal-title">{selectedVolunteer.name}</h3>
                  <p className="modal-subtitle">{selectedVolunteer.role || 'Volunteer'} • Rank #{selectedVolunteer.position} of Top 10</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedVolunteer(null)}
                className="modal-close-btn"
                title="Close dialog"
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-grid-stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              <div className="modal-stat-box green">
                <div className="modal-stat-label">Kits</div>
                <div className="modal-stat-value">
                  {selectedVolunteer.totalKitsCollected.toLocaleString()}
                </div>
              </div>
              <div className="modal-stat-box blue">
                <div className="modal-stat-label">Donors</div>
                <div className="modal-stat-value">
                  {selectedVolunteer.donorsCount.toLocaleString()}
                </div>
              </div>
              <div className="modal-stat-box gold">
                <div className="modal-stat-label">Sponsors</div>
                <div className="modal-stat-value">
                  {selectedVolunteer.sponsorsCount.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="modal-details-card">
              <div className="modal-detail-row">
                <span className="modal-detail-lbl">Assigned Ward:</span>
                <span className="modal-detail-val" style={{ color: '#008A2E' }}>
                  {selectedVolunteer.wardNumber > 0 ? `Ward ${selectedVolunteer.wardNumber} (${selectedVolunteer.wardName})` : 'No Ward Assigned'}
                </span>
              </div>
              <div className="modal-detail-row">
                <span className="modal-detail-lbl">Ward Committee Lead:</span>
                <span className="modal-detail-val">
                  {selectedVolunteer.wardNumber > 0 ? (selectedVolunteer.wardLeadName || 'No Ward Lead') : 'No Ward Lead'}
                </span>
              </div>
              {selectedVolunteer.targetKits > 0 && (
                <div className="modal-detail-row">
                  <span className="modal-detail-lbl">Personal Kit Target:</span>
                  <span className="modal-detail-val" style={{ color: '#D97706' }}>
                    {selectedVolunteer.totalKitsCollected} / {selectedVolunteer.targetKits} Kits ({selectedVolunteer.achievementPercentage}%)
                  </span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSelectedVolunteer(null)}
              className="kiosk-btn"
              style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
            >
              <span>Close</span>
            </button>
          </div>
        </div>
      )}

      {/* FOOTER: Strictly Locked, Display Only */}
      <footer className="kiosk-footer">
        <div className="kiosk-footer-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={16} style={{ color: '#008A2E' }} />
            <span>Community Relief Campaign • Official Standings Scoreboard</span>
          </div>
          <div>
            Last Updated: {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        </div>
      </footer>
    </div>
  );
};
