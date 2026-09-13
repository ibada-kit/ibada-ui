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
  UpdateManagedUserRequest,
  SponsorshipItem,
  CreateSponsorshipPayload,
  SponsorshipRecord,
  UpdatePaymentPayload,
  SponsorshipLeaderboardResponse
} from '../types';

// Live Azure API Base URL (uses Vite proxy in DEV to eliminate local CORS restrictions)
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? '/api' : 'https://mlcharitywebapi-g6evcsavaqf6drej.centralindia-01.azurewebsites.net/api');
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

// Generates random 6-character alphanumeric password (letters & numbers)
export function generateRandomPassword(length: number = 6): string {
  const chars = '23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = '';
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < length; i++) {
      result += chars[bytes[i] % chars.length];
    }
  } else {
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  }
  return result;
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

// Helper to extract clean error message from API responses
async function extractErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const text = await res.text();
    if (!text) return `${fallback} (HTTP ${res.status})`;
    try {
      const json = JSON.parse(text);
      return json.message || json.Message || json.title || (json.errors ? Object.values(json.errors).flat().join(', ') : text);
    } catch {
      return text;
    }
  } catch {
    return `${fallback} (HTTP ${res.status})`;
  }
}

// Current User State helpers
export const getCurrentUser = (): User | null => {
  const data = localStorage.getItem(STORAGE_USER);
  if (data) {
    try {
      const user = JSON.parse(data);
      if (user?.token) {
        const claims = parseJwt(user.token);
        // If sub was serialized as an array from the old backend bug, or token expired, invalidate it so user can cleanly re-login
        if (Array.isArray(claims.sub) || (claims.exp && claims.exp * 1000 < Date.now())) {
          console.warn('[api.ts] Detected stale or malformed token in localStorage. Clearing session.');
          localStorage.removeItem(STORAGE_USER);
          return null;
        }
      }
      return user;
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
      const msg = await extractErrorMessage(res, 'Invalid phone or password');
      throw new Error(msg);
    }

    const data = await res.json();
    const claims = parseJwt(data.token);

    const rawSub = Array.isArray(claims.sub) ? claims.sub[0] : claims.sub;
    const rawRole = data.role || (Array.isArray(claims.role) ? claims.role[0] : claims.role) || claims['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || 'Volunteer';

    const user: User = {
      userId: rawSub || claims.UserId || claims['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || `usr-${Date.now()}`,
      fullName: data.fullName || claims.name || 'Community Member',
      phoneNumber: formattedPhone,
      role: rawRole,
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
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday
    const formatDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

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

        const targetKits = topWards.reduce((acc, w) => acc + (w.targetKits || 0), 0);
        const targetAmount = targetKits * 1000;
        const donorsCount = topWards.reduce((acc, w) => acc + (w.donationsCount || 0), 0)
          || topVols.reduce((acc, v) => acc + (v.donationsCount || 0), 0);

        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayCounts: Record<string, { kits: number; amount: number }> = {
          Mon: { kits: 0, amount: 0 },
          Tue: { kits: 0, amount: 0 },
          Wed: { kits: 0, amount: 0 },
          Thu: { kits: 0, amount: 0 },
          Fri: { kits: 0, amount: 0 },
          Sat: { kits: 0, amount: 0 },
          Sun: { kits: 0, amount: 0 }
        };

        const donations = getStoredDonations();
        donations.forEach(d => {
          if (d.timestamp) {
            const day = days[new Date(d.timestamp).getDay()];
            if (dayCounts[day]) {
              dayCounts[day].kits += d.kitCount || 0;
              dayCounts[day].amount += d.totalAmount || 0;
            }
          }
        });

        // Attribute remaining live kits to current day if no local session timestamps
        const currentDayName = days[today.getDay()];
        const sumRecordedKits = Object.values(dayCounts).reduce((s, x) => s + x.kits, 0);
        if (totalKits > sumRecordedKits && dayCounts[currentDayName]) {
          dayCounts[currentDayName].kits += (totalKits - sumRecordedKits);
          dayCounts[currentDayName].amount += (totalAmount - Object.values(dayCounts).reduce((s, x) => s + x.amount, 0));
        }

        const dailyBreakdown = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => ({
          day,
          kits: dayCounts[day].kits,
          amount: dayCounts[day].amount
        }));

        return {
          startDate: formatDate(startOfWeek),
          endDate: formatDate(endOfWeek),
          totalAmount,
          totalKits,
          targetAmount,
          targetKits,
          donorsCount,
          growthPercentage: 0,
          dailyBreakdown
        };
      }
    } catch (err) {
      console.warn('Leaderboard API fetch failed:', err);
    }

    return {
      startDate: formatDate(startOfWeek),
      endDate: formatDate(endOfWeek),
      totalAmount: 0,
      totalKits: 0,
      targetAmount: 0,
      targetKits: 0,
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
          id: v.userId || `vol-${idx + 1}`,
          name: v.name,
          role: (v.role as UserRole) || 'Volunteer',
          wardNumber: v.wardNumber || 0,
          panchayath: v.panchayath || '',
          kitsCollected: v.totalKits || 0,
          totalAmount: v.totalAmount || 0,
          donationsCount: v.donationsCount || 0,
          targetKits: v.targetKits || 0,
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
          const wardNum = w.wardNumber || parseInt((w.name || '').match(/\d+/)?.[0] || '0', 10) || idx + 1;
          const target = w.targetKits || 0;
          const kits = w.totalKits || 0;

          return {
            wardNumber: wardNum,
            wardName: w.name || `Ward ${wardNum}`,
            kitsCollected: kits,
            targetKits: target,
            totalAmount: w.totalAmount || (kits * 1000),
            progressPercentage: target > 0 ? Math.min(100, Math.round((kits / target) * 100)) : 0,
            volunteerCount: w.volunteerCount || 0,
            rank: w.position || idx + 1
          };
        });
      }
    } catch (err) {
      console.warn('Failed to load ward leaderboard:', err);
    }

    return [];
  },

  // Get Recent Donations from backend server stream
  getRecentDonations: async (userRole?: UserRole): Promise<Donation[]> => {
    const token = getCurrentUser()?.token;
    if (token) {
      try {
        const res = await fetch(`${API_BASE_URL}/Donations`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data: any[] = await res.json();
          if (Array.isArray(data)) {
            return data.map((d) => ({
              donationId: d.donationId,
              receiptToken: d.receiptToken,
              donorName: d.donorName,
              whatsAppNumber: d.whatsAppNumber || '',
              kitCount: d.kitCount,
              kitUnitRate: 1000,
              totalAmount: d.totalAmount,
              panchayath: d.panchayath || 'Madavoor',
              wardNumber: d.wardNumber,
              collectedByUserId: d.collectedByUserId,
              collectedByName: d.collectedByName || 'Volunteer',
              collectedByRole: d.collectedByRole,
              timestamp: d.timestamp
            }));
          }
        }
      } catch (err) {
        console.warn('Could not fetch donations from server:', err);
      }
    }

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
      const msg = await extractErrorMessage(res, 'Failed to record donation');
      throw new Error(msg);
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
// Users API (Shared user management actions)
// ============================================================================
export const usersApi = {
  resetPassword: async (userIdOrPhone: string, newPassword?: string): Promise<{ message: string; newPassword: string }> => {
    const user = getCurrentUser();
    const token = user?.token;
    const finalPassword = newPassword ? newPassword.trim() : generateRandomPassword(6);

    try {
      const res = await fetch(`${API_BASE_URL}/Users/${encodeURIComponent(userIdOrPhone)}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ newPassword: finalPassword })
      });

      if (res.ok) {
        const resData = await res.json().catch(() => ({}));
        return {
          message: resData.message || resData.Message || 'Password reset successfully.',
          newPassword: resData.newPassword || resData.NewPassword || finalPassword
        };
      }

      // If HTTP 403 / 404 and caller is Admin, attempt PUT /api/Users/{userId} fallback
      if ((res.status === 403 || res.status === 404) && user?.role === 'Admin') {
        const putRes = await fetch(`${API_BASE_URL}/Users/${encodeURIComponent(userIdOrPhone)}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ newPassword: finalPassword })
        });

        if (putRes.ok) {
          const putData = await putRes.json().catch(() => ({}));
          return {
            message: putData.message || putData.Message || 'Password updated successfully.',
            newPassword: putData.newPassword || finalPassword
          };
        }
      }

      const msg = await extractErrorMessage(res, 'Failed to reset password');
      throw new Error(msg);
    } catch (err: any) {
      if (err.message && err.message.includes('403') && user?.role === 'Admin') {
        try {
          const putRes = await fetch(`${API_BASE_URL}/Users/${encodeURIComponent(userIdOrPhone)}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ newPassword: finalPassword })
          });

          if (putRes.ok) {
            const putData = await putRes.json().catch(() => ({}));
            return {
              message: putData.message || putData.Message || 'Password updated successfully.',
              newPassword: putData.newPassword || finalPassword
            };
          }
        } catch {}
      }
      throw err;
    }
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
      const msg = await extractErrorMessage(res, 'Failed to load coordinators');
      console.error('[adminApi.getManagedUsers] Request failed:', msg);
      throw new Error(msg);
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
      kitsCollected: Number(u.kitsCollected ?? u.KitsCollected ?? 0),
      totalAmount: Number(u.totalAmount ?? u.TotalAmount ?? u.collectedAmount ?? u.CollectedAmount ?? 0),
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
      const msg = await extractErrorMessage(res, 'Failed to create user');
      throw new Error(msg);
    }

    const created = await res.json();

    return {
      userId: created.userId || created.UserId || `mng-${Date.now()}`,
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
      const msg = await extractErrorMessage(res, 'Failed to update target');
      throw new Error(msg);
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
      const msg = await extractErrorMessage(res, 'Failed to update user');
      throw new Error(msg);
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
    const res = await usersApi.resetPassword(userId, newPassword);
    return res.newPassword;
  },

  // Deactivate or remove a user (DELETE /api/Users/{userId})
  deleteManagedUser: async (userId: string): Promise<boolean> => {
    const token = getCurrentUser()?.token;
    const res = await fetch(`${API_BASE_URL}/Users/${userId}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });

    if (!res.ok) {
      const msg = await extractErrorMessage(res, 'Failed to delete user');
      throw new Error(msg);
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
    console.log(token);
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
    try {
      console.log('[coordinatorApi.getMyVolunteers] Calling GET /Users/volunteers. Token present:', !!token);
      const res = await fetch(`${API_BASE_URL}/Users/volunteers`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      console.log('[coordinatorApi.getMyVolunteers] Status:', res.status, res.statusText);

      if (!res.ok) {
        console.warn('[coordinatorApi.getMyVolunteers] Request rejected with status:', res.status);
        return [];
      }

      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.warn('[coordinatorApi.getMyVolunteers] Fetch failed (network or server error):', err);
      return [];
    }
  }
};

// ============================================================================
// Sponsorships API (Live Azure Backend & Corporate Ledger)
// ============================================================================

const STORAGE_SPONSORSHIPS = 'charity_sponsorships';

export const DEFAULT_SPONSORSHIP_ITEMS: SponsorshipItem[] = [
  {
    itemId: 'ITEM-001',
    name: 'Family Food Relief Kit Pack',
    itemPrice: 5000,
    description: 'Essential 1-month comprehensive food & nutrition ration pack for a distressed family.',
    isActive: true,
    displayOrder: 1
  },
  {
    itemId: 'ITEM-002',
    name: 'Student Education Kit Support',
    itemPrice: 2500,
    description: 'Annual educational support kit with school bags, notebooks, and study essentials.',
    isActive: true,
    displayOrder: 2
  },
  {
    itemId: 'ITEM-003',
    name: 'Chronic Illness Medical Care Pack',
    itemPrice: 10000,
    description: 'Vital critical medicines, diabetic care, and emergency prescription support.',
    isActive: true,
    displayOrder: 3
  },
  {
    itemId: 'ITEM-004',
    name: 'Ramadan Family Relief Care',
    itemPrice: 7500,
    description: 'Special seasonal food hamper, clothing assistance, and festive provisions.',
    isActive: true,
    displayOrder: 4
  }
];

function getStoredSponsorships(): SponsorshipRecord[] {
  const data = localStorage.getItem(STORAGE_SPONSORSHIPS);
  if (data) {
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  }
  return [];
}

function saveStoredSponsorships(records: SponsorshipRecord[]) {
  localStorage.setItem(STORAGE_SPONSORSHIPS, JSON.stringify(records));
}

export const sponsorshipsApi = {
  // 1. Get Catalog Items (GET /api/Sponsorships/items)
  getItems: async (panchayath = 'Madavoor'): Promise<SponsorshipItem[]> => {
    try {
      const res = await fetch(`${API_BASE_URL}/Sponsorships/items?panchayath=${encodeURIComponent(panchayath)}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return data;
        }
      }
    } catch (err) {
      console.warn('Could not fetch catalog items from server:', err);
    }
    return DEFAULT_SPONSORSHIP_ITEMS;
  },

  // 2. Accept New Corporate Sponsorship (POST /api/Sponsorships)
  acceptSponsorship: async (payload: CreateSponsorshipPayload): Promise<SponsorshipRecord> => {
    const user = getCurrentUser();
    const token = user?.token;

    const cleanPhone = payload.mobileNumber.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('91') ? `+${cleanPhone}` : `+91${cleanPhone.slice(-10)}`;

    const res = await fetch(`${API_BASE_URL}/Sponsorships`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        donorName: payload.donorName.trim(),
        contactPerson: payload.contactPerson?.trim() || '',
        mobileNumber: formattedPhone,
        itemId: payload.itemId,
        quantity: Math.max(1, Math.floor(Number(payload.quantity) || 1)),
        paymentOption: payload.paymentOption,
        initialAmountPaid: payload.initialAmountPaid !== undefined ? Number(payload.initialAmountPaid) : undefined,
        paymentMode: payload.paymentMode || 'Cash',
        transactionReference: payload.transactionReference?.trim() || '',
        notes: payload.notes?.trim() || ''
      })
    });

    if (!res.ok) {
      const msg = await extractErrorMessage(res, 'Failed to record sponsorship');
      throw new Error(msg);
    }

    const created: SponsorshipRecord = await res.json();

    // Cache in local session stream
    const stored = getStoredSponsorships();
    saveStoredSponsorships([created, ...stored.filter(s => s.receiptToken !== created.receiptToken)]);

    return created;
  },

  // 3. List Sponsorships by Status / Hierarchy (GET /api/Sponsorships)
  getSponsorships: async (status?: string): Promise<SponsorshipRecord[]> => {
    const token = getCurrentUser()?.token;
    if (token) {
      try {
        const url = status 
          ? `${API_BASE_URL}/Sponsorships?status=${encodeURIComponent(status)}`
          : `${API_BASE_URL}/Sponsorships`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            // Save fresh copy
            saveStoredSponsorships(data);
            return data;
          }
        }
      } catch (err) {
        console.warn('Could not fetch sponsorships from server:', err);
      }
    }

    // Fallback to local session storage
    const all = getStoredSponsorships();
    if (status) {
      return all.filter(s => s.paymentStatus.toLowerCase() === status.toLowerCase());
    }
    return all;
  },

  // 4. Update Payment for Outstanding Balance (POST /api/Sponsorships/{receiptToken}/payments)
  updatePayment: async (
    receiptToken: string,
    payload: UpdatePaymentPayload,
    panchayath = 'Madavoor'
  ): Promise<SponsorshipRecord> => {
    const token = getCurrentUser()?.token;

    const res = await fetch(`${API_BASE_URL}/Sponsorships/${encodeURIComponent(receiptToken)}/payments?panchayath=${encodeURIComponent(panchayath)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        amountToPay: Number(payload.amountToPay),
        paymentMode: payload.paymentMode || 'Cash',
        transactionReference: payload.transactionReference?.trim() || '',
        notes: payload.notes?.trim() || ''
      })
    });

    if (!res.ok) {
      const msg = await extractErrorMessage(res, 'Failed to update payment');
      throw new Error(msg);
    }

    const updated: SponsorshipRecord = await res.json();

    // Update local store
    const stored = getStoredSponsorships();
    saveStoredSponsorships(stored.map(s => s.receiptToken === receiptToken ? updated : s));

    return updated;
  },

  // 5. Dedicated Sponsorship Leaderboard (GET /api/Sponsorships/leaderboard)
  getLeaderboard: async (): Promise<SponsorshipLeaderboardResponse> => {
    const token = getCurrentUser()?.token;
    try {
      const res = await fetch(`${API_BASE_URL}/Sponsorships/leaderboard`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (res.ok) {
        const data = await res.json();
        return data;
      }
    } catch (err) {
      console.warn('Failed to load corporate leaderboard:', err);
    }

    // Fallback empty leaderboard response
    const stored = getStoredSponsorships();
    const totalCommitted = stored.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
    const totalPaid = stored.reduce((acc, s) => acc + (s.amountPaid || 0), 0);
    const totalBalance = stored.reduce((acc, s) => acc + (s.balanceAmount || 0), 0);

    return {
      topCollectors: [],
      topWards: [],
      topSponsoringFirms: stored.map((s, idx) => ({
        position: idx + 1,
        firmName: s.donorName,
        contactPerson: s.contactPerson || '',
        mobileNumber: s.mobileNumber,
        itemName: s.itemName,
        quantity: s.quantity,
        totalAmount: s.totalAmount,
        amountPaid: s.amountPaid,
        balanceAmount: s.balanceAmount,
        paymentStatus: s.paymentStatus,
        collectedByName: s.collectedByName,
        date: s.createdDate
      })),
      summary: {
        totalSponsorships: stored.length,
        totalCommittedAmount: totalCommitted,
        totalPaidAmount: totalPaid,
        totalPendingBalance: totalBalance,
        completedCount: stored.filter(s => s.paymentStatus === 'Completed').length,
        partialCount: stored.filter(s => s.paymentStatus === 'Partial').length,
        bookedCount: stored.filter(s => s.paymentStatus === 'Booked').length
      },
      generatedAt: new Date().toISOString()
    };
  }
};

