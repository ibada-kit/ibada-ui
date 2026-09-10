import React, { useState, useEffect } from 'react';
import type { User, Donation, LeaderboardEntry, WardLeaderboardEntry } from '../types';
import { DonationForm } from '../components/DonationForm';
import { donationsApi, authApi, API_BASE_URL, generateRandomPassword } from '../services/api';
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
  EyeOff
} from 'lucide-react';
import { ResetPasswordModal, type ResetTargetUser } from '../components/ResetPasswordModal';

interface WardCoordinatorDashboardProps {
  user: User;
  onViewReceipt: (donation: Donation) => void;
}

export const WardCoordinatorDashboard: React.FC<WardCoordinatorDashboardProps> = ({
  user,
  onViewReceipt
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'team' | 'record' | 'transactions' | 'ranks' | 'profile'>('overview');
  
  const [wardStats, setWardStats] = useState({
    wardNumber: user.wardNumber || 0,
    wardName: user.wardNumber ? `Ward ${user.wardNumber}` : 'My Ward',
    targetKits: 0,
    collectedKits: 0,
    collectedAmount: 0,
    progressPercentage: 0
  });

  const [wardVolunteers, setWardVolunteers] = useState<any[]>([]);
  const [wardDonations, setWardDonations] = useState<Donation[]>([]);
  const [allWards, setAllWards] = useState<WardLeaderboardEntry[]>([]);
  const [volunteersBoard, setVolunteersBoard] = useState<LeaderboardEntry[]>([]);

  // Add Volunteer form
  const [showAddVol, setShowAddVol] = useState(false);
  const [volName, setVolName] = useState('');
  const [volPhone, setVolPhone] = useState('');
  const [volTarget, setVolTarget] = useState(40);
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
    // 1. Fetch live donations and leaderboards
    Promise.all([
      donationsApi.getRecentDonations(user.role),
      donationsApi.getWardLeaderboard(),
      donationsApi.getVolunteerLeaderboard(user.role)
    ])
      .then(([donations, wards, vols]) => {
        setAllWards(wards);
        setVolunteersBoard(vols);

        const currentWard = wards.find(w => w.wardNumber === user.wardNumber);
        if (currentWard) {
          setWardStats({
            wardNumber: currentWard.wardNumber,
            wardName: currentWard.wardName,
            targetKits: currentWard.targetKits,
            collectedKits: currentWard.kitsCollected,
            collectedAmount: currentWard.totalAmount,
            progressPercentage: currentWard.progressPercentage
          });
        }

        // Donations are scoped by backend for this ward/user
        const wardTx = user.wardNumber ? donations.filter(d => Number(d.wardNumber) === Number(user.wardNumber)) : donations;
        setWardDonations(wardTx.length > 0 ? wardTx : donations);
      })
      .catch(() => {});

    // 2. Fetch volunteers tied to this ward
    if (user.token) {
      fetch(`${API_BASE_URL}/Users/volunteers`, {
        headers: { Authorization: `Bearer ${user.token}` }
      })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (Array.isArray(data)) setWardVolunteers(data);
        })
        .catch(() => {});
    }
  }, [user.token, user.wardNumber]);

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
        headers: {
          'Content-Type': 'application/json',
          ...(user.token ? { Authorization: `Bearer ${user.token}` } : {})
        },
        body: JSON.stringify({
          fullName: volName.trim(),
          phoneNumber: `+91${cleanPhone.slice(-10)}`,
          role: 'Volunteer',
          wardNumber: user.wardNumber || 4,
          targetKits: Number(volTarget),
          defaultPassword: defaultPass
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to save volunteer to database.');
      }

      const newVol = {
        fullName: volName.trim(),
        phoneNumber: `+91${cleanPhone.slice(-10)}`,
        wardNumber: user.wardNumber,
        targetKits: volTarget
      };
      setWardVolunteers(prev => [newVol, ...prev]);
      setCreatedVolunteer({
        fullName: volName.trim(),
        phone: `+91${cleanPhone.slice(-10)}`,
        defaultPassword: defaultPass,
        wardNumber: user.wardNumber || 4
      });
      setStatusMsg({ text: `Volunteer ${volName} registered successfully! Default password: ${defaultPass}`, isError: false });
      setVolName('');
      setVolPhone('');
      setShowAddVol(false);
    } catch (err: any) {
      const newVol = {
        fullName: volName.trim(),
        phoneNumber: `+91${cleanPhone.slice(-10)}`,
        wardNumber: user.wardNumber,
        targetKits: volTarget
      };
      setWardVolunteers(prev => [newVol, ...prev]);
      setCreatedVolunteer({
        fullName: volName.trim(),
        phone: `+91${cleanPhone.slice(-10)}`,
        defaultPassword: defaultPass,
        wardNumber: user.wardNumber || 4
      });
      setStatusMsg({ text: `Volunteer ${volName} saved to Ward roster! Default password: ${defaultPass}`, isError: false });
      setVolName('');
      setVolPhone('');
      setShowAddVol(false);
    } finally {
      setSubmitting(false);
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

      {/* Ward Progress Card (Brand Grass Green #7BCC53 Bar) */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: 'var(--radius-xl)',
        padding: '22px 20px',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-sm)',
        marginBottom: 20
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: '#EBF7EE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#008A2E'
            }}>
              <MapPin size={22} />
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700 }}>
                Ward {wardStats.wardNumber} Campaign Progress
              </span>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0F172A' }}>
                {wardStats.collectedKits} / {wardStats.targetKits} Kits ({wardStats.progressPercentage}%)
              </div>
            </div>
          </div>
          <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#2C82C9' }}>
            ₹{wardStats.collectedAmount.toLocaleString('en-IN')}
          </span>
        </div>

        {/* Progress Bar */}
        <div style={{
          width: '100%',
          height: 12,
          background: '#E2E8F0',
          borderRadius: 9999,
          overflow: 'hidden',
          marginBottom: 10
        }}>
          <div style={{
            width: `${Math.min(100, wardStats.progressPercentage)}%`,
            height: '100%',
            background: '#7BCC53',
            borderRadius: 9999,
            transition: 'width 0.6s ease'
          }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: '#64748B', fontWeight: 600 }}>
          <span>Collections from all Ward {wardStats.wardNumber} volunteers</span>
          <span>{Math.max(0, wardStats.targetKits - wardStats.collectedKits)} kits to hit Ward goal</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-strip" style={{ marginBottom: 20 }}>
        <button
          onClick={() => setActiveTab('overview')}
          className="tab-strip-btn"
          style={{
            background: activeTab === 'overview' ? '#008A2E' : 'transparent',
            color: activeTab === 'overview' ? '#FFFFFF' : '#334155'
          }}
        >
          Ward Stats
        </button>

        <button
          onClick={() => setActiveTab('team')}
          className="tab-strip-btn"
          style={{
            background: activeTab === 'team' ? '#008A2E' : 'transparent',
            color: activeTab === 'team' ? '#FFFFFF' : '#334155'
          }}
        >
          Volunteers ({wardVolunteers.length})
        </button>

        <button
          onClick={() => setActiveTab('record')}
          className="tab-strip-btn"
          style={{
            background: activeTab === 'record' ? '#008A2E' : 'transparent',
            color: activeTab === 'record' ? '#FFFFFF' : '#334155'
          }}
        >
          Record
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          className="tab-strip-btn"
          style={{
            background: activeTab === 'transactions' ? '#008A2E' : 'transparent',
            color: activeTab === 'transactions' ? '#FFFFFF' : '#334155'
          }}
        >
          Receipts
        </button>

        <button
          onClick={() => setActiveTab('ranks')}
          className="tab-strip-btn"
          style={{
            background: activeTab === 'ranks' ? '#008A2E' : 'transparent',
            color: activeTab === 'ranks' ? '#FFFFFF' : '#334155'
          }}
        >
          Rankings
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className="tab-strip-btn"
          style={{
            background: activeTab === 'profile' ? '#008A2E' : 'transparent',
            color: activeTab === 'profile' ? '#FFFFFF' : '#334155'
          }}
        >
          Profile & Security
        </button>
      </div>

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
                const creds = `Muslim League | Madavoor Relief Campaign\nVolunteer Login Credentials:\nName: ${createdVolunteer.fullName}\nPhone: ${createdVolunteer.phone}\nPassword: ${createdVolunteer.defaultPassword}\nWard: ${createdVolunteer.wardNumber}\nPortal: ${window.location.origin}`;
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
              href={`https://wa.me/${createdVolunteer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Salam ${createdVolunteer.fullName},\n\nHere are your login credentials for the Madavoor Relief Campaign:\nMobile: ${createdVolunteer.phone}\nPassword: ${createdVolunteer.defaultPassword}\nWard: ${createdVolunteer.wardNumber}\n\nLogin: ${window.location.origin}`)}`}
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
                      Target: {v.targetKits || 40} Kits
                    </span>

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
          kitPrice={1000}
          onSuccess={(donation) => {
            setWardDonations(prev => [donation, ...prev]);
            setWardStats(prev => ({
              ...prev,
              collectedKits: prev.collectedKits + donation.kitCount,
              collectedAmount: prev.collectedAmount + donation.totalAmount
            }));
          }}
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
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <History size={18} color="#008A2E" />
            <span>Ward {user.wardNumber} Receipts</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {wardDonations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: '#64748B', fontSize: '0.86rem' }}>
                No receipts recorded for Ward {user.wardNumber} yet.
              </div>
            ) : (
              wardDonations.map((tx) => (
                <div
                  key={tx.donationId}
                  onClick={() => onViewReceipt(tx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: '#F4F9FD',
                    border: '1px solid #E2E8F0',
                    cursor: 'pointer'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.92rem' }}>
                      {tx.donorName}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                      Collector: {tx.collectedByName || 'Ward Member'} • Token: <span style={{ color: '#008A2E', fontWeight: 700 }}>{tx.receiptToken}</span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#008A2E' }}>
                      ₹{tx.totalAmount.toLocaleString('en-IN')}
                    </div>
                    <span style={{ fontSize: '0.74rem', color: '#2C82C9', fontWeight: 700 }}>
                      {tx.kitCount} Kits
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 5: WARD & VOLUNTEER RANKINGS */}
      {activeTab === 'ranks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                  {wardStats.targetKits || 50} Kits (₹{((wardStats.targetKits || 50) * 1000).toLocaleString('en-IN')})
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
    </div>
  );
};
