import React, { useState, useEffect } from 'react';
import type { User, Donation, SponsorshipRecord } from './types';
import { getCurrentUser, setCurrentUser } from './services/api';
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

export const App: React.FC = () => {
  const [currentUser, setCurUser] = useState<User | null>(() => getCurrentUser());
  const [activeAdminView, setActiveAdminView] = useState<'home' | 'admin'>(() => {
    const user = getCurrentUser();
    return user?.role === 'Admin' ? 'admin' : 'home';
  });
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<Donation | null>(null);
  const [activeSponsorshipReceipt, setActiveSponsorshipReceipt] = useState<SponsorshipRecord | null>(null);
  const [activePayBalanceSponsorship, setActivePayBalanceSponsorship] = useState<SponsorshipRecord | null>(null);
  const [globalKitPrice, setGlobalKitPrice] = useState<number>(1000);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setCurUser(user);
      if (user.role === 'Admin') {
        setActiveAdminView('admin');
      }
    }
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
                onViewReceipt={(don) => setActiveReceipt(don)}
              />
            )}

            {currentUser.role === 'Coordinator' && (
              <CoordinatorDashboard
                key={refreshKey}
                user={currentUser}
                onViewReceipt={(don) => setActiveReceipt(don)}
              />
            )}

            {currentUser.role === 'WardCommittee' && (
              <WardCoordinatorDashboard
                key={refreshKey}
                user={currentUser}
                onViewReceipt={(don) => setActiveReceipt(don)}
              />
            )}

            {currentUser.role === 'Admin' && (
              activeAdminView === 'admin' ? (
                <AdminDashboard
                  currentUser={currentUser}
                  kitPrice={globalKitPrice}
                  onUpdateKitPrice={(newPrice) => setGlobalKitPrice(newPrice)}
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
