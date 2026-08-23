'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth.store';

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [localError, setLocalError] = useState<string | null>(null);
  const { register, loading, error, clearError, accessToken } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (accessToken) router.replace('/dashboard');
  }, [accessToken, router]);

  // Validation regex checks
  const emailValid = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim());
  const hasNumberInName = /\d/.test(fullName);
  const nameValid = fullName.trim().length >= 2 && /^[a-zA-Z\s'-]+$/.test(fullName.trim());

  // Password requirements
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  const reqPassedCount = [hasMinLength, hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
  const passwordValid = reqPassedCount === 5;
  const confirmValid = confirm.length > 0 && confirm === password;

  // Strength label & color
  let strengthLabel = 'Weak';
  let strengthColor = 'bg-error';
  let strengthText = 'text-error';
  if (reqPassedCount >= 5) {
    strengthLabel = 'Strong';
    strengthColor = 'bg-[#34A853]';
    strengthText = 'text-[#34A853]';
  } else if (reqPassedCount >= 3) {
    strengthLabel = 'Fair';
    strengthColor = 'bg-[#FBBC04]';
    strengthText = 'text-[#FBBC04]';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    clearError();
    setLocalError(null);

    if (hasNumberInName || !nameValid) {
      setLocalError('Full Name must contain only letters (no numbers or symbols)');
      return;
    }
    if (!emailValid) {
      setLocalError('Please enter a valid email address (e.g. name@gmail.com)');
      return;
    }
    if (!passwordValid) {
      setLocalError('Password must meet all complexity requirements');
      return;
    }
    if (!confirmValid) {
      setLocalError('Passwords do not match');
      return;
    }

    try {
      await register(email.trim(), password, fullName.trim());
      router.push('/dashboard');
    } catch {
      // Error handles in auth store
    }
  }

  const displayError = localError ?? error;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-surface">
      <div className="w-full max-w-md my-8 animate-fade-in">
        <div className="text-center mb-lg">
          <div className="w-14 h-14 rounded-2xl bg-primary-fixed flex items-center justify-center text-primary mx-auto mb-sm card-shadow">
            <span className="material-symbols-outlined text-3xl">auto_awesome</span>
          </div>
          <h1 className="font-display-lg text-headline-md font-bold text-on-surface">
            Create Your Account
          </h1>
          <p className="font-body-sm text-on-surface-variant mt-1">
            Join Focussive-AI to boost your productivity
          </p>
        </div>

        <div className="bg-surface-container-lowest p-lg rounded-2xl card-shadow border border-outline-variant/30">
          {displayError && (
            <div className="mb-md p-sm rounded-xl bg-error-container text-on-error-container font-body-sm flex items-start gap-xs animate-fade-in">
              <span className="material-symbols-outlined text-lg shrink-0 mt-0.5">error</span>
              <span>{displayError}</span>
            </div>
          )}

          <form className="space-y-md" onSubmit={handleSubmit}>
            {/* Full Name Input */}
            <div>
              <label className="font-label-caps text-outline mb-xs block text-xs">
                Full Name *
              </label>
              <div className="relative">
                <input
                  id="register-fullname"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe (Letters only)"
                  required
                  className={`w-full p-md pr-10 rounded-xl bg-surface-container-low border font-body-md text-sm focus:outline-none transition-all ${
                    hasNumberInName
                      ? 'border-error focus:border-error'
                      : fullName && nameValid
                      ? 'border-[#34A853] focus:border-[#34A853]'
                      : 'border-outline-variant/50 focus:border-primary'
                  }`}
                />
                {fullName && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-lg pointer-events-none">
                    {hasNumberInName ? (
                      <span className="text-error">cancel</span>
                    ) : nameValid ? (
                      <span className="text-[#34A853]">check_circle</span>
                    ) : null}
                  </span>
                )}
              </div>
              {hasNumberInName && (
                <p className="text-xs text-error font-title-sm mt-1 flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-xs">warning</span>
                  Full Name cannot contain numbers!
                </p>
              )}
            </div>

            {/* Email Input */}
            <div>
              <label className="font-label-caps text-outline mb-xs block text-xs">
                Email Address *
              </label>
              <div className="relative">
                <input
                  id="register-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@gmail.com"
                  required
                  className={`w-full p-md pr-10 rounded-xl bg-surface-container-low border font-body-md text-sm focus:outline-none transition-all ${
                    email && !emailValid
                      ? 'border-error focus:border-error'
                      : email && emailValid
                      ? 'border-[#34A853] focus:border-[#34A853]'
                      : 'border-outline-variant/50 focus:border-primary'
                  }`}
                />
                {email && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-lg pointer-events-none">
                    {emailValid ? (
                      <span className="text-[#34A853]">check_circle</span>
                    ) : (
                      <span className="text-error">cancel</span>
                    )}
                  </span>
                )}
              </div>
              {email && !emailValid && (
                <p className="text-xs text-error font-title-sm mt-1">
                  Must be a valid email format (e.g., user@gmail.com)
                </p>
              )}
            </div>

            {/* Password Input */}
            <div>
              <label className="font-label-caps text-outline mb-xs block text-xs">
                Password *
              </label>
              <div className="relative">
                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 chars, A-Z, 0-9, special (!@#$)"
                  required
                  className="w-full p-md pr-10 rounded-xl bg-surface-container-low border border-outline-variant/50 focus:border-primary focus:outline-none font-body-md text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>

              {/* Password Strength Indicator */}
              {password && (
                <div className="mt-2 space-y-1.5 animate-fade-in">
                  <div className="flex items-center justify-between text-xs font-title-sm">
                    <span className="text-on-surface-variant">Password Strength:</span>
                    <span className={`font-bold ${strengthText}`}>{strengthLabel}</span>
                  </div>
                  <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${strengthColor} transition-all duration-300`}
                      style={{ width: `${(reqPassedCount / 5) * 100}%` }}
                    />
                  </div>

                  {/* Requirements Checklist */}
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1 text-[11px] text-on-surface-variant">
                    <div className={`flex items-center gap-1 ${hasMinLength ? 'text-[#34A853]' : ''}`}>
                      <span className="material-symbols-outlined text-xs">
                        {hasMinLength ? 'check' : 'close'}
                      </span>
                      8+ characters
                    </div>
                    <div className={`flex items-center gap-1 ${hasUpper ? 'text-[#34A853]' : ''}`}>
                      <span className="material-symbols-outlined text-xs">
                        {hasUpper ? 'check' : 'close'}
                      </span>
                      Uppercase (A-Z)
                    </div>
                    <div className={`flex items-center gap-1 ${hasLower ? 'text-[#34A853]' : ''}`}>
                      <span className="material-symbols-outlined text-xs">
                        {hasLower ? 'check' : 'close'}
                      </span>
                      Lowercase (a-z)
                    </div>
                    <div className={`flex items-center gap-1 ${hasNumber ? 'text-[#34A853]' : ''}`}>
                      <span className="material-symbols-outlined text-xs">
                        {hasNumber ? 'check' : 'close'}
                      </span>
                      Number (0-9)
                    </div>
                    <div className={`flex items-center gap-1 col-span-2 ${hasSpecial ? 'text-[#34A853]' : ''}`}>
                      <span className="material-symbols-outlined text-xs">
                        {hasSpecial ? 'check' : 'close'}
                      </span>
                      Special char (!@#$%^&*)
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password Input */}
            <div>
              <label className="font-label-caps text-outline mb-xs block text-xs">
                Confirm Password *
              </label>
              <div className="relative">
                <input
                  id="register-confirm"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat your password"
                  required
                  className={`w-full p-md pr-10 rounded-xl bg-surface-container-low border font-body-md text-sm focus:outline-none transition-all ${
                    confirm && !confirmValid
                      ? 'border-error focus:border-error'
                      : confirm && confirmValid
                      ? 'border-[#34A853] focus:border-[#34A853]'
                      : 'border-outline-variant/50 focus:border-primary'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">
                    {showConfirm ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              {confirm && !confirmValid && (
                <p className="text-xs text-error font-title-sm mt-1">
                  Passwords do not match
                </p>
              )}
            </div>

            <button
              id="register-submit"
              type="submit"
              disabled={loading || hasNumberInName || !nameValid || !emailValid || !passwordValid || !confirmValid}
              className="w-full bg-primary hover:bg-primary-container text-white font-title-sm py-sm rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-md mt-md"
            >
              {loading ? 'Creating Account…' : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="text-center font-body-sm text-on-surface-variant mt-lg">
          Already have an account?{' '}
          <Link href="/login" className="text-primary hover:underline font-title-sm">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
