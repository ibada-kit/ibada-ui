import React from 'react';
import type { User } from '../types';
import { Heart, PlusCircle, LogOut } from 'lucide-react';

interface NavbarProps {
  user: User | null;
  onOpenRecordModal: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onOpenRecordModal,
  onLogout
}) => {
  const getRoleBadgeClass = (role?: string) => {
    switch (role) {
      case 'Admin':
        return 'badge-gold';
      case 'Coordinator':
        return 'badge-blue';
      case 'WardCommittee':
        return 'badge-purple';
      default:
        return 'badge-emerald';
    }
  };

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: 'rgba(9, 14, 23, 0.85)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      padding: '14px 20px'
    }}>
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16
      }}>
        {/* Brand Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(16, 185, 129, 0.35)'
          }}>
            <Heart size={22} color="#ffffff" fill="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                Madavoor Relief
              </h1>
              <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>
                Live Drive
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Community Food & Medical Kit Drive • ₹500/Kit
            </p>
          </div>
        </div>

        {/* User Info & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {user ? (
            <>
              <button
                id="btn-quick-record-donation"
                onClick={onOpenRecordModal}
                className="btn-primary"
                style={{ padding: '8px 16px', fontSize: '0.88rem' }}
              >
                <PlusCircle size={17} />
                <span>Record Donation</span>
              </button>

              {/* User Profile Pill */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: 'rgba(255, 255, 255, 0.05)',
                padding: '6px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)'
              }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #38bdf8, #6366f1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.85rem'
                }}>
                  {user.fullName.charAt(0)}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{user.fullName}</span>
                    <span className={`badge ${getRoleBadgeClass(user.role)}`} style={{ fontSize: '0.65rem', padding: '2px 8px' }}>
                      {user.role}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    Ward {user.wardNumber} • {user.panchayath}
                  </span>
                </div>
              </div>

              {/* Logout */}
              <button
                id="btn-logout"
                onClick={onLogout}
                className="btn-icon"
                title="Log Out"
                aria-label="Log Out"
              >
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Volunteer Portal
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
