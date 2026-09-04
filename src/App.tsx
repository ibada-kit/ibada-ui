import React, { useState, useEffect } from 'react';
import type { User, Donation } from './types';
import { getCurrentUser, setCurrentUser } from './services/api';
import { Navbar } from './components/Navbar';
import { AuthScreen } from './pages/AuthScreen';
import { HomeScreen } from './pages/HomeScreen';
import { RecordDonationModal } from './components/RecordDonationModal';
import { ReceiptModal } from './components/ReceiptModal';

export const App: React.FC = () => {
  const [currentUser, setCurUser] = useState<User | null>(null);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<Donation | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setCurUser(user);
    }
  }, []);

  const handleAuthSuccess = (user: User) => {
    setCurUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurUser(null);
  };

  const handleDonationRecorded = (donation: Donation) => {
    setIsRecordModalOpen(false);
    setActiveReceipt(donation);
    setRefreshKey((prev) => prev + 1); // Trigger refresh in HomeScreen
  };

  return (
    <div className="app-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {currentUser ? (
        <>
          <Navbar
            user={currentUser}
            onOpenRecordModal={() => setIsRecordModalOpen(true)}
            onLogout={handleLogout}
          />

          <HomeScreen
            key={refreshKey}
            user={currentUser}
            onOpenRecordModal={() => setIsRecordModalOpen(true)}
            onViewReceipt={(don) => setActiveReceipt(don)}
          />

          {/* Record Donation Modal */}
          {isRecordModalOpen && (
            <RecordDonationModal
              onClose={() => setIsRecordModalOpen(false)}
              onDonationRecorded={handleDonationRecorded}
            />
          )}

          {/* Receipt / Badge Modal */}
          {activeReceipt && (
            <ReceiptModal
              donation={activeReceipt}
              onClose={() => setActiveReceipt(null)}
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
