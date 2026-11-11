import React, { useState, useEffect } from 'react';
import type { User, ManagedUser, ManagedUserRole, LeaderboardEntry, WardLeaderboardEntry } from '../types';
import { adminApi, donationsApi, analyticsApi, sponsorshipsApi, generateRandomPassword, type UserProgress } from '../services/api';
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
  Trophy,
  Trash2,
  Key,
  Copy,
  Check,
  AlertTriangle,
  X,
  Building2,
  Search,
  CheckCircle2,
  XCircle,
  UserCheck,
  UserX,
  Lock,
  Package
} from 'lucide-react';
import { ResetPasswordModal, type ResetTargetUser } from '../components/ResetPasswordModal';
import { SponsorshipLeaderboardView } from '../components/SponsorshipLeaderboardView';
import { ScrollableTabStrip } from '../components/ScrollableTabStrip';
import { exportSponsorshipsToCSV } from '../utils/exportCsv';
import { useWards } from '../hooks/useWards';

interface AdminDashboardProps {
  currentUser: User;
  kitPrice: number;
  kitPriceModifiedDate?: string;
  kitPriceModifiedBy?: string;
  blockWardKitCollection?: boolean;
  onUpdateKitPrice: (price: number) => Promise<void> | void;
  onUpdateWardKitCollectionStatus?: (blocked: boolean) => Promise<void> | void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  kitPrice,
  kitPriceModifiedDate,
  kitPriceModifiedBy,
  blockWardKitCollection = false,
  onUpdateKitPrice,
  onUpdateWardKitCollectionStatus
}) => {
  const { wards: wardOptions } = useWards();
  const [activeTab, setActiveTab] = useState<'users' | 'targets' | 'reports' | 'sponsorships' | 'settings'>('users');
  
  const [coordinators, setCoordinators] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; isError: boolean } | null>(null);

  // User Management Filter & Search State
  const [userRoleFilter, setUserRoleFilter] = useState<'All' | 'WardCommittee' | 'Coordinator' | 'Volunteer'>('All');
  const [userStatusFilter, setUserStatusFilter] = useState<'All' | 'active' | 'disabled'>('All');
  const [userWardFilter, setUserWardFilter] = useState<number | 'All'>('All');
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');

  // Add User Modal / Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<ManagedUserRole>('Volunteer');
  const [newWard, setNewWard] = useState<number>(1);
  const [newTarget, _setNewTarget] = useState<number>(50);
  void _setNewTarget;
  const [newVolunteerAssignType, setNewVolunteerAssignType] = useState<'ward' | 'coordinator'>('ward');
  const [newAssignedCoordinatorId, setNewAssignedCoordinatorId] = useState<string>('');

  // Edit User Modal / Form State
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState<ManagedUserRole>('Volunteer');
  const [editWard, setEditWard] = useState<number>(1);
  const [editTarget, setEditTarget] = useState<number>(0);
  const [editAssignedParentId, setEditAssignedParentId] = useState<string>('');
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [editPassword, setEditPassword] = useState('');
  const [passwordFeedback, setPasswordFeedback] = useState<string | null>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState<ResetTargetUser | null>(null);

  // Delete User Confirmation State
  const [deletingUser, setDeletingUser] = useState<ManagedUser | null>(null);

  // Target Editing state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingTargetKits, setEditingTargetKits] = useState<number>(50);

  // Global Settings state
  const [tempKitPrice, setTempKitPrice] = useState<number>(kitPrice);

  useEffect(() => {
    setTempKitPrice(kitPrice);
  }, [kitPrice]);

  // Leaderboards & Reports state
  const [volunteers, setVolunteers] = useState<LeaderboardEntry[]>([]);
  const [wards, setWards] = useState<WardLeaderboardEntry[]>([]);
  const [adminProgress, setAdminProgress] = useState<UserProgress | null>(null);
  const [sponsorshipSummary, setSponsorshipSummary] = useState<{
    totalSponsorships: number;
    totalPaidAmount: number;
    totalCommittedAmount: number;
  } | null>(null);

  // Helper to find existing active coordinator for a ward
  const getActiveWardCoordinator = (wardNum: number, excludeUserId?: string): ManagedUser | undefined => {
    return coordinators.find(u => 
      u.role === 'WardCommittee' && 
      u.wardNumber === wardNum && 
      u.isActive !== false && 
      u.userId !== excludeUserId
    );
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [users, vList, wList, prog, sponLBoard] = await Promise.all([
        adminApi.getManagedUsers(),
        donationsApi.getVolunteerLeaderboard('Admin'),
        donationsApi.getWardLeaderboard(),
        analyticsApi.getMyProgress(currentUser?.token).catch(() => null),
        sponsorshipsApi.getLeaderboard().catch(() => null)
      ]);
      setCoordinators(users);
      setVolunteers(vList);
      setWards(wList);
      if (prog) setAdminProgress(prog);
      if (sponLBoard?.summary) {
        setSponsorshipSummary({
          totalSponsorships: sponLBoard.summary.totalSponsorships || 0,
          totalPaidAmount: sponLBoard.summary.totalPaidAmount || 0,
          totalCommittedAmount: sponLBoard.summary.totalCommittedAmount || 0
        });
      }
    } catch (err) {
      console.warn('Could not load admin management data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser?.token]);

  // Handle Add User
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMsg(null);

    const clean = newPhone.replace(/\D/g, '');
    if (clean.length < 10) {
      setFeedbackMsg({ text: 'Please enter a valid 10-digit mobile number.', isError: true });
      return;
    }

    // Check single active Ward Coordinator rule
    if (newRole === 'WardCommittee') {
      const existing = getActiveWardCoordinator(Number(newWard));
      if (existing) {
        setFeedbackMsg({
          text: `Ward ${newWard} already has an active Ward Coordinator (${existing.fullName}). Each ward can only have one active coordinator.`,
          isError: true
        });
        return;
      }
    }

    try {
      setLoading(true);
      const generatedPass = generateRandomPassword(6);
      let assignedParent: string | undefined = undefined;
      let wardToAssign: number = 0;

      if (newRole === 'WardCommittee') {
        wardToAssign = Number(newWard);
      } else if (newRole === 'Coordinator') {
        wardToAssign = 0;
      } else if (newRole === 'Volunteer') {
        if (newVolunteerAssignType === 'coordinator') {
          if (!newAssignedCoordinatorId) {
            setFeedbackMsg({ text: 'Please select a Drive Coordinator to assign this volunteer.', isError: true });
            setLoading(false);
            return;
          }
          assignedParent = newAssignedCoordinatorId;
          const parentUser = coordinators.find(c => c.userId === newAssignedCoordinatorId);
          wardToAssign = parentUser?.wardNumber || 0;
        } else {
          wardToAssign = Number(newWard);
          const wardCoord = getActiveWardCoordinator(Number(newWard));
          if (wardCoord) {
            assignedParent = wardCoord.userId;
          }
        }
      }

      const created = await adminApi.createManagedUser({
        fullName: newFullName.trim(),
        phoneNumber: `+91${clean.slice(-10)}`,
        role: newRole,
        wardNumber: wardToAssign,
        targetKits: Number(newTarget) || 50,
        defaultPassword: generatedPass,
        assignedParentUserId: assignedParent
      });

      setCoordinators(prev => [created, ...prev]);
      setFeedbackMsg({ 
        text: `Registered ${created.fullName} as ${created.role === 'WardCommittee' ? 'Ward Coordinator' : created.role}! Default password: ${generatedPass}`, 
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

  // Open Edit User Modal
  const handleOpenEdit = (user: ManagedUser) => {
    setEditingUser(user);
    setEditFullName(user.fullName);
    setEditPhone(user.phoneNumber.replace('+91', ''));
    setEditRole((user.role === 'Admin' ? 'Coordinator' : user.role) as any);
    setEditWard(user.wardNumber || 1);
    setEditTarget(user.targetKits || 50);
    setEditAssignedParentId(user.parentUserId || '');
    setEditIsActive(user.isActive !== false);
    setEditPassword('');
    setPasswordFeedback(null);
    setCopiedPassword(false);
  };

  // Regenerate Default Random 6-Character Password
  const handleRegeneratePassword = () => {
    const gen = generateRandomPassword(6);
    setEditPassword(gen);
    setPasswordFeedback(`New random password generated: "${gen}". Save to apply.`);
  };

  // Copy Password to Clipboard
  const handleCopyPassword = () => {
    if (editPassword) {
      navigator.clipboard.writeText(editPassword);
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    }
  };

  // Handle Save Edit User
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setFeedbackMsg(null);

    const clean = editPhone.replace(/\D/g, '');
    if (clean.length < 10) {
      setFeedbackMsg({ text: 'Please enter a valid 10-digit mobile number.', isError: true });
      return;
    }

    if (!editIsActive) {
      const isSelf = 
        editingUser.userId === currentUser.userId ||
        (!!editingUser.phoneNumber && !!currentUser.phoneNumber && 
         editingUser.phoneNumber.replace(/\D/g, '').slice(-10) === currentUser.phoneNumber.replace(/\D/g, '').slice(-10));
      if (isSelf) {
        setFeedbackMsg({ text: 'You cannot disable your own admin account.', isError: true });
        return;
      }
    }

    // Enforce single active coordinator per ward
    if (editRole === 'WardCommittee' && editIsActive) {
      const existing = getActiveWardCoordinator(Number(editWard), editingUser.userId);
      if (existing) {
        setFeedbackMsg({
          text: `Ward ${editWard} already has an active Ward Coordinator (${existing.fullName}). Each ward can only have one active coordinator.`,
          isError: true
        });
        return;
      }
    }

    try {
      setLoading(true);
      let assignedParent: string | undefined = undefined;
      let wardToAssign: number = 0;

      if (editRole === 'WardCommittee') {
        wardToAssign = Number(editWard);
      } else if (editRole === 'Coordinator') {
        wardToAssign = 0;
      } else if (editRole === 'Volunteer') {
        wardToAssign = Number(editWard);
        assignedParent = editAssignedParentId || undefined;
      }

      const res = await adminApi.updateManagedUser(editingUser.userId, {
        fullName: editFullName.trim(),
        phoneNumber: `+91${clean.slice(-10)}`,
        role: editRole,
        wardNumber: wardToAssign,
        targetKits: Number(editTarget),
        isActive: editIsActive,
        assignedParentUserId: assignedParent,
        newPassword: editPassword.trim() ? editPassword.trim() : undefined
      });

      setCoordinators(prev => prev.map(u => u.userId === editingUser.userId ? res.user : u));
      setFeedbackMsg({
        text: `Updated ${res.user.fullName} successfully!${editPassword.trim() ? ` New password: ${editPassword.trim()}` : ''}`,
        isError: false
      });
      setEditingUser(null);
    } catch (err: any) {
      setFeedbackMsg({ text: err.message || 'Failed to update user.', isError: true });
    } finally {
      setLoading(false);
    }
  };

  // Handle Quick Toggle User Active / Disabled status
  const handleToggleUserStatus = async (user: ManagedUser) => {
    const isSelf = 
      user.userId === currentUser.userId ||
      (!!user.phoneNumber && !!currentUser.phoneNumber && 
       user.phoneNumber.replace(/\D/g, '').slice(-10) === currentUser.phoneNumber.replace(/\D/g, '').slice(-10));

    if (isSelf) {
      setFeedbackMsg({ text: 'You cannot disable your own admin account.', isError: true });
      return;
    }

    const nextStatus = user.isActive === false ? true : false;
    setFeedbackMsg(null);

    // If activating a WardCommittee, check if another active coordinator already exists in that ward
    if (nextStatus && user.role === 'WardCommittee') {
      const existing = getActiveWardCoordinator(user.wardNumber, user.userId);
      if (existing) {
        setFeedbackMsg({
          text: `Cannot activate: Ward ${user.wardNumber} already has an active Ward Coordinator (${existing.fullName}).`,
          isError: true
        });
        return;
      }
    }

    try {
      setLoading(true);
      const res = await adminApi.toggleUserStatus(user.userId, nextStatus);
      setCoordinators(prev => prev.map(u => u.userId === user.userId ? { ...u, isActive: nextStatus } : u));
      setFeedbackMsg({
        text: res.message || `User "${user.fullName}" is now ${nextStatus ? 'active' : 'disabled'}.`,
        isError: false
      });
    } catch (err: any) {
      setFeedbackMsg({ text: err.message || `Failed to change status for ${user.fullName}`, isError: true });
    } finally {
      setLoading(false);
    }
  };

  // Handle Delete User
  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    setFeedbackMsg(null);

    const isSelf = 
      deletingUser.userId === currentUser.userId ||
      (!!deletingUser.phoneNumber && !!currentUser.phoneNumber && 
       deletingUser.phoneNumber.replace(/\D/g, '').slice(-10) === currentUser.phoneNumber.replace(/\D/g, '').slice(-10));

    if (isSelf) {
      setFeedbackMsg({ text: 'You cannot delete your own admin account.', isError: true });
      setDeletingUser(null);
      return;
    }

    try {
      setLoading(true);
      await adminApi.deleteManagedUser(deletingUser.userId);
      setCoordinators(prev => prev.filter(u => u.userId !== deletingUser.userId));
      setFeedbackMsg({ text: `User "${deletingUser.fullName}" deactivated successfully.`, isError: false });
      setDeletingUser(null);
    } catch (err: any) {
      setFeedbackMsg({ text: err.message || 'Failed to delete user.', isError: true });
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

  // Handle Kit Price Update (persisted in Azure Table Storage)
  const [isSavingPrice, setIsSavingPrice] = useState(false);
  const handleSavePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tempKitPrice > 0) {
      try {
        setIsSavingPrice(true);
        await onUpdateKitPrice(tempKitPrice);
        setFeedbackMsg({ text: `Relief Kit price has been updated to ₹${tempKitPrice.toLocaleString('en-IN')}!`, isError: false });
      } catch (err: any) {
        setFeedbackMsg({ text: err.message || 'Failed to update kit price. Please try again.', isError: true });
      } finally {
        setIsSavingPrice(false);
      }
    }
  };

  // Handle Ward Kit Collection Toggle (persisted in Azure Table Storage)
  const handleToggleWardKitCollection = async () => {
    if (!onUpdateWardKitCollectionStatus) return;
    const nextStatus = !blockWardKitCollection;
    const confirmMessage = nextStatus
      ? 'Are you sure you want to BLOCK Relief Kit collections for all Ward Coordinators and Ward Volunteers? They will be guided to collect Sponsorships only.'
      : 'Are you sure you want to RE-OPEN Relief Kit collections for Ward Coordinators and Ward Volunteers?';
    if (!window.confirm(confirmMessage)) return;

    try {
      setIsUpdatingStatus(true);
      await onUpdateWardKitCollectionStatus(nextStatus);
      setFeedbackMsg({
        text: nextStatus
          ? 'Ward Kit Collection is now BLOCKED. Ward teams are accepting sponsorships only.'
          : 'Ward Kit Collection is now OPEN. Ward teams can collect both kits and sponsorships.',
        isError: false
      });
    } catch (err: any) {
      setFeedbackMsg({ text: err.message || 'Failed to update kit collection status.', isError: true });
    } finally {
      setIsUpdatingStatus(false);
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
    link.setAttribute('download', `ibada_kit_challenge_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Detailed Sponsorships Report
  const handleDownloadSponsorshipsReport = async () => {
    try {
      setLoading(true);
      const allSpons = await sponsorshipsApi.getSponsorships();
      exportSponsorshipsToCSV(allSpons, 'ibada_kit_sponsorships_detailed_report');
    } catch {
      alert('Failed to retrieve full campaign sponsorships list.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      maxWidth: 1040,
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
              <span style={{ fontSize: '0.78rem', color: '#64748B' }}>Ibada Kit Central Administration</span>
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
          <span>Add New User</span>
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

      {/* Campaign Progress Metric Card */}
      {adminProgress && (
        <div style={{
          background: 'linear-gradient(135deg, #008A2E 0%, #005E1F 100%)',
          borderRadius: 'var(--radius-xl)',
          padding: '20px 24px',
          color: '#FFFFFF',
          marginBottom: 20,
          boxShadow: '0 8px 24px -4px rgba(0, 138, 46, 0.3)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.85 }}>
                Overall Campaign Collections
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
                <span style={{ fontSize: '2.2rem', fontWeight: 900, lineHeight: 1 }}>
                  {adminProgress.collectedKits}
                </span>
                <span style={{ fontSize: '1rem', opacity: 0.85, fontWeight: 600 }}>
                  Relief Kits Collected
                </span>
              </div>
              {sponsorshipSummary && sponsorshipSummary.totalSponsorships > 0 && (
                <div style={{ fontSize: '0.76rem', opacity: 0.9, marginTop: 4, display: 'flex', gap: 6, alignItems: 'center' }}>
                  <Building2 size={13} />
                  <span>+ {sponsorshipSummary.totalSponsorships} Corporate Sponsorship Packages</span>
                </div>
              )}
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.78rem', opacity: 0.85, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Total Funds Raised
              </span>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, marginTop: 2 }}>
                ₹{(adminProgress.collectedAmount + (sponsorshipSummary?.totalPaidAmount || 0)).toLocaleString('en-IN')}
              </div>
              {sponsorshipSummary && sponsorshipSummary.totalPaidAmount > 0 && (
                <span style={{ fontSize: '0.72rem', opacity: 0.85, display: 'block', marginTop: 2 }}>
                  (Kits: ₹{adminProgress.collectedAmount.toLocaleString('en-IN')} | Spon: ₹{sponsorshipSummary.totalPaidAmount.toLocaleString('en-IN')})
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tabs - Smooth horizontally scrollable with auto-centering and navigation chevrons */}
      <ScrollableTabStrip activeKey={activeTab}>
        <button
          onClick={() => setActiveTab('users')}
          className={`tab-strip-btn ${activeTab === 'users' ? 'active' : ''}`}
          style={{
            background: activeTab === 'users' ? '#008A2E' : 'transparent',
            color: activeTab === 'users' ? '#FFFFFF' : '#334155',
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
          className={`tab-strip-btn ${activeTab === 'targets' ? 'active' : ''}`}
          style={{
            background: activeTab === 'targets' ? '#008A2E' : 'transparent',
            color: activeTab === 'targets' ? '#FFFFFF' : '#334155',
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
          className={`tab-strip-btn ${activeTab === 'reports' ? 'active' : ''}`}
          style={{
            background: activeTab === 'reports' ? '#008A2E' : 'transparent',
            color: activeTab === 'reports' ? '#FFFFFF' : '#334155',
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
          id="admin-tab-sponsorships"
          onClick={() => setActiveTab('sponsorships')}
          className={`tab-strip-btn ${activeTab === 'sponsorships' ? 'active' : ''}`}
          style={{
            background: activeTab === 'sponsorships' ? '#2C82C9' : 'transparent',
            color: activeTab === 'sponsorships' ? '#FFFFFF' : '#334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6
          }}
        >
          <Building2 size={16} />
          <span>Sponsorships</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`tab-strip-btn ${activeTab === 'settings' ? 'active' : ''}`}
          style={{
            background: activeTab === 'settings' ? '#008A2E' : 'transparent',
            color: activeTab === 'settings' ? '#FFFFFF' : '#334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6
          }}
        >
          <Settings size={16} />
          <span>Settings</span>
        </button>
      </ScrollableTabStrip>

      {/* MODAL: REGISTER NEW USER (Volunteer / Coordinator / Ward Committee) */}
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
            padding: '24px clamp(14px, 4vw, 24px)',
            maxWidth: 520,
            width: '100%',
            maxHeight: '90dvh',
            overflowY: 'auto',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Register New User
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddUser} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Role Assignment
                </label>
                <select
                  className="input-field"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                >
                  <option value="Volunteer">Volunteer (Relief Kit Collector)</option>
                  <option value="WardCommittee">Ward Committee (Ward Coordinator)</option>
                  <option value="Coordinator">Drive Coordinator (General Lead)</option>
                </select>
              </div>

              {/* SPECIFIC TO WARD COMMITTEE */}
              {newRole === 'WardCommittee' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Assigned Ward Number
                  </label>
                  <select
                    className="input-field"
                    value={newWard}
                    onChange={(e) => setNewWard(Number(e.target.value))}
                  >
                    {wardOptions.map((w) => {
                      const existing = getActiveWardCoordinator(w.wardNumber);
                      return (
                        <option key={w.wardNumber} value={w.wardNumber}>
                          {w.wardName} (Ward {w.wardNumber}){existing ? ` - [Occupied: ${existing.fullName}]` : ' - [Vacant]'}
                        </option>
                      );
                    })}
                  </select>

                  {/* Single Coordinator Constraint Warning */}
                  {(() => {
                    const existing = getActiveWardCoordinator(Number(newWard));
                    if (existing) {
                      return (
                        <div style={{
                          marginTop: 8,
                          padding: '10px 12px',
                          background: '#FEF3C7',
                          border: '1px solid #FCD34D',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '0.75rem',
                          color: '#92400E',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 6
                        }}>
                          <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                          <span>
                            <strong>Ward {newWard} Already Assigned:</strong> Currently led by <strong>{existing.fullName}</strong> ({existing.phoneNumber}). Each ward is strictly limited to 1 active Ward Coordinator.
                          </span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}

              {/* SPECIFIC TO VOLUNTEER: ASSIGN TO WARD OR COORDINATOR */}
              {newRole === 'Volunteer' && (
                <div style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 14px'
                }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 8 }}>
                    Volunteer Hierarchy & Reporting
                  </label>

                  <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="volunteerAssignType"
                        checked={newVolunteerAssignType === 'ward'}
                        onChange={() => setNewVolunteerAssignType('ward')}
                      />
                      <span>Assign to Ward</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="volunteerAssignType"
                        checked={newVolunteerAssignType === 'coordinator'}
                        onChange={() => setNewVolunteerAssignType('coordinator')}
                      />
                      <span>Assign to Drive Coordinator</span>
                    </label>
                  </div>

                  {newVolunteerAssignType === 'ward' ? (
                    <div>
                      <select
                        className="input-field"
                        value={newWard}
                        onChange={(e) => setNewWard(Number(e.target.value))}
                      >
                        {wardOptions.map((w) => (
                          <option key={w.wardNumber} value={w.wardNumber}>
                            {w.wardName} (Ward {w.wardNumber})
                          </option>
                        ))}
                      </select>
                      {(() => {
                        const wardCoord = getActiveWardCoordinator(Number(newWard));
                        return (
                          <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748B', marginTop: 4 }}>
                            {wardCoord 
                              ? `Will report to Ward Lead: ${wardCoord.fullName} (${wardCoord.phoneNumber})` 
                              : `No Ward Coordinator appointed yet; volunteer will report directly to Central Admin.`}
                          </span>
                        );
                      })()}
                    </div>
                  ) : (
                    <div>
                      <select
                        className="input-field"
                        value={newAssignedCoordinatorId}
                        onChange={(e) => setNewAssignedCoordinatorId(e.target.value)}
                      >
                        <option value="">-- Choose Drive Coordinator --</option>
                        {coordinators.filter(c => c.role === 'Coordinator' && c.isActive !== false).map((c) => (
                          <option key={c.userId} value={c.userId}>
                            {c.fullName} ({c.phoneNumber})
                          </option>
                        ))}
                      </select>
                      <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748B', marginTop: 4 }}>
                        Volunteer collections will contribute directly to this coordinator's team tally.
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Target Relief Kits
                </label>
                <input
                  type="number"
                  min={1}
                  className="input-field"
                  placeholder="e.g. 50"
                  value={newTarget}
                  onChange={(e) => _setNewTarget(Number(e.target.value))}
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

      {/* MODAL: EDIT USER & ROLE & STATUS */}
      {editingUser && (
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
            padding: '24px clamp(16px, 4vw, 24px)',
            maxWidth: 520,
            width: '100%',
            maxHeight: '90dvh',
            overflowY: 'auto',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Edit User: {editingUser.fullName}
                </h3>
                <p style={{ fontSize: '0.76rem', color: '#64748B', margin: '2px 0 0 0' }}>
                  Update role assignment, status, reporting hierarchy, or password.
                </p>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748B',
                  padding: 4
                }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  className="input-field"
                  placeholder="e.g. Shafeeq Rahiman"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
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
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: (editRole === 'WardCommittee' || editRole === 'Volunteer') ? '1fr 1fr' : '1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Role Assignment
                  </label>
                  <select
                    className="input-field"
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as any)}
                  >
                    <option value="Volunteer">Volunteer</option>
                    <option value="Coordinator">Drive Coordinator</option>
                    <option value="WardCommittee">Ward Committee (Ward Coordinator)</option>
                  </select>
                </div>

                {(editRole === 'WardCommittee' || editRole === 'Volunteer') && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      Ward Number
                    </label>
                    <select
                      className="input-field"
                      value={editWard}
                      onChange={(e) => setEditWard(Number(e.target.value))}
                    >
                      {wardOptions.map((w) => {
                        const existing = getActiveWardCoordinator(w.wardNumber, editingUser.userId);
                        return (
                          <option key={w.wardNumber} value={w.wardNumber}>
                            {w.wardName} ({w.wardNumber}){existing && editRole === 'WardCommittee' ? ' [Occupied]' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}
              </div>

              {/* Conflict Alert in Edit modal when changing role or ward to WardCommittee */}
              {editRole === 'WardCommittee' && editIsActive && (() => {
                const existing = getActiveWardCoordinator(Number(editWard), editingUser.userId);
                if (existing) {
                  return (
                    <div style={{
                      padding: '10px 12px',
                      background: '#FEF3C7',
                      border: '1px solid #FCD34D',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.75rem',
                      color: '#92400E',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 6
                    }}>
                      <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                      <span>
                        <strong>Conflict Warning:</strong> Ward {editWard} already has an active coordinator (<strong>{existing.fullName}</strong>). Saving this will be rejected by the system.
                      </span>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Volunteer Parent Coordinator Selection */}
              {editRole === 'Volunteer' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Reporting Coordinator / Lead
                  </label>
                  <select
                    className="input-field"
                    value={editAssignedParentId}
                    onChange={(e) => setEditAssignedParentId(e.target.value)}
                  >
                    <option value="">-- Direct Central Administration --</option>
                    {coordinators
                      .filter(c => (c.role === 'Coordinator' || c.role === 'WardCommittee') && c.userId !== editingUser.userId)
                      .map(c => (
                        <option key={c.userId} value={c.userId}>
                          {c.fullName} ({c.role === 'WardCommittee' ? `Ward ${c.wardNumber} Lead` : 'Drive Coordinator'})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Active / Disabled Account Status Toggle */}
              {editingUser && (editingUser.userId === currentUser.userId || 
                (!!editingUser.phoneNumber && !!currentUser.phoneNumber &&
                 editingUser.phoneNumber.replace(/\D/g, '').slice(-10) === currentUser.phoneNumber.replace(/\D/g, '').slice(-10))) ? (
                <div style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: '#F0FDF4',
                  border: '1px solid #BBF7D0'
                }}>
                  <span style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#166534' }}>
                    Account Status: Active (Your Administrator Account)
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#15803D' }}>
                    You cannot disable or suspend your own active administrator account.
                  </span>
                </div>
              ) : (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: editIsActive ? '#F0FDF4' : '#FEF2F2',
                  border: editIsActive ? '1px solid #BBF7D0' : '1px solid #FECACA'
                }}>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: editIsActive ? '#166534' : '#991B1B' }}>
                      Account Status: {editIsActive ? 'Active' : 'Disabled / Suspended'}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: editIsActive ? '#15803D' : '#B91C1C' }}>
                      {editIsActive ? 'User can log in and submit collections.' : 'User is blocked from logging in.'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setEditIsActive(prev => !prev)}
                    className="btn-secondary"
                    style={{
                      padding: '6px 12px',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      background: editIsActive ? '#DC2626' : '#008A2E',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer'
                    }}
                  >
                    {editIsActive ? 'Disable User' : 'Activate User'}
                  </button>
                </div>
              )}

              {/* Password & Credentials Box */}
              <div style={{
                background: '#F0FDF4',
                border: '1px solid #BBF7D0',
                borderRadius: 'var(--radius-lg)',
                padding: '14px 16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Key size={16} color="#008A2E" />
                    <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0F172A' }}>
                      Password & Credentials
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleRegeneratePassword}
                    className="btn-secondary"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      padding: '4px 10px',
                      background: '#FFFFFF',
                      color: '#008A2E',
                      borderColor: '#86EFAC'
                    }}
                  >
                    <RefreshCw size={12} />
                    <span>Regenerate Default</span>
                  </button>
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="text"
                    className="input-field"
                    style={{ background: '#FFFFFF', fontFamily: editPassword ? 'monospace' : 'inherit' }}
                    placeholder="Leave blank to keep existing password"
                    value={editPassword}
                    onChange={(e) => {
                      setEditPassword(e.target.value);
                      setPasswordFeedback(null);
                    }}
                  />

                  {editPassword && (
                    <button
                      type="button"
                      onClick={handleCopyPassword}
                      className="btn-secondary"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '10px 12px',
                        background: '#FFFFFF',
                        borderColor: copiedPassword ? '#008A2E' : '#CBD5E1',
                        color: copiedPassword ? '#008A2E' : '#334155'
                      }}
                      title="Copy Password"
                    >
                      {copiedPassword ? <Check size={16} color="#008A2E" /> : <Copy size={16} />}
                    </button>
                  )}
                </div>

                {passwordFeedback && (
                  <span style={{ display: 'block', fontSize: '0.74rem', color: '#008A2E', fontWeight: 600, marginTop: 6 }}>
                    {passwordFeedback}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
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
                  {loading ? <RefreshCw size={16} className="animate-spin" /> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE USER CONFIRMATION */}
      {deletingUser && (
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
            padding: '24px clamp(16px, 4vw, 24px)',
            maxWidth: 420,
            width: '100%',
            boxShadow: 'var(--shadow-lg)',
            textAlign: 'center'
          }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: 'var(--radius-full)',
              background: '#FEF2F2',
              color: '#DC2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}>
              <AlertTriangle size={28} />
            </div>

            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', marginBottom: 8 }}>
              Delete User?
            </h3>

            <p style={{ fontSize: '0.84rem', color: '#475569', lineHeight: 1.5, marginBottom: 20 }}>
              Are you sure you want to delete <strong>{deletingUser.fullName}</strong> ({deletingUser.role})? This will revoke their access to the portal immediately.
            </p>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="btn-secondary"
                style={{ flex: 1, padding: '11px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleDeleteUser}
                className="btn-primary"
                style={{
                  flex: 1,
                  padding: '11px',
                  background: '#DC2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6
                }}
              >
                {loading ? <RefreshCw size={16} className="animate-spin" /> : (
                  <>
                    <Trash2 size={16} />
                    <span>Delete User</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: USER MANAGEMENT */}
      {activeTab === 'users' && (() => {
        const wardCoordinatorsCount = coordinators.filter(u => u.role === 'WardCommittee').length;
        const driveCoordinatorsCount = coordinators.filter(u => u.role === 'Coordinator').length;
        const volunteersCount = coordinators.filter(u => u.role === 'Volunteer').length;
        const activeUsersCount = coordinators.filter(u => u.isActive !== false).length;
        const disabledUsersCount = coordinators.filter(u => u.isActive === false).length;

        const filteredUsers = coordinators.filter(u => {
          if (userRoleFilter !== 'All' && u.role !== userRoleFilter) return false;
          if (userStatusFilter === 'active' && u.isActive === false) return false;
          if (userStatusFilter === 'disabled' && u.isActive !== false) return false;
          if (userWardFilter !== 'All' && u.wardNumber !== userWardFilter) return false;
          if (userSearchQuery.trim()) {
            const q = userSearchQuery.trim().toLowerCase();
            const matchName = u.fullName?.toLowerCase().includes(q);
            const matchPhone = u.phoneNumber?.includes(q);
            if (!matchName && !matchPhone) return false;
          }
          return true;
        });

        return (
          <div style={{
            background: '#FFFFFF',
            borderRadius: 'var(--radius-xl)',
            padding: 20,
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            {/* Header & Quick Action */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  User Management
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                  {coordinators.length} registered members ({activeUsersCount} active, {disabledUsersCount} disabled)
                </span>
              </div>

              <button
                onClick={() => setShowAddModal(true)}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#008A2E', padding: '8px 14px', fontSize: '0.82rem' }}
              >
                <UserPlus size={15} />
                <span>Register User</span>
              </button>
            </div>

            {/* Search & Filter Controls */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              padding: 14,
              background: '#F8FAFC',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              marginBottom: 16
            }}>
              {/* Search Bar */}
              <div style={{ position: 'relative' }}>
                <Search size={16} color="#64748B" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  className="input-field"
                  style={{ paddingLeft: 36, background: '#FFFFFF' }}
                  placeholder="Search volunteers, coordinators by name or mobile number..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                />
                {userSearchQuery && (
                  <button
                    onClick={() => setUserSearchQuery('')}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Filter Pills & Selectors */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                {/* Role Filter Tabs */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {[
                    { key: 'All', label: 'All Users', count: coordinators.length },
                    { key: 'WardCommittee', label: 'Ward Coordinators', count: wardCoordinatorsCount },
                    { key: 'Coordinator', label: 'Drive Coordinators', count: driveCoordinatorsCount },
                    { key: 'Volunteer', label: 'Volunteers', count: volunteersCount }
                  ].map(tab => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setUserRoleFilter(tab.key as any)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: '1px solid',
                        borderColor: userRoleFilter === tab.key ? '#008A2E' : '#CBD5E1',
                        background: userRoleFilter === tab.key ? '#008A2E' : '#FFFFFF',
                        color: userRoleFilter === tab.key ? '#FFFFFF' : '#475569',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {tab.label} ({tab.count})
                    </button>
                  ))}
                </div>

                {/* Status & Ward Filter Dropdowns */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <select
                    className="input-field"
                    style={{ width: 'auto', padding: '6px 10px', fontSize: '0.76rem', background: '#FFFFFF' }}
                    value={userStatusFilter}
                    onChange={(e) => setUserStatusFilter(e.target.value as any)}
                  >
                    <option value="All">All Statuses</option>
                    <option value="active">Active Only ({activeUsersCount})</option>
                    <option value="disabled">Disabled Only ({disabledUsersCount})</option>
                  </select>

                  <select
                    className="input-field"
                    style={{ width: 'auto', padding: '6px 10px', fontSize: '0.76rem', background: '#FFFFFF' }}
                    value={userWardFilter}
                    onChange={(e) => setUserWardFilter(e.target.value === 'All' ? 'All' : Number(e.target.value))}
                  >
                    <option value="All">All Wards</option>
                    {wardOptions.map(w => (
                      <option key={w.wardNumber} value={w.wardNumber}>Ward {w.wardNumber}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* User Cards List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredUsers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 16px', color: '#64748B' }}>
                  <Users size={36} style={{ margin: '0 auto 10px auto', opacity: 0.4 }} />
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '0.92rem' }}>No users found matching your filters.</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem' }}>Try resetting the search or filter options above.</p>
                </div>
              ) : (
                filteredUsers.map(u => {
                  const isActive = u.isActive !== false;
                  const parentUser = u.parentUserId ? coordinators.find(c => c.userId === u.parentUserId) : null;
                  const isSelf = 
                    u.userId === currentUser.userId ||
                    (!!u.phoneNumber && !!currentUser.phoneNumber && 
                     u.phoneNumber.replace(/\D/g, '').slice(-10) === currentUser.phoneNumber.replace(/\D/g, '').slice(-10));

                  return (
                    <div
                      key={u.userId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 16px',
                        borderRadius: 'var(--radius-md)',
                        background: isActive ? '#FFFFFF' : '#F8FAFC',
                        border: isSelf ? '1.5px solid #008A2E' : isActive ? '1px solid var(--border-subtle)' : '1px dashed #CBD5E1',
                        opacity: isActive ? 1 : 0.8,
                        flexWrap: 'wrap',
                        gap: 12,
                        boxShadow: 'var(--shadow-sm)'
                      }}
                    >
                      {/* Identity & Role */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 240 }}>
                        <div style={{
                          width: 40,
                          height: 40,
                          borderRadius: 'var(--radius-full)',
                          background: u.role === 'Admin' ? '#FEF3C7' : u.role === 'WardCommittee' ? '#EBF7EE' : u.role === 'Coordinator' ? '#EDF4FA' : '#F5F3FF',
                          color: u.role === 'Admin' ? '#B45309' : u.role === 'WardCommittee' ? '#008A2E' : u.role === 'Coordinator' ? '#2C82C9' : '#7C3AED',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '0.85rem'
                        }}>
                          {u.fullName?.slice(0, 2).toUpperCase() || 'U'}
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.94rem' }}>
                              {u.fullName}
                            </span>

                            {/* Role Badge */}
                            <span style={{
                              background: u.role === 'Admin' ? '#FEF3C7' : u.role === 'WardCommittee' ? '#EBF7EE' : u.role === 'Coordinator' ? '#EDF4FA' : '#F5F3FF',
                              color: u.role === 'Admin' ? '#B45309' : u.role === 'WardCommittee' ? '#008A2E' : u.role === 'Coordinator' ? '#2C82C9' : '#7C3AED',
                              fontSize: '0.7rem',
                              fontWeight: 800,
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-full)'
                            }}>
                              {u.role === 'Admin' ? 'System Admin' : u.role === 'WardCommittee' ? `Ward ${u.wardNumber} Lead` : u.role === 'Coordinator' ? 'Drive Coordinator' : `Volunteer (Ward ${u.wardNumber || '-'})`}
                            </span>

                            {/* Status Badge */}
                            <span style={{
                              background: isActive ? '#DCFCE7' : '#FEE2E2',
                              color: isActive ? '#15803D' : '#B91C1C',
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              padding: '1px 7px',
                              borderRadius: 'var(--radius-full)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 3
                            }}>
                              {isActive ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                              <span>{isActive ? 'Active' : 'Disabled'}</span>
                            </span>

                            {isSelf && (
                              <span style={{
                                background: '#E0F2FE',
                                color: '#0369A1',
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                padding: '1px 7px',
                                borderRadius: 'var(--radius-full)'
                              }}>
                                You
                              </span>
                            )}
                          </div>

                          <span style={{ fontSize: '0.76rem', color: '#64748B', display: 'block', marginTop: 2 }}>
                            {u.phoneNumber} • {u.panchayath}
                            {parentUser && (
                              <span> • Reports to: <strong>{parentUser.fullName}</strong></span>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Stats & Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                        <div style={{ textAlign: 'right', minWidth: 90 }}>
                          <span style={{ fontWeight: 800, color: '#008A2E', fontSize: '0.92rem', display: 'block' }}>
                            {u.kitsCollected || 0} / {u.targetKits || 50} Kits
                          </span>
                          <span style={{ fontSize: '0.72rem', color: '#64748B', display: 'block' }}>
                            ₹{(u.totalAmount || 0).toLocaleString('en-IN')} Raised
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          {/* Edit Details */}
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="btn-secondary"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '6px 10px',
                              fontSize: '0.76rem',
                              fontWeight: 700,
                              color: '#0F172A',
                              background: '#FFFFFF',
                              border: '1px solid #CBD5E1',
                              borderRadius: 'var(--radius-md)',
                              cursor: 'pointer'
                            }}
                            title="Edit User Details & Role"
                          >
                            <Edit3 size={13} color="#008A2E" />
                            <span>Edit</span>
                          </button>

                          {/* Toggle Active/Disabled Status (Hidden for self: Admin cannot disable themselves) */}
                          {!isSelf && (
                            <button
                              onClick={() => handleToggleUserStatus(u)}
                              disabled={loading}
                              className="btn-secondary"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '6px 10px',
                                fontSize: '0.76rem',
                                fontWeight: 700,
                                color: isActive ? '#B45309' : '#008A2E',
                                background: isActive ? '#FFFBEB' : '#ECFDF5',
                                border: isActive ? '1px solid #FCD34D' : '1px solid #A7F3D0',
                                borderRadius: 'var(--radius-md)',
                                cursor: 'pointer'
                              }}
                              title={isActive ? 'Disable User (Block Login)' : 'Activate User (Allow Login)'}
                            >
                              {isActive ? <UserX size={13} /> : <UserCheck size={13} />}
                              <span>{isActive ? 'Disable' : 'Activate'}</span>
                            </button>
                          )}

                          {/* Reset / Change Password */}
                          <button
                            onClick={() => setResetTargetUser({
                              id: u.userId,
                              name: u.fullName,
                              phone: u.phoneNumber,
                              role: u.role,
                              wardNumber: u.wardNumber
                            })}
                            className="btn-secondary"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '6px 10px',
                              fontSize: '0.76rem',
                              fontWeight: 700,
                              color: '#0284C7',
                              background: '#F0F9FF',
                              border: '1px solid #BAE6FD',
                              borderRadius: 'var(--radius-md)',
                              cursor: 'pointer'
                            }}
                            title="Change / Reset User Password"
                          >
                            <Key size={13} />
                            <span>Password</span>
                          </button>

                          {/* Delete Button (Hidden for self: Admin cannot delete themselves) */}
                          {!isSelf && (
                            <button
                              onClick={() => setDeletingUser(u)}
                              className="btn-secondary"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '6px 8px',
                                fontSize: '0.76rem',
                                fontWeight: 700,
                                color: '#DC2626',
                                background: '#FEF2F2',
                                border: '1px solid #FECACA',
                                borderRadius: 'var(--radius-md)',
                                cursor: 'pointer'
                              }}
                              title="Delete User"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })()}

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
                        {u.targetKits ? `${u.targetKits} Kits (₹${(u.targetKits * kitPrice).toLocaleString('en-IN')})` : 'No Target Set'}
                      </span>
                      <button
                        onClick={() => {
                          setEditingUserId(u.userId);
                          setEditingTargetKits(u.targetKits || 0);
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

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <button
                onClick={handleDownloadReport}
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                title="Export kit donations report"
              >
                <Download size={16} />
                <span>Kit Donations CSV</span>
              </button>

              <button
                onClick={handleDownloadSponsorshipsReport}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#2C82C9' }}
                title="Export detailed sponsorships report across all wards"
              >
                <Download size={16} />
                <span>Sponsorships Detailed CSV</span>
              </button>
            </div>
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
                    border: '1px solid var(--border-subtle)',
                    flexWrap: 'wrap',
                    gap: 8
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
                disabled={isSavingPrice}
              />
              <button
                type="submit"
                className="btn-primary"
                disabled={isSavingPrice}
                style={{ padding: '10px 20px', background: '#008A2E' }}
              >
                {isSavingPrice ? 'Saving...' : 'Save'}
              </button>
            </div>
            <span style={{ fontSize: '0.74rem', color: '#64748B', display: 'block', marginTop: 8 }}>
              All campaign goals, donations, and receipts will calculate using this relief kit price.
            </span>

            <div style={{
              marginTop: 14,
              padding: '12px 14px',
              background: '#FFFFFF',
              borderRadius: 8,
              border: '1px solid #CBD5E1',
              fontSize: '0.78rem',
              color: '#475569',
              display: 'flex',
              flexDirection: 'column',
              gap: 6
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600 }}>Status:</span>
                <span style={{ color: '#008A2E', fontWeight: 700 }}>Active & Live</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600 }}>Last Updated:</span>
                <span>{kitPriceModifiedDate ? new Date(kitPriceModifiedDate).toLocaleString('en-IN') : 'Initial Setup'}</span>
              </div>
              {kitPriceModifiedBy && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600 }}>Updated By:</span>
                  <span style={{ fontWeight: 600, color: '#1E293B' }}>{kitPriceModifiedBy}</span>
                </div>
              )}
            </div>
          </form>

          {/* Card 2: Ward Relief Kit Collection Control */}
          <div style={{
            background: blockWardKitCollection ? '#FFFBFB' : '#F0FDF4',
            border: blockWardKitCollection ? '1px solid #FECACA' : '1px solid #BBF7D0',
            borderRadius: 'var(--radius-lg)',
            padding: 18,
            maxWidth: 440,
            marginTop: 18
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 10 }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                {blockWardKitCollection ? <Lock size={16} color="#DC2626" /> : <Package size={16} color="#16A34A" />}
                <span>Ward Relief Kit Collection Control</span>
              </label>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                padding: '3px 8px',
                borderRadius: 20,
                background: blockWardKitCollection ? '#FEE2E2' : '#DCFCE7',
                color: blockWardKitCollection ? '#DC2626' : '#15803D',
                border: blockWardKitCollection ? '1px solid #FECACA' : '1px solid #86EFAC',
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}>
                {blockWardKitCollection ? 'Closed / Blocked' : 'Open / Active'}
              </span>
            </div>

            <p style={{ fontSize: '0.76rem', color: '#475569', lineHeight: 1.5, margin: '6px 0 14px 0' }}>
              {blockWardKitCollection
                ? 'Relief kit collections are blocked for Ward Coordinators and Ward Volunteers. They are guided to collect Sponsorships only. Drive coordinators and volunteers remain active.'
                : 'All teams (Ward and Drive) can actively collect and log Relief Kit donations.'}
            </p>

            <div style={{
              background: '#FFFFFF',
              borderRadius: 8,
              padding: '10px 12px',
              border: '1px solid var(--border-subtle)',
              marginBottom: 14,
              fontSize: '0.74rem',
              color: '#334155'
            }}>
              <strong>Note on Balance Collection:</strong> Outstanding balance collection on already registered kit donations remains available at all times regardless of this toggle.
            </div>

            <button
              type="button"
              onClick={handleToggleWardKitCollection}
              disabled={isUpdatingStatus || !onUpdateWardKitCollectionStatus}
              className="btn-primary"
              style={{
                width: '100%',
                padding: '10px 16px',
                background: blockWardKitCollection ? '#16A34A' : '#DC2626',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.84rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                borderRadius: 8,
                cursor: 'pointer'
              }}
            >
              {isUpdatingStatus ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  <span>Updating...</span>
                </>
              ) : blockWardKitCollection ? (
                <>
                  <Package size={15} />
                  <span>Re-open Ward Kit Collection</span>
                </>
              ) : (
                <>
                  <Lock size={15} />
                  <span>Block Ward Kit Collection (Sponsorships Only)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* TAB: SPONSORSHIPS */}
      {activeTab === 'sponsorships' && (
        <SponsorshipLeaderboardView user={currentUser} />
      )}

      {/* RESET PASSWORD MODAL FOR COORDINATORS & WARD COMMITTEES */}
      <ResetPasswordModal
        isOpen={!!resetTargetUser}
        onClose={() => setResetTargetUser(null)}
        targetUser={resetTargetUser}
        onSuccess={() => loadData()}
      />
    </div>
  );
};
