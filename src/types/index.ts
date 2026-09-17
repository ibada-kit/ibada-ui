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
  totalAmount?: number;
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

export interface WardOption {
  wardNumber: number;
  wardName: string;
  panchayath: string;
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

export interface UpdateManagedUserRequest {
  fullName?: string;
  phoneNumber?: string;
  role?: ManagedUserRole;
  wardNumber?: number;
  panchayath?: string;
  district?: string;
  targetKits?: number;
  newPassword?: string;
  isActive?: boolean;
}

// ============================================================================
// Corporate & Organization Sponsorship Contracts
// ============================================================================

export interface SponsorshipItem {
  itemId: string;
  name: string;
  itemPrice: number;
  description: string;
  isActive: boolean;
  displayOrder: number;
  updateDate?: string;
  updatedBy?: string;
}

export type PaymentOption = 'PayFull' | 'Book' | 'Advance';
export type PaymentStatus = 'Completed' | 'Partial' | 'Booked';
export type PaymentMode = 'Cash' | 'UPI' | 'BankTransfer' | 'Cheque';

export interface CreateSponsorshipPayload {
  donorName: string;            // Name of firm / organization
  contactPerson?: string;       // Representative name
  mobileNumber: string;         // WhatsApp / Phone
  itemId: string;               // Selected catalog item
  quantity: number;             // Stepper integer >= 1
  paymentOption: PaymentOption; // 'PayFull' | 'Book' | 'Advance'
  initialAmountPaid?: number;   // Required if 'Advance', optional if 'Book'
  paymentMode?: PaymentMode;    // Default: 'Cash'
  transactionReference?: string;
  notes?: string;
}

export interface SponsorshipRecord {
  sponsorshipId: string;
  receiptToken: string;
  donorName: string;
  contactPerson: string;
  mobileNumber: string;
  itemId: string;
  itemName: string;
  itemPrice: number;
  quantity: number;
  totalAmount: number;
  paymentOption: PaymentOption;
  amountPaid: number;
  balanceAmount: number;
  paymentStatus: PaymentStatus;
  paymentMode: PaymentMode | string;
  transactionReference: string;
  panchayath: string;
  wardNumber: number;
  collectedByUserId: string;
  collectedByName: string;
  collectedByRole: string;
  parentUserId?: string;
  notes: string;
  createdDate: string;
  updateDate: string;
  updatedBy: string;
}

export interface UpdatePaymentPayload {
  amountToPay: number;
  paymentMode?: PaymentMode;
  transactionReference?: string;
  notes?: string;
}

export interface SponsorshipCollectorRank {
  position: number;
  userId: string;
  name: string;
  role: string;
  wardNumber: number;
  panchayath: string;
  sponsorshipCount: number;
  totalCommittedAmount: number;
  totalPaidAmount: number;
  balanceAmount: number;
  rankBadge: 'Gold' | 'Silver' | 'Bronze' | 'Contributor';
}

export interface SponsorshipWardRank {
  position: number;
  wardNumber: number;
  wardName: string;
  sponsorshipCount: number;
  totalCommittedAmount: number;
  totalPaidAmount: number;
  rankBadge: 'Gold' | 'Silver' | 'Bronze' | 'Contributor';
}

export interface TopSponsoringFirm {
  position: number;
  firmName: string;
  contactPerson: string;
  mobileNumber: string;
  itemName: string;
  quantity: number;
  totalAmount: number;
  amountPaid: number;
  balanceAmount: number;
  paymentStatus: PaymentStatus;
  collectedByName: string;
  date: string;
}

export interface SponsorshipSummaryStats {
  totalSponsorships: number;
  totalCommittedAmount: number;
  totalPaidAmount: number;
  totalPendingBalance: number;
  completedCount: number;
  partialCount: number;
  bookedCount: number;
}

export interface SponsorshipLeaderboardResponse {
  topCollectors: SponsorshipCollectorRank[];
  topWards: SponsorshipWardRank[];
  topSponsoringFirms: TopSponsoringFirm[];
  summary: SponsorshipSummaryStats;
  generatedAt: string;
}

