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
  CalendarDays,
  CalendarRange,
  Clock,
  Sparkles,
  Check,
  RotateCcw,
  X,
  ChevronDown,
  Target,
  TrendingUp,
  HeartHandshake,
} from 'lucide-react';
import type { PublicWardsResponse } from '../types';
import { donationsApi } from '../services/api';
import './PublicWardsView.css';

export const PublicWardsView: React.FC = () => {
  const [data, setData] = useState<PublicWardsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'wards' | 'volunteers' | 'contributors'>('wards');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'kits' | 'donors' | 'wardNum' | 'target'>('kits');
  const [quickFilter, setQuickFilter] = useState<'all' | 'top3' | 'top10' | 'achieved'>('all');
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | 'today' | 'week' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(false);

  // 1. STRICT NAVIGATION BLOCK: Trap browser back navigation for kiosk mode
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
    setIsCalendarOpen(false);
    fetchWardsData(false, { period: 'custom', fromDate: customStartDate, toDate: to });
  };

  const handleResetToAllTime = () => {
    setSelectedPeriod('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setIsCalendarOpen(false);
    fetchWardsData(false, { period: 'all' });
  };

  // 5. Sorted & Filtered Wards Logic
  const sortedWards = useMemo(() => {
    if (!data?.wards) return [];
    const list = [...data.wards];

    switch (sortBy) {
      case 'donors':
        return list.sort((a, b) => (b.donorsCount || 0) - (a.donorsCount || 0) || b.totalKitsCollected - a.totalKitsCollected);
      case 'wardNum':
        return list.sort((a, b) => a.wardNumber - b.wardNumber);
      case 'target':
        return list.sort((a, b) => (b.achievementPercentage || 0) - (a.achievementPercentage || 0) || b.totalKitsCollected - a.totalKitsCollected);
      case 'kits':
      default:
        return list.sort((a, b) => b.totalKitsCollected - a.totalKitsCollected || a.wardNumber - b.wardNumber);
    }
  }, [data, sortBy]);

  const displayedWards = useMemo(() => {
    let list = sortedWards;

    // Apply quick filters
    if (quickFilter === 'top3') {
      list = list.filter((w) => w.position <= 3);
    } else if (quickFilter === 'top10') {
      list = list.filter((w) => w.position <= 10);
    } else if (quickFilter === 'achieved') {
      list = list.filter((w) => (w.achievementPercentage || 0) >= 100);
    }

    // Apply text search
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (w) =>
        w.wardName.toLowerCase().includes(q) ||
        w.wardLeadName.toLowerCase().includes(q) ||
        w.wardNumber.toString() === q ||
        `ward ${w.wardNumber}`.includes(q)
    );
  }, [sortedWards, quickFilter, searchQuery]);

  // Max Kits Collected for relative bar scaling
  const maxKitsCollected = useMemo(() => {
    if (!data?.wards || data.wards.length === 0) return 1;
    return Math.max(...data.wards.map((w) => w.totalKitsCollected), 1);
  }, [data]);

  // 6. Volunteers List & Filter logic
  const top10Volunteers = useMemo(() => {
    return data?.topVolunteers || [];
  }, [data]);

  const displayedVolunteers = useMemo(() => {
    let list = top10Volunteers;
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.wardName.toLowerCase().includes(q) ||
        v.wardLeadName.toLowerCase().includes(q) ||
        (v.wardNumber > 0 && `ward ${v.wardNumber}`.includes(q))
    );
  }, [top10Volunteers, searchQuery]);

  // 7. Contributors (Kit Donors & Sponsor Firms) logic
  const top10KitPurchases = useMemo(() => {
    return data?.topKitDonors || [];
  }, [data]);

  const top10SponsorFirms = useMemo(() => {
    return data?.topSponsorFirms || [];
  }, [data]);

  const displayedKitPurchases = useMemo(() => {
    let list = [...top10KitPurchases];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (k) =>
          k.donorName.toLowerCase().includes(q) ||
          k.wardName.toLowerCase().includes(q) ||
          (k.wardNumber > 0 && `ward ${k.wardNumber}`.includes(q))
      );
    }
    return list.sort((a, b) => {
      if (b.amountPaid !== a.amountPaid) return b.amountPaid - a.amountPaid;
      const dateA = a.transactionDate ? new Date(a.transactionDate).getTime() : 0;
      const dateB = b.transactionDate ? new Date(b.transactionDate).getTime() : 0;
      return dateB - dateA;
    });
  }, [top10KitPurchases, searchQuery]);

  const displayedSponsorFirms = useMemo(() => {
    let list = [...top10SponsorFirms];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.firmName.toLowerCase().includes(q) ||
          s.wardName.toLowerCase().includes(q) ||
          s.itemName.toLowerCase().includes(q) ||
          (s.wardNumber > 0 && `ward ${s.wardNumber}`.includes(q))
      );
    }
    return list.sort((a, b) => {
      if (b.amountPaid !== a.amountPaid) return b.amountPaid - a.amountPaid;
      const dateA = a.createdDate ? new Date(a.createdDate).getTime() : 0;
      const dateB = b.createdDate ? new Date(b.createdDate).getTime() : 0;
      return dateB - dateA;
    });
  }, [top10SponsorFirms, searchQuery]);

  const topWard = useMemo(() => {
    if (data?.topperWard && data.topperWard.totalKitsCollected > 0) return data.topperWard;
    if (data?.wards && data.wards.length > 0) {
      return [...data.wards].sort((a, b) => b.totalKitsCollected - a.totalKitsCollected)[0];
    }
    return null;
  }, [data]);

  return (
    <div className="pw-kiosk-page">
      {/* ========================================================
          1. COMPACT STICKY HEADER
          ======================================================== */}
      <header className="pw-header">
        <div className="pw-header-inner">
          <div className="pw-brand">
            <div className="pw-logo-badge">
              <Trophy size={20} className="pw-gold-icon" />
            </div>
            <div className="pw-brand-text">
              <div className="pw-brand-top">
                <span className="pw-live-indicator">
                  <span className="pw-pulse-dot" />
                  Live Campaign
                </span>
                <span className="pw-last-updated">
                  Updated: {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <h1 className="pw-title">Ward Leaderboard & Standings</h1>
            </div>
          </div>

          <div className="pw-header-actions">
            <button
              type="button"
              onClick={() => fetchWardsData(false)}
              disabled={loading}
              className="pw-refresh-btn"
              title="Refresh live standings"
              aria-label="Refresh live standings"
            >
              <RefreshCw size={15} className={loading ? 'pw-spin' : ''} />
              <span className="pw-btn-text">Refresh</span>
            </button>
          </div>
        </div>
      </header>

      <main className="pw-main">
        {/* ========================================================
            2. ULTRA-COMPACT METRIC RIBBON (4 Key Metrics)
            ======================================================== */}
        <section className="pw-metrics-ribbon" aria-label="Campaign Summary Metrics">
          <div className="pw-metric-tile pw-metric-kits">
            <div className="pw-metric-icon">
              <Package size={20} />
            </div>
            <div className="pw-metric-info">
              <div className="pw-metric-value">
                {(data?.totalKitsCollected || 0).toLocaleString()}
              </div>
              <div className="pw-metric-label">Kits Sponsored</div>
            </div>
          </div>

          <div className="pw-metric-tile pw-metric-donors">
            <div className="pw-metric-icon">
              <Users size={20} />
            </div>
            <div className="pw-metric-info">
              <div className="pw-metric-value">
                {(data?.totalDonors || 0).toLocaleString()}
              </div>
              <div className="pw-metric-label">Kit Donors</div>
            </div>
          </div>

          <div className="pw-metric-tile pw-metric-sponsors">
            <div className="pw-metric-icon">
              <Award size={20} />
            </div>
            <div className="pw-metric-info">
              <div className="pw-metric-value">
                {(data?.totalSponsors || 0).toLocaleString()}
              </div>
              <div className="pw-metric-label">Item Sponsors</div>
            </div>
          </div>

          <div className="pw-metric-tile pw-metric-leader">
            <div className="pw-metric-icon">
              <Flame size={20} />
            </div>
            <div className="pw-metric-info">
              <div className="pw-metric-value truncate">
                {topWard ? `Ward ${topWard.wardNumber}` : '---'}
              </div>
              <div className="pw-metric-label truncate">
                {topWard ? topWard.wardName : 'Leaderboard Leader'}
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================
            3. UNIFIED COMMAND & FILTER TOOLBAR
            ======================================================== */}
        <section className="pw-toolbar-section">
          {/* Row A: Tab Switcher (Wards vs Volunteers) & Period Selector */}
          <div className="pw-toolbar-row">
            {/* Tab Switcher */}
            <div className="pw-tab-group" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'wards'}
                onClick={() => {
                  setActiveTab('wards');
                  setSearchQuery('');
                }}
                className={`pw-tab-btn ${activeTab === 'wards' ? 'active' : ''}`}
              >
                <Building size={16} />
                <span>Wards</span>
                <span className="pw-tab-count">{data?.wards?.length || 0}</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'volunteers'}
                onClick={() => {
                  setActiveTab('volunteers');
                  setSearchQuery('');
                }}
                className={`pw-tab-btn ${activeTab === 'volunteers' ? 'active' : ''}`}
              >
                <Users size={16} />
                <span>Volunteers</span>
                <span className="pw-tab-count">{top10Volunteers.length}</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'contributors'}
                onClick={() => {
                  setActiveTab('contributors');
                  setSearchQuery('');
                  if (selectedPeriod !== 'all') {
                    handleSelectPeriod('all');
                  }
                }}
                className={`pw-tab-btn ${activeTab === 'contributors' ? 'active' : ''}`}
              >
                <HeartHandshake size={16} />
                <span>Top Contributors</span>
                <span className="pw-tab-count">{top10KitPurchases.length + top10SponsorFirms.length}</span>
              </button>
            </div>

            {/* Time Period Selector - Only visible for Wards & Volunteers */}
            {activeTab !== 'contributors' && (
            <div className="pw-period-group">
              <button
                type="button"
                onClick={() => handleSelectPeriod('all')}
                className={`pw-period-chip ${selectedPeriod === 'all' ? 'active' : ''}`}
              >
                All Time
              </button>
              <button
                type="button"
                onClick={() => handleSelectPeriod('today')}
                className={`pw-period-chip ${selectedPeriod === 'today' ? 'active' : ''}`}
              >
                <Clock size={13} />
                <span>Today</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectPeriod('week')}
                className={`pw-period-chip ${selectedPeriod === 'week' ? 'active' : ''}`}
              >
                <CalendarDays size={13} />
                <span>Week</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selectedPeriod === 'custom') {
                    setIsCalendarOpen(!isCalendarOpen);
                  } else {
                    handleSelectPeriod('custom');
                  }
                }}
                className={`pw-period-chip ${selectedPeriod === 'custom' ? 'active' : ''}`}
              >
                <CalendarRange size={13} />
                <span>Custom</span>
                <ChevronDown size={13} className={isCalendarOpen ? 'pw-rotate-180' : ''} />
              </button>
            </div>
            )}
          </div>

          {/* Row B: Search + Quick Chips + Sort */}
          <div className="pw-filter-row">
            {/* Search Input */}
            <div className="pw-search-wrapper">
              <Search size={15} className="pw-search-icon" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={activeTab === 'wards' ? 'Search ward name, number, or lead...' : activeTab === 'volunteers' ? 'Search volunteer, ward...' : 'Search donor, firm, or ward...'}
                className="pw-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="pw-search-clear"
                  title="Clear search"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Quick Filter Chips (No scrollbar issues, clean wraps) */}

            {activeTab === 'wards' && (
              <div className="pw-quick-chips">
                <button
                  type="button"
                  onClick={() => setQuickFilter('all')}
                  className={`pw-quick-chip ${quickFilter === 'all' ? 'active' : ''}`}
                >
                  All ({sortedWards.length})
                </button>
                <button
                  type="button"
                  onClick={() => setQuickFilter('top3')}
                  className={`pw-quick-chip ${quickFilter === 'top3' ? 'active' : ''}`}
                >
                  Top 3 Podium
                </button>
                <button
                  type="button"
                  onClick={() => setQuickFilter('top10')}
                  className={`pw-quick-chip ${quickFilter === 'top10' ? 'active' : ''}`}
                >
                  Top 10
                </button>
                <button
                  type="button"
                  onClick={() => setQuickFilter('achieved')}
                  className={`pw-quick-chip ${quickFilter === 'achieved' ? 'active' : ''}`}
                >
                  🎯 100%+ Target
                </button>
              </div>
            )}

            {/* Sort Selector */}
            {activeTab === 'wards' && (
              <div className="pw-sort-wrapper">
                <ArrowUpDown size={14} className="pw-sort-icon" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="pw-sort-select"
                  aria-label="Sort wards"
                >
                  <option value="kits">Sort: Kits (High-Low)</option>
                  <option value="donors">Sort: Donors (Most)</option>
                  <option value="target">Sort: % Target Met</option>
                  <option value="wardNum">Sort: Ward #</option>
                </select>
              </div>
            )}
          </div>

          {/* Expandable Custom Date Picker Popover */}
          {isCalendarOpen && (
            <div className="pw-custom-date-popover">
              <div className="pw-calendar-grid">
                <div className="pw-date-field">
                  <label htmlFor="pwFromDate">From Date:</label>
                  <input
                    id="pwFromDate"
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                </div>
                <div className="pw-date-field">
                  <label htmlFor="pwToDate">To Date:</label>
                  <input
                    id="pwToDate"
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                </div>
                <div className="pw-calendar-actions">
                  <button
                    type="button"
                    onClick={handleApplyCustomDates}
                    disabled={!customStartDate}
                    className="pw-btn-apply"
                  >
                    <Check size={14} />
                    <span>Apply</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleResetToAllTime}
                    className="pw-btn-reset"
                  >
                    <RotateCcw size={14} />
                    <span>Reset</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Active Period Notice Ribbon */}
          {selectedPeriod !== 'all' && (
            <div className="pw-period-notice-strip">
              <div className="pw-notice-left">
                <Sparkles size={14} className="pw-notice-sparkle" />
                <span>
                  {data?.isFallbackToLastTransactionDate ? (
                    <>Latest Active Day Standings: <strong>{formatDateDisplay(data?.lastActiveTransactionDate || data?.filterFromDate)}</strong> (No transactions today)</>
                  ) : selectedPeriod === 'today' ? (
                    <>Today's Standings: <strong>{formatDateDisplay(data?.filterFromDate || new Date().toISOString())}</strong></>
                  ) : selectedPeriod === 'week' ? (
                    <>Weekly Standings: <strong>{formatDateDisplay(data?.filterFromDate)} – {formatDateDisplay(data?.filterToDate)}</strong></>
                  ) : (
                    <>Custom Range: <strong>{formatDateDisplay(data?.filterFromDate || customStartDate)} – {formatDateDisplay(data?.filterToDate || customEndDate || customStartDate)}</strong></>
                  )}
                </span>
              </div>
              <button
                type="button"
                onClick={handleResetToAllTime}
                className="pw-notice-clear-btn"
                title="Reset to All Time"
              >
                <X size={13} />
                <span>Reset to All Time</span>
              </button>
            </div>
          )}
        </section>

        {/* ========================================================
            4. LOADING / ERROR / EMPTY STATES
            ======================================================== */}
        {loading && !data && (
          <div className="pw-state-box">
            <RefreshCw size={36} className="pw-spin pw-state-spinner" />
            <h3>Connecting to Live Standings...</h3>
            <p>Fetching real-time ward data from campaign server</p>
          </div>
        )}

        {error && (
          <div className="pw-state-box pw-state-error">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => fetchWardsData(false)}
              className="pw-btn-retry"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* ========================================================
            5. MAIN CONTENT: WARDS CARDS GRID (Enhanced & Styled)
            ======================================================== */}
        {activeTab === 'wards' && !loading && (
          <>
            {displayedWards.length === 0 ? (
              <div className="pw-state-box">
                <p>No wards match your search or filter.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setQuickFilter('all');
                  }}
                  className="pw-btn-reset-filter"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="pw-cards-grid">
                {displayedWards.map((ward) => {
                  const isRank1 = ward.position === 1;
                  const isRank2 = ward.position === 2;
                  const isRank3 = ward.position === 3;
                  const isPodium = isRank1 || isRank2 || isRank3;
                  const progressRatio = Math.min(100, Math.round((ward.totalKitsCollected / maxKitsCollected) * 100));
                  const isTargetAchieved = (ward.achievementPercentage || 0) >= 100;

                  return (
                    <div
                      key={ward.wardNumber}
                      className={`pw-ward-card ${isRank1 ? 'rank-1' : isRank2 ? 'rank-2' : isRank3 ? 'rank-3' : 'rank-standard'}`}
                    >
                      {/* Top Accent Stripe for Top 3 */}
                      {isPodium && (
                        <div className={`pw-card-accent-bar ${isRank1 ? 'gold' : isRank2 ? 'silver' : 'bronze'}`} />
                      )}

                      {/* Header Row: Rank Badge (Left) & Hero Kits Counter (Right) */}
                      <div className="pw-card-header">
                        <div className={`pw-rank-badge ${isRank1 ? 'gold' : isRank2 ? 'silver' : isRank3 ? 'bronze' : 'standard'}`}>
                          {isRank1 ? <Trophy size={14} /> : isRank2 ? <Medal size={14} /> : isRank3 ? <Award size={14} /> : null}
                          <span className="pw-rank-badge-num">#{ward.position}</span>
                          {isPodium && (
                            <span className="pw-rank-badge-label">
                              {isRank1 ? 'Gold' : isRank2 ? 'Silver' : 'Bronze'}
                            </span>
                          )}
                        </div>

                        {/* Hero Metric Pill */}
                        <div className="pw-hero-kit-pill">
                          <Package size={17} className="pw-hero-kit-icon" />
                          <div className="pw-hero-kit-data">
                            <span className="pw-hero-kit-num">{ward.totalKitsCollected.toLocaleString()}</span>
                            <span className="pw-hero-kit-unit">KITS</span>
                          </div>
                        </div>
                      </div>

                      {/* Title & Ward Identity */}
                      <div className="pw-card-identity">
                        <div className="pw-card-title-row">
                          <h3 className="pw-card-title">{ward.wardName}</h3>
                          <span className="pw-card-ward-pill">Ward {ward.wardNumber}</span>
                        </div>
                      </div>

                      {/* Two-Column Mini Stat Cells (Lead & Donors) */}
                      <div className="pw-card-stat-cells">
                        {/* Cell 1: Ward Lead */}
                        <div className="pw-stat-cell">
                          <div className="pw-cell-icon blue">
                            <UserCheck size={14} />
                          </div>
                          <div className="pw-cell-content">
                            <span className="pw-cell-value" title={ward.wardLeadName || 'Ward Committee Lead'}>
                              {ward.wardLeadName || 'Committee'}
                            </span>
                            <span className="pw-cell-label">Ward Lead</span>
                          </div>
                        </div>

                        {/* Cell 2: Donors & Sponsors */}
                        <div className="pw-stat-cell">
                          <div className="pw-cell-icon emerald">
                            <Users size={14} />
                          </div>
                          <div className="pw-cell-content">
                            <span className="pw-cell-value">
                              {ward.donorsCount.toLocaleString()} Donors
                            </span>
                            <span className="pw-cell-label">
                              {ward.sponsorsCount > 0 ? `+${ward.sponsorsCount} Sponsors` : 'Contributions'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Achievement & Progress Section */}
                      <div className="pw-card-progress-section">
                        <div className="pw-progress-header">
                          <div className="pw-target-label">
                            <Target size={12} className="pw-target-icon" />
                            <span>
                              Target: <strong>{ward.targetKits > 0 ? `${ward.targetKits} Kits` : 'Relative'}</strong>
                            </span>
                          </div>

                          <div className={`pw-progress-badge ${isTargetAchieved ? 'achieved' : ''}`}>
                            {isTargetAchieved && <TrendingUp size={11} />}
                            <span>{ward.achievementPercentage ? `${ward.achievementPercentage}%` : `${progressRatio}%`}</span>
                          </div>
                        </div>

                        <div className="pw-progress-track">
                          <div
                            className={`pw-progress-fill ${isRank1 ? 'gold' : isTargetAchieved ? 'achieved' : 'standard'}`}
                            style={{ width: `${Math.min(100, Math.max(6, progressRatio))}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ========================================================
            6. MAIN CONTENT: VOLUNTEERS CARDS GRID
            ======================================================== */}
        {activeTab === 'volunteers' && !loading && (
          <>
            {displayedVolunteers.length === 0 ? (
              <div className="pw-state-box">
                <p>No volunteers match your search.</p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="pw-btn-reset-filter"
                >
                  Clear Search
                </button>
              </div>
            ) : (
              <div className="pw-cards-grid">
                {displayedVolunteers.map((vol) => {
                  const isRank1 = vol.position === 1;
                  const isRank2 = vol.position === 2;
                  const isRank3 = vol.position === 3;
                  const isPodium = isRank1 || isRank2 || isRank3;

                  return (
                    <div
                      key={vol.userId || vol.position}
                      className={`pw-ward-card ${isRank1 ? 'rank-1' : isRank2 ? 'rank-2' : isRank3 ? 'rank-3' : 'rank-standard'}`}
                    >
                      {/* Top Accent Stripe for Top 3 */}
                      {isPodium && (
                        <div className={`pw-card-accent-bar ${isRank1 ? 'gold' : isRank2 ? 'silver' : 'bronze'}`} />
                      )}

                      {/* Header Row: Rank Badge & Hero Kit Count */}
                      <div className="pw-card-header">
                        <div className={`pw-rank-badge ${isRank1 ? 'gold' : isRank2 ? 'silver' : isRank3 ? 'bronze' : 'standard'}`}>
                          {isRank1 ? <Trophy size={14} /> : isRank2 ? <Medal size={14} /> : isRank3 ? <Award size={14} /> : null}
                          <span className="pw-rank-badge-num">#{vol.position}</span>
                          {isPodium && (
                            <span className="pw-rank-badge-label">
                              {isRank1 ? 'Gold' : isRank2 ? 'Silver' : 'Bronze'}
                            </span>
                          )}
                        </div>

                        <div className="pw-hero-kit-pill">
                          <Package size={17} className="pw-hero-kit-icon" />
                          <div className="pw-hero-kit-data">
                            <span className="pw-hero-kit-num">{vol.totalKitsCollected.toLocaleString()}</span>
                            <span className="pw-hero-kit-unit">KITS</span>
                          </div>
                        </div>
                      </div>

                      {/* Volunteer Name & Assigned Ward */}
                      <div className="pw-card-identity">
                        <div className="pw-card-title-row">
                          <h3 className="pw-card-title">{vol.name}</h3>
                          {vol.wardNumber > 0 && (
                            <span className="pw-card-ward-pill">Ward {vol.wardNumber}</span>
                          )}
                        </div>
                        <div className="pw-volunteer-location">
                          <MapPin size={12} />
                          <span>{vol.wardNumber > 0 ? vol.wardName : 'General Volunteer'}</span>
                        </div>
                      </div>

                      {/* Stat Cells: Role / Ward Lead & Donors */}
                      <div className="pw-card-stat-cells">
                        <div className="pw-stat-cell">
                          <div className="pw-cell-icon blue">
                            <UserCheck size={14} />
                          </div>
                          <div className="pw-cell-content">
                            <span className="pw-cell-value truncate" title={vol.wardLeadName || vol.role}>
                              {vol.wardLeadName && vol.wardLeadName !== 'No Ward Lead' ? vol.wardLeadName : vol.role}
                            </span>
                            <span className="pw-cell-label">
                              {vol.wardLeadName && vol.wardLeadName !== 'No Ward Lead' ? 'Ward Lead' : 'Role'}
                            </span>
                          </div>
                        </div>

                        <div className="pw-stat-cell">
                          <div className="pw-cell-icon emerald">
                            <HeartHandshake size={14} />
                          </div>
                          <div className="pw-cell-content">
                            <span className="pw-cell-value">
                              {vol.donorsCount.toLocaleString()} Donors
                            </span>
                            <span className="pw-cell-label">
                              {vol.sponsorsCount > 0 ? `+${vol.sponsorsCount} Sponsors` : 'Direct Donors'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ========================================================
            7. MAIN CONTENT: TOP CONTRIBUTORS (KIT DONORS & SPONSOR FIRMS)
            ======================================================== */}
        {activeTab === 'contributors' && !loading && (
          <div className="pw-contributors-container">
            {displayedKitPurchases.length === 0 && displayedSponsorFirms.length === 0 ? (
              <div className="pw-state-box">
                <p>No contributors match your search.</p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="pw-btn-reset-filter"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <>
                {/* Section A: Kit Purchases */}
                  <section className="pw-contributor-section">
                    <div className="pw-section-header">
                      <div className="pw-section-title-wrap">
                        <div className="pw-section-icon-badge emerald">
                          <Package size={18} />
                        </div>
                        <div>
                          <h2 className="pw-section-title">Top 10 Kit Purchases</h2>
                          <p className="pw-section-desc">
                            All-time leaders ranked by collected amount & sorted by latest date
                          </p>
                        </div>
                      </div>
                      <span className="pw-section-count-pill">
                        {displayedKitPurchases.length} {displayedKitPurchases.length === 1 ? 'Purchase' : 'Purchases'}
                      </span>
                    </div>

                    {displayedKitPurchases.length === 0 ? (
                      <div className="pw-empty-substate">
                        <p>No kit purchases recorded.</p>
                      </div>
                    ) : (
                      <div className="pw-list-table-wrap">
                        <table className="pw-list-table">
                          <thead>
                            <tr>
                              <th style={{ width: '64px' }}>Rank</th>
                              <th>Donor Name</th>
                              <th>Ward</th>
                              <th>Kits</th>
                              <th>Amount Paid</th>
                              <th>Status</th>
                              <th>Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {displayedKitPurchases.map((item) => {
                              const isRank1 = item.position === 1;
                              const isRank2 = item.position === 2;
                              const isRank3 = item.position === 3;
                              const isFullyPaid = item.balanceAmount <= 0;

                              return (
                                <tr key={`kit-list-${item.position}-${item.donorName}`}>
                                  <td>
                                    <span className={`pw-table-rank-pill ${isRank1 ? 'gold' : isRank2 ? 'silver' : isRank3 ? 'bronze' : 'standard'}`}>
                                      #{item.position}
                                    </span>
                                  </td>
                                  <td>
                                    <div className="pw-table-name-cell">
                                      <span className="pw-table-donor-name">{item.donorName}</span>
                                    </div>
                                  </td>
                                  <td>
                                    <span className="pw-table-ward-pill">
                                      <MapPin size={11} />
                                      {item.wardNumber > 0 ? `Ward ${item.wardNumber} • ${item.wardName}` : item.wardName}
                                    </span>
                                  </td>
                                  <td>
                                    <span className="pw-table-kits">
                                      <strong>{item.kitCount}</strong> Kits
                                    </span>
                                  </td>
                                  <td>
                                    <span className="pw-table-amount">
                                      ₹{item.amountPaid.toLocaleString()}
                                    </span>
                                  </td>
                                  <td>
                                    <span className={`pw-status-pill ${isFullyPaid ? 'paid' : 'partial'}`}>
                                      {isFullyPaid ? 'Fully Paid' : `Partial (₹${item.balanceAmount.toLocaleString()} Due)`}
                                    </span>
                                  </td>
                                  <td>
                                    <span className="pw-table-date">
                                      {formatDateDisplay(item.transactionDate) || '---'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>

                {/* Section B: Sponsor Firms */}
                  <section className="pw-contributor-section">
                    <div className="pw-section-header">
                      <div className="pw-section-title-wrap">
                        <div className="pw-section-icon-badge blue">
                          <Building size={18} />
                        </div>
                        <div>
                          <h2 className="pw-section-title">Top 10 Sponsoring Firms</h2>
                          <p className="pw-section-desc">
                            All-time leaders ranked by collected amount & sorted by latest date
                          </p>
                        </div>
                      </div>
                      <span className="pw-section-count-pill">
                        {displayedSponsorFirms.length} {displayedSponsorFirms.length === 1 ? 'Firm' : 'Firms'}
                      </span>
                    </div>

                    {displayedSponsorFirms.length === 0 ? (
                      <div className="pw-empty-substate">
                        <p>No sponsoring firms recorded.</p>
                      </div>
                    ) : (
                      <div className="pw-list-table-wrap">
                        <table className="pw-list-table">
                          <thead>
                            <tr>
                              <th style={{ width: '64px' }}>Rank</th>
                              <th>Firm / Organization</th>
                              <th>Ward</th>
                              <th>Sponsored Item</th>
                              <th>Amount Paid</th>
                              <th>Status</th>
                              <th>Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {displayedSponsorFirms.map((item) => {
                              const isRank1 = item.position === 1;
                              const isRank2 = item.position === 2;
                              const isRank3 = item.position === 3;
                              const isFullyPaid = item.balanceAmount <= 0;

                              return (
                                <tr key={`spon-list-${item.position}-${item.firmName}`}>
                                  <td>
                                    <span className={`pw-table-rank-pill ${isRank1 ? 'gold' : isRank2 ? 'silver' : isRank3 ? 'bronze' : 'standard'}`}>
                                      #{item.position}
                                    </span>
                                  </td>
                                  <td>
                                    <div className="pw-table-name-cell">
                                      <span className="pw-table-donor-name">{item.firmName}</span>
                                    </div>
                                  </td>
                                  <td>
                                    <span className="pw-table-ward-pill">
                                      <Building size={11} />
                                      {item.wardNumber > 0 ? `Ward ${item.wardNumber} • ${item.wardName}` : item.wardName}
                                    </span>
                                  </td>
                                  <td>
                                    <span className="pw-table-kits">
                                      {item.quantity > 1 ? `${item.quantity}x ` : ''}<strong>{item.itemName}</strong>
                                    </span>
                                  </td>
                                  <td>
                                    <span className="pw-table-amount">
                                      ₹{item.amountPaid.toLocaleString()}
                                    </span>
                                  </td>
                                  <td>
                                    <span className={`pw-status-pill ${isFullyPaid ? 'paid' : 'partial'}`}>
                                      {isFullyPaid ? 'Fully Paid' : `Partial (₹${item.balanceAmount.toLocaleString()} Due)`}
                                    </span>
                                  </td>
                                  <td>
                                    <span className="pw-table-date">
                                      {formatDateDisplay(item.createdDate) || '---'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>
              </>
            )}
          </div>
        )}
      </main>

      {/* ========================================================
          7. CLEAN COMPACT FOOTER
          ======================================================== */}
      <footer className="pw-footer">
        <div className="pw-footer-inner">
          <div className="pw-footer-left">
            <ShieldCheck size={15} className="pw-text-emerald" />
            <span>Community Relief Campaign • Official Live Scoreboard</span>
          </div>
          <div className="pw-footer-right">
            Auto-refreshes every 30s • Authoritative Azure Cloud Sync
          </div>
        </div>
      </footer>
    </div>
  );
};
