import type { User, WeeklyMetrics, LeaderboardEntry, WardLeaderboardEntry, Donation } from '../types';

export const KIT_UNIT_RATE = 500;

export const DEMO_USERS: User[] = [
  {
    userId: 'usr-001',
    fullName: 'Shabeer Rahman',
    phoneNumber: '9847123456',
    role: 'Volunteer',
    panchayath: 'Madavoor',
    wardNumber: 4,
    district: 'Kozhikode',
    token: 'mock-jwt-token-shabeer',
    expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString()
  },
  {
    userId: 'usr-002',
    fullName: 'Anas Madavoor',
    phoneNumber: '9895098765',
    role: 'Coordinator',
    panchayath: 'Madavoor',
    wardNumber: 7,
    district: 'Kozhikode',
    token: 'mock-jwt-token-anas',
    expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString()
  },
  {
    userId: 'usr-003',
    fullName: 'Fasalu Deen',
    phoneNumber: '9744112233',
    role: 'Admin',
    panchayath: 'Madavoor',
    wardNumber: 1,
    district: 'Kozhikode',
    token: 'mock-jwt-token-admin',
    expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString()
  }
];

export const INITIAL_WEEKLY_METRICS: WeeklyMetrics = {
  totalKits: 497,
  totalAmount: 497 * KIT_UNIT_RATE, // ₹248,500
  targetKits: 600,
  targetAmount: 600 * KIT_UNIT_RATE, // ₹300,000
  donorsCount: 168,
  growthPercentage: 24.5,
  dailyBreakdown: [
    { day: 'Mon', kits: 54, amount: 54 * KIT_UNIT_RATE },
    { day: 'Tue', kits: 68, amount: 68 * KIT_UNIT_RATE },
    { day: 'Wed', kits: 85, amount: 85 * KIT_UNIT_RATE },
    { day: 'Thu', kits: 72, amount: 72 * KIT_UNIT_RATE },
    { day: 'Fri', kits: 110, amount: 110 * KIT_UNIT_RATE },
    { day: 'Sat', kits: 63, amount: 63 * KIT_UNIT_RATE },
    { day: 'Sun', kits: 45, amount: 45 * KIT_UNIT_RATE },
  ],
  startDate: 'Mon, 1 Sep',
  endDate: 'Sun, 7 Sep'
};

export const INITIAL_VOLUNTEER_LEADERBOARD: LeaderboardEntry[] = [
  {
    id: 'vol-1',
    name: 'Shabeer Rahman',
    role: 'Volunteer',
    wardNumber: 4,
    panchayath: 'Madavoor',
    kitsCollected: 84,
    totalAmount: 84 * KIT_UNIT_RATE,
    donationsCount: 29,
    rank: 1
  },
  {
    id: 'vol-2',
    name: 'Anas K.P.',
    role: 'Coordinator',
    wardNumber: 7,
    panchayath: 'Madavoor',
    kitsCollected: 76,
    totalAmount: 76 * KIT_UNIT_RATE,
    donationsCount: 24,
    rank: 2
  },
  {
    id: 'vol-3',
    name: 'Muhammed Nihal',
    role: 'Volunteer',
    wardNumber: 4,
    panchayath: 'Madavoor',
    kitsCollected: 62,
    totalAmount: 62 * KIT_UNIT_RATE,
    donationsCount: 21,
    rank: 3
  },
  {
    id: 'vol-4',
    name: 'Jaseel Pulikkal',
    role: 'Volunteer',
    wardNumber: 2,
    panchayath: 'Madavoor',
    kitsCollected: 51,
    totalAmount: 51 * KIT_UNIT_RATE,
    donationsCount: 18,
    rank: 4
  },
  {
    id: 'vol-5',
    name: 'Suhail Chelannur',
    role: 'Volunteer',
    wardNumber: 9,
    panchayath: 'Madavoor',
    kitsCollected: 48,
    totalAmount: 48 * KIT_UNIT_RATE,
    donationsCount: 15,
    rank: 5
  },
  {
    id: 'vol-6',
    name: 'Rashid Parambil',
    role: 'Volunteer',
    wardNumber: 5,
    panchayath: 'Madavoor',
    kitsCollected: 42,
    totalAmount: 42 * KIT_UNIT_RATE,
    donationsCount: 14,
    rank: 6
  },
  {
    id: 'vol-7',
    name: 'Basheer C.K.',
    role: 'Coordinator',
    wardNumber: 11,
    panchayath: 'Madavoor',
    kitsCollected: 39,
    totalAmount: 39 * KIT_UNIT_RATE,
    donationsCount: 13,
    rank: 7
  },
  {
    id: 'vol-8',
    name: 'Nawaf Madavoor',
    role: 'Volunteer',
    wardNumber: 3,
    panchayath: 'Madavoor',
    kitsCollected: 35,
    totalAmount: 35 * KIT_UNIT_RATE,
    donationsCount: 12,
    rank: 8
  }
];

export const INITIAL_WARD_LEADERBOARD: WardLeaderboardEntry[] = [
  {
    wardNumber: 4,
    wardName: 'Kakkad North',
    kitsCollected: 146,
    totalAmount: 146 * KIT_UNIT_RATE,
    targetKits: 150,
    progressPercentage: 97.3,
    volunteerCount: 8,
    rank: 1
  },
  {
    wardNumber: 7,
    wardName: 'Palath Center',
    kitsCollected: 118,
    totalAmount: 118 * KIT_UNIT_RATE,
    targetKits: 130,
    progressPercentage: 90.7,
    volunteerCount: 6,
    rank: 2
  },
  {
    wardNumber: 2,
    wardName: 'Kallurutty East',
    kitsCollected: 89,
    totalAmount: 89 * KIT_UNIT_RATE,
    targetKits: 110,
    progressPercentage: 80.9,
    volunteerCount: 5,
    rank: 3
  },
  {
    wardNumber: 9,
    wardName: 'Nellikode South',
    kitsCollected: 74,
    totalAmount: 74 * KIT_UNIT_RATE,
    targetKits: 100,
    progressPercentage: 74.0,
    volunteerCount: 4,
    rank: 4
  },
  {
    wardNumber: 5,
    wardName: 'Peringalam Town',
    kitsCollected: 70,
    totalAmount: 70 * KIT_UNIT_RATE,
    targetKits: 110,
    progressPercentage: 63.6,
    volunteerCount: 5,
    rank: 5
  }
];

export const INITIAL_DONATIONS: Donation[] = [
  {
    donationId: 'don-101',
    receiptToken: 'MDV-E94A1F82',
    donorName: 'Abdul Gafoor',
    whatsAppNumber: '+91 94470 11223',
    kitCount: 10,
    kitUnitRate: KIT_UNIT_RATE,
    totalAmount: 10 * KIT_UNIT_RATE,
    panchayath: 'Madavoor',
    wardNumber: 4,
    collectedByUserId: 'usr-001',
    collectedByName: 'Shabeer Rahman',
    collectedByRole: 'Volunteer',
    timestamp: '2026-09-04T05:40:00Z'
  },
  {
    donationId: 'don-102',
    receiptToken: 'MDV-78BC3D10',
    donorName: 'Kadeeja Haji Family',
    whatsAppNumber: '+91 98460 99887',
    kitCount: 5,
    kitUnitRate: KIT_UNIT_RATE,
    totalAmount: 5 * KIT_UNIT_RATE,
    panchayath: 'Madavoor',
    wardNumber: 7,
    collectedByUserId: 'usr-002',
    collectedByName: 'Anas K.P.',
    collectedByRole: 'Coordinator',
    timestamp: '2026-09-04T04:15:00Z'
  },
  {
    donationId: 'don-103',
    receiptToken: 'MDV-33AC4E99',
    donorName: 'C.P. Moidu Haji',
    whatsAppNumber: '+91 97441 55667',
    kitCount: 20,
    kitUnitRate: KIT_UNIT_RATE,
    totalAmount: 20 * KIT_UNIT_RATE,
    panchayath: 'Madavoor',
    wardNumber: 4,
    collectedByUserId: 'usr-001',
    collectedByName: 'Shabeer Rahman',
    collectedByRole: 'Volunteer',
    timestamp: '2026-09-04T02:50:00Z'
  },
  {
    donationId: 'don-104',
    receiptToken: 'MDV-10AA72FF',
    donorName: 'Dr. Faisal & Friends',
    whatsAppNumber: '+91 94002 44332',
    kitCount: 8,
    kitUnitRate: KIT_UNIT_RATE,
    totalAmount: 8 * KIT_UNIT_RATE,
    panchayath: 'Madavoor',
    wardNumber: 2,
    collectedByUserId: 'usr-004',
    collectedByName: 'Jaseel Pulikkal',
    collectedByRole: 'Volunteer',
    timestamp: '2026-09-03T20:10:00Z'
  },
  {
    donationId: 'don-105',
    receiptToken: 'MDV-6D99C021',
    donorName: 'Panchayath Youth Club',
    whatsAppNumber: '+91 99461 88776',
    kitCount: 15,
    kitUnitRate: KIT_UNIT_RATE,
    totalAmount: 15 * KIT_UNIT_RATE,
    panchayath: 'Madavoor',
    wardNumber: 9,
    collectedByUserId: 'usr-005',
    collectedByName: 'Suhail Chelannur',
    collectedByRole: 'Volunteer',
    timestamp: '2026-09-03T17:35:00Z'
  }
];
