import type {
  User,
  UserRole,
  Donation,
  CreateDonationRequest,
  WeeklyMetrics,
  LeaderboardEntry,
  WardLeaderboardEntry,
  ManagedUser,
  CreateManagedUserRequest,
  UpdateManagedUserRequest
} from '../types';

// Live Azure API Base URL
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://mlcharitywebapi-g6evcsavaqf6drej.centralindia-01.azurewebsites.net/api';
export const KIT_UNIT_RATE = 1000;

// Local Storage Keys
const STORAGE_USER = 'charity_user';
const STORAGE_DONATIONS = 'charity_donations';

// Helper to decode claims from JWT token
export function parseJwt(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return {};
  }
}

// Generates 6-character default password (first 3 letters of name + last 3 digits of phone)
export function generateDefaultPassword(fullName: string, phoneNumber: string): string {
  const cleanName = (fullName || '').replace(/[^a-zA-Z]/g, '').toLowerCase();
  const cleanPhone = (phoneNumber || '').replace(/\D/g, '');

  let namePart = 'usr';
  if (cleanName.length >= 3) {
    namePart = cleanName.substring(0, 3);
  } else if (cleanName.length > 0) {
    namePart = cleanName.padEnd(3, 'x');
  }

  let phonePart = '123';
  if (cleanPhone.length >= 3) {
    phonePart = cleanPhone.slice(-3);
  } else if (cleanPhone.length > 0) {
    phonePart = cleanPhone.padStart(3, '0');
  }

  return `${namePart}${phonePart}`;
}

// Current User State helpers
export const getCurrentUser = (): User | null => {
  const data = localStorage.getItem(STORAGE_USER);
  if (data) {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
  return null;
};

export const setCurrentUser = (user: User | null) => {
  if (user) {
    localStorage.setItem(STORAGE_USER, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_USER);
  }
};

// Local storage helper for session receipts/history
function getStoredDonations(): Donation[] {
  const data = localStorage.getItem(STORAGE_DONATIONS);
  if (data) {
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  }
  return [];
}

// ============================================================================
// Auth API (Live Azure Backend)
// ============================================================================
export const authApi = {
  // Password-based login (POST /api/Auth/login)
  loginWithPassword: async (phoneNumber: string, password: string): Promise<User> => {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('91') ? `+${cleanPhone}` : `+91${cleanPhone.slice(-10)}`;

    const res = await fetch(`${API_BASE_URL}/Auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phoneNumber: formattedPhone,
        password
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Invalid phone or password' }));
      throw new Error(err.message || err.Message || 'Authentication failed. Please check your credentials.');
    }

    const data = await res.json();
    const claims = parseJwt(data.token);

    const user: User = {
      userId: claims.sub || claims['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || `usr-${Date.now()}`,
      fullName: data.fullName || claims.name || 'Community Member',
      phoneNumber: formattedPhone,
      role: data.role || claims['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || 'Volunteer',
      panchayath: claims.Panchayath || 'Madavoor',
      wardNumber: claims.WardNumber ? parseInt(claims.WardNumber, 10) : 4,
      district: claims.District || 'Kozhikode',
      token: data.token,
      expiresAt: data.expiresAt
    };

    setCurrentUser(user);
    return user;
  },

  // Change Password (POST /api/Auth/change-password)
  changePassword: async (oldPassword: string, newPassword: string): Promise<string> => {
    const token = getCurrentUser()?.token;
    const res = await fetch(`${API_BASE_URL}/Auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ oldPassword, newPassword })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Failed to change password' }));
      throw new Error(err.message || err.Message || 'Failed to update password');
    }

    const data = await res.json().catch(() => ({ message: 'Password updated successfully.' }));
    return data.message || 'Password updated successfully.';
  },

  logout: async () => {
    setCurrentUser(null);
  }
};

// ============================================================================
// Donations & Metrics API (Live Azure Backend)
// ============================================================================
export const donationsApi = {
  // Get Weekly Metrics derived from live Leaderboard aggregate
  getWeeklyMetrics: async (): Promise<WeeklyMetrics> => {
    const token = getCurrentUser()?.token;
    try {
      const res = await fetch(`${API_BASE_URL}/Leaderboards`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (res.ok) {
        const data = await res.json();
        const topWards: any[] = data.topWards || [];
        const topVols: any[] = data.topVolunteers || [];

        const totalKits = topWards.reduce((acc, w) => acc + (w.totalKits || 0), 0)
          || topVols.reduce((acc, v) => acc + (v.totalKits || 0), 0);
        const totalAmount = topWards.reduce((acc, w) => acc + (w.totalAmount || 0), 0)
          || topVols.reduce((acc, v) => acc + (v.totalAmount || 0), 0);

        const targetKits = 1200;
        const targetAmount = 1200000;
        const donorsCount = getStoredDonations().length || topVols.length;

        return {
          startDate: 'Sep 3',
          endDate: 'Sep 10',
          totalAmount,
          totalKits,
          targetAmount,
          targetKits,
          donorsCount,
          growthPercentage: 24.5,
          dailyBreakdown: [
            { day: 'Mon', kits: 0, amount: 0 },
            { day: 'Tue', kits: 0, amount: 0 },
            { day: 'Wed', kits: 0, amount: 0 },
            { day: 'Thu', kits: 0, amount: 0 },
            { day: 'Fri', kits: 0, amount: 0 },
            { day: 'Sat', kits: 0, amount: 0 },
            { day: 'Sun', kits: totalKits, amount: totalAmount }
          ]
        };
      }
    } catch (err) {
      console.warn('Leaderboard API fetch failed, returning default metrics template:', err);
    }

    return {
      startDate: 'Sep 3',
      endDate: 'Sep 10',
      totalAmount: 0,
      totalKits: 0,
      targetAmount: 1200000,
      targetKits: 1200,
      donorsCount: 0,
      growthPercentage: 0,
      dailyBreakdown: []
    };
  },

  // Get Volunteer Leaderboard (GET /api/Leaderboards)
  getVolunteerLeaderboard: async (_userRole?: UserRole): Promise<LeaderboardEntry[]> => {
    const token = getCurrentUser()?.token;
    try {
      const res = await fetch(`${API_BASE_URL}/Leaderboards`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (res.ok) {
        const data = await res.json();
        const topVols: any[] = data.topVolunteers || [];

        return topVols.map((v, idx) => ({
          id: `vol-${idx + 1}`,
          name: v.name,
          role: 'Volunteer' as UserRole,
          wardNumber: 4,
          panchayath: 'Madavoor',
          kitsCollected: v.totalKits || 0,
          totalAmount: v.totalAmount || 0,
          donationsCount: Math.max(1, Math.round((v.totalKits || 1) / 2)),
          targetKits: 50,
          rank: v.position || idx + 1
        }));
      }
    } catch (err) {
      console.warn('Failed to load volunteer leaderboard:', err);
    }

    return [];
  },

  // Get Ward Leaderboard (GET /api/Leaderboards)
  getWardLeaderboard: async (): Promise<WardLeaderboardEntry[]> => {
    const token = getCurrentUser()?.token;
    try {
      const res = await fetch(`${API_BASE_URL}/Leaderboards`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (res.ok) {
        const data = await res.json();
        const topWards: any[] = data.topWards || [];

        return topWards.map((w, idx) => {
          const match = (w.name || '').match(/\d+/);
          const wardNum = match ? parseInt(match[0], 10) : idx + 1;
          const target = 100;
          const kits = w.totalKits || 0;

          return {
            wardNumber: wardNum,
            wardName: w.name || `Ward ${wardNum}`,
            kitsCollected: kits,
            targetKits: target,
            totalAmount: w.totalAmount || (kits * 1000),
            progressPercentage: Math.min(100, Math.round((kits / target) * 100)),
            volunteerCount: 5,
            rank: w.position || idx + 1
          };
        });
      }
    } catch (err) {
      console.warn('Failed to load ward leaderboard:', err);
    }

    return [];
  },

  // Get Recent Donations from current session/device stream
  getRecentDonations: async (userRole?: UserRole): Promise<Donation[]> => {
    const all = getStoredDonations();
    const role = userRole || getCurrentUser()?.role || 'Volunteer';

    if (role === 'Admin') {
      return all;
    }
    return all.filter((d) => d.collectedByRole === 'Volunteer' || !d.collectedByRole);
  },

  // Record a New Donation (POST /api/Donations)
  recordDonation: async (request: CreateDonationRequest): Promise<Donation> => {
    const currentUser = getCurrentUser();
    const token = currentUser?.token;
    const cleanPhone = request.whatsAppNumber.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('91') ? `+${cleanPhone}` : `+91${cleanPhone.slice(-10)}`;

    const res = await fetch(`${API_BASE_URL}/Donations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        donorName: request.donorName.trim(),
        whatsAppNumber: formattedPhone,
        kitCount: Number(request.kitCount)
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Failed to record donation' }));
      throw new Error(err.message || err.Message || 'Failed to record donation');
    }

    const data = await res.json();
    const newDonation: Donation = {
      donationId: data.donationId || `don-${Date.now()}`,
      receiptToken: data.receiptToken,
      donorName: data.donorName,
      whatsAppNumber: formattedPhone,
      kitCount: data.kitCount,
      kitUnitRate: 1000,
      totalAmount: data.totalAmount,
      panchayath: data.panchayath || currentUser?.panchayath || 'Madavoor',
      wardNumber: data.wardNumber || currentUser?.wardNumber || 4,
      collectedByUserId: currentUser?.userId || 'usr-guest',
      collectedByName: currentUser?.fullName || 'Volunteer',
      collectedByRole: currentUser?.role || 'Volunteer',
      timestamp: data.timestamp || new Date().toISOString()
    };

    // Store in local session stream for receipt history
    const stored = [newDonation, ...getStoredDonations()];
    localStorage.setItem(STORAGE_DONATIONS, JSON.stringify(stored));

    return newDonation;
  },

  // Public Receipt Viewer
  getPublicReceipt: async (token: string): Promise<Donation | null> => {
    const donations = getStoredDonations();
    const found = donations.find((d) => d.receiptToken.toUpperCase() === token.toUpperCase());
    return found || null;
  }
};

// ============================================================================
// Admin API (Live Azure Backend)
// ============================================================================
export const adminApi = {
  // Get Coordinators & Ward Committees (GET /api/Users/coordinators)
  getManagedUsers: async (): Promise<ManagedUser[]> => {
    const user = getCurrentUser();
    const token = user?.token;
    console.log('[adminApi.getManagedUsers] Initiating call. User:', user?.fullName, '| Role:', user?.role, '| Token:', token ? `${token.substring(0, 15)}...` : 'NONE');

    const res = await fetch(`${API_BASE_URL}/Users/coordinators`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });

    console.log('[adminApi.getManagedUsers] HTTP Status:', res.status, res.statusText);

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: `HTTP ${res.status}: Failed to load coordinators` }));
      console.error('[adminApi.getManagedUsers] Request failed:', err);
      throw new Error(err.message || err.Message || `HTTP ${res.status}: Failed to load coordinators`);
    }

    const data: any[] = await res.json();
    console.log('[adminApi.getManagedUsers] Successfully loaded coordinators count:', data?.length, data);

    return data.map((u) => ({
      userId: u.userId,
      fullName: u.fullName,
      phoneNumber: u.phoneNumber,
      role: u.role,
      wardNumber: u.wardNumber,
      panchayath: u.panchayath || 'Madavoor',
      district: u.district || 'Kozhikode',
      targetKits: u.targetKits || 50,
      kitsCollected: 0,
      totalAmount: 0,
      donationsCount: 0,
      createdAt: new Date().toISOString()
    }));
  },

  // Register Coordinator / Ward Committee (POST /api/Users)
  createManagedUser: async (data: CreateManagedUserRequest): Promise<ManagedUser> => {
    const token = getCurrentUser()?.token;
    const defaultPassword = data.defaultPassword || generateDefaultPassword(data.fullName, data.phoneNumber);
    const cleanPhone = data.phoneNumber.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('91') ? `+${cleanPhone}` : `+91${cleanPhone.slice(-10)}`;

    const res = await fetch(`${API_BASE_URL}/Users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        fullName: data.fullName.trim(),
        phoneNumber: formattedPhone,
        role: data.role,
        wardNumber: Number(data.wardNumber),
        panchayath: data.panchayath || 'Madavoor',
        district: data.district || 'Kozhikode',
        targetKits: Number(data.targetKits) || 50,
        defaultPassword: defaultPassword
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Failed to create user' }));
      throw new Error(err.message || err.Message || 'Failed to create user');
    }

    const created = await res.json();

    return {
      userId: created.userId || `mng-${Date.now()}`,
      fullName: data.fullName.trim(),
      phoneNumber: formattedPhone,
      role: data.role,
      wardNumber: Number(data.wardNumber),
      panchayath: data.panchayath || 'Madavoor',
      district: data.district || 'Kozhikode',
      targetKits: Number(data.targetKits) || 50,
      kitsCollected: 0,
      totalAmount: 0,
      donationsCount: 0,
      createdAt: new Date().toISOString()
    };
  },

  // Update target (PUT /api/Users/{userId}/target)
  updateUserTarget: async (userId: string, targetKits: number): Promise<ManagedUser> => {
    const token = getCurrentUser()?.token;
    const res = await fetch(`${API_BASE_URL}/Users/${userId}/target`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ targetKits: Number(targetKits) })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Failed to update target' }));
      throw new Error(err.message || 'Failed to update target');
    }

    return {
      userId,
      targetKits: Number(targetKits)
    } as ManagedUser;
  },

  // Update user details (PUT /api/Users/{userId})
  updateManagedUser: async (
    userId: string,
    data: UpdateManagedUserRequest
  ): Promise<{ user: ManagedUser; newPassword?: string }> => {
    const token = getCurrentUser()?.token;
    let formattedPhone = data.phoneNumber;
    if (formattedPhone) {
      const cleanPhone = formattedPhone.replace(/\D/g, '');
      formattedPhone = cleanPhone.startsWith('91') ? `+${cleanPhone}` : `+91${cleanPhone.slice(-10)}`;
    }

    const payload: any = { ...data };
    if (formattedPhone) payload.phoneNumber = formattedPhone;
    if (data.wardNumber !== undefined) payload.wardNumber = Number(data.wardNumber);
    if (data.targetKits !== undefined) payload.targetKits = Number(data.targetKits);

    const res = await fetch(`${API_BASE_URL}/Users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Failed to update user' }));
      throw new Error(err.message || err.Message || 'Failed to update user');
    }

    const resData = await res.json();
    const u = resData.user || {};
    return {
      user: {
        userId: u.userId || userId,
        fullName: u.fullName || data.fullName || '',
        phoneNumber: u.phoneNumber || formattedPhone || '',
        role: u.role || data.role || 'Coordinator',
        wardNumber: u.wardNumber ?? data.wardNumber ?? 4,
        panchayath: u.panchayath || data.panchayath || 'Madavoor',
        district: u.district || data.district || 'Kozhikode',
        targetKits: u.targetKits ?? data.targetKits ?? 50,
        kitsCollected: 0,
        totalAmount: 0,
        donationsCount: 0,
        createdAt: new Date().toISOString()
      },
      newPassword: resData.newPassword
    };
  },

  // Regenerate / Reset Password (POST /api/Users/{userId}/reset-password)
  resetUserPassword: async (userId: string, newPassword?: string): Promise<string> => {
    const token = getCurrentUser()?.token;
    const res = await fetch(`${API_BASE_URL}/Users/${userId}/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ newPassword: newPassword || null })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Failed to reset password' }));
      throw new Error(err.message || err.Message || 'Failed to reset password');
    }

    const resData = await res.json();
    return resData.newPassword || '';
  },

  // Deactivate or remove a user (DELETE /api/Users/{userId})
  deleteManagedUser: async (userId: string): Promise<boolean> => {
    const token = getCurrentUser()?.token;
    const res = await fetch(`${API_BASE_URL}/Users/${userId}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Failed to delete user' }));
      throw new Error(err.message || err.Message || 'Failed to delete user');
    }

    return true;
  }
};

// ============================================================================
// Analytics API (Live Azure Backend)
// ============================================================================
export interface UserProgress {
  targetKits: number;
  targetAmount: number;
  collectedKits: number;
  collectedAmount: number;
  achievementPercentage: number;
}

export const analyticsApi = {
  // Get personal / team progress (GET /api/Analytics/my-progress)
  getMyProgress: async (tokenOverride?: string): Promise<UserProgress> => {
    const token = tokenOverride || getCurrentUser()?.token;
    console.log('[analyticsApi.getMyProgress] Calling GET /Analytics/my-progress. Token present:', !!token);

    const res = await fetch(`${API_BASE_URL}/Analytics/my-progress`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });

    console.log('[analyticsApi.getMyProgress] HTTP Status:', res.status, res.statusText);

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: `HTTP ${res.status}: Failed to load progress` }));
      console.error('[analyticsApi.getMyProgress] Error:', err);
      throw new Error(err.message || err.Message || `HTTP ${res.status}: Failed to load progress`);
    }

    const data = await res.json();
    console.log('[analyticsApi.getMyProgress] Received data:', data);

    const targetKits = Number(data.targetKits ?? data.TargetKits ?? 0);
    const collectedKits = Number(data.collectedKits ?? data.CollectedKits ?? 0);
    const collectedAmount = Number(data.collectedAmount ?? data.CollectedAmount ?? 0);
    const targetAmount = Number(data.targetAmount ?? data.TargetAmount ?? (targetKits * 1000));
    const rawPct = data.achievementPercentage ?? data.AchievementPercentage;
    const achievementPercentage = rawPct !== undefined 
      ? Number(rawPct) 
      : (targetKits > 0 ? Math.round((collectedKits / targetKits) * 100) : 0);

    return {
      targetKits,
      targetAmount,
      collectedKits,
      collectedAmount,
      achievementPercentage
    };
  }
};

// ============================================================================
// Coordinator API (Live Azure Backend)
// ============================================================================
export const coordinatorApi = {
  // Get team volunteers (GET /api/Users/volunteers)
  getMyVolunteers: async (tokenOverride?: string): Promise<any[]> => {
    const token = tokenOverride || getCurrentUser()?.token;
    const res = await fetch(`${API_BASE_URL}/Users/volunteers`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });

    if (!res.ok) {
      console.warn('[coordinatorApi.getMyVolunteers] Status:', res.status);
      return [];
    }

    const data = await res.json();
    return Array.isArray(data) ? data : [];
  }
};
