import React, { useState, useEffect } from 'react';
import type { User, ManagedUser, LeaderboardEntry, WardLeaderboardEntry } from '../types';
import { adminApi, donationsApi, generateDefaultPassword } from '../services/api';
import { 
  ShieldCheck, 
  Users, 
  Settings, 
  Target, 
  FileText, 
  UserPlus, 
  Download, 
  Edit3, 
  RefreshCw,
  Trophy
} from 'lucide-react';

interface AdminDashboardProps {
  currentUser: User;
  kitPrice: number;
  onUpdateKitPrice: (price: number) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  kitPrice,
  onUpdateKitPrice
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'targets' | 'reports' | 'settings'>('users');
  
  const [coordinators, setCoordinators] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; isError: boolean } | null>(null);

  // Add User Modal / Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<'Coordinator' | 'WardCommittee'>('Coordinator');
  const [newWard, setNewWard] = useState<number>(4);
  const [newTarget, setNewTarget] = useState<number>(100);

  // Target Editing state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingTargetKits, setEditingTargetKits] = useState<number>(50);

  // Global Settings state
  const [tempKitPrice, setTempKitPrice] = useState<number>(kitPrice);

  // Leaderboards & Reports state
  const [volunteers, setVolunteers] = useState<LeaderboardEntry[]>([]);
  const [wards, setWards] = useState<WardLeaderboardEntry[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [users, vList, wList] = await Promise.all([
        adminApi.getManagedUsers(),
        donationsApi.getVolunteerLeaderboard('Admin'),
        donationsApi.getWardLeaderboard()
      ]);
      setCoordinators(users);
      setVolunteers(vList);
      setWards(wList);
    } catch (err) {
      console.warn('Could not load admin management data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle Add User
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMsg(null);

    const clean = newPhone.replace(/\D/g, '');
    if (clean.length < 10) {
      setFeedbackMsg({ text: 'Please enter a valid 10-digit mobile number.', isError: true });
      return;
    }

    try {
      setLoading(true);
      const generatedPass = generateDefaultPassword(newFullName, clean);
      const created = await adminApi.createManagedUser({
        fullName: newFullName.trim(),
        phoneNumber: `+91${clean.slice(-10)}`,
        role: newRole,
        wardNumber: Number(newWard),
        targetKits: Number(newTarget),
        defaultPassword: generatedPass
      });

      setCoordinators(prev => [created, ...prev]);
      setFeedbackMsg({ 
        text: `Registered ${created.fullName} as ${created.role}! Default password: ${generatedPass}`, 
        isError: false 
      });
      
      setNewFullName('');
      setNewPhone('');
      setShowAddModal(false);
    } catch (err: any) {
      setFeedbackMsg({ text: err.message || 'Failed to register user.', isError: true });
    } finally {
      setLoading(false);
    }
  };

  // Handle Target Update
  const handleSaveTarget = async (userId: string) => {
    try {
      await adminApi.updateUserTarget(userId, editingTargetKits);
      setCoordinators(prev => prev.map(u => u.userId === userId ? { ...u, targetKits: editingTargetKits } : u));
      setEditingUserId(null);
      setFeedbackMsg({ text: 'Target kits updated successfully!', isError: false });
    } catch (err: any) {
      setFeedbackMsg({ text: err.message || 'Failed to update target.', isError: true });
    }
  };

  // Handle Kit Price Update
  const handleSavePrice = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempKitPrice > 0) {
      onUpdateKitPrice(tempKitPrice);
      setFeedbackMsg({ text: `Global kit price updated to ₹${tempKitPrice}!`, isError: false });
    }
  };

  // Export CSV Report
  const handleDownloadReport = () => {
    const header = ['Ward', 'Name', 'Role', 'Kits Collected', 'Total Raised (INR)'];
    const rows = volunteers.map(v => [
      v.wardNumber,
      `"${v.name}"`,
      v.role,
      v.kitsCollected,
      v.totalAmount
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [header.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `madavoor_relief_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{
      maxWidth: 1040,
      margin: '0 auto',
      padding: '16px 14px calc(90px + var(--safe-area-bottom)) 14px',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
            <ShieldCheck size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                background: '#FEF3C7',
                color: '#92400E',
                border: '1px solid #FCD34D',
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.7rem',
                fontWeight: 800
              }}>
                SUPER ADMIN
              </span>
              <span style={{ fontSize: '0.78rem', color: '#64748B' }}>Madavoor Central Administration</span>
            </div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 900, color: '#0F172A', marginTop: 2 }}>
              Campaign Control Center
            </h1>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#008A2E' }}
        >
          <UserPlus size={16} />
          <span>Add Coordinator</span>
        </button>
      </div>

      {feedbackMsg && (
        <div style={{
          padding: '12px 14px',
          borderRadius: 'var(--radius-md)',
          marginBottom: 16,
          fontSize: '0.84rem',
          fontWeight: 600,
          background: feedbackMsg.isError ? '#FEF2F2' : '#EBF7EE',
          color: feedbackMsg.isError ? '#B91C1C' : '#008A2E',
          border: feedbackMsg.isError ? '1px solid #FECACA' : '1px solid #A5D6B8'
        }}>
          {feedbackMsg.text}
        </div>
      )}

      {/* Tabs */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 6,
        background: '#F4F9FD',
        padding: 5,
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        marginBottom: 20
      }}>
        <button
          onClick={() => setActiveTab('users')}
          style={{
            padding: '10px 4px',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: activeTab === 'users' ? '#008A2E' : 'transparent',
            color: activeTab === 'users' ? '#FFFFFF' : '#334155',
            fontWeight: 800,
            fontSize: '0.8rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6
          }}
        >
          <Users size={16} />
          <span>User Management</span>
        </button>

        <button
          onClick={() => setActiveTab('targets')}
          style={{
            padding: '10px 4px',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: activeTab === 'targets' ? '#008A2E' : 'transparent',
            color: activeTab === 'targets' ? '#FFFFFF' : '#334155',
            fontWeight: 800,
            fontSize: '0.8rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6
          }}
        >
          <Target size={16} />
          <span>Targets</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          style={{
            padding: '10px 4px',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: activeTab === 'reports' ? '#008A2E' : 'transparent',
            color: activeTab === 'reports' ? '#FFFFFF' : '#334155',
            fontWeight: 800,
            fontSize: '0.8rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6
          }}
        >
          <FileText size={16} />
          <span>Reports</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          style={{
            padding: '10px 4px',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: activeTab === 'settings' ? '#008A2E' : 'transparent',
            color: activeTab === 'settings' ? '#FFFFFF' : '#334155',
            fontWeight: 800,
            fontSize: '0.8rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6
          }}
        >
          <Settings size={16} />
          <span>Settings</span>
        </button>
      </div>

      {/* MODAL: ADD COORDINATOR */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
          zIndex: 999
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 'var(--radius-xl)',
            padding: 24,
            maxWidth: 480,
            width: '100%',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', marginBottom: 14 }}>
              Register Coordinator / Ward Committee
            </h3>

            <form onSubmit={handleAddUser} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  className="input-field"
                  placeholder="e.g. Shafeeq Rahiman"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Mobile Number (WhatsApp)
                </label>
                <input
                  type="tel"
                  required
                  className="input-field"
                  placeholder="98471 23456"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Role Assignment
                  </label>
                  <select
                    className="input-field"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as any)}
                  >
                    <option value="Coordinator">Drive Coordinator</option>
                    <option value="WardCommittee">Ward Committee</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Ward Number
                  </label>
                  <select
                    className="input-field"
                    value={newWard}
                    onChange={(e) => setNewWard(Number(e.target.value))}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(w => (
                      <option key={w} value={w}>Ward {w}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Target Relief Kits
                </label>
                <input
                  type="number"
                  min={10}
                  className="input-field"
                  value={newTarget}
                  onChange={(e) => setNewTarget(Number(e.target.value))}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary"
                  style={{ flex: 1, padding: '12px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary"
                  style={{ flex: 1, padding: '12px', background: '#008A2E' }}
                >
                  {loading ? <RefreshCw size={16} className="animate-spin" /> : 'Register User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 1: USER MANAGEMENT */}
      {activeTab === 'users' && (
        <div style={{
          background: '#FFFFFF',
          borderRadius: 'var(--radius-xl)',
          padding: 20,
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A' }}>
              Coordinators & Ward Committees
            </h3>
            <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
              {coordinators.length} registered leads
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {coordinators.map(u => (
              <div
                key={u.userId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: '#F8FAFC',
                  border: '1px solid var(--border-subtle)',
                  flexWrap: 'wrap',
                  gap: 8
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.94rem' }}>
                      {u.fullName}
                    </span>
                    <span style={{
                      background: u.role === 'Coordinator' ? '#EDF4FA' : '#EBF7EE',
                      color: u.role === 'Coordinator' ? '#2C82C9' : '#008A2E',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)'
                    }}>
                      {u.role === 'Coordinator' ? 'Coordinator' : `Ward ${u.wardNumber} Committee`}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.76rem', color: '#64748B', display: 'block', marginTop: 2 }}>
                    {u.phoneNumber} • Panchayath: {u.panchayath}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontWeight: 800, color: '#008A2E', fontSize: '0.92rem' }}>
                      {u.kitsCollected || 0} / {u.targetKits || 50} Kits
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#64748B', display: 'block' }}>
                      ₹{(u.totalAmount || 0).toLocaleString('en-IN')} Raised
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: TARGET MANAGEMENT */}
      {activeTab === 'targets' && (
        <div style={{
          background: '#FFFFFF',
          borderRadius: 'var(--radius-xl)',
          padding: 20,
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', marginBottom: 14 }}>
            Assign & Edit Collection Targets
          </h3>
          <p style={{ fontSize: '0.82rem', color: '#64748B', marginBottom: 18 }}>
            Set custom Relief Kit targets for each coordinator. The portal automatically computes their monetary target based on ₹{kitPrice}/Kit.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {coordinators.map(u => (
              <div
                key={u.userId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: '#F8FAFC',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.92rem' }}>
                    {u.fullName}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                    {u.role} (Ward {u.wardNumber})
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {editingUserId === u.userId ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        type="number"
                        min={1}
                        className="input-field"
                        style={{ width: 80, padding: '6px 8px' }}
                        value={editingTargetKits}
                        onChange={(e) => setEditingTargetKits(Number(e.target.value))}
                      />
                      <button
                        onClick={() => handleSaveTarget(u.userId)}
                        className="btn-primary"
                        style={{ padding: '6px 12px', fontSize: '0.78rem', background: '#008A2E' }}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingUserId(null)}
                        className="btn-secondary"
                        style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontWeight: 900, color: '#2C82C9', fontSize: '1rem' }}>
                        {u.targetKits || 50} Kits (₹{((u.targetKits || 50) * kitPrice).toLocaleString('en-IN')})
                      </span>
                      <button
                        onClick={() => {
                          setEditingUserId(u.userId);
                          setEditingTargetKits(u.targetKits || 50);
                        }}
                        className="btn-secondary"
                        style={{ padding: '6px 10px', fontSize: '0.76rem' }}
                      >
                        <Edit3 size={13} />
                        <span>Edit</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: REPORTS & LEADERBOARDS */}
      {activeTab === 'reports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 'var(--radius-xl)',
            padding: 20,
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12
          }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A' }}>
                Campaign Audit & Reports
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#64748B', marginTop: 2 }}>
                Export comprehensive donor collection reports across all 12 wards.
              </p>
            </div>

            <button
              onClick={handleDownloadReport}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#008A2E' }}
            >
              <Download size={16} />
              <span>Export CSV Report</span>
            </button>
          </div>

          {/* Top Wards Table */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: 'var(--radius-xl)',
            padding: 20,
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Trophy size={18} color="#D97706" />
              <span>Ward Leaderboard Rankings</span>
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {wards.map((w, idx) => (
                <div
                  key={w.wardNumber}
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
                    <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#2C82C9' }}>
                      #{idx + 1}
                    </span>
                    <div>
                      <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0F172A' }}>
                        Ward {w.wardNumber} – {w.wardName}
                      </span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontWeight: 800, color: '#008A2E', fontSize: '0.9rem' }}>
                      {w.kitsCollected} Kits (₹{w.totalAmount.toLocaleString('en-IN')})
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#64748B', display: 'block' }}>
                      {w.progressPercentage}% of Target
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SETTINGS */}
      {activeTab === 'settings' && (
        <div style={{
          background: '#FFFFFF',
          borderRadius: 'var(--radius-xl)',
          padding: 22,
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Settings size={20} color="#008A2E" />
            <span>Global Campaign Settings</span>
          </h3>

          <form onSubmit={handleSavePrice} style={{
            background: '#F4F9FD',
            border: '1px solid #B8D4EE',
            borderRadius: 'var(--radius-lg)',
            padding: 18,
            maxWidth: 440
          }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
              Global Relief Kit Unit Price (₹)
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                type="number"
                min={100}
                step={50}
                className="input-field"
                value={tempKitPrice}
                onChange={(e) => setTempKitPrice(Number(e.target.value))}
              />
              <button
                type="submit"
                className="btn-primary"
                style={{ padding: '10px 20px', background: '#008A2E' }}
              >
                Save
              </button>
            </div>
            <span style={{ fontSize: '0.74rem', color: '#64748B', display: 'block', marginTop: 8 }}>
              All donation calculations and backend receipt generation will multiply by this kit rate.
            </span>
          </form>
        </div>
      )}
    </div>
  );
};
