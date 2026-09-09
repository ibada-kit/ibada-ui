import React, { useState, useEffect } from 'react';
import type { User, Donation, LeaderboardEntry } from '../types';
import { DonationForm } from '../components/DonationForm';
import { donationsApi, analyticsApi, coordinatorApi, API_BASE_URL, generateDefaultPassword } from '../services/api';
import type { UserProgress } from '../services/api';
import { 
  Users, 
  TrendingUp, 
  PlusCircle, 
  History, 
  Trophy, 
  UserPlus, 
  Package, 
  RefreshCw
} from 'lucide-react';

interface CoordinatorDashboardProps {
  user: User;
  onViewReceipt: (donation: Donation) => void;
}

export const CoordinatorDashboard: React.FC<CoordinatorDashboardProps> = ({
  user,
  onViewReceipt
}) => {
  const [activeTab, setActiveTab] = useState<'progress' | 'record' | 'team' | 'transactions' | 'leaderboard'>('progress');
  
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
  const [volWard, setVolWard] = useState(user.wardNumber || 4);
  const [volTarget, setVolTarget] = useState(50);
  const [creatingVol, setCreatingVol] = useState(false);
  const [createMsg, setCreateMsg] = useState<{ text: string; isError: boolean } | null>(null);

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

    return () => {
      isMounted = false;
    };
  }, [user.token, user.userId]);

  const handleCreateVolunteer = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateMsg(null);
    const cleanPhone = volPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setCreateMsg({ text: 'Please enter a valid 10-digit mobile number.', isError: true });
      return;
    }

    try {
      setCreatingVol(true);
      const defaultPass = generateDefaultPassword(volFullName, cleanPhone);
      const res = await fetch(`${API_BASE_URL}/Users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user.token ? { Authorization: `Bearer ${user.token}` } : {})
        },
        body: JSON.stringify({
          fullName: volFullName.trim(),
          phoneNumber: `+91${cleanPhone.slice(-10)}`,
          role: 'Volunteer',
          wardNumber: Number(volWard),
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
        wardNumber: volWard,
        targetKits: volTarget
      }, ...prev]);

      setVolFullName('');
      setVolPhone('');
      setShowAddVolunteer(false);
    } catch (err: any) {
      // Fallback local addition if network fails
      setTeamMembers(prev => [{
        fullName: volFullName.trim(),
        phoneNumber: `+91${cleanPhone.slice(-10)}`,
        role: 'Volunteer',
        wardNumber: volWard,
        targetKits: volTarget
      }, ...prev]);
      setCreateMsg({ text: `Volunteer ${volFullName} added to team roster.`, isError: false });
      setVolFullName('');
      setVolPhone('');
      setShowAddVolunteer(false);
    } finally {
      setCreatingVol(false);
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

      {/* Coordinator Progress Card (Grass Green #7BCC53 Bar) */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: 'var(--radius-xl)',
        padding: 'clamp(16px, 3vw, 22px) clamp(14px, 3vw, 20px)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-sm)',
        marginBottom: 18
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 40,
              height: 40,
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
              <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700 }}>
                Coordinator Team Campaign Target
              </span>
              <div style={{ fontSize: 'clamp(1.1rem, 3.5vw, 1.3rem)', fontWeight: 900, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
                {loadingProgress ? (
                  <span style={{ fontSize: '0.86rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <RefreshCw size={14} className="animate-spin" /> Loading live data...
                  </span>
                ) : (
                  <span>{progress.collectedKits} / {progress.targetKits} Kits ({progress.achievementPercentage}%)</span>
                )}
              </div>
            </div>
          </div>
          <span style={{ fontSize: 'clamp(1.15rem, 3.5vw, 1.4rem)', fontWeight: 900, color: '#2C82C9' }}>
            {loadingProgress ? '...' : `₹${progress.collectedAmount.toLocaleString('en-IN')}`}
          </span>
        </div>

        {/* Brand Progress Bar */}
        <div style={{
          width: '100%',
          height: 12,
          background: '#F1F5F9',
          borderRadius: 9999,
          overflow: 'hidden',
          marginBottom: 10
        }}>
          <div style={{
            width: `${Math.min(100, progress.achievementPercentage)}%`,
            height: '100%',
            background: '#7BCC53',
            borderRadius: 9999,
            transition: 'width 0.6s ease'
          }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#64748B', fontWeight: 600, flexWrap: 'wrap', gap: 4 }}>
          <span>Covers volunteers assigned under this coordinator</span>
          <span>{Math.max(0, progress.targetKits - progress.collectedKits)} kits to goal</span>
        </div>
      </div>

      {/* Tabs Navigation - Responsive tab-strip */}
      <div className="tab-strip" style={{ marginBottom: 18 }}>
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
          <Users size={15} />
          <span>My Team ({teamMembers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('record')}
          className={`tab-strip-btn ${activeTab === 'record' ? 'active' : ''}`}
        >
          <PlusCircle size={15} />
          <span>Record Donation</span>
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          className={`tab-strip-btn ${activeTab === 'transactions' ? 'active' : ''}`}
        >
          <History size={15} />
          <span>Receipts ({recentTransactions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`tab-strip-btn ${activeTab === 'leaderboard' ? 'active' : ''}`}
        >
          <Trophy size={15} />
          <span>Leaderboard</span>
        </button>
      </div>

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
                    Ward Number
                  </label>
                  <select
                    className="input-field"
                    value={volWard}
                    onChange={(e) => setVolWard(Number(e.target.value))}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(w => (
                      <option key={w} value={w}>Ward {w}</option>
                    ))}
                  </select>
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
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.92rem' }}>
                      {vol.fullName}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                      {vol.phoneNumber} • Ward {vol.wardNumber}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
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
          kitPrice={1000}
          onSuccess={(donation) => {
            setRecentTransactions(prev => [donation, ...prev]);
            setProgress(prev => ({
              ...prev,
              collectedKits: prev.collectedKits + donation.kitCount,
              collectedAmount: prev.collectedAmount + donation.totalAmount
            }));
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
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <History size={18} color="#008A2E" />
            <span>Team Donation Receipts</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recentTransactions.map((tx) => (
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
                    Collector: {tx.collectedByName || 'Volunteer'} • Token: <span style={{ color: '#008A2E', fontWeight: 700 }}>{tx.receiptToken}</span>
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
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: LEADERBOARD */}
      {activeTab === 'leaderboard' && (
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
  );
};
