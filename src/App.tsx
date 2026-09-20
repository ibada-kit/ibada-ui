import React, { useState, useEffect } from 'react';
import type { User, Donation, SponsorshipRecord } from './types';
import { getCurrentUser, setCurrentUser, getKitUnitPrice, setKitUnitPrice, settingsApi, type KitPriceInfo } from './services/api';
import { Navbar } from './components/Navbar';
import { AuthScreen } from './pages/AuthScreen';
import { VolunteerDashboard } from './pages/VolunteerDashboard';
import { CoordinatorDashboard } from './pages/CoordinatorDashboard';
import { WardCoordinatorDashboard } from './pages/WardCoordinatorDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { HomeScreen } from './pages/HomeScreen';
import { RecordDonationModal } from './components/RecordDonationModal';
import { ReceiptModal } from './components/ReceiptModal';
import { SponsorshipReceiptModal } from './components/SponsorshipReceiptModal';
import { CollectBalanceModal } from './components/CollectBalanceModal';
import { DonorPosterGenerator } from './components/DonorPosterGenerator';

export const App: React.FC = () => {
  const [currentUser, setCurUser] = useState<User | null>(() => getCurrentUser());
  const [isPosterView, setIsPosterView] = useState<boolean>(() => {
    const path = window.location.pathname.toLowerCase();
    const params = new URLSearchParams(window.location.search);
    return path.startsWith('/poster') || params.get('view') === 'poster' || params.has('poster');
  });
  const [activeAdminView, setActiveAdminView] = useState<'home' | 'admin'>(() => {
    const user = getCurrentUser();
    return user?.role === 'Admin' ? 'admin' : 'home';
  });
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<Donation | null>(null);
  const [activeSponsorshipReceipt, setActiveSponsorshipReceipt] = useState<SponsorshipRecord | null>(null);
  const [activePayBalanceSponsorship, setActivePayBalanceSponsorship] = useState<SponsorshipRecord | null>(null);
  const [globalKitPrice, setGlobalKitPrice] = useState<number>(() => getKitUnitPrice());
  const [kitPriceInfo, setKitPriceInfo] = useState<KitPriceInfo | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUpdateKitPrice = async (newPrice: number) => {
    if (!currentUser?.token) {
      alert('You must be logged in as Admin to update kit price.');
      return;
    }
    const updated = await settingsApi.updateKitPrice(currentUser.token, newPrice);
    setGlobalKitPrice(updated.kitPrice);
    setKitPriceInfo(updated);
    setKitUnitPrice(updated.kitPrice);
    setRefreshKey((prev) => prev + 1);
  };

  useEffect(() => {
    // Load authoritative kit price and modified date from Azure Table Storage
    settingsApi.getKitPrice()
      .then((info) => {
        if (info && info.kitPrice > 0) {
          setGlobalKitPrice(info.kitPrice);
          setKitPriceInfo(info);
          setKitUnitPrice(info.kitPrice);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch kit price from Azure Table Storage:', err);
      });

    const user = getCurrentUser();
    if (user) {
      setCurUser(user);
      if (user.role === 'Admin') {
        setActiveAdminView('admin');
      }
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get('receipt') === 'sample' || params.has('sample-receipt')) {
      setActiveReceipt({
        donationId: 'sample-preview',
        receiptToken: 'MDV-2026-8491',
        serialNumber: 10058,
        donorName: 'അബ്ദുൽ റഹ്‌മാൻ (Abdul Rahman)',
        kitCount: 5,
        kitUnitRate: 1000,
        totalAmount: 5000,
        wardNumber: 4,
        panchayath: 'Madavoor',
        collectedByUserId: 'usr-123',
        collectedByName: 'Safwan M (Lead)',
        collectedByRole: 'Coordinator',
        whatsAppNumber: '9846012345',
        timestamp: new Date().toISOString()
      });
    }

    if (params.get('receipt') === 'sponsor' || params.has('sponsor-sample') || params.get('sponsor') === 'sample') {
      setActiveSponsorshipReceipt({
        sponsorshipId: 'spon-sample-preview',
        receiptToken: 'SPON-2026-7821',
        donorName: 'അൽ മദീന ഹൈപ്പർമാർക്കറ്റ് (Al Madeena)',
        contactPerson: 'K.P. അബ്ദുള്ള ഹാജി',
        mobileNumber: '9847123456',
        itemId: 'item-1',
        itemName: 'Sponsorship Contribution',
        itemPrice: 50000,
        quantity: 1,
        totalAmount: 50000,
        paymentOption: 'PayFull',
        amountPaid: 50000,
        balanceAmount: 0,
        paymentStatus: 'Completed',
        paymentMode: 'BankTransfer',
        transactionReference: 'NEFT98231',
        panchayath: 'Madavoor',
        wardNumber: 4,
        collectedByUserId: 'usr-123',
        collectedByName: 'Safwan M (Lead)',
        collectedByRole: 'Coordinator',
        notes: 'Annual sponsorship',
        createdDate: new Date().toISOString(),
        updateDate: new Date().toISOString(),
        updatedBy: 'usr-123'
      });
    }

    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase();
      const p = new URLSearchParams(window.location.search);
      setIsPosterView(path.startsWith('/poster') || p.get('view') === 'poster' || p.has('poster'));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleAuthSuccess = (user: User) => {
    setCurUser(user);
    setActiveAdminView(user.role === 'Admin' ? 'admin' : 'home');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurUser(null);
    setActiveAdminView('home');
  };

  const handleDonationRecorded = (donation: Donation) => {
    setIsRecordModalOpen(false);
    setActiveReceipt(donation);
    setRefreshKey((prev) => prev + 1);
  };

  const handleOpenPosterForDonation = (donation: Donation) => {
    setActiveReceipt(null);
    const params = new URLSearchParams({
      poster: '1',
      token: donation.receiptToken,
      name: donation.donorName,
      type: 'kit',
      kits: String(donation.kitCount),
      amount: String(donation.totalAmount),
      ward: String(donation.wardNumber || ''),
      panchayath: donation.panchayath || 'Madavoor',
      serial: donation.serialNumber ? String(donation.serialNumber) : ''
    });
    window.history.pushState({}, '', `${window.location.origin}/?${params.toString()}`);
    setIsPosterView(true);
  };

  const handleOpenPosterForSponsorship = (spon: any) => {
    setActiveSponsorshipReceipt(null);
    const params = new URLSearchParams({
      poster: '1',
      token: spon.receiptToken,
      name: spon.donorName,
      type: 'sponsorship',
      item: spon.itemName || 'Sponsorship Contribution',
      amount: String(spon.totalAmount),
      ward: String(spon.wardNumber || ''),
      panchayath: spon.panchayath || 'Madavoor'
    });
    window.history.pushState({}, '', `${window.location.origin}/?${params.toString()}`);
    setIsPosterView(true);
  };

  // Public Donor Poster Generator view (no auth required)
  if (isPosterView) {
    return (
      <DonorPosterGenerator
        onBackToApp={() => {
          window.history.pushState({}, '', window.location.origin + '/');
          setIsPosterView(false);
        }}
      />
    );
  }

  return (
    <div className="app-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#F4F9FD' }}>
      {currentUser ? (
        <>
          {/* Top Navbar */}
          <Navbar
            user={currentUser}
            activeView={activeAdminView}
            onNavigateView={(view) => setActiveAdminView(view)}
            onOpenRecordModal={() => setIsRecordModalOpen(true)}
            onLogout={handleLogout}
          />

          {/* Role-Based Routing / Dashboards */}
          <main style={{ flex: 1 }}>
            {currentUser.role === 'Volunteer' && (
              <VolunteerDashboard
                key={refreshKey}
                user={currentUser}
                kitPrice={globalKitPrice}
                onViewReceipt={(don) => setActiveReceipt(don)}
                onViewSponsorshipReceipt={(spon) => setActiveSponsorshipReceipt(spon)}
                onOpenPayBalance={(spon) => setActivePayBalanceSponsorship(spon)}
              />
            )}

            {currentUser.role === 'Coordinator' && (
              <CoordinatorDashboard
                key={refreshKey}
                user={currentUser}
                kitPrice={globalKitPrice}
                onViewReceipt={(don) => setActiveReceipt(don)}
                onViewSponsorshipReceipt={(spon) => setActiveSponsorshipReceipt(spon)}
                onOpenPayBalance={(spon) => setActivePayBalanceSponsorship(spon)}
              />
            )}

            {currentUser.role === 'WardCommittee' && (
              <WardCoordinatorDashboard
                key={refreshKey}
                user={currentUser}
                kitPrice={globalKitPrice}
                onViewReceipt={(don) => setActiveReceipt(don)}
                onViewSponsorshipReceipt={(spon) => setActiveSponsorshipReceipt(spon)}
                onOpenPayBalance={(spon) => setActivePayBalanceSponsorship(spon)}
              />
            )}

            {currentUser.role === 'Admin' && (
              activeAdminView === 'admin' ? (
                <AdminDashboard
                  currentUser={currentUser}
                  kitPrice={globalKitPrice}
                  kitPriceModifiedDate={kitPriceInfo?.modifiedDate}
                  kitPriceModifiedBy={kitPriceInfo?.modifiedBy}
                  onUpdateKitPrice={handleUpdateKitPrice}
                />
              ) : (
                <HomeScreen
                  key={refreshKey}
                  user={currentUser}
                  onViewReceipt={(don) => setActiveReceipt(don)}
                />
              )
            )}
          </main>

          {/* Record Donation Quick Modal (Global) */}
          {isRecordModalOpen && (
            <RecordDonationModal
              kitPrice={globalKitPrice}
              onClose={() => setIsRecordModalOpen(false)}
              onDonationRecorded={handleDonationRecorded}
              onSponsorshipRecorded={(spon) => {
                setIsRecordModalOpen(false);
                setActiveSponsorshipReceipt(spon);
                setRefreshKey((prev) => prev + 1);
              }}
            />
          )}

          {/* Kit Donation Receipt Modal */}
          {activeReceipt && (
            <ReceiptModal
              donation={activeReceipt}
              onClose={() => setActiveReceipt(null)}
              onOpenPoster={() => handleOpenPosterForDonation(activeReceipt)}
            />
          )}

          {/* Corporate Sponsorship Receipt Modal */}
          {activeSponsorshipReceipt && (
            <SponsorshipReceiptModal
              sponsorship={activeSponsorshipReceipt}
              onClose={() => setActiveSponsorshipReceipt(null)}
              onOpenPayBalance={(spon) => setActivePayBalanceSponsorship(spon)}
              onOpenPoster={() => handleOpenPosterForSponsorship(activeSponsorshipReceipt)}
            />
          )}

          {/* Collect Outstanding Balance Modal */}
          {activePayBalanceSponsorship && (
            <CollectBalanceModal
              sponsorship={activePayBalanceSponsorship}
              onClose={() => setActivePayBalanceSponsorship(null)}
              onPaymentRecorded={(updated) => {
                setActivePayBalanceSponsorship(null);
                setActiveSponsorshipReceipt(updated);
                setRefreshKey((prev) => prev + 1);
              }}
            />
          )}
        </>
      ) : (
        <AuthScreen onSuccess={handleAuthSuccess} />
      )}
    </div>
  );
};

export default App;
