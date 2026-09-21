import React, { useState, useEffect, useMemo } from 'react';
import type { User, Donation, LeaderboardEntry, WardLeaderboardEntry, SponsorshipRecord } from '../types';
import { DonationForm } from '../components/DonationForm';
import { donationsApi, sponsorshipsApi, authApi, analyticsApi, adminApi, API_BASE_URL, generateRandomPassword, getKitUnitPrice, getAuthHeaders } from '../services/api';
import { 
  MapPin, 
  Users, 
  TrendingUp, 
  PlusCircle, 
  History, 
  Trophy, 
  UserPlus, 
  RefreshCw,
  KeyRound,
  Copy,
  Check,
  CheckCircle,
  User as UserIcon,
  Share2,
  X,
  Lock,
  Eye,
  EyeOff,
  Building2,
  Award,
  Download,
  Target,
  Edit3
} from 'lucide-react';
import { ResetPasswordModal, type ResetTargetUser } from '../components/ResetPasswordModal';
import { SponsorshipLeaderboardView } from '../components/SponsorshipLeaderboardView';
import { ScrollableTabStrip } from '../components/ScrollableTabStrip';
import { exportSponsorshipsToCSV, exportDonationsToCSV } from '../utils/exportCsv';

interface WardCoordinatorDashboardProps {
  user: User;
  kitPrice?: number;
  onViewReceipt: (donation: Donation) => void;
  onViewSponsorshipReceipt?: (sponsorship: SponsorshipRecord) => void;
  onOpenPayBalance?: (sponsorship: SponsorshipRecord) => void;
  onOpenPayDonationBalance?: (donation: Donation) => void;
}

export const WardCoordinatorDashboard: React.FC<WardCoordinatorDashboardProps> = ({
  user,
  kitPrice = getKitUnitPrice(),
  onViewReceipt,
  onViewSponsorshipReceipt,
  onOpenPayBalance,
  onOpenPayDonationBalance
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'team' | 'record' | 'transactions' | 'ranks' | 'profile'>('overview');
  const [ranksMode, setRanksMode] = useState<'individual' | 'sponsorship'>('individual');
  const [receiptsType, setReceiptsType] = useState<'donations' | 'sponsorships'>('donations');
  const [wardSponsorships, setWardSponsorships] = useState<SponsorshipRecord[]>([]);
  
  // Aggregate statistics for ward sponsorships
  const wardSponsorshipStats = useMemo(() => {
    const totalItems = wardSponsorships.reduce((sum, s) => sum + (Number(s.quantity) || 1), 0);
    const totalCommitted = wardSponsorships.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
    const totalPaid = wardSponsorships.reduce((sum, s) => sum + (Number(s.amountPaid) || 0), 0);
    const totalBalance = wardSponsorships.reduce((sum, s) => sum + (Number(s.balanceAmount) || 0), 0);
    const realizationPct = totalCommitted > 0 ? Math.min(100, Math.round((totalPaid / totalCommitted) * 100)) : 0;
    return { totalItems, totalCommitted, totalPaid, totalBalance, realizationPct };
  }, [wardSponsorships]);
  
  const [wardStats, setWardStats] = useState({
    wardNumber: user.wardNumber || 0,
    wardName: user.wardNumber ? `Ward ${user.wardNumber}` : 'My Ward',
    targetKits: user.targetKits || 0,
    collectedKits: 0,
    collectedAmount: 0,
    progressPercentage: 0
  });

  const [wardVolunteers, setWardVolunteers] = useState<any[]>([]);
  const [wardDonations, setWardDonations] = useState<Donation[]>([]);
  const [allWards, setAllWards] = useState<WardLeaderboardEntry[]>([]);
  const [volunteersBoard, setVolunteersBoard] = useState<LeaderboardEntry[]>([]);

  // Target allocation breakdown (Ward target is divided among volunteers, never accumulated)
  const volunteerAllocatedTarget = useMemo(() => {
    return wardVolunteers.reduce((sum, v) => sum + (Number(v.targetKits) || 0), 0);
  }, [wardVolunteers]);

  const unallocatedTarget = useMemo(() => {
    const total = wardStats.targetKits || user.targetKits || 0;
    return Math.max(0, total - volunteerAllocatedTarget);
  }, [wardStats.targetKits, user.targetKits, volunteerAllocatedTarget]);

  // Edit volunteer target modal state
  const [editingVolunteer, setEditingVolunteer] = useState<{
    id: string;
    name: string;
    targetKits: number;
  } | null>(null);
  const [editTargetValue, setEditTargetValue] = useState<number>(0);
  const [updatingTarget, setUpdatingTarget] = useState(false);

  // Add Volunteer form
  const [showAddVol, setShowAddVol] = useState(false);
  const [volName, setVolName] = useState('');
  const [volPhone, setVolPhone] = useState('');
  const [volTarget, setVolTarget] = useState(20);
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; isError: boolean } | null>(null);

  // Highlight & Copy Newly Created Volunteer Credentials
  const [createdVolunteer, setCreatedVolunteer] = useState<{
    fullName: string;
    phone: string;
    defaultPassword: string;
    wardNumber: number;
  } | null>(null);
  const [copiedPass, setCopiedPass] = useState(false);
  const [copiedCreds, setCopiedCreds] = useState(false);
  const [resetVolunteerUser, setResetVolunteerUser] = useState<ResetTargetUser | null>(null);

  // Change Password state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword.length < 6) {
      setPasswordMsg({ text: 'New password must be at least 6 characters.', isError: true });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ text: 'New passwords do not match.', isError: true });
      return;
    }

    try {
      setPasswordSubmitting(true);
      const msg = await authApi.changePassword(oldPassword, newPassword);
      setPasswordMsg({ text: msg || 'Password updated successfully!', isError: false });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordMsg({ text: err.message || 'Failed to update password. Please check your current password.', isError: true });
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const handleCopyPassword = (pass: string) => {
    navigator.clipboard.writeText(pass);
    setCopiedPass(true);
    setTimeout(() => setCopiedPass(false), 2000);
  };

  useEffect(() => {
    // 1. Fetch live donations, leaderboards, and coordinator progress
    Promise.all([
      donationsApi.getRecentDonations(user.role),
      donationsApi.getWardLeaderboard(),
      donationsApi.getVolunteerLeaderboard(user.role),
      user.token ? analyticsApi.getMyProgress(user.token).catch(() => null) : Promise.resolve(null)
    ])
      .then(([donations, wards, vols, progressData]) => {
        setAllWards(wards);
        setVolunteersBoard(vols);

        const currentWard = wards.find(w => w.wardNumber === user.wardNumber);
        const resolvedTarget = (progressData && progressData.targetKits > 0)
          ? progressData.targetKits
          : (user.targetKits && user.targetKits > 0)
            ? user.targetKits
            : (currentWard?.targetKits || 0);

        const kits = progressData?.collectedKits ?? (currentWard?.kitsCollected || 0);
        const amt = progressData?.collectedAmount ?? (currentWard?.totalAmount || (kits * (kitPrice || 1000)));
        const pct = resolvedTarget > 0 ? Math.min(100, Math.round((kits / resolvedTarget) * 100)) : 0;

        setWardStats({
          wardNumber: user.wardNumber || (currentWard ? currentWard.wardNumber : 0),
          wardName: currentWard ? currentWard.wardName : (user.wardNumber ? `Ward ${user.wardNumber}` : 'My Ward'),
          targetKits: resolvedTarget,
          collectedKits: kits,
          collectedAmount: amt,
          progressPercentage: pct
        });

        // Donations are scoped by backend for this ward/user
        const wardTx = user.wardNumber ? donations.filter(d => Number(d.wardNumber) === Number(user.wardNumber)) : donations;
        setWardDonations(wardTx);
      })
      .catch(() => {});

    // 2. Fetch volunteers tied to this ward
    if (user.token) {
      fetch(`${API_BASE_URL}/Users/volunteers`, {
        headers: getAuthHeaders(user.token, false)
      })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (Array.isArray(data)) setWardVolunteers(data);
        })
        .catch(() => {});
    }

    // 3. Fetch sponsorships tied to this ward
    sponsorshipsApi.getSponsorships()
      .then(spons => {
        const filtered = user.wardNumber ? spons.filter(s => Number(s.wardNumber) === Number(user.wardNumber)) : spons;
        setWardSponsorships(filtered);
      })
      .catch(() => {});
  }, [user.token, user.wardNumber]);

  // Helper to re-fetch live sponsorships for automatic tab refresh
  const refreshWardSponsorships = () => {
    sponsorshipsApi.getSponsorships()
      .then(spons => {
        const filtered = user.wardNumber ? spons.filter(s => Number(s.wardNumber) === Number(user.wardNumber)) : spons;
        setWardSponsorships(filtered);
      })
      .catch(() => {});
  };

  // Automatically refresh live receipts when switching to the receipts tab
  useEffect(() => {
    if (activeTab === 'transactions') {
      refreshWardSponsorships();
      donationsApi.getRecentDonations(user.role)
        .then(donations => {
          const wardTx = user.wardNumber ? donations.filter(d => Number(d.wardNumber) === Number(user.wardNumber)) : donations;
          setWardDonations(wardTx);
        })
        .catch(() => {});
    }
  }, [activeTab, user.role, user.wardNumber]);

  const handleSponsorshipRecorded = (spon: SponsorshipRecord) => {
    setWardSponsorships(prev => [spon, ...prev.filter(s => s.sponsorshipId !== spon.sponsorshipId)]);
    refreshWardSponsorships();
  };

  const handleCreateWardVolunteer = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    const cleanPhone = volPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setStatusMsg({ text: 'Please enter a valid 10-digit mobile number.', isError: true });
      return;
    }

    const defaultPass = generateRandomPassword(6);

    try {
      setSubmitting(true);
      const res = await fetch(`${API_BASE_URL}/Users`, {
        method: 'POST',
        headers: getAuthHeaders(user.token),
        body: JSON.stringify({
          fullName: volName.trim(),
          phoneNumber: `+91${cleanPhone.slice(-10)}`,
          role: 'Volunteer',
          wardNumber: user.wardNumber || 0,
          targetKits: Number(volTarget),
          defaultPassword: defaultPass
        })
      });

      const resData = await res.json().catch(() => ({}));
      const createdId = resData.userId || resData.UserId || `vol-${Date.now()}`;

      const newVol = {
        userId: createdId,
        id: createdId,
        fullName: volName.trim(),
        phoneNumber: `+91${cleanPhone.slice(-10)}`,
        wardNumber: user.wardNumber,
        targetKits: Number(volTarget)
      };
      setWardVolunteers(prev => [newVol, ...prev]);
      setCreatedVolunteer({
        fullName: volName.trim(),
        phone: `+91${cleanPhone.slice(-10)}`,
        defaultPassword: defaultPass,
        wardNumber: user.wardNumber || 0
      });
      setStatusMsg({ text: `Volunteer ${volName} registered successfully! Default password: ${defaultPass}`, isError: false });
      setVolName('');
      setVolPhone('');
    } catch (err: any) {
      setStatusMsg({ text: err.message || 'Failed to save volunteer to database. Please try again.', isError: true });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateVolunteerTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVolunteer) return;
    try {
      setUpdatingTarget(true);
      await adminApi.updateUserTarget(editingVolunteer.id, editTargetValue);
      setWardVolunteers(prev =>
        prev.map(v => (v.userId === editingVolunteer.id || v.id === editingVolunteer.id || v.phoneNumber === editingVolunteer.id)
          ? { ...v, targetKits: editTargetValue }
          : v
        )
      );
      setStatusMsg({ text: `Target for ${editingVolunteer.name} updated to ${editTargetValue} kits!`, isError: false });
      setEditingVolunteer(null);
    } catch (err: any) {
      setStatusMsg({ text: err.message || 'Failed to update volunteer target.', isError: true });
    } finally {
      setUpdatingTarget(false);
    }
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
        marginBottom: 20
      }}>
        <div>
          <span style={{
            background: '#F4F9FD',
            color: '#2C82C9',
            border: '1px solid #B8D4EE',
            padding: '4px 10px',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.74rem',
            fontWeight: 800,
            textTransform: 'uppercase'
          }}>
            Ward {user.wardNumber} Coordinator
          </span>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 900, color: '#0F172A', marginTop: 4 }}>
            Ward Committee
          </h1>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('profile')}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <KeyRound size={16} />
            <span>Profile & Password</span>
          </button>
          <button
            onClick={() => setActiveTab('record')}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#008A2E' }}
          >
            <PlusCircle size={17} />
            <span>Record Ward Donation</span>
          </button>
        </div>
      </div>

      {/* Ward Progress Card with 3-Way Collections Display & Separate Progress Bars */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: 'var(--radius-xl)',
        padding: '22px 20px',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-sm)',
        marginBottom: 20
      }}>
        {/* Header Row: Ward Identity & 3-Way Collection (Donations | Sponsorship | Total) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
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
              <MapPin size={22} />
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700, letterSpacing: '0.04em' }}>
                Ward {wardStats.wardNumber} Campaign Progress
              </span>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0F172A', marginTop: 1 }}>
                {wardStats.wardName}
              </div>
            </div>
          </div>

          {/* 3-Way Collections Display: Donations | Sponsorship | Total */}
          <div className="collections-split-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700 }}>Donations:</span>
              <span style={{ fontSize: '0.94rem', fontWeight: 800, color: '#008A2E' }}>
                ₹{wardStats.collectedAmount.toLocaleString('en-IN')}
              </span>
            </div>
            <span className="split-divider">|</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700 }}>Sponsorship:</span>
              <span style={{ fontSize: '0.94rem', fontWeight: 800, color: '#2C82C9' }}>
                ₹{wardSponsorshipStats.totalPaid.toLocaleString('en-IN')}
              </span>
            </div>
            <span className="split-divider">|</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#0F172A', fontWeight: 800 }}>Total:</span>
              <span style={{ fontSize: '1.12rem', fontWeight: 900, color: '#0F172A' }}>
                ₹{(wardStats.collectedAmount + wardSponsorshipStats.totalPaid).toLocaleString('en-IN')}
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
                  Kit Donations Target: {wardStats.collectedKits} / {wardStats.targetKits} Kits ({wardStats.progressPercentage}%)
                </span>
              </div>
              <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#008A2E' }}>
                ₹{wardStats.collectedAmount.toLocaleString('en-IN')} Raised
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
                width: `${Math.min(100, wardStats.progressPercentage)}%`,
                height: '100%',
                background: '#7BCC53',
                borderRadius: 9999,
                transition: 'width 0.6s ease'
              }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748B', fontWeight: 600, flexWrap: 'wrap', gap: 4 }}>
              <span>Collections from all Ward {wardStats.wardNumber} volunteers</span>
              <span>{Math.max(0, wardStats.targetKits - wardStats.collectedKits)} kits to hit Ward goal</span>
            </div>
          </div>

          {/* BAR 2: Sponsorship Packages & Collections Progress (Sponsorship Blue #2C82C9) */}
          <div style={{ background: '#F4F9FD', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid #DCE9F6' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2C82C9', display: 'inline-block' }} />
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0F172A' }}>
                  Sponsorship Packages: <span style={{ color: '#2C82C9', fontWeight: 900 }}>{wardSponsorshipStats.totalItems} Items Sponsored</span>
                </span>
              </div>
              <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#2C82C9' }}>
                ₹{wardSponsorshipStats.totalPaid.toLocaleString('en-IN')} / ₹{wardSponsorshipStats.totalCommitted.toLocaleString('en-IN')} ({wardSponsorshipStats.realizationPct}%)
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
                width: `${wardSponsorshipStats.totalCommitted > 0 ? Math.min(100, wardSponsorshipStats.realizationPct) : 0}%`,
                height: '100%',
                background: '#2C82C9',
                borderRadius: 9999,
                transition: 'width 0.6s ease'
              }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748B', fontWeight: 600, flexWrap: 'wrap', gap: 4 }}>
              <span>{wardSponsorshipStats.totalItems} package units sponsored in Ward {wardStats.wardNumber}</span>
              <span>
                {wardSponsorshipStats.totalBalance > 0 
                  ? `Pending balance: ₹${wardSponsorshipStats.totalBalance.toLocaleString('en-IN')}` 
                  : 'All committed funds collected'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs - Smooth horizontally scrollable with auto-centering and navigation chevrons */}
      <ScrollableTabStrip activeKey={`${activeTab}-${ranksMode}`}>
        <button
          onClick={() => setActiveTab('overview')}
          className={`tab-strip-btn ${activeTab === 'overview' ? 'active' : ''}`}
          style={{
            background: activeTab === 'overview' ? '#008A2E' : 'transparent',
            color: activeTab === 'overview' ? '#FFFFFF' : '#334155'
          }}
        >
          <span>Ward Stats</span>
        </button>

        <button
          onClick={() => setActiveTab('team')}
          className={`tab-strip-btn ${activeTab === 'team' ? 'active' : ''}`}
          style={{
            background: activeTab === 'team' ? '#008A2E' : 'transparent',
            color: activeTab === 'team' ? '#FFFFFF' : '#334155'
          }}
        >
          <span>Volunteers ({wardVolunteers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('record')}
          className={`tab-strip-btn ${activeTab === 'record' ? 'active' : ''}`}
          style={{
            background: activeTab === 'record' ? '#008A2E' : 'transparent',
            color: activeTab === 'record' ? '#FFFFFF' : '#334155'
          }}
        >
          <span>Record</span>
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          className={`tab-strip-btn ${activeTab === 'transactions' ? 'active' : ''}`}
          style={{
            background: activeTab === 'transactions' ? '#008A2E' : 'transparent',
            color: activeTab === 'transactions' ? '#FFFFFF' : '#334155'
          }}
        >
          <span>Receipts ({wardDonations.length + wardSponsorships.length})</span>
        </button>

        <button
          onClick={() => { setActiveTab('ranks'); setRanksMode('individual'); }}
          className={`tab-strip-btn ${activeTab === 'ranks' && ranksMode === 'individual' ? 'active' : ''}`}
          style={{
            background: activeTab === 'ranks' && ranksMode === 'individual' ? '#008A2E' : 'transparent',
            color: activeTab === 'ranks' && ranksMode === 'individual' ? '#FFFFFF' : '#334155'
          }}
        >
          <span>Rankings</span>
        </button>

        <button
          id="ward-tab-sponsorships"
          onClick={() => { setActiveTab('ranks'); setRanksMode('sponsorship'); }}
          className={`tab-strip-btn ${activeTab === 'ranks' && ranksMode === 'sponsorship' ? 'active' : ''}`}
          style={{
            background: activeTab === 'ranks' && ranksMode === 'sponsorship' ? '#2C82C9' : 'transparent',
            color: activeTab === 'ranks' && ranksMode === 'sponsorship' ? '#FFFFFF' : '#334155'
          }}
          title="Sponsorship Leaderboard"
        >
          <Building2 size={14} />
          <span>Sponsorships</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`tab-strip-btn ${activeTab === 'profile' ? 'active' : ''}`}
          style={{
            background: activeTab === 'profile' ? '#008A2E' : 'transparent',
            color: activeTab === 'profile' ? '#FFFFFF' : '#334155'
          }}
        >
          <span>Profile</span>
        </button>
      </ScrollableTabStrip>

      {/* Prominently Highlighted Newly Generated Volunteer Password Card with Copy Action */}
      {createdVolunteer && (
        <div style={{
          background: '#FFFFFF',
          borderRadius: 'var(--radius-xl)',
          border: '2px solid #10B981',
          boxShadow: '0 8px 24px rgba(16, 185, 129, 0.15)',
          padding: '20px',
          marginBottom: 20,
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: 'linear-gradient(90deg, #10B981, #059669)'
          }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: '#ECFDF5',
                border: '1px solid #A7F3D0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#059669'
              }}>
                <CheckCircle size={22} />
              </div>
              <div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Volunteer Registered Successfully!
                </h4>
                <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '2px 0 0 0' }}>
                  Share these login credentials with <strong>{createdVolunteer.fullName}</strong>
                </p>
              </div>
            </div>

            <button
              onClick={() => setCreatedVolunteer(null)}
              className="btn-icon"
              style={{ width: 28, height: 28, color: '#94A3B8' }}
              title="Dismiss"
            >
              <X size={16} />
            </button>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 14,
            background: '#F0FDF4',
            border: '1px solid #BBF7D0',
            borderRadius: 'var(--radius-lg)',
            padding: '16px',
            marginBottom: 14
          }}>
            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700, color: '#065F46' }}>
                Volunteer Member
              </span>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', marginTop: 2 }}>
                {createdVolunteer.fullName}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
                {createdVolunteer.phone} • Ward {createdVolunteer.wardNumber}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700, color: '#065F46' }}>
                Default Login Password
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                <div style={{
                  background: '#FEF3C7',
                  border: '2px solid #F59E0B',
                  borderRadius: 'var(--radius-md)',
                  padding: '6px 14px',
                  fontSize: '1.35rem',
                  fontFamily: 'monospace',
                  fontWeight: 900,
                  letterSpacing: '0.12em',
                  color: '#92400E',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)'
                }}>
                  {createdVolunteer.defaultPassword}
                </div>

                <button
                  onClick={() => handleCopyPassword(createdVolunteer.defaultPassword)}
                  className="btn-primary"
                  style={{
                    padding: '8px 14px',
                    fontSize: '0.82rem',
                    background: copiedPass ? '#059669' : '#008A2E',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  {copiedPass ? <Check size={16} /> : <Copy size={16} />}
                  <span>{copiedPass ? 'Copied!' : 'Copy Password'}</span>
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                const creds = `Muslim League | Ibada Kit Challenge\nVolunteer Login Credentials:\nName: ${createdVolunteer.fullName}\nPhone: ${createdVolunteer.phone}\nPassword: ${createdVolunteer.defaultPassword}\nWard: ${createdVolunteer.wardNumber}\nPortal: ${window.location.origin}`;
                navigator.clipboard.writeText(creds);
                setCopiedCreds(true);
                setTimeout(() => setCopiedCreds(false), 2000);
              }}
              className="btn-secondary"
              style={{ padding: '8px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {copiedCreds ? <Check size={15} color="#008A2E" /> : <Copy size={15} />}
              <span>{copiedCreds ? 'All Credentials Copied!' : 'Copy Details for WhatsApp'}</span>
            </button>

            <a
              href={`https://wa.me/${createdVolunteer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Salam ${createdVolunteer.fullName},\n\nHere are your login credentials for the Ibada Kit Challenge:\nMobile: ${createdVolunteer.phone}\nPassword: ${createdVolunteer.defaultPassword}\nWard: ${createdVolunteer.wardNumber}\n\nLogin: ${window.location.origin}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
              style={{ padding: '8px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6, color: '#166534', background: '#DCFCE7', borderColor: '#86EFAC' }}
            >
              <Share2 size={15} />
              <span>Send via WhatsApp</span>
            </a>
          </div>
        </div>
      )}

      {statusMsg && !createdVolunteer && (
        <div style={{
          padding: '12px 14px',
          borderRadius: 'var(--radius-md)',
          marginBottom: 18,
          fontSize: '0.84rem',
          fontWeight: 600,
          background: statusMsg.isError ? '#FEF2F2' : '#EBF7EE',
          color: statusMsg.isError ? '#B91C1C' : '#008A2E',
          border: statusMsg.isError ? '1px solid #FECACA' : '1px solid #A5D6B8'
        }}>
          {statusMsg.text}
        </div>
      )}

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          <div style={{
            background: '#FFFFFF',
            padding: '20px',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users size={18} color="#2C82C9" />
              <span>Ward {user.wardNumber} Volunteers</span>
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#64748B', marginBottom: 16 }}>
              Register new volunteers explicitly attached to Ward {user.wardNumber} to expand field coverage.
            </p>
            <button
              onClick={() => { setActiveTab('team'); setShowAddVol(true); }}
              className="btn-secondary"
              style={{ width: '100%', padding: '10px', fontSize: '0.84rem' }}
            >
              <UserPlus size={15} />
              <span>Register Ward Volunteer</span>
            </button>
          </div>

          <div style={{
            background: '#FFFFFF',
            padding: '20px',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Trophy size={18} color="#008A2E" />
              <span>Ward Ranking</span>
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#64748B', marginBottom: 16 }}>
              Check how Ward {user.wardNumber} compares to other wards across Madavoor Panchayath.
            </p>
            <button
              onClick={() => setActiveTab('ranks')}
              className="btn-primary"
              style={{ width: '100%', padding: '10px', fontSize: '0.84rem', background: '#008A2E' }}
            >
              <TrendingUp size={15} />
              <span>View Leaderboards</span>
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
              <span>Ward {user.wardNumber} Volunteers</span>
            </h3>
            <button
              onClick={() => setShowAddVol(!showAddVol)}
              className="btn-primary"
              style={{ padding: '8px 14px', fontSize: '0.82rem', background: '#008A2E' }}
            >
              <UserPlus size={15} />
              <span>{showAddVol ? 'Close' : 'Add Volunteer'}</span>
            </button>
          </div>

          {/* Target Distribution Summary Card */}
          <div style={{
            background: 'linear-gradient(135deg, #F0FDF4 0%, #F8FAFC 100%)',
            border: '1px solid #BBF7D0',
            borderRadius: 'var(--radius-lg)',
            padding: '16px 18px',
            marginBottom: 20
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Target size={18} color="#008A2E" />
                <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A' }}>
                  Ward {user.wardNumber} Target Sharing & Distribution
                </span>
              </div>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#15803D',
                background: '#DCFCE7',
                padding: '3px 8px',
                borderRadius: 9999
              }}>
                Fixed Ward Goal: {wardStats.targetKits || user.targetKits || 50} Kits
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
              <div style={{ background: '#FFFFFF', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>
                  Admin Set Ward Target
                </span>
                <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0F172A' }}>
                  {wardStats.targetKits || user.targetKits || 50} Kits
                </span>
                <span style={{ fontSize: '0.68rem', color: '#64748B', display: 'block' }}>
                  Fixed goal assigned to Lead
                </span>
              </div>

              <div style={{ background: '#FFFFFF', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>
                  Assigned to Volunteers
                </span>
                <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#008A2E' }}>
                  {volunteerAllocatedTarget} Kits
                </span>
                <span style={{ fontSize: '0.68rem', color: '#64748B', display: 'block' }}>
                  {wardVolunteers.length} {wardVolunteers.length === 1 ? 'volunteer' : 'volunteers'}
                </span>
              </div>

              <div style={{ background: '#FFFFFF', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>
                  {volunteerAllocatedTarget > (wardStats.targetKits || user.targetKits || 50) ? 'Exceeding Ward Goal' : 'Unallocated / Direct'}
                </span>
                <span style={{
                  fontSize: '1.25rem',
                  fontWeight: 900,
                  color: volunteerAllocatedTarget > (wardStats.targetKits || user.targetKits || 50) ? '#008A2E' : unallocatedTarget > 0 ? '#2563EB' : '#64748B'
                }}>
                  {volunteerAllocatedTarget > (wardStats.targetKits || user.targetKits || 50)
                    ? `+${volunteerAllocatedTarget - (wardStats.targetKits || user.targetKits || 50)} Kits`
                    : `${unallocatedTarget} Kits`}
                </span>
                <span style={{ fontSize: '0.68rem', color: '#64748B', display: 'block' }}>
                  {volunteerAllocatedTarget > (wardStats.targetKits || user.targetKits || 50)
                    ? 'Above baseline target'
                    : unallocatedTarget > 0 ? 'Remaining from goal' : '100% Allocated'}
                </span>
              </div>
            </div>
          </div>

          {showAddVol && (
            <form onSubmit={handleCreateWardVolunteer} style={{
              background: '#F4F9FD',
              border: '1px solid #B8D4EE',
              borderRadius: 'var(--radius-lg)',
              padding: '18px',
              marginBottom: 20
            }}>
              <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0F172A', marginBottom: 12 }}>
                Register Volunteer for Ward {user.wardNumber}
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Volunteer Name
                  </label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="e.g. Jasim K."
                    value={volName}
                    onChange={(e) => setVolName(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    WhatsApp Mobile
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
                    Volunteer Target Kits
                  </label>
                  <input
                    type="number"
                    min={1}
                    className="input-field"
                    value={volTarget}
                    onChange={(e) => setVolTarget(Number(e.target.value))}
                  />
                  <span style={{ fontSize: '0.7rem', color: '#64748B', display: 'block', marginTop: 3 }}>
                    No limit. You can assign any kit target to each volunteer.
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary"
                style={{ padding: '10px 20px', background: '#008A2E' }}
              >
                {submitting ? <RefreshCw size={16} className="animate-spin" /> : 'Register Volunteer'}
              </button>
            </form>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {wardVolunteers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 16px', color: '#64748B', fontSize: '0.86rem' }}>
                No volunteers registered for Ward {user.wardNumber} yet. Click "Add Volunteer" to deploy members!
              </div>
            ) : (
              wardVolunteers.map((v, i) => (
                <div
                  key={i}
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
                      {v.fullName}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                      {v.phoneNumber} • Ward {v.wardNumber || user.wardNumber}
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
                      Target: {v.targetKits || 20} Kits
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        const vId = v.userId || v.id || v.phoneNumber;
                        setEditingVolunteer({
                          id: vId,
                          name: v.fullName,
                          targetKits: Number(v.targetKits) || 20
                        });
                        setEditTargetValue(Number(v.targetKits) || 20);
                      }}
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
                      title="Adjust volunteer target share"
                    >
                      <Edit3 size={13} color="#2563EB" />
                      <span>Target</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setResetVolunteerUser({
                        id: v.userId || v.phoneNumber,
                        name: v.fullName,
                        phone: v.phoneNumber,
                        role: 'Volunteer',
                        wardNumber: v.wardNumber || user.wardNumber
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
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: RECORD DONATION */}
      {activeTab === 'record' && (
        <DonationForm
          kitPrice={kitPrice}
          onSuccess={(donation) => {
            setWardDonations(prev => [donation, ...prev]);
            const paid = donation.amountPaid !== undefined ? donation.amountPaid : donation.totalAmount;
            setWardStats(prev => ({
              ...prev,
              collectedKits: prev.collectedKits + donation.kitCount,
              collectedAmount: prev.collectedAmount + paid
            }));
          }}
          onSponsorshipSuccess={handleSponsorshipRecorded}
        />
      )}

      {/* TAB 4: RECENT WARD RECEIPTS */}
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
              <span>Ward {user.wardNumber} Receipts</span>
            </h3>

            {/* Switch between Kit Donations vs Sponsorships + Export CSV Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', background: '#F1F5F9', padding: 3, borderRadius: 'var(--radius-md)', gap: 4 }}>
                <button
                  id="btn-receipts-donations"
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
                  Kit Donations ({wardDonations.length})
                </button>

                <button
                  id="btn-receipts-sponsorships"
                  type="button"
                  onClick={() => {
                    setReceiptsType('sponsorships');
                    refreshWardSponsorships();
                  }}
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
                  Sponsorships ({wardSponsorships.length})
                </button>
              </div>

              {receiptsType === 'donations' && (
                <button
                  type="button"
                  id="btn-export-ward-donations-receipts-csv"
                  onClick={() => exportDonationsToCSV(wardDonations, `ward_${user.wardNumber}_donations_report`)}
                  className="btn-secondary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    fontSize: '0.78rem'
                  }}
                  title="Export Ward kit donations to CSV"
                >
                  <Download size={14} color="#008A2E" />
                  <span>Export CSV</span>
                </button>
              )}

              {receiptsType === 'sponsorships' && (
                <button
                  type="button"
                  id="btn-export-ward-sponsorships-receipts-csv"
                  onClick={() => exportSponsorshipsToCSV(wardSponsorships, `ward_${user.wardNumber}_sponsorships_report`)}
                  className="btn-secondary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    fontSize: '0.78rem'
                  }}
                  title="Export Ward sponsorships to CSV"
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
              {wardDonations.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: '#64748B', fontSize: '0.86rem' }}>
                  No kit donation receipts recorded for Ward {user.wardNumber} yet.
                </div>
              ) : (
                wardDonations.map((tx) => {
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
                          Collector: {tx.collectedByName || 'Ward Member'} • Receipt No: <span style={{ color: '#008A2E', fontWeight: 700 }}>{tx.receiptToken}</span>
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
              {wardSponsorships.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: '#64748B', fontSize: '0.86rem' }}>
                  No sponsorship receipts recorded for Ward {user.wardNumber} yet.
                </div>
              ) : (
                wardSponsorships.map((sp) => (
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
                        {sp.itemName} ({sp.quantity} {sp.quantity === 1 ? 'pkg' : 'pkgs'}) • Receipt No: <span style={{ color: '#2C82C9', fontWeight: 800 }}>{sp.receiptToken}</span>
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

      {/* TAB 5: WARD & VOLUNTEER RANKINGS */}
      {activeTab === 'ranks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Sub-Switch: Ward & Volunteers vs Corporate Sponsorships */}
          <div style={{
            display: 'flex',
            background: '#FFFFFF',
            padding: 4,
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            gap: 6
          }}>
            <button
              id="ward-switch-standings"
              onClick={() => setRanksMode('individual')}
              style={{
                flex: 1,
                padding: '9px clamp(6px, 2vw, 12px)',
                borderRadius: 'var(--radius-md)',
                border: ranksMode === 'individual' ? '1px solid #7C3AED' : 'none',
                background: ranksMode === 'individual' ? '#F5F3FF' : 'transparent',
                color: ranksMode === 'individual' ? '#6D28D9' : '#64748B',
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
              <span>Ward & Volunteers</span>
            </button>

            <button
              id="ward-switch-sponsorships"
              onClick={() => setRanksMode('sponsorship')}
              style={{
                flex: 1,
                minWidth: 0,
                padding: '9px clamp(6px, 2vw, 12px)',
                borderRadius: 'var(--radius-md)',
                border: ranksMode === 'sponsorship' ? '1px solid #B8D4EE' : 'none',
                background: ranksMode === 'sponsorship' ? '#EDF4FA' : 'transparent',
                color: ranksMode === 'sponsorship' ? '#2C82C9' : '#64748B',
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

          {ranksMode === 'sponsorship' ? (
            <SponsorshipLeaderboardView user={user} onOpenSponsorshipModal={() => setActiveTab('record')} />
          ) : (
            <>
          {/* Top Wards */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: 'var(--radius-xl)',
            padding: '20px',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <MapPin size={18} color="#2C82C9" />
              <span>Ward Standings</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {allWards.map((w, idx) => (
                <div
                  key={w.wardNumber}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: w.wardNumber === user.wardNumber ? '#EBF7EE' : '#F4F9FD',
                    border: w.wardNumber === user.wardNumber ? '1px solid #7BCC53' : '1px solid #E2E8F0'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#2C82C9' }}>
                      #{idx + 1}
                    </span>
                    <div>
                      <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0F172A' }}>
                        Ward {w.wardNumber} – {w.wardName}
                      </span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontWeight: 800, color: '#008A2E', fontSize: '0.88rem' }}>
                      {w.kitsCollected} Kits
                    </span>
                    <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                      {w.progressPercentage}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Volunteer Leaderboard */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: 'var(--radius-xl)',
            padding: '20px',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Trophy size={18} color="#008A2E" />
              <span>Top Volunteers</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {volunteersBoard.slice(0, 8).map((v, idx) => (
                <div
                  key={v.id}
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
                      #{idx + 1}
                    </span>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0F172A' }}>{v.name}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B' }}>Ward {v.wardNumber}</div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontWeight: 800, color: '#008A2E', fontSize: '0.88rem' }}>
                      {v.kitsCollected} Kits
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          </>
          )}
        </div>
      )}

      {/* TAB 6: PROFILE & PASSWORD MANAGEMENT */}
      {activeTab === 'profile' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Profile Overview Card */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: 'var(--radius-xl)',
            padding: '24px 22px',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <UserIcon size={20} color="#7C3AED" />
              <span>Ward Committee Profile</span>
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 14,
              padding: '16px',
              background: '#F5F3FF',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid #DDD6FE',
              marginBottom: 16
            }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#6D28D9', textTransform: 'uppercase', fontWeight: 700 }}>
                  Full Name
                </span>
                <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.98rem', marginTop: 2 }}>
                  {user.fullName}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.7rem', color: '#6D28D9', textTransform: 'uppercase', fontWeight: 700 }}>
                  Role Assignment
                </span>
                <div style={{ marginTop: 2 }}>
                  <span className="badge badge-purple" style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                    Ward Committee Lead
                  </span>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.7rem', color: '#6D28D9', textTransform: 'uppercase', fontWeight: 700 }}>
                  Assigned Ward
                </span>
                <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.98rem', marginTop: 2 }}>
                  Ward {user.wardNumber} ({wardStats.wardName})
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.7rem', color: '#6D28D9', textTransform: 'uppercase', fontWeight: 700 }}>
                  Phone Number
                </span>
                <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.98rem', marginTop: 2 }}>
                  {user.phoneNumber}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.7rem', color: '#6D28D9', textTransform: 'uppercase', fontWeight: 700 }}>
                  Panchayath & District
                </span>
                <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.98rem', marginTop: 2 }}>
                  {user.panchayath}, {user.district || 'Kozhikode'}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.7rem', color: '#6D28D9', textTransform: 'uppercase', fontWeight: 700 }}>
                  Ward Relief Target
                </span>
                <div style={{ fontWeight: 800, color: '#008A2E', fontSize: '0.98rem', marginTop: 2 }}>
                  {wardStats.targetKits || 50} Kits (₹{((wardStats.targetKits || 50) * kitPrice).toLocaleString('en-IN')})
                </div>
              </div>
            </div>
          </div>

          {/* Change Password Card */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: 'var(--radius-xl)',
            padding: '24px 22px',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <KeyRound size={20} color="#2C82C9" />
              <span>Change Portal Password</span>
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#64748B', marginBottom: 18 }}>
              Update your account password. Enter your current password followed by your desired new password.
            </p>

            {passwordMsg && (
              <div style={{
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                marginBottom: 16,
                fontSize: '0.84rem',
                fontWeight: 600,
                background: passwordMsg.isError ? '#FEF2F2' : '#EBF7EE',
                color: passwordMsg.isError ? '#B91C1C' : '#008A2E',
                border: passwordMsg.isError ? '1px solid #FECACA' : '1px solid #A5D6B8'
              }}>
                {passwordMsg.text}
              </div>
            )}

            <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 480 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Current Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showOldPass ? 'text' : 'password'}
                    required
                    className="input-field"
                    placeholder="Enter current password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    style={{ paddingRight: 40 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPass(!showOldPass)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#94A3B8'
                    }}
                  >
                    {showOldPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  New Password (minimum 6 characters)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    required
                    minLength={6}
                    className="input-field"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={{ paddingRight: 40 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#94A3B8'
                    }}
                  >
                    {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  className="input-field"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={passwordSubmitting}
                className="btn-primary"
                style={{
                  marginTop: 6,
                  padding: '12px',
                  background: '#008A2E',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  fontWeight: 700
                }}
              >
                {passwordSubmitting ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <Lock size={16} />
                    <span>Update Password</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* RESET VOLUNTEER PASSWORD MODAL */}
      <ResetPasswordModal
        isOpen={!!resetVolunteerUser}
        onClose={() => setResetVolunteerUser(null)}
        targetUser={resetVolunteerUser}
      />

      {/* ADJUST VOLUNTEER TARGET MODAL */}
      {editingVolunteer && (
        <div className="modal-overlay" onClick={() => setEditingVolunteer(null)} style={{ zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420, width: '100%', padding: 0, overflow: 'hidden' }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#F8FAFC'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Target size={18} color="#008A2E" />
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Adjust Volunteer Target Share
                </h3>
              </div>
              <button onClick={() => setEditingVolunteer(null)} className="btn-icon" style={{ width: 28, height: 28 }}>
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleUpdateVolunteerTarget} style={{ padding: '20px' }}>
              <p style={{ fontSize: '0.84rem', color: '#475569', marginBottom: 16, lineHeight: 1.4 }}>
                Set kit target for <strong>{editingVolunteer.name}</strong>. You can assign any amount without restrictions. Your Ward goal set by Admin remains constant at <strong>{wardStats.targetKits || user.targetKits || 50} Kits</strong>.
              </p>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Volunteer Target Kits
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  className="input-field"
                  value={editTargetValue}
                  onChange={(e) => setEditTargetValue(Number(e.target.value))}
                />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="submit"
                  disabled={updatingTarget}
                  className="btn-primary"
                  style={{ flex: 1, padding: '10px 16px', background: '#008A2E', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  {updatingTarget ? <RefreshCw size={15} className="animate-spin" /> : <Check size={16} />}
                  <span>{updatingTarget ? 'Saving...' : 'Save Target'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditingVolunteer(null)}
                  className="btn-secondary"
                  style={{ padding: '10px 16px' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
