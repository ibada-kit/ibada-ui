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
    <header className="pwa-navbar">
      <div className="pwa-navbar-inner">
        {/* Brand Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
          }}>
            <Heart size={20} color="#ffffff" fill="#ffffff" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <h1 style={{
                fontSize: '1.05rem',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                Madavoor Relief
              </h1>
              <span className="badge badge-emerald" style={{ fontSize: '0.6rem', padding: '2px 6px' }}>
                Live
              </span>
            </div>
            <p style={{
              fontSize: '0.72rem',
              color: 'var(--text-secondary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              ₹500 / Kit Drive
            </p>
          </div>
        </div>

        {/* User Info & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {user ? (
            <>
              {/* Quick Record Button (Desktop/Tablet) */}
              <button
                id="btn-quick-record-donation"
                onClick={onOpenRecordModal}
                className="btn-primary"
                style={{
                  padding: '8px 14px',
                  fontSize: '0.85rem',
                  minHeight: 38,
                  display: 'none'
                }}
              >
                <PlusCircle size={16} />
                <span>Record</span>
              </button>

              {/* User Profile Pill */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(255, 255, 255, 0.05)',
                padding: '4px 10px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)'
              }}>
                <div style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #38bdf8, #6366f1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  flexShrink: 0
                }}>
                  {user.fullName.charAt(0)}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      maxWidth: 100,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {user.fullName.split(' ')[0]}
                    </span>
                    <span className={`badge ${getRoleBadgeClass(user.role)}`} style={{ fontSize: '0.6rem', padding: '1px 5px' }}>
                      {user.role}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                    W{user.wardNumber}
                  </span>
                </div>
              </div>

              {/* Logout Button */}
              <button
                id="btn-logout"
                onClick={onLogout}
                className="btn-icon"
                style={{ width: 38, height: 38, minWidth: 38, minHeight: 38 }}
                title="Log Out"
                aria-label="Log Out"
              >
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Portal
            </span>
          )}
        </div>
      </div>
    </header>
  );
};
