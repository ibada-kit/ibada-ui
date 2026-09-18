import React, { useState, useEffect } from 'react';
import type { User, Donation, SponsorshipRecord } from './types';
import { getCurrentUser, setCurrentUser, getKitUnitPrice, setKitUnitPrice } from './services/api';
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
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUpdateKitPrice = (newPrice: number) => {
    setGlobalKitPrice(newPrice);
    setKitUnitPrice(newPrice);
    setRefreshKey((prev) => prev + 1);
  };

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setCurUser(user);
      if (user.role === 'Admin') {
        setActiveAdminView('admin');
      }
    }

    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase();
      const params = new URLSearchParams(window.location.search);
      setIsPosterView(path.startsWith('/poster') || params.get('view') === 'poster' || params.has('poster'));
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
            />
          )}

          {/* Corporate Sponsorship Receipt Modal */}
          {activeSponsorshipReceipt && (
            <SponsorshipReceiptModal
              sponsorship={activeSponsorshipReceipt}
              onClose={() => setActiveSponsorshipReceipt(null)}
              onOpenPayBalance={(spon) => setActivePayBalanceSponsorship(spon)}
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
