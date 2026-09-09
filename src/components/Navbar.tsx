import React from 'react';
import type { User } from '../types';
import { Heart, LogOut, ShieldCheck, Home } from 'lucide-react';

interface NavbarProps {
  user: User | null;
  activeView?: 'home' | 'admin';
  onNavigateView?: (view: 'home' | 'admin') => void;
  onOpenRecordModal?: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeView = 'home',
  onNavigateView,
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
            background: '#008A2E',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 2px 8px rgba(0, 138, 46, 0.25)'
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
              <span className="badge badge-emerald" style={{ fontSize: '0.6rem', padding: '2px 6px', background: '#EBF7EE', color: '#008A2E', border: '1px solid #A5D6B8' }}>
                Live
              </span>
            </div>
            <p style={{
              fontSize: '0.72rem',
              color: '#2C82C9',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              Relief Campaign
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
                      padding: '6px 8px',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      background: activeView === 'home' ? '#008A2E' : 'transparent',
                      color: activeView === 'home' ? '#ffffff' : 'var(--text-secondary)',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    title="Live Drive Overview"
                  >
                    <Home size={14} />
                    <span className="hidden-mobile">Overview</span>
                  </button>
                  <button
                    id="nav-btn-admin"
                    onClick={() => onNavigateView('admin')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '6px 8px',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      background: activeView === 'admin' ? '#2C82C9' : 'transparent',
                      color: activeView === 'admin' ? '#ffffff' : 'var(--text-secondary)',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    title="Admin Console"
                  >
                    <ShieldCheck size={14} />
                    <span className="hidden-mobile">Admin</span>
                  </button>
                </div>
              )}

              {/* User Profile Pill */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: '#FFFFFF',
                padding: '4px 8px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                minWidth: 0
              }}>
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: '#2C82C9',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  flexShrink: 0
                }}>
                  {user.fullName.charAt(0)}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span className="hidden-mobile" style={{
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      maxWidth: 80,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {user.fullName.split(' ')[0]}
                    </span>
                    <span className={`badge ${getRoleBadgeClass(user.role)}`} style={{ fontSize: '0.62rem', padding: '1px 5px', whiteSpace: 'nowrap' }}>
                      {user.role === 'WardCommittee' ? 'Ward Lead' : user.role}
                    </span>
                  </div>
                  <span className="hidden-mobile" style={{ fontSize: '0.66rem', color: 'var(--text-secondary)' }}>
                    Ward {user.wardNumber}
                  </span>
                </div>
              </div>

              {/* Logout Button */}
              <button
                id="btn-logout"
                onClick={onLogout}
                className="btn-icon"
                style={{ width: 34, height: 34, minWidth: 34, minHeight: 34 }}
                title="Log Out"
                aria-label="Log Out"
              >
                <LogOut size={15} />
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
