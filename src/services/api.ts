import type {
  User,
  UserRole,
  SendOtpResponse,
  LoginResponse,
  Donation,
  CreateDonationRequest,
  WeeklyMetrics,
  LeaderboardEntry,
  WardLeaderboardEntry,
  ManagedUser,
  CreateManagedUserRequest
} from '../types';
import {
  DEMO_USERS,
  INITIAL_WEEKLY_METRICS,
  INITIAL_VOLUNTEER_LEADERBOARD,
  INITIAL_WARD_LEADERBOARD,
  INITIAL_DONATIONS,
  INITIAL_MANAGED_USERS,
  KIT_UNIT_RATE
} from './mockData';

// Configurable via Vite environment variables
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://charity-api.azurewebsites.net/api';
const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'; // Default to mock until Azure backend is connected

// Local Storage Keys
const STORAGE_USER = 'charity_user';
const STORAGE_METRICS = 'charity_weekly_metrics';
const STORAGE_LEADERBOARD = 'charity_leaderboard';
const STORAGE_WARD_LEADERBOARD = 'charity_ward_leaderboard';
const STORAGE_DONATIONS = 'charity_donations';
const STORAGE_MANAGED_USERS = 'charity_managed_users';

// Initialize mock storage if not already present
function getStoredManagedUsers(): ManagedUser[] {
  const data = localStorage.getItem(STORAGE_MANAGED_USERS);
  if (data) {
    try {
      return JSON.parse(data);
    } catch {
      // ignore
    }
  }
  localStorage.setItem(STORAGE_MANAGED_USERS, JSON.stringify(INITIAL_MANAGED_USERS));
  return INITIAL_MANAGED_USERS;
}

// Initialize mock storage if not already present
function getStoredMetrics(): WeeklyMetrics {
  const data = localStorage.getItem(STORAGE_METRICS);
  if (data) {
    try {
      return JSON.parse(data);
    } catch {
      // ignore
    }
  }
  localStorage.setItem(STORAGE_METRICS, JSON.stringify(INITIAL_WEEKLY_METRICS));
  return INITIAL_WEEKLY_METRICS;
}

function getStoredLeaderboard(): LeaderboardEntry[] {
  const data = localStorage.getItem(STORAGE_LEADERBOARD);
  if (data) {
    try {
      return JSON.parse(data);
    } catch {
      // ignore
    }
  }
  localStorage.setItem(STORAGE_LEADERBOARD, JSON.stringify(INITIAL_VOLUNTEER_LEADERBOARD));
  return INITIAL_VOLUNTEER_LEADERBOARD;
}

function getStoredWardLeaderboard(): WardLeaderboardEntry[] {
  const data = localStorage.getItem(STORAGE_WARD_LEADERBOARD);
  if (data) {
    try {
      return JSON.parse(data);
    } catch {
      // ignore
    }
  }
  localStorage.setItem(STORAGE_WARD_LEADERBOARD, JSON.stringify(INITIAL_WARD_LEADERBOARD));
  return INITIAL_WARD_LEADERBOARD;
}

function getStoredDonations(): Donation[] {
  const data = localStorage.getItem(STORAGE_DONATIONS);
  if (data) {
    try {
      return JSON.parse(data);
    } catch {
      // ignore
    }
  }
  localStorage.setItem(STORAGE_DONATIONS, JSON.stringify(INITIAL_DONATIONS));
  return INITIAL_DONATIONS;
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

// Simulated network delay
const delay = (ms: number = 400) => new Promise((resolve) => setTimeout(resolve, ms));

// Auth API
export const authApi = {
  // Step 1: Send OTP to WhatsApp
  sendOtp: async (phoneNumber: string): Promise<SendOtpResponse> => {
    if (USE_MOCK) {
      await delay(600);
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      if (cleanPhone.length < 10) {
        throw new Error('Please enter a valid 10-digit phone number');
      }
      return {
        success: true,
        message: `OTP sent to +91 ${cleanPhone.slice(-10)} via WhatsApp. Demo OTP is 123456.`,
        expiresInSeconds: 300
      };
    }

    const res = await fetch(`${API_BASE_URL}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Failed to send OTP' }));
      throw new Error(err.message || 'Failed to send OTP');
    }
    return res.json();
  },

  // Step 2: Verify OTP and return session token
  verifyOtp: async (phoneNumber: string, otpCode: string): Promise<LoginResponse> => {
    if (USE_MOCK) {
      await delay(700);
      const cleanPhone = phoneNumber.replace(/\D/g, '');

      // Demo OTP check
      if (otpCode !== '123456') {
        throw new Error('Invalid OTP code. For demo testing, please use 123456.');
      }

      // Check if matches known demo user or managed user or auto-create a Volunteer profile
      const managedUsers = getStoredManagedUsers();
      const matchedManaged = managedUsers.find((u) => u.phoneNumber.replace(/\D/g, '').endsWith(cleanPhone.slice(-10)));
      const matchedDemo = DEMO_USERS.find((u) => u.phoneNumber.endsWith(cleanPhone.slice(-10)));

      let user: User;
      if (matchedManaged) {
        user = {
          userId: matchedManaged.userId,
          fullName: matchedManaged.fullName,
          phoneNumber: matchedManaged.phoneNumber,
          role: matchedManaged.role,
          panchayath: matchedManaged.panchayath,
          wardNumber: matchedManaged.wardNumber,
          district: matchedManaged.district || 'Kozhikode',
          token: `jwt-mock-${matchedManaged.userId}`,
          expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString()
        };
      } else if (matchedDemo) {
        user = matchedDemo;
      } else {
        user = {
          userId: `usr-${Date.now()}`,
          fullName: 'Community Volunteer',
          phoneNumber: cleanPhone.slice(-10),
          role: 'Volunteer',
          panchayath: 'Madavoor',
          wardNumber: 4,
          district: 'Kozhikode',
          token: `jwt-mock-${Date.now()}`,
          expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString()
        };
      }

      setCurrentUser(user);

      return {
        token: user.token || 'mock-token',
        role: user.role,
        fullName: user.fullName,
        panchayath: user.panchayath,
        wardNumber: user.wardNumber,
        expiresAt: user.expiresAt || new Date().toISOString()
      };
    }

    const res = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber, otpCode })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Verification failed' }));
      throw new Error(err.message || 'Invalid OTP code');
    }
    const data: LoginResponse = await res.json();
    return data;
  },

  logout: async () => {
    setCurrentUser(null);
  }
};

// Donations & Metrics API
export const donationsApi = {
  // Get Weekly Metrics
  getWeeklyMetrics: async (): Promise<WeeklyMetrics> => {
    if (USE_MOCK) {
      await delay(300);
      return getStoredMetrics();
    }

    const token = getCurrentUser()?.token;
    const res = await fetch(`${API_BASE_URL}/donations/weekly-metrics`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!res.ok) throw new Error('Failed to load weekly metrics');
    return res.json();
  },

  // Get Volunteer Leaderboard with Role-Based Scope
  getVolunteerLeaderboard: async (userRole?: UserRole): Promise<LeaderboardEntry[]> => {
    if (USE_MOCK) {
      await delay(300);
      const allEntries = getStoredLeaderboard();
      const role = userRole || getCurrentUser()?.role || 'Volunteer';

      let filtered: LeaderboardEntry[];
      if (role === 'Admin') {
        // Admin can see coordinators and volunteers data
        filtered = [...allEntries];
      } else if (role === 'Coordinator') {
        // Coordinators can see volunteers data
        filtered = allEntries.filter((e) => e.role === 'Volunteer');
      } else {
        // Volunteers can see only other volunteers data
        filtered = allEntries.filter((e) => e.role === 'Volunteer');
      }

      // Re-assign sequential ranks according to the filtered list
      return filtered.map((item, idx) => ({
        ...item,
        rank: idx + 1
      }));
    }

    const token = getCurrentUser()?.token;
    const res = await fetch(`${API_BASE_URL}/donations/leaderboard/volunteers`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!res.ok) throw new Error('Failed to load volunteer leaderboard');
    return res.json();
  },

  // Get Ward Leaderboard
  getWardLeaderboard: async (): Promise<WardLeaderboardEntry[]> => {
    if (USE_MOCK) {
      await delay(300);
      return getStoredWardLeaderboard();
    }

    const token = getCurrentUser()?.token;
    const res = await fetch(`${API_BASE_URL}/donations/leaderboard/wards`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!res.ok) throw new Error('Failed to load ward leaderboard');
    return res.json();
  },

  // Get Recent Donations with Role-Based Scope
  getRecentDonations: async (userRole?: UserRole): Promise<Donation[]> => {
    if (USE_MOCK) {
      await delay(200);
      const allDonations = getStoredDonations();
      const role = userRole || getCurrentUser()?.role || 'Volunteer';

      if (role === 'Admin') {
        // Admin can see both coordinators and volunteers data
        return allDonations;
      } else if (role === 'Coordinator') {
        // Coordinators can see volunteers data
        return allDonations.filter((d) => d.collectedByRole === 'Volunteer' || !d.collectedByRole);
      } else {
        // Volunteers can see only other volunteers data
        return allDonations.filter((d) => d.collectedByRole === 'Volunteer' || !d.collectedByRole);
      }
    }

    const token = getCurrentUser()?.token;
    const res = await fetch(`${API_BASE_URL}/donations/recent`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!res.ok) throw new Error('Failed to load recent donations');
    return res.json();
  },

  // Record a New Donation
  recordDonation: async (request: CreateDonationRequest): Promise<Donation> => {
    const currentUser = getCurrentUser();
    if (USE_MOCK) {
      await delay(500);
      const randomHex = Math.random().toString(16).substring(2, 10).toUpperCase();
      const receiptToken = `MDV-${randomHex}`;
      const kitCount = Number(request.kitCount);
      const totalAmount = kitCount * KIT_UNIT_RATE;

      const newDonation: Donation = {
        donationId: `don-${Date.now()}`,
        receiptToken,
        donorName: request.donorName,
        whatsAppNumber: request.whatsAppNumber,
        kitCount,
        kitUnitRate: KIT_UNIT_RATE,
        totalAmount,
        panchayath: currentUser?.panchayath || 'Madavoor',
        wardNumber: currentUser?.wardNumber || 4,
        collectedByUserId: currentUser?.userId || 'usr-guest',
        collectedByName: currentUser?.fullName || 'Volunteer',
        collectedByRole: currentUser?.role || 'Volunteer',
        timestamp: new Date().toISOString()
      };

      // 1. Update donations stream
      const donations = [newDonation, ...getStoredDonations()];
      localStorage.setItem(STORAGE_DONATIONS, JSON.stringify(donations));

      // 2. Update weekly metrics
      const metrics = getStoredMetrics();
      metrics.totalKits += kitCount;
      metrics.totalAmount += totalAmount;
      metrics.donorsCount += 1;
      const todayIndex = 4; // Friday
      if (metrics.dailyBreakdown[todayIndex]) {
        metrics.dailyBreakdown[todayIndex].kits += kitCount;
        metrics.dailyBreakdown[todayIndex].amount += totalAmount;
      }
      localStorage.setItem(STORAGE_METRICS, JSON.stringify(metrics));

      // 3. Update volunteer leaderboard
      const leaderboard = getStoredLeaderboard();
      const volunteer = leaderboard.find(
        (v) => v.name.toLowerCase() === (currentUser?.fullName || '').toLowerCase()
      );
      if (volunteer) {
        volunteer.kitsCollected += kitCount;
        volunteer.totalAmount += totalAmount;
        volunteer.donationsCount += 1;
      } else if (currentUser) {
        leaderboard.push({
          id: currentUser.userId,
          name: currentUser.fullName,
          role: currentUser.role,
          wardNumber: currentUser.wardNumber,
          panchayath: currentUser.panchayath,
          kitsCollected: kitCount,
          totalAmount: totalAmount,
          donationsCount: 1,
          rank: leaderboard.length + 1
        });
      }
      // Re-sort leaderboard
      leaderboard.sort((a, b) => b.kitsCollected - a.kitsCollected);
      leaderboard.forEach((item, index) => {
        item.rank = index + 1;
      });
      localStorage.setItem(STORAGE_LEADERBOARD, JSON.stringify(leaderboard));

      // 4. Update ward leaderboard
      const wardBoard = getStoredWardLeaderboard();
      const ward = wardBoard.find((w) => w.wardNumber === (currentUser?.wardNumber || 4));
      if (ward) {
        ward.kitsCollected += kitCount;
        ward.totalAmount += totalAmount;
        ward.progressPercentage = Math.min(100, Math.round((ward.kitsCollected / ward.targetKits) * 1000) / 10);
      }
      wardBoard.sort((a, b) => b.kitsCollected - a.kitsCollected);
      wardBoard.forEach((w, i) => {
        w.rank = i + 1;
      });
      localStorage.setItem(STORAGE_WARD_LEADERBOARD, JSON.stringify(wardBoard));

      // 5. Update managed users if collected by a Coordinator or WardCommittee member
      const managedList = getStoredManagedUsers();
      const mIndex = managedList.findIndex(
        (m) => m.userId === currentUser?.userId || m.fullName.toLowerCase() === (currentUser?.fullName || '').toLowerCase()
      );
      if (mIndex !== -1) {
        managedList[mIndex].kitsCollected += kitCount;
        managedList[mIndex].totalAmount += totalAmount;
        managedList[mIndex].donationsCount += 1;
        localStorage.setItem(STORAGE_MANAGED_USERS, JSON.stringify(managedList));
      }

      return newDonation;
    }

    const token = currentUser?.token;
    const res = await fetch(`${API_BASE_URL}/donations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(request)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Failed to record donation' }));
      throw new Error(err.message || 'Failed to record donation');
    }
    return res.json();
  },

  // Public Receipt Viewer
  getPublicReceipt: async (token: string) => {
    if (USE_MOCK) {
      await delay(300);
      const donations = getStoredDonations();
      const found = donations.find((d) => d.receiptToken.toUpperCase() === token.toUpperCase());
      if (!found) throw new Error('Receipt not found');
      return found;
    }

    const res = await fetch(`${API_BASE_URL}/donations/receipt/${token}`);
    if (!res.ok) throw new Error('Receipt not found');
    return res.json();
  }
};

// Admin API: Management of Ward Committee and Coordinator users only
export const adminApi = {
  // Get managed users (Ward Committee & Coordinator ONLY, volunteers excluded)
  getManagedUsers: async (): Promise<ManagedUser[]> => {
    if (USE_MOCK) {
      await delay(250);
      const all = getStoredManagedUsers();
      // Enforce: only WardCommittee and Coordinator, never Volunteer
      return all.filter((u) => u.role === 'WardCommittee' || u.role === 'Coordinator');
    }

    const token = getCurrentUser()?.token;
    const res = await fetch(`${API_BASE_URL}/admin/managed-users`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!res.ok) throw new Error('Failed to load managed users');
    return res.json();
  },

  // Create a new Ward Committee or Coordinator user
  createManagedUser: async (data: CreateManagedUserRequest): Promise<ManagedUser> => {
    if (USE_MOCK) {
      await delay(350);
      const users = getStoredManagedUsers();
      const cleanPhone = data.phoneNumber.replace(/\D/g, '');

      if (!cleanPhone || cleanPhone.length < 10) {
        throw new Error('Please enter a valid 10-digit mobile number.');
      }
      if (!data.fullName.trim()) {
        throw new Error('User full name is required.');
      }

      // Check duplicate phone
      const exists = users.find((u) => u.phoneNumber.replace(/\D/g, '').endsWith(cleanPhone.slice(-10)));
      if (exists) {
        throw new Error(`A member with phone number +91 ${cleanPhone.slice(-10)} already exists (${exists.fullName} - ${exists.role}).`);
      }

      const target = Number(data.targetKits) > 0 ? Number(data.targetKits) : 50;

      const newUser: ManagedUser = {
        userId: `mng-${Date.now()}`,
        fullName: data.fullName.trim(),
        phoneNumber: cleanPhone.slice(-10),
        role: data.role,
        wardNumber: Number(data.wardNumber),
        panchayath: data.panchayath || 'Madavoor',
        district: data.district || 'Kozhikode',
        targetKits: target,
        kitsCollected: 0,
        totalAmount: 0,
        donationsCount: 0,
        createdAt: new Date().toISOString()
      };

      const updated = [newUser, ...users];
      localStorage.setItem(STORAGE_MANAGED_USERS, JSON.stringify(updated));
      return newUser;
    }

    const token = getCurrentUser()?.token;
    const res = await fetch(`${API_BASE_URL}/admin/managed-users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Failed to create user' }));
      throw new Error(err.message || 'Failed to create user');
    }
    return res.json();
  },

  // Set target for a user
  updateUserTarget: async (userId: string, targetKits: number): Promise<ManagedUser> => {
    if (USE_MOCK) {
      await delay(250);
      const users = getStoredManagedUsers();
      const idx = users.findIndex((u) => u.userId === userId);
      if (idx === -1) {
        throw new Error('User not found.');
      }

      const validTarget = Math.max(1, Math.round(Number(targetKits) || 1));
      users[idx].targetKits = validTarget;
      localStorage.setItem(STORAGE_MANAGED_USERS, JSON.stringify(users));
      return users[idx];
    }

    const token = getCurrentUser()?.token;
    const res = await fetch(`${API_BASE_URL}/admin/managed-users/${userId}/target`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ targetKits })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Failed to update target' }));
      throw new Error(err.message || 'Failed to update target');
    }
    return res.json();
  },

  // Delete a managed user
  deleteManagedUser: async (userId: string): Promise<boolean> => {
    if (USE_MOCK) {
      await delay(250);
      const users = getStoredManagedUsers();
      const filtered = users.filter((u) => u.userId !== userId);
      localStorage.setItem(STORAGE_MANAGED_USERS, JSON.stringify(filtered));
      return true;
    }

    const token = getCurrentUser()?.token;
    const res = await fetch(`${API_BASE_URL}/admin/managed-users/${userId}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Failed to delete user' }));
      throw new Error(err.message || 'Failed to delete user');
    }
    return true;
  }
};
