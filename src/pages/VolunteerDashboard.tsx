import React, { useState, useEffect } from 'react';
import type { User, Donation, LeaderboardEntry, WardLeaderboardEntry } from '../types';
import { DonationForm } from '../components/DonationForm';
import { donationsApi, API_BASE_URL } from '../services/api';
import { 
  Trophy, 
  History, 
  TrendingUp, 
  PlusCircle, 
  Award, 
  MapPin, 
  CheckCircle2, 
  User as UserIcon,
  KeyRound
} from 'lucide-react';

interface VolunteerDashboardProps {
  user: User;
  onViewReceipt: (donation: Donation) => void;
}

export const VolunteerDashboard: React.FC<VolunteerDashboardProps> = ({
  user,
  onViewReceipt
}) => {
  const [activeTab, setActiveTab] = useState<'record' | 'history' | 'leaderboard' | 'profile'>('record');
  
  // Progress & collection state
  const [progress, setProgress] = useState({
    targetKits: 50,
    collectedKits: 18,
    achievementPercentage: 36,
    collectedAmount: 18000
  });

  const [history, setHistory] = useState<Donation[]>([]);
  const [volunteers, setVolunteers] = useState<LeaderboardEntry[]>([]);
  const [wards, setWards] = useState<WardLeaderboardEntry[]>([]);
  
  // Profile password state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ text: string; isError: boolean } | null>(null);

  // Load volunteer stats
  useEffect(() => {
    // 1. Fetch live or stored leaderboards & donations
    Promise.all([
      donationsApi.getRecentDonations('Volunteer'),
      donationsApi.getVolunteerLeaderboard('Volunteer'),
      donationsApi.getWardLeaderboard()
    ])
      .then(([recent, vBoard, wBoard]) => {
        setHistory(recent);
        setVolunteers(vBoard);
        setWards(wBoard);

        // Compute volunteer's own collected kits
        const myDonations = recent.filter(d => 
          d.collectedByUserId === user.userId || 
          d.collectedByName?.toLowerCase() === user.fullName.toLowerCase()
        );
        const totalMyKits = myDonations.reduce((acc, curr) => acc + (curr.kitCount || 0), 0);
        if (totalMyKits > 0) {
          setProgress(prev => ({
            ...prev,
            collectedKits: totalMyKits,
            collectedAmount: totalMyKits * 1000,
            achievementPercentage: Math.min(100, Math.round((totalMyKits / prev.targetKits) * 100))
          }));
        }
      })
      .catch((err) => console.warn('Could not load volunteer dashboard data', err));

    // Try fetching from backend analytics if token exists
    if (user.token) {
      fetch(`${API_BASE_URL}/Analytics/my-progress`, {
        headers: { Authorization: `Bearer ${user.token}` }
      })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.targetKits) {
            setProgress({
              targetKits: data.targetKits,
              collectedKits: data.collectedKits,
              achievementPercentage: data.achievementPercentage,
              collectedAmount: data.collectedAmount
            });
          }
        })
        .catch(() => {});
    }
  }, [user.userId, user.token, user.fullName]);

  const handleDonationRecorded = (donation: Donation) => {
    setHistory(prev => [donation, ...prev]);
    setProgress(prev => {
      const newKits = prev.collectedKits + donation.kitCount;
      const newAmt = prev.collectedAmount + donation.totalAmount;
      return {
        ...prev,
        collectedKits: newKits,
        collectedAmount: newAmt,
        achievementPercentage: Math.min(100, Math.round((newKits / (prev.targetKits || 1)) * 100))
      };
    });
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    if (newPassword.length < 6) {
      setPasswordMsg({ text: 'New password must be at least 6 characters.', isError: true });
      return;
    }

    try {
      if (user.token) {
        const res = await fetch(`${API_BASE_URL}/Auth/change-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user.token}`
          },
          body: JSON.stringify({ oldPassword, newPassword })
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || 'Failed to update password.');
        }
      }
      setPasswordMsg({ text: 'Password updated successfully!', isError: false });
      setOldPassword('');
      setNewPassword('');
    } catch (err: any) {
      setPasswordMsg({ text: err.message || 'Error updating password.', isError: true });
    }
  };

  return (
    <div style={{
      maxWidth: 900,
      margin: '0 auto',
      padding: '14px clamp(10px, 3vw, 16px) calc(90px + var(--safe-area-bottom)) clamp(10px, 3vw, 16px)',
      width: '100%'
    }}>
      {/* Volunteer Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 16
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
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
              Ward {user.wardNumber} Volunteer
            </span>
            <span style={{ fontSize: '0.76rem', color: '#64748B' }}>Panchayath: {user.panchayath}</span>
          </div>
          <h1 style={{ fontSize: 'clamp(1.3rem, 4vw, 1.65rem)', fontWeight: 900, color: '#0F172A', marginTop: 4 }}>
            {user.fullName}
          </h1>
        </div>

        <div style={{
          width: 42,
          height: 42,
          borderRadius: 14,
          background: '#008A2E',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: '1rem',
          boxShadow: '0 3px 8px rgba(0, 138, 46, 0.25)',
          flexShrink: 0
        }}>
          {user.fullName.slice(0, 2).toUpperCase()}
        </div>
      </div>

      {/* Target vs Progress Card (Brand Grass Green #7BCC53) */}
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
              width: 38,
              height: 38,
              borderRadius: 10,
              background: '#EBF7EE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#008A2E',
              flexShrink: 0
            }}>
              <TrendingUp size={20} />
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700 }}>
                My Campaign Target
              </span>
              <div style={{ fontSize: 'clamp(1.1rem, 3.5vw, 1.25rem)', fontWeight: 900, color: '#0F172A' }}>
                {progress.collectedKits} / {progress.targetKits} Kits
              </div>
            </div>
          </div>
          <span style={{ fontSize: 'clamp(1.15rem, 3.5vw, 1.35rem)', fontWeight: 900, color: '#2C82C9' }}>
            {progress.achievementPercentage}%
          </span>
        </div>

        {/* Progress Bar with Grass Green */}
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
          <span>₹{progress.collectedAmount.toLocaleString('en-IN')} Raised</span>
          <span>{Math.max(0, progress.targetKits - progress.collectedKits)} kits to goal</span>
        </div>
      </div>

      {/* Tabs Navigation - Responsive tab-strip */}
      <div className="tab-strip" style={{ marginBottom: 18 }}>
        <button
          onClick={() => setActiveTab('record')}
          className={`tab-strip-btn ${activeTab === 'record' ? 'active' : ''}`}
        >
          <PlusCircle size={15} />
          <span>Record Donation</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`tab-strip-btn ${activeTab === 'history' ? 'active' : ''}`}
        >
          <History size={15} />
          <span>Receipts ({history.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`tab-strip-btn ${activeTab === 'leaderboard' ? 'active' : ''}`}
        >
          <Trophy size={15} />
          <span>Leaderboard</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`tab-strip-btn ${activeTab === 'profile' ? 'active' : ''}`}
        >
          <UserIcon size={15} />
          <span>Profile</span>
        </button>
      </div>

      {/* TAB 1: RECORD DONATION */}
      {activeTab === 'record' && (
        <DonationForm
          kitPrice={1000}
          onSuccess={handleDonationRecorded}
        />
      )}

      {/* TAB 2: RECENT RECEIPTS HISTORY */}
      {activeTab === 'history' && (
        <div style={{
          background: '#FFFFFF',
          borderRadius: 'var(--radius-xl)',
          padding: '20px',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={18} color="#008A2E" />
            <span>My Registered Donations</span>
          </h3>

          {history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 16px', color: '#64748B', fontSize: '0.88rem' }}>
              No donations registered yet. Use the "Record" tab to enter your first contribution!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {history.map((item) => (
                <div
                  key={item.donationId}
                  onClick={() => onViewReceipt(item)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: '#F4F9FD',
                    border: '1px solid #E2E8F0',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.92rem' }}>
                      {item.donorName}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: 2 }}>
                      Token: <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#008A2E' }}>{item.receiptToken}</span>
                      {' '}• {item.whatsAppNumber}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#008A2E' }}>
                      ₹{item.totalAmount.toLocaleString('en-IN')}
                    </div>
                    <span style={{ fontSize: '0.74rem', color: '#2C82C9', fontWeight: 700 }}>
                      {item.kitCount} {item.kitCount === 1 ? 'Kit' : 'Kits'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: LEADERBOARDS */}
      {activeTab === 'leaderboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Top Volunteers */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: 'var(--radius-xl)',
            padding: '20px',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Award size={18} color="#008A2E" />
              <span>Volunteer Standings</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {volunteers.slice(0, 10).map((v, i) => (
                <div
                  key={v.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: v.name.toLowerCase() === user.fullName.toLowerCase() ? '#EBF7EE' : '#F8FAFC',
                    border: v.name.toLowerCase() === user.fullName.toLowerCase() ? '1px solid #7BCC53' : '1px solid var(--border-subtle)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      width: 24,
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      color: i === 0 ? '#D97706' : '#64748B'
                    }}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                    </span>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0F172A' }}>
                        {v.name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                        Ward {v.wardNumber}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontWeight: 800, color: '#008A2E', fontSize: '0.9rem' }}>
                      {v.kitsCollected} Kits
                    </span>
                    <div style={{ fontSize: '0.72rem', color: '#2C82C9', fontWeight: 700 }}>
                      ₹{v.totalAmount.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

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
              <span>Top Wards Leaderboard</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {wards.slice(0, 5).map((w, idx) => (
                <div
                  key={w.wardNumber}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: '#F4F9FD',
                    border: '1px solid #E2E8F0'
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
                      {w.progressPercentage}% of Ward Goal
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PROFILE & PASSWORD MANAGEMENT */}
      {activeTab === 'profile' && (
        <div style={{
          background: '#FFFFFF',
          borderRadius: 'var(--radius-xl)',
          padding: '22px 20px',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserIcon size={20} color="#008A2E" />
            <span>Volunteer Details</span>
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
            marginBottom: 24,
            padding: 14,
            background: '#F4F9FD',
            borderRadius: 'var(--radius-md)',
            border: '1px solid #B8D4EE'
          }}>
            <div>
              <span style={{ fontSize: '0.7rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Name</span>
              <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.92rem' }}>{user.fullName}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Mobile Number</span>
              <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.92rem' }}>{user.phoneNumber}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Panchayath</span>
              <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.92rem' }}>{user.panchayath}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Ward</span>
              <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.92rem' }}>Ward {user.wardNumber}</div>
            </div>
          </div>

          <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <KeyRound size={17} color="#2C82C9" />
            <span>Change Portal Password</span>
          </h4>

          {passwordMsg && (
            <div style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              marginBottom: 14,
              fontSize: '0.82rem',
              fontWeight: 600,
              background: passwordMsg.isError ? '#FEF2F2' : '#EBF7EE',
              color: passwordMsg.isError ? '#B91C1C' : '#008A2E',
              border: passwordMsg.isError ? '1px solid #FECACA' : '1px solid #A5D6B8'
            }}>
              {passwordMsg.text}
            </div>
          )}

          <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                Current Password
              </label>
              <input
                type="password"
                required
                className="input-field"
                placeholder="••••••••"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                New Password (minimum 6 characters)
              </label>
              <input
                type="password"
                required
                minLength={6}
                className="input-field"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{ alignSelf: 'flex-start', padding: '10px 20px', marginTop: 4, background: '#008A2E' }}
            >
              Update Password
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
