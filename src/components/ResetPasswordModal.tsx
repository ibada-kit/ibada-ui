import React, { useState } from 'react';
import { Key, RefreshCw, Copy, Check, Share2, Eye, EyeOff, X, Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import { usersApi, generateRandomPassword } from '../services/api';

export interface ResetTargetUser {
  id: string;
  name: string;
  phone: string;
  role?: string;
  wardNumber?: number;
}

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: ResetTargetUser | null;
  onSuccess?: (newPassword: string) => void;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  isOpen,
  onClose,
  targetUser,
  onSuccess
}) => {
  const [customPassword, setCustomPassword] = useState('');
  const [showCustomPass, setShowCustomPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resultPassword, setResultPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !targetUser) return null;

  const handleClose = () => {
    setCustomPassword('');
    setShowCustomPass(false);
    setResultPassword(null);
    setCopied(false);
    setErrorMsg(null);
    onClose();
  };

  const handleRegenerateRandom = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      const randomPass = generateRandomPassword(6);
      const res = await usersApi.resetPassword(targetUser.id || targetUser.phone, randomPass);
      const updatedPass = res.newPassword || randomPass;
      setResultPassword(updatedPass);
      if (onSuccess) onSuccess(updatedPass);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to regenerate password.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPassword.trim()) {
      setErrorMsg('Please enter a new password.');
      return;
    }
    if (customPassword.length < 4) {
      setErrorMsg('Password must be at least 4 characters.');
      return;
    }

    setErrorMsg(null);
    setLoading(true);
    try {
      const res = await usersApi.resetPassword(targetUser.id || targetUser.phone, customPassword.trim());
      const updatedPass = res.newPassword || customPassword.trim();
      setResultPassword(updatedPass);
      setCustomPassword('');
      if (onSuccess) onSuccess(updatedPass);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (pass: string) => {
    navigator.clipboard.writeText(pass);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const cleanPhone = targetUser.phone.replace(/\D/g, '');
  const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  const waText = encodeURIComponent(
    `Salam ${targetUser.name},\n\nYour login password for the Ibada Kit Challenge has been reset:\n📱 Mobile: ${targetUser.phone}\n🔑 Password: ${resultPassword}\n${targetUser.wardNumber ? `📍 Ward: ${targetUser.wardNumber}\n` : ''}\n🌐 Login Portal: ${window.location.origin}`
  );

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      zIndex: 1000
    }}>
      <div style={{
        background: '#FFFFFF',
        borderRadius: 'var(--radius-xl)',
        padding: '24px clamp(16px, 4vw, 24px)',
        maxWidth: 480,
        width: '100%',
        maxHeight: '90dvh',
        overflowY: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 'var(--radius-md)',
              background: '#EBF7EE',
              color: '#008A2E',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Key size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Reset / Change Password
              </h3>
              <p style={{ fontSize: '0.76rem', color: '#64748B', margin: '2px 0 0 0' }}>
                Manage login credentials for this member
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#64748B',
              padding: 4
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Target User Info Badge */}
        <div style={{
          background: '#F8FAFC',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 14px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.92rem' }}>
              {targetUser.name}
            </div>
            <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: 2 }}>
              {targetUser.phone} {targetUser.wardNumber ? `• Ward ${targetUser.wardNumber}` : ''}
            </div>
          </div>
          <span style={{
            background: targetUser.role === 'Coordinator' ? '#EDF4FA' : '#EBF7EE',
            color: targetUser.role === 'Coordinator' ? '#2C82C9' : '#008A2E',
            fontSize: '0.72rem',
            fontWeight: 800,
            padding: '3px 9px',
            borderRadius: 'var(--radius-full)'
          }}>
            {targetUser.role || 'Volunteer'}
          </span>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div style={{
            background: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            color: '#991B1B',
            fontSize: '0.82rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 16
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* SUCCESS BADGE & COPY BOX */}
        {resultPassword ? (
          <div style={{
            background: '#F0FDF4',
            border: '1.5px solid #86EFAC',
            borderRadius: 'var(--radius-lg)',
            padding: '16px',
            marginBottom: 20
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#166534', fontWeight: 800, fontSize: '0.88rem', marginBottom: 8 }}>
              <CheckCircle2 size={18} color="#008A2E" />
              <span>Password Successfully Updated!</span>
            </div>

            <p style={{ fontSize: '0.78rem', color: '#15803D', margin: '0 0 12px 0' }}>
              Please share the new credentials with <strong>{targetUser.name}</strong>:
            </p>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#FFFFFF',
              border: '1px solid #BBF7D0',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              marginBottom: 12
            }}>
              <div>
                <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', display: 'block' }}>
                  New Login Password
                </span>
                <span style={{ fontSize: '1.25rem', fontWeight: 900, fontFamily: 'monospace', color: '#0F172A', letterSpacing: '0.12em' }}>
                  {resultPassword}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(resultPassword)}
                className="btn-secondary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 12px',
                  background: copied ? '#008A2E' : '#FFFFFF',
                  color: copied ? '#FFFFFF' : '#008A2E',
                  borderColor: '#86EFAC',
                  fontWeight: 700,
                  fontSize: '0.8rem'
                }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>

            {/* WhatsApp Share Action */}
            <a
              href={`https://wa.me/${waPhone}?text=${waText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
              style={{
                width: '100%',
                padding: '11px',
                background: '#25D366',
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: '0.86rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                textDecoration: 'none',
                borderRadius: 'var(--radius-md)'
              }}
            >
              <Share2 size={16} />
              <span>Share via WhatsApp</span>
            </a>
          </div>
        ) : null}

        {/* METHOD 1: QUICK REGENERATE RANDOM */}
        <div style={{
          background: '#F0FDF4',
          border: '1px solid #BBF7D0',
          borderRadius: 'var(--radius-lg)',
          padding: '16px',
          marginBottom: 16
        }}>
          <div style={{ marginBottom: 10 }}>
            <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#166534', margin: 0 }}>
              Option 1: Generate Random Password
            </h4>
            <p style={{ fontSize: '0.74rem', color: '#15803D', margin: '3px 0 0 0' }}>
              Creates a secure 6-character random password instantly.
            </p>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={handleRegenerateRandom}
            className="btn-primary"
            style={{
              width: '100%',
              padding: '11px',
              background: '#008A2E',
              fontSize: '0.86rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }}
          >
            {loading ? <RefreshCw size={16} className="animate-spin" /> : (
              <>
                <RefreshCw size={16} />
                <span>Regenerate Random Password</span>
              </>
            )}
          </button>
        </div>

        {/* DIVIDER */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          margin: '16px 0',
          color: '#94A3B8',
          fontSize: '0.74rem',
          fontWeight: 700
        }}>
          <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
          <span>OR SET CUSTOM PASSWORD</span>
          <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
        </div>

        {/* METHOD 2: SET CUSTOM PASSWORD */}
        <form onSubmit={handleSaveCustom}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
              New Custom Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input
                type={showCustomPass ? 'text' : 'password'}
                className="input-field"
                style={{ paddingLeft: 38, paddingRight: 38 }}
                placeholder="Enter new password (min 4 chars)"
                value={customPassword}
                onChange={(e) => setCustomPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowCustomPass(!showCustomPass)}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#64748B',
                  cursor: 'pointer',
                  padding: 4
                }}
              >
                {showCustomPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={handleClose}
              className="btn-secondary"
              style={{ flex: 1, padding: '11px' }}
            >
              {resultPassword ? 'Close' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={loading || !customPassword.trim()}
              className="btn-primary"
              style={{
                flex: 1,
                padding: '11px',
                background: '#2C82C9',
                opacity: (!customPassword.trim() || loading) ? 0.6 : 1
              }}
            >
              {loading ? <RefreshCw size={16} className="animate-spin" /> : 'Set Custom Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
