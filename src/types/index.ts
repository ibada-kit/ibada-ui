export type UserRole = 'Admin' | 'WardCommittee' | 'Coordinator' | 'Volunteer';

export interface User {
  userId: string;
  fullName: string;
  phoneNumber: string;
  role: UserRole;
  panchayath: string;
  wardNumber: number;
  district?: string;
  token?: string;
  expiresAt?: string;
}

export interface SendOtpRequest {
  phoneNumber: string;
}

export interface SendOtpResponse {
  success: boolean;
  message: string;
  expiresInSeconds: number;
}

export interface VerifyOtpRequest {
  phoneNumber: string;
  otpCode: string;
}

export interface LoginResponse {
  token: string;
  role: UserRole;
  fullName: string;
  panchayath: string;
  wardNumber: number;
  expiresAt: string;
}

export interface Donation {
  donationId: string;
  receiptToken: string;
  donorName: string;
  whatsAppNumber: string;
  kitCount: number;
  kitUnitRate: number;
  totalAmount: number;
  panchayath: string;
  wardNumber: number;
  collectedByUserId: string;
  collectedByName?: string;
  collectedByRole?: UserRole;
  timestamp: string;
}

export interface CreateDonationRequest {
  donorName: string;
  whatsAppNumber: string;
  kitCount: number;
}

export interface WeeklyMetrics {
  totalAmount: number;
  totalKits: number;
  targetKits: number;
  targetAmount: number;
  donorsCount: number;
  growthPercentage: number;
  dailyBreakdown: {
    day: string;
    kits: number;
    amount: number;
  }[];
  startDate: string;
  endDate: string;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  role: UserRole;
  wardNumber: number;
  panchayath: string;
  kitsCollected: number;
  totalAmount: number;
  donationsCount: number;
  targetKits?: number;
  rank: number;
  avatarUrl?: string;
}

export interface WardLeaderboardEntry {
  wardNumber: number;
  wardName: string;
  kitsCollected: number;
  totalAmount: number;
  targetKits: number;
  progressPercentage: number;
  volunteerCount: number;
  rank: number;
}

export type ManagedUserRole = 'WardCommittee' | 'Coordinator';

export interface ManagedUser {
  userId: string;
  fullName: string;
  phoneNumber: string;
  role: ManagedUserRole;
  panchayath: string;
  wardNumber: number;
  district?: string;
  targetKits: number;
  kitsCollected: number;
  totalAmount: number;
  donationsCount: number;
  createdAt: string;
}

export interface CreateManagedUserRequest {
  fullName: string;
  phoneNumber: string;
  role: ManagedUserRole;
  wardNumber: number;
  panchayath?: string;
  district?: string;
  targetKits: number;
  defaultPassword?: string;
}
