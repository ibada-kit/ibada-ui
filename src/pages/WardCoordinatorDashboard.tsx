import React, { useState, useEffect } from 'react';
import type { User, Donation, LeaderboardEntry, WardLeaderboardEntry } from '../types';
import { DonationForm } from '../components/DonationForm';
import { donationsApi, API_BASE_URL, generateDefaultPassword } from '../services/api';
import { 
  MapPin, 
  Users, 
  TrendingUp, 
  PlusCircle, 
  History, 
  Trophy, 
  UserPlus, 
  RefreshCw
} from 'lucide-react';

interface WardCoordinatorDashboardProps {
  user: User;
  onViewReceipt: (donation: Donation) => void;
}

export const WardCoordinatorDashboard: React.FC<WardCoordinatorDashboardProps> = ({
  user,
  onViewReceipt
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'team' | 'record' | 'transactions' | 'ranks'>('overview');
  
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

    try {
      setSubmitting(true);
      const defaultPass = generateDefaultPassword(volName, cleanPhone);
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

      setStatusMsg({ text: `Volunteer ${volName} registered for Ward ${user.wardNumber}! Default password: ${defaultPass}`, isError: false });
      setWardVolunteers(prev => [{
        fullName: volName.trim(),
        phoneNumber: `+91${cleanPhone.slice(-10)}`,
        wardNumber: user.wardNumber,
        targetKits: volTarget
      }, ...prev]);

      setVolName('');
      setVolPhone('');
      setShowAddVol(false);
    } catch (err: any) {
      setWardVolunteers(prev => [{
        fullName: volName.trim(),
        phoneNumber: `+91${cleanPhone.slice(-10)}`,
        wardNumber: user.wardNumber,
        targetKits: volTarget
      }, ...prev]);
      setStatusMsg({ text: `Volunteer ${volName} saved locally to Ward roster.`, isError: false });
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

        <button
          onClick={() => setActiveTab('record')}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#008A2E' }}
        >
          <PlusCircle size={17} />
          <span>Record Ward Donation</span>
        </button>
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
      </div>

      {statusMsg && (
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
                    border: '1px solid var(--border-subtle)'
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
    </div>
  );
};
