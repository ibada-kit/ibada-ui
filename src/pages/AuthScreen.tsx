import React, { useState, useRef, useEffect } from 'react';
import type { User, UserRole } from '../types';
import { authApi, setCurrentUser } from '../services/api';
import { DEMO_USERS } from '../services/mockData';
import { Heart, KeyRound, ArrowRight, CheckCircle2, AlertCircle, RefreshCw, Sparkles, UserPlus, LogIn } from 'lucide-react';

interface AuthScreenProps {
  onSuccess: (user: User) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  
  // Phone step state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('Volunteer');
  const [wardNumber, setWardNumber] = useState<number>(4);
  const [panchayath] = useState('Madavoor');

  // OTP step state
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);
  
  // UX state
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(60);
  const [isTimerActive, setIsTimerActive] = useState(false);

  // Timer countdown
  useEffect(() => {
    let interval: number;
    if (isTimerActive && timerSeconds > 0) {
      interval = window.setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0) {
      setIsTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [isTimerActive, timerSeconds]);

  // Handle Send OTP
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    const clean = phoneNumber.replace(/\D/g, '');
    if (clean.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (mode === 'signup' && !fullName.trim()) {
      setErrorMessage('Please enter your full name for registration.');
      return;
    }

    try {
      setLoading(true);
      const res = await authApi.sendOtp(clean);
      setInfoMessage(res.message);
      setStep('otp');
      setTimerSeconds(60);
      setIsTimerActive(true);
      setTimeout(() => {
        otpInputsRef.current[0]?.focus();
      }, 100);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to dispatch OTP.');
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP digit changes
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;

    const newOtp = [...otp];
    for (let i = 0; i < pastedData.length; i++) {
      newOtp[i] = pastedData[i];
    }
    setOtp(newOtp);
    const nextIndex = Math.min(pastedData.length, 5);
    otpInputsRef.current[nextIndex]?.focus();
  };

  // Handle Verify OTP
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      setErrorMessage('Please enter all 6 digits of the OTP.');
      return;
    }

    try {
      setLoading(true);
      const clean = phoneNumber.replace(/\D/g, '');
      const loginRes = await authApi.verifyOtp(clean, otpCode);

      const storedUser: User = {
        userId: `usr-${Date.now()}`,
        fullName: mode === 'signup' && fullName ? fullName : loginRes.fullName,
        phoneNumber: clean,
        role: mode === 'signup' ? role : loginRes.role,
        panchayath: mode === 'signup' ? panchayath : loginRes.panchayath,
        wardNumber: mode === 'signup' ? wardNumber : loginRes.wardNumber,
        token: loginRes.token,
        expiresAt: loginRes.expiresAt
      };
      setCurrentUser(storedUser);
      onSuccess(storedUser);
    } catch (err: any) {
      setErrorMessage(err.message || 'OTP verification failed.');
    } finally {
      setLoading(false);
    }
  };

  // Quick Demo Login Helper
  const handleQuickDemo = (demoUser: User) => {
    setPhoneNumber(demoUser.phoneNumber);
    setFullName(demoUser.fullName);
    setRole(demoUser.role);
    setWardNumber(demoUser.wardNumber);
    setStep('otp');
    setOtp(['1', '2', '3', '4', '5', '6']);
    setInfoMessage(`Preloaded ${demoUser.fullName} (${demoUser.role}). Ready to verify!`);
  };

  const handleAutofillDemoOtp = () => {
    setOtp(['1', '2', '3', '4', '5', '6']);
  };

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'max(16px, env(safe-area-inset-top)) 16px max(24px, env(safe-area-inset-bottom)) 16px',
      backgroundColor: '#F8FAFC',
      position: 'relative'
    }}>
      {/* Main Container */}
      <div style={{ width: '100%', maxWidth: 460, position: 'relative', zIndex: 2 }}>
        
        {/* Logo & Headline */}
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: '#42B06F',
            margin: '0 auto 12px auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(66, 176, 111, 0.25)'
          }}>
            <Heart size={26} color="#ffffff" fill="#ffffff" />
          </div>
          <h1 style={{ fontSize: '1.55rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4, color: '#0F172A' }}>
            Madavoor Relief Drive
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            Volunteer & Coordinator Portal
          </p>
        </div>

        {/* Card */}
        <div className="glass-card" style={{ padding: '24px 20px', background: '#FFFFFF' }}>
          
          {/* Tabs: Sign In vs Sign Up */}
          {step === 'phone' && (
            <div style={{
              display: 'flex',
              background: '#F1F5F9',
              borderRadius: 'var(--radius-md)',
              padding: 4,
              marginBottom: 24,
              border: '1px solid var(--border-subtle)'
            }}>
              <button
                type="button"
                id="tab-login"
                onClick={() => setMode('login')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: mode === 'login' ? '#42B06F' : 'transparent',
                  color: mode === 'login' ? '#ffffff' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <LogIn size={16} />
                <span>Log In</span>
              </button>
              <button
                type="button"
                id="tab-signup"
                onClick={() => setMode('signup')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: mode === 'signup' ? '#256CAA' : 'transparent',
                  color: mode === 'signup' ? '#ffffff' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <UserPlus size={16} />
                <span>Sign Up</span>
              </button>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              color: '#B91C1C',
              fontSize: '0.85rem',
              fontWeight: 600,
              marginBottom: 20
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Info/Success Message */}
          {infoMessage && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              background: '#EBF7F0',
              border: '1px solid #A5D6B8',
              color: '#1E6B3E',
              fontSize: '0.85rem',
              fontWeight: 600,
              marginBottom: 20
            }}>
              <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
              <span>{infoMessage}</span>
            </div>
          )}

          {/* STEP 1: Phone Number & Details */}
          {step === 'phone' ? (
            <form onSubmit={handleSendOtp}>
              {mode === 'signup' && (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      Full Name
                    </label>
                    <input
                      id="input-fullname"
                      type="text"
                      className="input-field"
                      placeholder="e.g. Muhammed Shabeer"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                        Volunteer Role
                      </label>
                      <select
                        id="select-role"
                        className="input-field"
                        value={role}
                        onChange={(e) => setRole(e.target.value as UserRole)}
                      >
                        <option value="Volunteer">Volunteer</option>
                        <option value="Coordinator">Ward Coordinator</option>
                        <option value="WardCommittee">Ward Committee</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                        Ward Number
                      </label>
                      <select
                        id="select-ward"
                        className="input-field"
                        value={wardNumber}
                        onChange={(e) => setWardNumber(Number(e.target.value))}
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                          <option key={num} value={num}>Ward {num}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              )}

              <div style={{ marginBottom: 22 }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  WhatsApp Mobile Number
                </label>
                <div style={{ position: 'relative', display: 'flex' }}>
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '0 14px',
                    background: '#F8FAFC',
                    border: '1px solid #CBD5E1',
                    borderRight: 'none',
                    borderRadius: 'var(--radius-md) 0 0 var(--radius-md)',
                    color: 'var(--text-secondary)',
                    fontSize: '0.95rem',
                    fontWeight: 600
                  }}>
                    🇮🇳 +91
                  </span>
                  <input
                    id="input-phone"
                    type="tel"
                    className="input-field"
                    style={{ borderRadius: '0 var(--radius-md) var(--radius-md) 0' }}
                    placeholder="98471 23456"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    maxLength={13}
                    required
                  />
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>
                  A 6-digit verification code will be sent via WhatsApp OTP.
                </p>
              </div>

              <button
                id="btn-send-otp"
                type="submit"
                className="btn-primary"
                style={{ width: '100%', padding: '13px' }}
                disabled={loading}
              >
                {loading ? (
                  <RefreshCw size={18} className="animate-spin" />
                ) : (
                  <>
                    <span>Continue with OTP</span>
                    <ArrowRight size={17} />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* STEP 2: 6-Digit OTP Entry */
            <form onSubmit={handleVerifyOtp}>
              <div style={{ textAlign: 'center', marginBottom: 22 }}>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: '#EBF7F0',
                  border: '1px solid #A5D6B8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 10px auto',
                  color: '#1E6B3E'
                }}>
                  <KeyRound size={22} />
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>Enter Verification Code</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                  Sent to +91 {phoneNumber.replace(/\D/g, '').slice(-10)}
                  <button
                    type="button"
                    onClick={() => { setStep('phone'); setErrorMessage(null); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#256CAA',
                      marginLeft: 8,
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    Change
                  </button>
                </p>
              </div>

              {/* 6-box segmented OTP inputs */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: 'min(10px, 2vw)',
                  marginBottom: 20,
                  width: '100%'
                }}
                onPaste={handlePaste}
              >
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => { otpInputsRef.current[idx] = el; }}
                    id={`otp-input-${idx}`}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    style={{
                      width: 'clamp(40px, 12vw, 48px)',
                      height: 'clamp(46px, 14vw, 54px)',
                      textAlign: 'center',
                      fontSize: 'clamp(1.15rem, 4vw, 1.4rem)',
                      fontWeight: 800,
                      background: '#FFFFFF',
                      border: digit ? '2px solid #42B06F' : '1px solid #CBD5E1',
                      borderRadius: 'var(--radius-md)',
                      color: '#0F172A',
                      outline: 'none',
                      transition: 'all 0.15s ease'
                    }}
                  />
                ))}
              </div>

              {/* Autofill test helper */}
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <button
                  type="button"
                  id="btn-autofill-otp"
                  onClick={handleAutofillDemoOtp}
                  style={{
                    background: '#EDF4FA',
                    border: '1px dashed #256CAA',
                    color: '#256CAA',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    padding: '5px 12px',
                    borderRadius: 'var(--radius-full)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <Sparkles size={14} />
                  <span>Autofill Demo OTP (123456)</span>
                </button>
              </div>

              <button
                id="btn-verify-otp"
                type="submit"
                className="btn-primary"
                style={{ width: '100%', padding: '13px', marginBottom: 14 }}
                disabled={loading}
              >
                {loading ? (
                  <RefreshCw size={18} className="animate-spin" />
                ) : (
                  <span>Verify & Enter Portal</span>
                )}
              </button>

              {/* Resend OTP */}
              <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {isTimerActive ? (
                  <span>Resend code in {timerSeconds}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#256CAA',
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                  >
                    Resend OTP via WhatsApp
                  </button>
                )}
              </div>
            </form>
          )}

          {/* Quick Demo Test Presets */}
          <div style={{
            marginTop: 26,
            paddingTop: 18,
            borderTop: '1px solid var(--border-subtle)'
          }}>
            <p style={{
              fontSize: '0.74rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontWeight: 700,
              color: 'var(--text-muted)',
              marginBottom: 10,
              textAlign: 'center'
            }}>
              Quick 1-Click Demo Profiles
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {DEMO_USERS.map((u) => (
                <button
                  key={u.userId}
                  id={`btn-demo-${u.role.toLowerCase()}`}
                  type="button"
                  onClick={() => handleQuickDemo(u)}
                  style={{
                    background: '#F8FAFC',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 4px',
                    color: '#0F172A',
                    fontSize: '0.74rem',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 3,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{ fontWeight: 700 }}>{u.fullName.split(' ')[0]}</span>
                  <span style={{ fontSize: '0.66rem', color: 'var(--text-secondary)' }}>{u.role}</span>
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Footer info */}
        <p style={{
          textAlign: 'center',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          marginTop: 20
        }}>
          Protected by Azure Table Storage & WhatsApp OTP Service
        </p>
      </div>
    </div>
  );
};
