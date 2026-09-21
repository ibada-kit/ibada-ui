import React, { useState, useEffect, useMemo } from 'react';
import type { User, Donation, LeaderboardEntry, SponsorshipRecord, SponsorshipItem } from '../types';
import { DonationForm } from '../components/DonationForm';
import { donationsApi, analyticsApi, coordinatorApi, sponsorshipsApi, API_BASE_URL, generateRandomPassword, getKitUnitPrice, getAuthHeaders, type UserProgress } from '../services/api';
import { 
  Users, 
  TrendingUp, 
  PlusCircle, 
  History, 
  Trophy, 
  UserPlus, 
  Package, 
  RefreshCw, 
  KeyRound, 
  Copy, 
  Check, 
  Share2, 
  CheckCircle2, 
  X, 
  Building2, 
  Award,
  Download
} from 'lucide-react';
import { ResetPasswordModal, type ResetTargetUser } from '../components/ResetPasswordModal';
import { SponsorshipLeaderboardView } from '../components/SponsorshipLeaderboardView';
import { SponsoredItemsSummaryView } from '../components/SponsoredItemsSummaryView';
import { ScrollableTabStrip } from '../components/ScrollableTabStrip';
import { exportSponsorshipsToCSV, exportDonationsToCSV } from '../utils/exportCsv';

interface CoordinatorDashboardProps {
  user: User;
  kitPrice?: number;
  onViewReceipt: (donation: Donation) => void;
  onViewSponsorshipReceipt?: (sponsorship: SponsorshipRecord) => void;
  onOpenPayBalance?: (sponsorship: SponsorshipRecord) => void;
  onOpenPayDonationBalance?: (donation: Donation) => void;
}

export const CoordinatorDashboard: React.FC<CoordinatorDashboardProps> = ({
  user,
  kitPrice = getKitUnitPrice(),
  onViewReceipt,
  onViewSponsorshipReceipt,
  onOpenPayBalance,
  onOpenPayDonationBalance
}) => {
  const [activeTab, setActiveTab] = useState<'progress' | 'record' | 'team' | 'transactions' | 'leaderboard' | 'sponsored-items'>('progress');
  const [leaderboardMode, setLeaderboardMode] = useState<'individual' | 'sponsorship'>('individual');
  const [receiptsType, setReceiptsType] = useState<'donations' | 'sponsorships'>('donations');
  const [teamSponsorships, setTeamSponsorships] = useState<SponsorshipRecord[]>([]);
  const [catalogItems, setCatalogItems] = useState<SponsorshipItem[]>([]);
  
  // Aggregate statistics for coordinator team sponsorships
  const coordinatorSponsorshipStats = useMemo(() => {
    const totalItems = teamSponsorships.reduce((sum, s) => sum + (Number(s.quantity) || 1), 0);
    const totalCommitted = teamSponsorships.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
    const totalPaid = teamSponsorships.reduce((sum, s) => sum + (Number(s.amountPaid) || 0), 0);
    const totalBalance = teamSponsorships.reduce((sum, s) => sum + (Number(s.balanceAmount) || 0), 0);
    const realizationPct = totalCommitted > 0 ? Math.min(100, Math.round((totalPaid / totalCommitted) * 100)) : 0;
    return { totalItems, totalCommitted, totalPaid, totalBalance, realizationPct };
  }, [teamSponsorships]);
  
  const [progress, setProgress] = useState<UserProgress>({
    targetKits: 0,
    collectedKits: 0,
    achievementPercentage: 0,
    collectedAmount: 0,
    targetAmount: 0
  });
  const [loadingProgress, setLoadingProgress] = useState(true);

  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Donation[]>([]);
  const [volunteersBoard, setVolunteersBoard] = useState<LeaderboardEntry[]>([]);

  // Add Volunteer modal / form state
  const [showAddVolunteer, setShowAddVolunteer] = useState(false);
  const [volFullName, setVolFullName] = useState('');
  const [volPhone, setVolPhone] = useState('');
  const [volTarget, setVolTarget] = useState(50);
  const [creatingVol, setCreatingVol] = useState(false);
  const [createMsg, setCreateMsg] = useState<{ text: string; isError: boolean } | null>(null);

  // Credentials Highlight & Reset Password states
  const [createdVolunteer, setCreatedVolunteer] = useState<{
    fullName: string;
    phone: string;
    defaultPassword: string;
    wardNumber: number;
  } | null>(null);
  const [copiedPass, setCopiedPass] = useState(false);
  const [resetVolunteerUser, setResetVolunteerUser] = useState<ResetTargetUser | null>(null);

  useEffect(() => {
    let isMounted = true;

    // 1. Fetch live metrics from API
    analyticsApi.getMyProgress(user.token)
      .then((data) => {
        if (isMounted) {
          setProgress(data);
          setLoadingProgress(false);
        }
      })
      .catch((err) => {
        console.warn('[CoordinatorDashboard] Could not load progress from API:', err);
        if (isMounted) {
          setLoadingProgress(false);
        }
      });

    // 2. Fetch coordinator's team volunteers from API
    coordinatorApi.getMyVolunteers(user.token)
      .then((vols) => {
        if (isMounted) setTeamMembers(vols);
      })
      .catch((err) => console.warn('[CoordinatorDashboard] Could not load team volunteers:', err));

    // 3. Fetch recent receipts and leaderboard
    donationsApi.getRecentDonations('Coordinator')
      .then((dons) => { if (isMounted) setRecentTransactions(dons); })
      .catch(() => {});

    donationsApi.getVolunteerLeaderboard('Coordinator')
      .then((board) => { if (isMounted) setVolunteersBoard(board); })
      .catch(() => {});

    // 4. Fetch coordinator's team & ward sponsorships
    sponsorshipsApi.getSponsorships()
      .then((spons) => {
        if (isMounted) {
          const wardOrTeamSpons = spons.filter(s =>
            s.collectedByUserId === user.userId ||
            s.parentUserId === user.userId ||
            (user.wardNumber && Number(s.wardNumber) === Number(user.wardNumber))
          );
          setTeamSponsorships(wardOrTeamSpons);
        }
      })
      .catch(() => {});

    // 5. Fetch live sponsorship catalog items
    sponsorshipsApi.getItems()
      .then((items) => {
        if (isMounted && items && items.length > 0) {
          setCatalogItems(items);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [user.token, user.userId, user.wardNumber]);

  const handleCreateVolunteer = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateMsg(null);
    const cleanPhone = volPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setCreateMsg({ text: 'Please enter a valid 10-digit mobile number.', isError: true });
      return;
    }

    const defaultPass = generateRandomPassword(6);

    try {
      setCreatingVol(true);
      const res = await fetch(`${API_BASE_URL}/Users`, {
        method: 'POST',
        headers: getAuthHeaders(user.token),
        body: JSON.stringify({
          fullName: volFullName.trim(),
          phoneNumber: `+91${cleanPhone.slice(-10)}`,
          role: 'Volunteer',
          wardNumber: 0,
          targetKits: Number(volTarget),
          defaultPassword: defaultPass
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to create volunteer on server.');
      }

      setCreateMsg({ text: `Volunteer ${volFullName} created! Default password: ${defaultPass}`, isError: false });
      setTeamMembers(prev => [{
        fullName: volFullName.trim(),
        phoneNumber: `+91${cleanPhone.slice(-10)}`,
        role: 'Volunteer',
        wardNumber: 0,
        targetKits: volTarget
      }, ...prev]);

      setCreatedVolunteer({
        fullName: volFullName.trim(),
        phone: `+91${cleanPhone.slice(-10)}`,
        defaultPassword: defaultPass,
        wardNumber: 0
      });

      setVolFullName('');
      setVolPhone('');
    } catch (err: any) {
      setCreateMsg({ text: err.message || 'Failed to create volunteer on server. Please try again.', isError: true });
    } finally {
      setCreatingVol(false);
    }
  };

  const handleCopyPassword = (pass: string) => {
    navigator.clipboard.writeText(pass);
    setCopiedPass(true);
    setTimeout(() => setCopiedPass(false), 2000);
  };

  return (
    <div style={{
      maxWidth: 960,
      margin: '0 auto',
      padding: '14px clamp(10px, 3vw, 16px) calc(90px + var(--safe-area-bottom)) clamp(10px, 3vw, 16px)',
      width: '100%'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 16
      }}>
        <div>
          <span style={{
            background: '#F4F9FD',
            color: '#2C82C9',
            border: '1px solid #B8D4EE',
            padding: '3px 8px',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.72rem',
            fontWeight: 800,
            textTransform: 'uppercase'
          }}>
            Drive Coordinator
          </span>
          <h1 style={{ fontSize: 'clamp(1.3rem, 4vw, 1.65rem)', fontWeight: 900, color: '#0F172A', marginTop: 4 }}>
            {user.fullName}
          </h1>
        </div>

        <button
          onClick={() => setActiveTab('record')}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#008A2E' }}
        >
          <PlusCircle size={17} />
          <span>Record Donation</span>
        </button>
      </div>

      {/* Coordinator Progress Card with 3-Way Collections Display & Separate Progress Bars */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: 'var(--radius-xl)',
        padding: 'clamp(16px, 3vw, 22px) clamp(14px, 3vw, 20px)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-sm)',
        marginBottom: 18
      }}>
        {/* Header Row: Coordinator Team Title & 3-Way Collections Display (Donations | Sponsorship | Total) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: '#EBF7EE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#008A2E',
              flexShrink: 0
            }}>
              <TrendingUp size={22} />
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700, letterSpacing: '0.04em' }}>
                Coordinator Team Campaign Target
              </span>
              <div style={{ fontSize: 'clamp(1.1rem, 3.5vw, 1.25rem)', fontWeight: 900, color: '#0F172A', marginTop: 1 }}>
                {user.fullName} {user.wardNumber ? `(Ward ${user.wardNumber})` : ''}
              </div>
            </div>
          </div>

          {/* 3-Way Collections Display: Donations | Sponsorship | Total */}
          <div className="collections-split-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700 }}>Donations:</span>
              <span style={{ fontSize: '0.94rem', fontWeight: 800, color: '#008A2E' }}>
                {loadingProgress ? '...' : `₹${progress.collectedAmount.toLocaleString('en-IN')}`}
              </span>
            </div>
            <span className="split-divider">|</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700 }}>Sponsorship:</span>
              <span style={{ fontSize: '0.94rem', fontWeight: 800, color: '#2C82C9' }}>
                ₹{coordinatorSponsorshipStats.totalPaid.toLocaleString('en-IN')}
              </span>
            </div>
            <span className="split-divider">|</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#0F172A', fontWeight: 800 }}>Total:</span>
              <span style={{ fontSize: '1.12rem', fontWeight: 900, color: '#0F172A' }}>
                {loadingProgress ? '...' : `₹${(progress.collectedAmount + coordinatorSponsorshipStats.totalPaid).toLocaleString('en-IN')}`}
              </span>
            </div>
          </div>
        </div>

        {/* SEPARATE TARGET PROGRESS BARS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
          {/* BAR 1: Kit Donation Target Progress (Grass Green #7BCC53) */}
          <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid #F1F5F9' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#008A2E', display: 'inline-block' }} />
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0F172A' }}>
                  {loadingProgress ? 'Loading kits target...' : `Kit Donations Target: ${progress.collectedKits} / ${progress.targetKits} Kits (${progress.achievementPercentage}%)`}
                </span>
              </div>
              <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#008A2E' }}>
                {loadingProgress ? '...' : `₹${progress.collectedAmount.toLocaleString('en-IN')} Raised`}
              </span>
            </div>

            <div style={{
              width: '100%',
              height: 10,
              background: '#E2E8F0',
              borderRadius: 9999,
              overflow: 'hidden',
              marginBottom: 6
            }}>
              <div style={{
                width: `${Math.min(100, progress.achievementPercentage)}%`,
                height: '100%',
                background: '#7BCC53',
                borderRadius: 9999,
                transition: 'width 0.6s ease'
              }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748B', fontWeight: 600, flexWrap: 'wrap', gap: 4 }}>
              <span>Covers volunteers assigned under this coordinator</span>
              <span>{Math.max(0, progress.targetKits - progress.collectedKits)} kits to goal</span>
            </div>
          </div>

          {/* BAR 2: Sponsorship Packages & Collections Progress (Sponsorship Blue #2C82C9) */}
          <div style={{ background: '#F4F9FD', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid #DCE9F6' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2C82C9', display: 'inline-block' }} />
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0F172A' }}>
                  Sponsorship Packages: <span style={{ color: '#2C82C9', fontWeight: 900 }}>{coordinatorSponsorshipStats.totalItems} Items Sponsored</span>
                </span>
              </div>
              <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#2C82C9' }}>
                ₹{coordinatorSponsorshipStats.totalPaid.toLocaleString('en-IN')} / ₹{coordinatorSponsorshipStats.totalCommitted.toLocaleString('en-IN')} ({coordinatorSponsorshipStats.realizationPct}%)
              </span>
            </div>

            <div style={{
              width: '100%',
              height: 10,
              background: '#D9E8F5',
              borderRadius: 9999,
              overflow: 'hidden',
              marginBottom: 6
            }}>
              <div style={{
                width: `${coordinatorSponsorshipStats.totalCommitted > 0 ? Math.min(100, coordinatorSponsorshipStats.realizationPct) : 0}%`,
                height: '100%',
                background: '#2C82C9',
                borderRadius: 9999,
                transition: 'width 0.6s ease'
              }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748B', fontWeight: 600, flexWrap: 'wrap', gap: 4 }}>
              <span>{coordinatorSponsorshipStats.totalItems} package units sponsored across team</span>
              <span>
                {coordinatorSponsorshipStats.totalBalance > 0 
                  ? `Pending balance: ₹${coordinatorSponsorshipStats.totalBalance.toLocaleString('en-IN')}` 
                  : 'All committed funds collected'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation - Responsive Scrollable tab-strip */}
      <ScrollableTabStrip activeKey={`${activeTab}-${leaderboardMode}`}>
        <button
          onClick={() => setActiveTab('progress')}
          className={`tab-strip-btn ${activeTab === 'progress' ? 'active' : ''}`}
        >
          <span>Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('team')}
          className={`tab-strip-btn ${activeTab === 'team' ? 'active' : ''}`}
        >
          <Users size={14} />
          <span>Team ({teamMembers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('record')}
          className={`tab-strip-btn ${activeTab === 'record' ? 'active' : ''}`}
        >
          <PlusCircle size={14} />
          <span>Record</span>
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          className={`tab-strip-btn ${activeTab === 'transactions' ? 'active' : ''}`}
        >
          <History size={14} />
          <span>Receipts ({recentTransactions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`tab-strip-btn ${activeTab === 'leaderboard' && leaderboardMode === 'individual' ? 'active' : ''}`}
        >
          <Trophy size={14} />
          <span>Leaderboard</span>
        </button>

        <button
          id="coord-tab-sponsored-items"
          onClick={() => setActiveTab('sponsored-items')}
          className={`tab-strip-btn ${activeTab === 'sponsored-items' ? 'active' : ''}`}
          style={{
            background: activeTab === 'sponsored-items' ? '#2C82C9' : undefined,
            color: activeTab === 'sponsored-items' ? '#FFFFFF' : undefined
          }}
          title="Sponsored Items Catalog & Breakdown"
        >
          <Package size={14} />
          <span>Items ({coordinatorSponsorshipStats.totalItems})</span>
        </button>

        <button
          id="coord-tab-sponsorships"
          onClick={() => { setActiveTab('leaderboard'); setLeaderboardMode('sponsorship'); }}
          className={`tab-strip-btn ${activeTab === 'leaderboard' && leaderboardMode === 'sponsorship' ? 'active' : ''}`}
          style={{
            background: activeTab === 'leaderboard' && leaderboardMode === 'sponsorship' ? '#2C82C9' : undefined,
            color: activeTab === 'leaderboard' && leaderboardMode === 'sponsorship' ? '#FFFFFF' : undefined
          }}
          title="Sponsorship Leaderboard"
        >
          <Building2 size={14} />
          <span>Sponsorships</span>
        </button>
      </ScrollableTabStrip>

      {createMsg && (
        <div style={{
          padding: '12px 14px',
          borderRadius: 'var(--radius-md)',
          marginBottom: 18,
          fontSize: '0.84rem',
          fontWeight: 600,
          background: createMsg.isError ? '#FEF2F2' : '#EBF7EE',
          color: createMsg.isError ? '#B91C1C' : '#008A2E',
          border: createMsg.isError ? '1px solid #FECACA' : '1px solid #A5D6B8'
        }}>
          {createMsg.text}
        </div>
      )}

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'progress' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          <div style={{
            background: '#FFFFFF',
            padding: '20px',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users size={18} color="#2C82C9" />
              <span>Assigned Volunteer Team</span>
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#64748B', marginBottom: 16 }}>
              You currently supervise {teamMembers.length} field volunteers. Add new volunteers to deploy them to the field.
            </p>
            <button
              onClick={() => { setActiveTab('team'); setShowAddVolunteer(true); }}
              className="btn-secondary"
              style={{ width: '100%', padding: '10px', fontSize: '0.84rem' }}
            >
              <UserPlus size={15} />
              <span>Add New Volunteer</span>
            </button>
          </div>

          <div style={{
            background: '#FFFFFF',
            padding: '20px',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Package size={18} color="#008A2E" />
              <span>Field Donation Entry</span>
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#64748B', marginBottom: 16 }}>
              Collect donations directly as a coordinator. Receipts will be logged to your team metrics.
            </p>
            <button
              onClick={() => setActiveTab('record')}
              className="btn-primary"
              style={{ width: '100%', padding: '10px', fontSize: '0.84rem', background: '#008A2E' }}
            >
              <PlusCircle size={15} />
              <span>Open Record Form</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: TEAM MANAGEMENT */}
      {activeTab === 'team' && (
        <div style={{
          background: '#FFFFFF',
          borderRadius: 'var(--radius-xl)',
          padding: '20px',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users size={19} color="#008A2E" />
              <span>Team Volunteers</span>
            </h3>
            <button
              onClick={() => setShowAddVolunteer(!showAddVolunteer)}
              className="btn-primary"
              style={{ padding: '8px 14px', fontSize: '0.82rem', background: '#008A2E' }}
            >
              <UserPlus size={15} />
              <span>{showAddVolunteer ? 'Close Form' : 'Register Volunteer'}</span>
            </button>
          </div>

          {/* Newly Created Volunteer Credentials Highlight Banner */}
          {createdVolunteer && (
            <div style={{
              background: '#F0FDF4',
              border: '2px solid #86EFAC',
              borderRadius: 'var(--radius-lg)',
              padding: '16px',
              marginBottom: 20,
              boxShadow: '0 4px 12px rgba(0, 138, 46, 0.08)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle2 size={20} color="#008A2E" />
                  <span style={{ fontSize: '0.94rem', fontWeight: 800, color: '#166534' }}>
                    Volunteer Account Created & Credentials
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setCreatedVolunteer(null)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B', padding: 2 }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{
                background: '#FFFFFF',
                border: '1px solid #BBF7D0',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                marginBottom: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 10
              }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0F172A' }}>
                    {createdVolunteer.fullName}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#64748B' }}>
                    {createdVolunteer.phone} • {createdVolunteer.wardNumber && createdVolunteer.wardNumber > 0 ? `Ward ${createdVolunteer.wardNumber}` : 'General / Drive Team'}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    background: '#FEF3C7',
                    border: '1.5px solid #F59E0B',
                    color: '#92400E',
                    fontWeight: 900,
                    fontFamily: 'monospace',
                    fontSize: '1.1rem',
                    letterSpacing: '0.1em',
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-md)'
                  }}>
                    {createdVolunteer.defaultPassword}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyPassword(createdVolunteer.defaultPassword)}
                    className="btn-secondary"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '8px 12px',
                      background: copiedPass ? '#008A2E' : '#FFFFFF',
                      color: copiedPass ? '#FFFFFF' : '#008A2E',
                      borderColor: '#86EFAC',
                      fontWeight: 700,
                      fontSize: '0.78rem'
                    }}
                  >
                    {copiedPass ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedPass ? 'Copied!' : 'Copy Password'}</span>
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <a
                  href={`https://wa.me/${createdVolunteer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Salam ${createdVolunteer.fullName},\n\nHere are your login credentials for the Ibada Kit Challenge:\nMobile: ${createdVolunteer.phone}\nPassword: ${createdVolunteer.defaultPassword}\n${createdVolunteer.wardNumber && createdVolunteer.wardNumber > 0 ? `Ward: ${createdVolunteer.wardNumber}\n` : ''}\nLogin: ${window.location.origin}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary"
                  style={{
                    flex: 1,
                    minWidth: 160,
                    padding: '9px 14px',
                    background: '#25D366',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    fontSize: '0.8rem',
                    textDecoration: 'none'
                  }}
                >
                  <Share2 size={15} />
                  <span>Share on WhatsApp</span>
                </a>
              </div>
            </div>
          )}

          {/* Add Volunteer Form */}
          {showAddVolunteer && (
            <form onSubmit={handleCreateVolunteer} style={{
              background: '#F4F9FD',
              border: '1px solid #B8D4EE',
              borderRadius: 'var(--radius-lg)',
              padding: '18px',
              marginBottom: 20
            }}>
              <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0F172A', marginBottom: 12 }}>
                Add Volunteer Under My Supervision
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="e.g. Shafeeq K."
                    value={volFullName}
                    onChange={(e) => setVolFullName(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    required
                    className="input-field"
                    placeholder="98471 23456"
                    value={volPhone}
                    onChange={(e) => setVolPhone(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Target Kits
                  </label>
                  <input
                    type="number"
                    min={5}
                    className="input-field"
                    value={volTarget}
                    onChange={(e) => setVolTarget(Number(e.target.value))}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={creatingVol}
                className="btn-primary"
                style={{ padding: '10px 20px', background: '#008A2E' }}
              >
                {creatingVol ? <RefreshCw size={16} className="animate-spin" /> : 'Save Volunteer'}
              </button>
            </form>
          )}

          {/* List of Volunteers */}
          {teamMembers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 16px', color: '#64748B', fontSize: '0.86rem' }}>
              No volunteers registered under your team yet. Click "Register Volunteer" to add members!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {teamMembers.map((vol, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: '#F8FAFC',
                    border: '1px solid var(--border-subtle)',
                    flexWrap: 'wrap',
                    gap: 10
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.92rem' }}>
                      {vol.fullName}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                      {vol.phoneNumber} • {vol.wardNumber && vol.wardNumber > 0 ? `Ward ${vol.wardNumber}` : 'General / Drive Team'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      background: '#EBF7EE',
                      color: '#008A2E',
                      fontWeight: 800,
                      fontSize: '0.78rem',
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-full)'
                    }}>
                      Target: {vol.targetKits || 50} Kits
                    </span>

                    <button
                      type="button"
                      onClick={() => setResetVolunteerUser({
                        id: vol.userId || vol.phoneNumber,
                        name: vol.fullName,
                        phone: vol.phoneNumber,
                        role: 'Volunteer',
                        wardNumber: vol.wardNumber
                      })}
                      className="btn-secondary"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '6px 12px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        color: '#0F172A',
                        background: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer'
                      }}
                      title="Reset or change volunteer password"
                    >
                      <KeyRound size={13} color="#008A2E" />
                      <span>Password</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: RECORD DONATION */}
      {activeTab === 'record' && (
        <DonationForm
          kitPrice={kitPrice}
          onSuccess={(donation) => {
            setRecentTransactions(prev => [donation, ...prev]);
            const paid = donation.amountPaid !== undefined ? donation.amountPaid : donation.totalAmount;
            setProgress((prev: UserProgress) => ({
              ...prev,
              collectedKits: prev.collectedKits + donation.kitCount,
              collectedAmount: prev.collectedAmount + paid
            }));
          }}
          onSponsorshipSuccess={(spon) => {
            setTeamSponsorships(prev => [spon, ...prev.filter(s => s.sponsorshipId !== spon.sponsorshipId)]);
          }}
        />
      )}

      {/* TAB 4: RECENT TEAM RECEIPTS */}
      {activeTab === 'transactions' && (
        <div style={{
          background: '#FFFFFF',
          borderRadius: 'var(--radius-xl)',
          padding: '20px',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <History size={18} color="#008A2E" />
              <span>Team Receipts</span>
            </h3>

            {/* Switch between Kit Donations vs Sponsorships + Export CSV Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', background: '#F1F5F9', padding: 3, borderRadius: 'var(--radius-md)', gap: 4 }}>
                <button
                  id="btn-coord-receipts-donations"
                  type="button"
                  onClick={() => setReceiptsType('donations')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    background: receiptsType === 'donations' ? '#FFFFFF' : 'transparent',
                    color: receiptsType === 'donations' ? '#008A2E' : '#64748B',
                    fontWeight: 800,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    boxShadow: receiptsType === 'donations' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  Kit Donations ({recentTransactions.length})
                </button>

                <button
                  id="btn-coord-receipts-sponsorships"
                  type="button"
                  onClick={() => setReceiptsType('sponsorships')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    background: receiptsType === 'sponsorships' ? '#FFFFFF' : 'transparent',
                    color: receiptsType === 'sponsorships' ? '#2C82C9' : '#64748B',
                    fontWeight: 800,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    boxShadow: receiptsType === 'sponsorships' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  Sponsorships ({teamSponsorships.length})
                </button>
              </div>

              {receiptsType === 'donations' && (
                <button
                  type="button"
                  id="btn-export-coord-donations-receipts-csv"
                  onClick={() => exportDonationsToCSV(recentTransactions, `${user.fullName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_donations_report`)}
                  className="btn-secondary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    fontSize: '0.78rem'
                  }}
                  title="Export team kit donations to CSV"
                >
                  <Download size={14} color="#008A2E" />
                  <span>Export CSV</span>
                </button>
              )}

              {receiptsType === 'sponsorships' && (
                <button
                  type="button"
                  id="btn-export-coord-sponsorships-receipts-csv"
                  onClick={() => exportSponsorshipsToCSV(teamSponsorships, `${user.fullName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_sponsorships_report`)}
                  className="btn-secondary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    fontSize: '0.78rem'
                  }}
                  title="Export team sponsorships to CSV"
                >
                  <Download size={14} color="#008A2E" />
                  <span>Export CSV</span>
                </button>
              )}
            </div>
          </div>

          {/* KIT DONATION RECEIPTS LIST */}
          {receiptsType === 'donations' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recentTransactions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: '#64748B', fontSize: '0.86rem' }}>
                  No kit receipts recorded yet for your team. Click "Record Donation" to log contributions!
                </div>
              ) : (
                recentTransactions.map((tx) => {
                  const paid = tx.amountPaid !== undefined ? tx.amountPaid : tx.totalAmount;
                  const bal = tx.balanceAmount !== undefined ? tx.balanceAmount : Math.max(0, tx.totalAmount - paid);
                  const isCompleted = tx.paymentStatus === 'Completed' || (!tx.paymentStatus && bal <= 0);
                  const isPartial = tx.paymentStatus === 'Partial' || (bal > 0 && paid > 0);

                  return (
                    <div
                      key={tx.donationId || tx.receiptToken}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 16px',
                        borderRadius: 'var(--radius-md)',
                        background: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        flexWrap: 'wrap',
                        gap: 12
                      }}
                    >
                      <div style={{ minWidth: 200, flex: '1 1 200px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.94rem' }}>
                            {tx.donorName}
                          </span>
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: 6,
                            background: isCompleted ? '#EBF7EE' : isPartial ? '#FEF3C7' : '#EDF4FA',
                            color: isCompleted ? '#008A2E' : isPartial ? '#B45309' : '#2C82C9'
                          }}>
                            {isCompleted ? 'Fully Paid' : isPartial ? 'Advance Paid' : 'Booked'}
                          </span>
                        </div>

                        <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: 3 }}>
                          Collector: {tx.collectedByName || 'Volunteer'} • Token: <span style={{ color: '#008A2E', fontWeight: 700 }}>{tx.receiptToken}</span>
                          {tx.serialNumber && (
                            <span> • Serial: <span style={{ color: '#008A2E', fontWeight: 700 }}>#{tx.serialNumber}</span></span>
                          )}
                          {' '}• {tx.kitCount} {tx.kitCount === 1 ? 'Kit' : 'Kits'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#008A2E' }}>
                            ₹{paid.toLocaleString('en-IN')}
                          </div>
                          {bal > 0 ? (
                            <span style={{ fontSize: '0.7rem', color: '#B91C1C', fontWeight: 700, display: 'block' }}>
                              Bal: ₹{bal.toLocaleString('en-IN')}
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.7rem', color: '#64748B' }}>
                              Total: ₹{tx.totalAmount.toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => onViewReceipt(tx)}
                            className="btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '0.78rem', fontWeight: 700 }}
                          >
                            Receipt
                          </button>

                          {bal > 0 && onOpenPayDonationBalance && (
                            <button
                              type="button"
                              onClick={() => onOpenPayDonationBalance(tx)}
                              className="btn-primary"
                              style={{ padding: '6px 12px', fontSize: '0.78rem', background: '#008A2E' }}
                            >
                              Pay Bal
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* SPONSORSHIP RECEIPTS LIST */}
          {receiptsType === 'sponsorships' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {teamSponsorships.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: '#64748B', fontSize: '0.86rem' }}>
                  No sponsorship receipts recorded yet. Click "Sponsorship" to book and record corporate contributions!
                </div>
              ) : (
                teamSponsorships.map((sp) => (
                  <div
                    key={sp.sponsorshipId || sp.receiptToken}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 16px',
                      borderRadius: 'var(--radius-md)',
                      background: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      flexWrap: 'wrap',
                      gap: 12
                    }}
                  >
                    <div style={{ minWidth: 200, flex: '1 1 200px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.94rem' }}>
                          {sp.donorName}
                        </span>
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: 6,
                          background: sp.paymentStatus === 'Completed' ? '#EBF7EE' : sp.paymentStatus === 'Partial' ? '#FEF3C7' : '#EDF4FA',
                          color: sp.paymentStatus === 'Completed' ? '#008A2E' : sp.paymentStatus === 'Partial' ? '#B45309' : '#2C82C9'
                        }}>
                          {sp.paymentStatus === 'Completed' ? 'Fully Paid' : sp.paymentStatus === 'Partial' ? 'Advance Paid' : 'Booked'}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: 3 }}>
                        {sp.itemName} ({sp.quantity} {sp.quantity === 1 ? 'pkg' : 'pkgs'}) • Token: <span style={{ color: '#2C82C9', fontWeight: 800 }}>{sp.receiptToken}</span>
                      </div>

                      {sp.contactPerson && (
                        <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: 1 }}>
                          Contact: {sp.contactPerson} ({sp.mobileNumber})
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#008A2E' }}>
                          ₹{sp.amountPaid.toLocaleString('en-IN')}
                        </div>
                        {sp.balanceAmount > 0 ? (
                          <span style={{ fontSize: '0.7rem', color: '#B91C1C', fontWeight: 700, display: 'block' }}>
                            Bal: ₹{sp.balanceAmount.toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.7rem', color: '#64748B' }}>
                            Total: ₹{sp.totalAmount.toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => onViewSponsorshipReceipt && onViewSponsorshipReceipt(sp)}
                          className="btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.78rem', fontWeight: 700 }}
                        >
                          Receipt
                        </button>

                        {sp.balanceAmount > 0 && onOpenPayBalance && (
                          <button
                            type="button"
                            onClick={() => onOpenPayBalance(sp)}
                            className="btn-primary"
                            style={{ padding: '6px 12px', fontSize: '0.78rem', background: '#008A2E' }}
                          >
                            Pay Bal
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: LEADERBOARD */}
      {activeTab === 'leaderboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Sub-Switch: Field Volunteers vs Corporate Sponsorships */}
          <div style={{
            display: 'flex',
            background: '#FFFFFF',
            padding: 4,
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            gap: 6
          }}>
            <button
              id="coord-switch-volunteers"
              onClick={() => setLeaderboardMode('individual')}
              style={{
                flex: 1,
                minWidth: 0,
                padding: '9px clamp(6px, 2vw, 12px)',
                borderRadius: 'var(--radius-md)',
                border: leaderboardMode === 'individual' ? '1px solid #A5D6B8' : 'none',
                background: leaderboardMode === 'individual' ? '#EBF7EE' : 'transparent',
                color: leaderboardMode === 'individual' ? '#008A2E' : '#64748B',
                fontWeight: 800,
                fontSize: 'clamp(0.78rem, 2.5vw, 0.84rem)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                whiteSpace: 'nowrap'
              }}
            >
              <Award size={15} style={{ flexShrink: 0 }} />
              <span>Volunteer Rankings</span>
            </button>

            <button
              id="coord-switch-sponsorships"
              onClick={() => setLeaderboardMode('sponsorship')}
              style={{
                flex: 1,
                minWidth: 0,
                padding: '9px clamp(6px, 2vw, 12px)',
                borderRadius: 'var(--radius-md)',
                border: leaderboardMode === 'sponsorship' ? '1px solid #B8D4EE' : 'none',
                background: leaderboardMode === 'sponsorship' ? '#EDF4FA' : 'transparent',
                color: leaderboardMode === 'sponsorship' ? '#2C82C9' : '#64748B',
                fontWeight: 800,
                fontSize: 'clamp(0.78rem, 2.5vw, 0.84rem)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                whiteSpace: 'nowrap'
              }}
            >
              <Building2 size={15} style={{ flexShrink: 0 }} />
              <span>Sponsorships</span>
            </button>
          </div>

          {leaderboardMode === 'sponsorship' ? (
            <SponsorshipLeaderboardView user={user} onOpenSponsorshipModal={() => setActiveTab('record')} />
          ) : (
            <div style={{
              background: '#FFFFFF',
              borderRadius: 'var(--radius-xl)',
              padding: '20px',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Trophy size={18} color="#008A2E" />
                <span>Drive Volunteer Rankings</span>
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {volunteersBoard.map((vol, i) => (
                  <div
                    key={vol.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      background: '#F8FAFC',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 22, fontWeight: 800, fontSize: '0.85rem', color: '#64748B' }}>
                        #{i + 1}
                      </span>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0F172A' }}>{vol.name}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B' }}>Ward {vol.wardNumber} • {vol.role}</div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontWeight: 800, color: '#008A2E', fontSize: '0.9rem' }}>
                        {vol.kitsCollected} Kits
                      </span>
                      <div style={{ fontSize: '0.72rem', color: '#2C82C9', fontWeight: 700 }}>
                        ₹{vol.totalAmount.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: SPONSORED ITEMS SUMMARY VIEW */}
      {activeTab === 'sponsored-items' && (
        <SponsoredItemsSummaryView
          title="Team & Ward Sponsored Items"
          subtitle="Item-by-item breakdown of quantities sponsored and funds collected across your assigned team and ward."
          sponsorships={teamSponsorships}
          catalogItems={catalogItems}
          onViewReceipt={onViewSponsorshipReceipt}
          onOpenPayBalance={onOpenPayBalance}
          onOpenSponsorshipModal={() => setActiveTab('record')}
        />
      )}

      {/* RESET VOLUNTEER PASSWORD MODAL */}
      <ResetPasswordModal
        isOpen={!!resetVolunteerUser}
        onClose={() => setResetVolunteerUser(null)}
        targetUser={resetVolunteerUser}
      />
    </div>
  );
};
