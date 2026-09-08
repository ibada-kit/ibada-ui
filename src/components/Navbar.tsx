import React from 'react';
import type { User } from '../types';
import { Heart, PlusCircle, LogOut, ShieldCheck, Home } from 'lucide-react';

interface NavbarProps {
  user: User | null;
  activeView?: 'home' | 'admin';
  onNavigateView?: (view: 'home' | 'admin') => void;
  onOpenRecordModal: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeView = 'home',
  onNavigateView,
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
        <div
          onClick={() => onNavigateView && onNavigateView('home')}
          style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, cursor: onNavigateView ? 'pointer' : 'default' }}
        >
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: '#42B06F',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Heart size={20} color="#ffffff" fill="#ffffff" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <h1 style={{
                fontSize: '1.05rem',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: '#0F172A',
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
              {/* Admin View Switcher (Only visible to Admin) */}
              {user.role === 'Admin' && onNavigateView && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#F1F5F9',
                  padding: 3,
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  marginRight: 4
                }}>
                  <button
                    id="nav-btn-home"
                    onClick={() => onNavigateView('home')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '6px 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      background: activeView === 'home' ? '#42B06F' : 'transparent',
                      color: activeView === 'home' ? '#ffffff' : 'var(--text-secondary)',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    title="Live Drive Overview"
                  >
                    <Home size={14} />
                    <span>Overview</span>
                  </button>
                  <button
                    id="nav-btn-admin"
                    onClick={() => onNavigateView('admin')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '6px 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      background: activeView === 'admin' ? '#256CAA' : 'transparent',
                      color: activeView === 'admin' ? '#ffffff' : 'var(--text-secondary)',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    title="Admin Console (Ward Committee & Coordinators)"
                  >
                    <ShieldCheck size={14} />
                    <span>Admin Panel</span>
                  </button>
                </div>
              )}

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
                background: '#FFFFFF',
                padding: '4px 10px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)'
              }}>
                <div style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: '#256CAA',
                  color: '#FFFFFF',
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
                      color: 'var(--text-primary)',
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
