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
  Calendar,
  CalendarDays,
  CalendarRange,
  Clock,
  Sparkles,
  Check,
  RotateCcw,
  X
} from 'lucide-react';
import type { PublicWardsResponse } from '../types';
import { donationsApi } from '../services/api';
import './PublicWardsView.css';

export const PublicWardsView: React.FC = () => {
  const [data, setData] = useState<PublicWardsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'wards' | 'volunteers'>('wards');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'kits' | 'donors' | 'wardNum'>('kits');
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | 'today' | 'week' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(false);

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

  // 2. Fetch authoritative data from backend with optional date period
  const fetchWardsData = useCallback(async (
    isSilent = false,
    override?: { period?: 'all' | 'today' | 'week' | 'custom'; fromDate?: string; toDate?: string }
  ) => {
    if (!isSilent) setLoading(true);
    try {
      const activePeriod = override?.period !== undefined ? override.period : selectedPeriod;
      const activeFrom = override?.fromDate !== undefined ? override.fromDate : customStartDate;
      const activeTo = override?.toDate !== undefined ? override.toDate : customEndDate;

      const opts: { period?: string; fromDate?: string; toDate?: string } = {};
      if (activePeriod !== 'all') {
        opts.period = activePeriod;
        if (activePeriod === 'custom') {
          if (activeFrom) opts.fromDate = activeFrom;
          if (activeTo) opts.toDate = activeTo;
        }
      }

      const response = await donationsApi.getPublicWardsLeaderboard(opts);
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
  }, [selectedPeriod, customStartDate, customEndDate]);

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

  // 4. Period & Date Filtering Helpers
  const formatDateDisplay = (dateStr?: string | null) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const handleSelectPeriod = (period: 'all' | 'today' | 'week' | 'custom') => {
    setSelectedPeriod(period);
    if (period === 'custom') {
      setIsCalendarOpen(true);
      if (customStartDate && customEndDate) {
        fetchWardsData(false, { period: 'custom', fromDate: customStartDate, toDate: customEndDate });
      }
    } else {
      setIsCalendarOpen(false);
      fetchWardsData(false, { period });
    }
  };

  const handleApplyCustomDates = () => {
    if (!customStartDate) return;
    const to = customEndDate || customStartDate;
    setSelectedPeriod('custom');
    fetchWardsData(false, { period: 'custom', fromDate: customStartDate, toDate: to });
  };

  const handleResetToAllTime = () => {
    setSelectedPeriod('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setIsCalendarOpen(false);
    fetchWardsData(false, { period: 'all' });
  };

  // 6. Sort & Filter logic for Wards (Strictly separating Donors and Sponsors)
  const sortedWards = useMemo(() => {
    if (!data?.wards) return [];
    const list = [...data.wards];

    switch (sortBy) {
      case 'donors':
        return list.sort((a, b) => (b.donorsCount || 0) - (a.donorsCount || 0) || b.totalKitsCollected - a.totalKitsCollected);
      case 'wardNum':
        return list.sort((a, b) => a.wardNumber - b.wardNumber);
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
    if (data?.topperWard && data.topperWard.totalKitsCollected > 0) return data.topperWard;
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
    if (data?.topperVolunteer && data.topperVolunteer.totalKitsCollected > 0) return data.topperVolunteer;
    if (!top10Volunteers || top10Volunteers.length === 0) return null;
    return top10Volunteers[0];
  }, [data, top10Volunteers]);

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
        {/* DATE & TOPPER FILTER CONTROLS */}
        <section className="date-filter-section" aria-label="Standings Period Selector">
          <div className="date-filter-header-row">
            <div className="date-filter-label-group">
              <Calendar size={18} className="date-filter-icon" />
              <span className="date-filter-title">Standings Period:</span>
            </div>

            <div className="date-pills-row">
              {/* All Time Pill (Default) */}
              <button
                type="button"
                onClick={() => handleSelectPeriod('all')}
                className={`date-pill-btn ${selectedPeriod === 'all' ? 'active' : ''}`}
                title="View overall campaign standings"
              >
                <span>All Time</span>
              </button>

              {/* Today / Latest Day Topper Pill */}
              <button
                type="button"
                onClick={() => handleSelectPeriod('today')}
                className={`date-pill-btn ${selectedPeriod === 'today' ? 'active' : ''}`}
                title="Find today's topper (or whole 24h day of latest transactions)"
              >
                <Clock size={14} />
                <span>Today's Topper</span>
              </button>

              {/* Weekly Topper Pill */}
              <button
                type="button"
                onClick={() => handleSelectPeriod('week')}
                className={`date-pill-btn ${selectedPeriod === 'week' ? 'active' : ''}`}
                title="Find weekly topper (last 7 days)"
              >
                <CalendarDays size={14} />
                <span>Weekly Topper</span>
              </button>

              {/* Custom Date Range / Calendar Pill */}
              <button
                type="button"
                onClick={() => {
                  if (selectedPeriod === 'custom') {
                    setIsCalendarOpen(!isCalendarOpen);
                  } else {
                    handleSelectPeriod('custom');
                  }
                }}
                className={`date-pill-btn ${selectedPeriod === 'custom' ? 'active' : ''}`}
                title="Select custom date range or calendar date"
              >
                <CalendarRange size={14} />
                <span>Custom Date</span>
                {isCalendarOpen ? <X size={12} /> : null}
              </button>
            </div>
          </div>

          {/* Expandable Custom Date Range Picker */}
          {isCalendarOpen && (
            <div className="custom-calendar-panel">
              <div className="calendar-inputs-row">
                <div className="calendar-input-field">
                  <label htmlFor="fromDateInput">From Date:</label>
                  <input
                    id="fromDateInput"
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                </div>

                <div className="calendar-input-field">
                  <label htmlFor="toDateInput">To Date:</label>
                  <input
                    id="toDateInput"
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                </div>

                <div className="calendar-actions-row">
                  <button
                    type="button"
                    onClick={handleApplyCustomDates}
                    disabled={!customStartDate}
                    className="calendar-btn btn-apply"
                  >
                    <Check size={14} />
                    <span>Apply Date</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (customStartDate) {
                        setCustomEndDate(customStartDate);
                        setSelectedPeriod('custom');
                        fetchWardsData(false, { period: 'custom', fromDate: customStartDate, toDate: customStartDate });
                      }
                    }}
                    disabled={!customStartDate}
                    className="calendar-btn btn-single"
                    title="Filter for this single day only"
                  >
                    <span>Single Day</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetToAllTime}
                    className="calendar-btn btn-clear"
                  >
                    <RotateCcw size={14} />
                    <span>Reset</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Active Date Range Notice Banner */}
          {selectedPeriod !== 'all' && (
            <div className="date-active-banner">
              <div className="date-banner-content">
                <div className="date-banner-icon-bubble">
                  <Sparkles size={16} />
                </div>
                <div>
                  <div className="date-banner-title">
                    {data?.isFallbackToLastTransactionDate ? (
                      <>
                        Latest Active Day Topper (Full 24h Day — {formatDateDisplay(data?.lastActiveTransactionDate || data?.filterFromDate)})
                      </>
                    ) : selectedPeriod === 'today' ? (
                      <>
                        Current Day Topper (Full Day — {formatDateDisplay(data?.filterFromDate || new Date().toISOString())})
                      </>
                    ) : selectedPeriod === 'week' ? (
                      <>
                        Weekly Standings ({formatDateDisplay(data?.filterFromDate)} – {formatDateDisplay(data?.filterToDate)})
                      </>
                    ) : (
                      <>
                        Custom Date Range ({formatDateDisplay(data?.filterFromDate || customStartDate)} – {formatDateDisplay(data?.filterToDate || customEndDate || customStartDate)})
                      </>
                    )}
                  </div>
                  <div className="date-banner-subtitle">
                    {data?.isFallbackToLastTransactionDate ? (
                      'No transactions recorded today yet. Showing whole full day standings of the last active transaction date.'
                    ) : (
                      'Displaying standings and toppers for the selected time window.'
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleResetToAllTime}
                className="date-banner-reset-btn"
                title="Return to overall campaign standings"
              >
                <X size={14} />
                <span>Reset to All Time</span>
              </button>
            </div>
          )}
        </section>

        {/* DATE TOPPERS SPOTLIGHT (Displayed when filtered by date or date range) */}
        {selectedPeriod !== 'all' && (
          <div className="topper-spotlight-section">
            <div className="topper-spotlight-grid">
              {/* Top Ward Card */}
              <div className="topper-spotlight-card gold-border">
                <div className="topper-card-badge gold">
                  <Trophy size={14} />
                  <span>
                    {selectedPeriod === 'today' ? "Today's Top Ward" : selectedPeriod === 'week' ? "Weekly Top Ward" : "Period Top Ward"}
                  </span>
                </div>
                {topWard && topWard.totalKitsCollected > 0 ? (
                  <div className="topper-card-body">
                    <div className="topper-main-name">
                      Ward {topWard.wardNumber} • {topWard.wardName}
                    </div>
                    <div className="topper-sub-lead">
                      Ward Committee Lead: <strong>{topWard.wardLeadName}</strong>
                    </div>
                    <div className="topper-metrics-row">
                      <div className="topper-metric-pill green">
                        <Package size={15} />
                        <strong>{topWard.totalKitsCollected.toLocaleString()}</strong> Kits Collected
                      </div>
                      <div className="topper-metric-pill blue">
                        <Users size={15} />
                        <strong>{topWard.donorsCount.toLocaleString()}</strong> Donors
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="topper-card-empty">
                    <span>No ward kit collections recorded in this period</span>
                  </div>
                )}
              </div>

              {/* Top Volunteer Card */}
              <div className="topper-spotlight-card emerald-border">
                <div className="topper-card-badge emerald">
                  <Award size={14} />
                  <span>
                    {selectedPeriod === 'today' ? "Today's Top Volunteer" : selectedPeriod === 'week' ? "Weekly Top Volunteer" : "Period Top Volunteer"}
                  </span>
                </div>
                {topVolunteer && topVolunteer.totalKitsCollected > 0 ? (
                  <div className="topper-card-body">
                    <div className="topper-main-name">
                      {topVolunteer.name}
                    </div>
                    <div className="topper-sub-lead">
                      {topVolunteer.wardNumber > 0 ? `Ward ${topVolunteer.wardNumber} (${topVolunteer.wardName}) • Lead: ${topVolunteer.wardLeadName}` : 'General Volunteer'}
                    </div>
                    <div className="topper-metrics-row">
                      <div className="topper-metric-pill green">
                        <Package size={15} />
                        <strong>{topVolunteer.totalKitsCollected.toLocaleString()}</strong> Kits Collected
                      </div>
                      <div className="topper-metric-pill blue">
                        <Users size={15} />
                        <strong>{topVolunteer.donorsCount.toLocaleString()}</strong> Donors
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="topper-card-empty">
                    <span>No volunteer kit collections recorded in this period</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

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
                  <div className="kpi-label">
                    {selectedPeriod !== 'all' ? 'Period Kits Sponsored' : 'Total Kits Sponsored'}
                  </div>
                  <div className="kpi-value-row">
                    <span className="kpi-value">
                      {(data?.totalKitsCollected || 0).toLocaleString()}
                    </span>
                    <span className="kpi-unit">Kits</span>
                  </div>
                  <div className="kpi-subtext">
                    {selectedPeriod !== 'all' ? 'Kits collected in selected window' : 'Across all active campaign wards'}
                  </div>
                </div>
                <div className="kpi-icon-bubble">
                  <Package size={28} />
                </div>
              </div>

              {/* Kit Donors Count (Strictly Individual Kit Donors) */}
              <div className="kpi-card kpi-donors">
                <div>
                  <div className="kpi-label">
                    {selectedPeriod !== 'all' ? 'Period Kit Donors' : 'Kit Donors'}
                  </div>
                  <div className="kpi-value-row">
                    <span className="kpi-value">
                      {(data?.totalDonors || 0).toLocaleString()}
                    </span>
                    <span className="kpi-unit">Donors</span>
                  </div>
                  <div className="kpi-subtext">
                    {selectedPeriod !== 'all' ? 'Contributors in selected window' : 'Individual relief kit contributors'}
                  </div>
                </div>
                <div className="kpi-icon-bubble">
                  <Users size={28} />
                </div>
              </div>

              {/* Corporate Item Sponsors Count (Strictly Sponsors) */}
              <div className="kpi-card kpi-sponsors">
                <div>
                  <div className="kpi-label">
                    {selectedPeriod !== 'all' ? 'Period Item Sponsors' : 'Item Sponsors'}
                  </div>
                  <div className="kpi-value-row">
                    <span className="kpi-value">
                      {(data?.totalSponsors || 0).toLocaleString()}
                    </span>
                    <span className="kpi-unit">Sponsors</span>
                  </div>
                  <div className="kpi-subtext">
                    {selectedPeriod !== 'all' ? 'Item sponsors in selected window' : 'Firms & corporate item sponsors'}
                  </div>
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
                    <span>{selectedPeriod !== 'all' ? 'Period Leading Ward' : 'Rank #1 Leading Ward'}</span>
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

                return (
                  <div
                    key={ward.wardNumber}
                    className={`ward-card ${rankClass}`}
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

                      {/* Metrics Box: Ward Lead & Donors Count */}
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
                            <span>Donors:</span>
                          </div>
                          <div className="metric-value-highlight">
                            {ward.donorsCount.toLocaleString()} Donors
                          </div>
                        </div>

                        {/* Item Sponsors Count (only shown when sponsors exist) */}
                        {ward.sponsorsCount > 0 && (
                          <div className="metric-row">
                            <div className="metric-label">
                              <Award size={15} style={{ color: '#D97706' }} />
                              <span>Sponsors:</span>
                            </div>
                            <div className="metric-value-bold" style={{ color: '#D97706' }}>
                              {ward.sponsorsCount.toLocaleString()} Sponsors
                            </div>
                          </div>
                        )}
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

            {/* VOLUNTEERS CARDS GRID: Clean & Public-Focused */}
            <div className="wards-grid">
              {displayedVolunteers.map((vol) => {
                const isRank1 = vol.position === 1;
                const isRank2 = vol.position === 2;
                const isRank3 = vol.position === 3;
                const rankClass = isRank1 ? 'rank-1' : isRank2 ? 'rank-2' : isRank3 ? 'rank-3' : 'rank-other';

                return (
                  <div
                    key={vol.userId || vol.position}
                    className={`ward-card ${rankClass}`}
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

                        {/* Total Kits Sponsored Pill */}
                        <div className="kit-pill">
                          <div className="kit-pill-val">
                            <Package size={18} />
                            <span>{vol.totalKitsCollected.toLocaleString()}</span>
                          </div>
                          <div className="kit-pill-label">Kits Sponsored</div>
                        </div>
                      </div>

                      {/* Volunteer Name */}
                      <h3 className="ward-name-title" style={{ marginBottom: 14 }}>{vol.name}</h3>

                      {/* Metrics Box: Ward, Ward Lead, Donors */}
                      <div className="metrics-box">
                        {/* Assigned Ward */}
                        <div className="metric-row">
                          <div className="metric-label">
                            <MapPin size={15} style={{ color: '#008A2E' }} />
                            <span>Ward:</span>
                          </div>
                          <div className="metric-value-bold">
                            {vol.wardNumber > 0 ? `Ward ${vol.wardNumber} • ${vol.wardName}` : 'No Ward Assigned'}
                          </div>
                        </div>

                        {/* Ward Committee Lead */}
                        {vol.wardNumber > 0 && vol.wardLeadName && vol.wardLeadName !== 'No Ward Lead' && (
                          <div className="metric-row">
                            <div className="metric-label">
                              <UserCheck size={15} style={{ color: '#0284C7' }} />
                              <span>Ward Lead:</span>
                            </div>
                            <div className="metric-value-bold" title={vol.wardLeadName}>
                              {vol.wardLeadName}
                            </div>
                          </div>
                        )}

                        {/* Kit Donors Count */}
                        <div className="metric-row">
                          <div className="metric-label">
                            <Users size={15} style={{ color: '#008A2E' }} />
                            <span>Donors:</span>
                          </div>
                          <div className="metric-value-highlight">
                            {vol.donorsCount.toLocaleString()} Donors
                          </div>
                        </div>

                        {/* Item Sponsors Count (only shown when sponsors exist) */}
                        {vol.sponsorsCount > 0 && (
                          <div className="metric-row">
                            <div className="metric-label">
                              <Award size={15} style={{ color: '#D97706' }} />
                              <span>Sponsors:</span>
                            </div>
                            <div className="metric-value-bold" style={{ color: '#D97706' }}>
                              {vol.sponsorsCount.toLocaleString()} Sponsors
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>

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
