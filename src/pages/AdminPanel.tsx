import React, { useState, useEffect, useMemo } from 'react';
import type { User, ManagedUser, ManagedUserRole, CreateManagedUserRequest } from '../types';
import { adminApi } from '../services/api';
import {
  ShieldCheck,
  UserPlus,
  Target,
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Edit3,
  Check,
  X,
  Sparkles,
  TrendingUp,
  RefreshCw,
  Phone,
  Building2
} from 'lucide-react';

interface AdminPanelProps {
  currentUser: User;
  onNavigateHome: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ currentUser, onNavigateHome }) => {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | ManagedUserRole>('all');
  const [wardFilter, setWardFilter] = useState<string>('all');

  // Create User Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<ManagedUserRole>('Coordinator');
  const [newWard, setNewWard] = useState<number>(currentUser.wardNumber || 4);
  const [newTarget, setNewTarget] = useState<number>(100);

  // Target Editing State (inline or modal)
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingTargetValue, setEditingTargetValue] = useState<number>(0);

  // Feedback notifications
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // User to delete confirmation
  const [userToDelete, setUserToDelete] = useState<ManagedUser | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getManagedUsers();
      setUsers(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load managed users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Clear messages after 4 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // Strictly filter only WardCommittee and Coordinator (volunteers are NEVER included)
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Must be WardCommittee or Coordinator
      if (u.role !== 'WardCommittee' && u.role !== 'Coordinator') {
        return false;
      }

      // Role filter
      if (roleFilter !== 'all' && u.role !== roleFilter) {
        return false;
      }

      // Ward filter
      if (wardFilter !== 'all' && u.wardNumber.toString() !== wardFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = u.fullName.toLowerCase().includes(q);
        const matchesPhone = u.phoneNumber.includes(q);
        return matchesName || matchesPhone;
      }

      return true;
    });
  }, [users, roleFilter, wardFilter, searchQuery]);

  // Aggregate Metrics for Ward Committee & Coordinators ONLY
  const metrics = useMemo(() => {
    const committeeCount = users.filter((u) => u.role === 'WardCommittee').length;
    const coordinatorCount = users.filter((u) => u.role === 'Coordinator').length;
    const totalTargetKits = users.reduce((sum, u) => sum + (u.targetKits || 0), 0);
    const totalCollectedKits = users.reduce((sum, u) => sum + (u.kitsCollected || 0), 0);
    const totalFunds = users.reduce((sum, u) => sum + (u.totalAmount || 0), 0);
    const progressPercent = totalTargetKits > 0
      ? Math.min(100, Math.round((totalCollectedKits / totalTargetKits) * 1000) / 10)
      : 0;

    return {
      committeeCount,
      coordinatorCount,
      totalCount: users.length,
      totalTargetKits,
      totalCollectedKits,
      totalFunds,
      progressPercent
    };
  }, [users]);

  // Handler: Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const clean = newPhone.replace(/\D/g, '');
    if (clean.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!newFullName.trim()) {
      setErrorMessage('Please enter the user full name.');
      return;
    }
    if (newTarget <= 0) {
      setErrorMessage('Please set a valid target greater than 0.');
      return;
    }

    try {
      setActionLoading(true);
      const req: CreateManagedUserRequest = {
        fullName: newFullName.trim(),
        phoneNumber: clean,
        role: newRole,
        wardNumber: Number(newWard),
        targetKits: Number(newTarget),
        panchayath: currentUser.panchayath || 'Madavoor'
      };

      const created = await adminApi.createManagedUser(req);
      setUsers((prev) => [created, ...prev]);
      setSuccessMessage(`Successfully registered ${created.fullName} as ${created.role === 'WardCommittee' ? 'Ward Committee' : 'Coordinator'} with target of ${created.targetKits} kits!`);
      
      // Reset form & close
      setNewFullName('');
      setNewPhone('');
      setNewTarget(100);
      setShowCreateModal(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create user.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handler: Start inline editing target
  const handleStartEditTarget = (user: ManagedUser) => {
    setEditingUserId(user.userId);
    setEditingTargetValue(user.targetKits);
  };

  // Handler: Save inline edited target
  const handleSaveTarget = async (userId: string) => {
    if (editingTargetValue <= 0) {
      setErrorMessage('Target must be greater than 0 kits.');
      return;
    }

    try {
      setActionLoading(true);
      const updated = await adminApi.updateUserTarget(userId, editingTargetValue);
      setUsers((prev) =>
        prev.map((u) => (u.userId === userId ? { ...u, targetKits: updated.targetKits } : u))
      );
      setEditingUserId(null);
      setSuccessMessage(`Target updated to ${updated.targetKits} kits for ${updated.fullName}.`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update target.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handler: Confirm delete
  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    try {
      setActionLoading(true);
      await adminApi.deleteManagedUser(userToDelete.userId);
      setUsers((prev) => prev.filter((u) => u.userId !== userToDelete.userId));
      setSuccessMessage(`Removed ${userToDelete.fullName} (${userToDelete.role}) from managed users.`);
      setUserToDelete(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to remove user.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <main style={{
      maxWidth: 1200,
      margin: '0 auto',
      padding: '24px 16px calc(80px + var(--safe-area-bottom)) 16px',
      width: '100%'
    }}>
      {/* Header Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span className="badge badge-gold" style={{ fontSize: '0.74rem' }}>
              <ShieldCheck size={14} />
              Admin Management Console
            </span>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Ward Committee & Coordinators Only
            </span>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#0F172A' }}>
            Leadership Target & User Management
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            Manage Ward Committee members and Coordinators, assign kit targets, and track their performance. Volunteers are strictly excluded.
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={onNavigateHome}
            className="btn-secondary"
            style={{ fontSize: '0.85rem' }}
          >
            Back to Overview
          </button>
          <button
            id="btn-open-create-user-modal"
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
            style={{ fontSize: '0.88rem' }}
          >
            <UserPlus size={17} />
            <span>Create Leadership User</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          background: '#EBF7F0',
          border: '1px solid #A5D6B8',
          color: '#1E6B3E',
          fontSize: '0.88rem',
          fontWeight: 600,
          marginBottom: 20
        }}>
          <CheckCircle2 size={20} style={{ flexShrink: 0 }} />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          background: '#FEF2F2',
          border: '1px solid #FECACA',
          color: '#B91C1C',
          fontSize: '0.88rem',
          fontWeight: 600,
          marginBottom: 20
        }}>
          <AlertCircle size={20} style={{ flexShrink: 0 }} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* SECTION 1: Summary Metric Cards (Coordinators & Ward Committee only) */}
      <section style={{ marginBottom: 28 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16
        }}>
          {/* Card 1: Ward Committees */}
          <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: '#F5F3FF',
              border: '1px solid #DDD6FE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6D28D9',
              flexShrink: 0
            }}>
              <Building2 size={24} />
            </div>
            <div>
              <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700 }}>
                Ward Committee Users
              </span>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.15 }}>
                {metrics.committeeCount}
              </div>
              <span style={{ fontSize: '0.75rem', color: '#6D28D9', fontWeight: 600 }}>
                Key supervisory members
              </span>
            </div>
          </div>

          {/* Card 2: Coordinators */}
          <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: '#EDF4FA',
              border: '1px solid #B8D4EE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#256CAA',
              flexShrink: 0
            }}>
              <Users size={24} />
            </div>
            <div>
              <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700 }}>
                Ward Coordinators
              </span>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.15 }}>
                {metrics.coordinatorCount}
              </div>
              <span style={{ fontSize: '0.75rem', color: '#256CAA', fontWeight: 600 }}>
                Field leadership coordinators
              </span>
            </div>
          </div>

          {/* Card 3: Total Target Assigned */}
          <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: '#FEF3C7',
              border: '1px solid #FCD34D',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#92400E',
              flexShrink: 0
            }}>
              <Target size={24} />
            </div>
            <div>
              <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700 }}>
                Total Target Assigned
              </span>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.15 }}>
                {metrics.totalTargetKits.toLocaleString('en-IN')} <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Kits</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#92400E', fontWeight: 600 }}>
                ₹{(metrics.totalTargetKits * 500).toLocaleString('en-IN')} drive goal
              </span>
            </div>
          </div>

          {/* Card 4: Fulfillment Progress */}
          <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: '#EBF7F0',
              border: '1px solid #A5D6B8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#1E6B3E',
              flexShrink: 0
            }}>
              <TrendingUp size={24} />
            </div>
            <div>
              <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700 }}>
                Leader Target Progress
              </span>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1E6B3E', lineHeight: 1.15 }}>
                {metrics.progressPercent}%
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {metrics.totalCollectedKits} / {metrics.totalTargetKits} kits raised
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: Search, Filters & Data Table */}
      <section>
        {/* Filter bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 16
        }}>
          {/* Search box */}
          <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              id="input-search-managed-users"
              type="text"
              className="input-field"
              style={{ paddingLeft: 40, height: 42, minHeight: 42, fontSize: '0.9rem' }}
              placeholder="Search by name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Role Filter Tabs (Ward Committee vs Coordinator) */}
          <div style={{
            display: 'flex',
            background: '#FFFFFF',
            padding: 4,
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)'
          }}>
            <button
              id="filter-role-all"
              onClick={() => setRoleFilter('all')}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: roleFilter === 'all' ? '#42B06F' : 'transparent',
                color: roleFilter === 'all' ? '#FFFFFF' : 'var(--text-secondary)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              All ({users.length})
            </button>
            <button
              id="filter-role-wardcommittee"
              onClick={() => setRoleFilter('WardCommittee')}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: roleFilter === 'WardCommittee' ? '#7C3AED' : 'transparent',
                color: roleFilter === 'WardCommittee' ? '#FFFFFF' : 'var(--text-secondary)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              Ward Committee ({metrics.committeeCount})
            </button>
            <button
              id="filter-role-coordinator"
              onClick={() => setRoleFilter('Coordinator')}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: roleFilter === 'Coordinator' ? '#256CAA' : 'transparent',
                color: roleFilter === 'Coordinator' ? '#FFFFFF' : 'var(--text-secondary)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              Coordinators ({metrics.coordinatorCount})
            </button>
          </div>

          {/* Ward Selector */}
          <div style={{ minWidth: 140 }}>
            <select
              id="filter-managed-ward"
              className="input-field"
              style={{ height: 42, minHeight: 42, fontSize: '0.85rem', padding: '8px 12px' }}
              value={wardFilter}
              onChange={(e) => setWardFilter(e.target.value)}
            >
              <option value="all">All Wards</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((w) => (
                <option key={w} value={w.toString()}>Ward {w}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Data Scope Banner */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 14px',
          background: '#FEF3C7',
          border: '1px solid #FCD34D',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.82rem',
          color: '#92400E',
          marginBottom: 16
        }}>
          <Sparkles size={16} />
          <span>
            <strong>Isolated View Scope:</strong> Only Ward Committee and Coordinator users are shown. Field volunteers are excluded.
          </span>
        </div>

        {/* Managed Users Table Card */}
        <div className="glass-card" style={{ overflowX: 'auto' }}>
          {/* Table Header */}
          <div className="admin-table-row admin-table-header">
            <span>User & Contact</span>
            <span>Role</span>
            <span>Ward</span>
            <span>Kit Target</span>
            <span>Performance</span>
            <span style={{ textAlign: 'right' }}>Collected</span>
            <span style={{ textAlign: 'center' }}>Actions</span>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px auto', color: '#42B06F' }} />
              <p>Loading leadership users...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)' }}>
              <Users size={32} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
              <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>No users match the current filter</p>
              <p style={{ fontSize: '0.82rem', marginTop: 4 }}>
                Click <strong>Create Leadership User</strong> above to register a new Ward Committee or Coordinator.
              </p>
            </div>
          ) : (
            filteredUsers.map((u) => {
              const isEditing = editingUserId === u.userId;
              const progress = u.targetKits > 0 ? Math.min(100, Math.round((u.kitsCollected / u.targetKits) * 100)) : 0;
              
              return (
                <div
                  key={u.userId}
                  className="admin-table-row glass-card-interactive"
                  style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    background: '#FFFFFF'
                  }}
                >
                  {/* User & Contact */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {u.fullName}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                      <Phone size={12} />
                      <span>+91 {u.phoneNumber}</span>
                    </div>
                  </div>

                  {/* Role Badge */}
                  <div>
                    <span className={`badge ${u.role === 'WardCommittee' ? 'badge-purple' : 'badge-blue'}`}>
                      {u.role === 'WardCommittee' ? 'Ward Comm.' : 'Coordinator'}
                    </span>
                  </div>

                  {/* Ward Number */}
                  <div>
                    <span className="badge badge-emerald" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                      Ward {u.wardNumber}
                    </span>
                  </div>

                  {/* Kit Target Setting (Inline Editable) */}
                  <div>
                    {isEditing ? (
                      <div className="inline-target-box" style={{ width: 'fit-content' }}>
                        <input
                          type="number"
                          min="1"
                          max="9999"
                          className="inline-target-input"
                          value={editingTargetValue}
                          onChange={(e) => setEditingTargetValue(Number(e.target.value))}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveTarget(u.userId);
                            if (e.key === 'Escape') setEditingUserId(null);
                          }}
                        />
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>kits</span>
                        <button
                          title="Save Target"
                          onClick={() => handleSaveTarget(u.userId)}
                          style={{
                            background: '#42B06F',
                            border: 'none',
                            color: '#ffffff',
                            borderRadius: 4,
                            padding: '2px 5px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          <Check size={12} />
                        </button>
                        <button
                          title="Cancel"
                          onClick={() => setEditingUserId(null)}
                          style={{
                            background: '#E2E8F0',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            borderRadius: 4,
                            padding: '2px 5px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => handleStartEditTarget(u)}
                        title="Click to set new target"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          cursor: 'pointer',
                          padding: '4px 8px',
                          borderRadius: 'var(--radius-sm)',
                          background: '#FEF3C7',
                          border: '1px solid #FCD34D',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <Target size={13} color="#92400E" />
                        <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#92400E' }}>
                          {u.targetKits}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#92400E' }}>kits</span>
                        <Edit3 size={11} color="#92400E" style={{ marginLeft: 2 }} />
                      </div>
                    )}
                  </div>

                  {/* Performance Progress */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: 3 }}>
                      <span style={{ fontWeight: 700, color: progress >= 100 ? '#1E6B3E' : 'var(--text-primary)' }}>
                        {u.kitsCollected} kits
                      </span>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        {progress}%
                      </span>
                    </div>
                    <div className="progress-container" style={{ height: 6 }}>
                      <div
                        className="progress-fill"
                        style={{
                          width: `${progress}%`,
                          background: progress >= 100 ? '#42B06F' : '#256CAA'
                        }}
                      />
                    </div>
                  </div>

                  {/* Total Collected */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0F172A', whiteSpace: 'nowrap' }}>
                      ₹{u.totalAmount.toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                      {u.donationsCount} entries
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <button
                      id={`btn-edit-target-${u.userId}`}
                      onClick={() => handleStartEditTarget(u)}
                      className="btn-icon"
                      style={{ width: 32, height: 32, minWidth: 32, minHeight: 32 }}
                      title="Set target kits"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      id={`btn-delete-${u.userId}`}
                      onClick={() => setUserToDelete(u)}
                      className="btn-danger-ghost"
                      style={{ padding: '5px 8px' }}
                      title="Delete User"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* =========================================================================
          MODAL 1: CREATE LEADERSHIP USER (Ward Committee / Coordinator ONLY)
      ========================================================================= */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ padding: '24px 22px' }}
          >
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 18,
              borderBottom: '1px solid var(--border-subtle)',
              paddingBottom: 14
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: '#EBF7F0',
                  color: '#42B06F',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A' }}>Create Leadership User</h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Ward Committee Member or Coordinator
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="btn-icon"
                style={{ width: 32, height: 32, minWidth: 32, minHeight: 32 }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Create User Form */}
            <form onSubmit={handleCreateUser}>
              {/* Full Name */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Full Name *
                </label>
                <input
                  id="modal-input-fullname"
                  type="text"
                  className="input-field"
                  placeholder="e.g. C.P. Moidu Haji"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  required
                />
              </div>

              {/* WhatsApp Mobile */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  WhatsApp Mobile Number *
                </label>
                <div style={{ display: 'flex' }}>
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 12px',
                    background: '#F8FAFC',
                    border: '1px solid #CBD5E1',
                    borderRight: 'none',
                    borderRadius: 'var(--radius-md) 0 0 var(--radius-md)',
                    color: 'var(--text-secondary)',
                    fontSize: '0.9rem'
                  }}>
                    +91
                  </span>
                  <input
                    id="modal-input-phone"
                    type="tel"
                    className="input-field"
                    style={{ borderRadius: '0 var(--radius-md) var(--radius-md) 0' }}
                    placeholder="98470 12345"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    maxLength={10}
                    required
                  />
                </div>
              </div>

              {/* Role Selection (ONLY Ward Committee or Coordinator) */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  Select Leadership Role * (No Volunteers allowed)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <button
                    type="button"
                    id="radio-role-coordinator"
                    onClick={() => setNewRole('Coordinator')}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: newRole === 'Coordinator' ? '2px solid #256CAA' : '1px solid var(--border-subtle)',
                      background: newRole === 'Coordinator' ? '#EDF4FA' : '#FFFFFF',
                      color: newRole === 'Coordinator' ? '#256CAA' : 'var(--text-secondary)',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 3,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span style={{ color: '#0F172A' }}>Ward Coordinator</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 400, opacity: 0.85 }}>
                      Field coordinator leader
                    </span>
                  </button>

                  <button
                    type="button"
                    id="radio-role-wardcommittee"
                    onClick={() => setNewRole('WardCommittee')}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: newRole === 'WardCommittee' ? '2px solid #7C3AED' : '1px solid var(--border-subtle)',
                      background: newRole === 'WardCommittee' ? '#F5F3FF' : '#FFFFFF',
                      color: newRole === 'WardCommittee' ? '#6D28D9' : 'var(--text-secondary)',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 3,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span style={{ color: '#0F172A' }}>Ward Committee</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 400, opacity: 0.85 }}>
                      Supervisory ward committee
                    </span>
                  </button>
                </div>
              </div>

              {/* Ward & Target Kits */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    Assigned Ward *
                  </label>
                  <select
                    id="modal-select-ward"
                    className="input-field"
                    value={newWard}
                    onChange={(e) => setNewWard(Number(e.target.value))}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                      <option key={num} value={num}>Ward {num}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    Kit Target *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="modal-input-target"
                      type="number"
                      min="1"
                      className="input-field"
                      placeholder="100"
                      value={newTarget}
                      onChange={(e) => setNewTarget(Number(e.target.value))}
                      required
                    />
                    <span style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: '0.8rem',
                      color: '#92400E',
                      fontWeight: 600,
                      pointerEvents: 'none'
                    }}>
                      kits
                    </span>
                  </div>
                </div>
              </div>

              {/* Panchayath info display */}
              <div style={{
                background: '#F8FAFC',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 12px',
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                marginBottom: 20
              }}>
                Target value: <strong>{newTarget} Kits</strong> = ₹{(newTarget * 500).toLocaleString('en-IN')} (at ₹500/kit) • Panchayath: {currentUser.panchayath || 'Madavoor'}
              </div>

              {/* Submit Button */}
              <button
                id="btn-submit-create-user"
                type="submit"
                className="btn-primary"
                style={{ width: '100%', padding: '12px' }}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <RefreshCw size={18} className="animate-spin" />
                ) : (
                  <>
                    <UserPlus size={18} />
                    <span>Create Leadership User</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: CONFIRM DELETE USER
      ========================================================================= */}
      {userToDelete && (
        <div className="modal-overlay" onClick={() => setUserToDelete(null)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ padding: '24px 22px', maxWidth: 440 }}
          >
            <div style={{ textAlign: 'center', marginBottom: 18 }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: '#FEF2F2',
                color: '#DC2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px auto'
              }}>
                <Trash2 size={24} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A' }}>Confirm Removal</h3>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: 6 }}>
                Are you sure you want to remove <strong>{userToDelete.fullName}</strong> ({userToDelete.role}, Ward {userToDelete.wardNumber}) from managed leadership?
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <button
                onClick={() => setUserToDelete(null)}
                className="btn-secondary"
                style={{ width: '100%' }}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                id="btn-confirm-delete"
                onClick={handleConfirmDelete}
                className="btn-primary"
                style={{
                  width: '100%',
                  background: '#DC2626',
                  borderColor: '#B91C1C'
                }}
                disabled={actionLoading}
              >
                {actionLoading ? <RefreshCw size={16} className="animate-spin" /> : 'Yes, Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
