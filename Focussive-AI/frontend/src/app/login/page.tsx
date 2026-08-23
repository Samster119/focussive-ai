'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth.store';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const { login, loading, error, clearError, accessToken } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (accessToken) router.replace('/dashboard');
  }, [accessToken, router]);

  const emailValid = !email || /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    clearError();
    setLocalError(null);

    if (!email.trim() || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim())) {
      setLocalError('Please enter a valid email address (e.g. user@gmail.com)');
      return;
    }
    if (!password) {
      setLocalError('Please enter your password');
      return;
    }

    try {
      await login(email.trim(), password);
      router.push('/dashboard');
    } catch {
      // error set in auth store
    }
  }

  const displayError = localError ?? error;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-surface">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-xl">
          <div className="w-14 h-14 rounded-2xl bg-primary-fixed flex items-center justify-center text-primary mx-auto mb-sm card-shadow">
            <span className="material-symbols-outlined text-3xl">psychology</span>
          </div>
          <h1 className="font-display-lg text-headline-md font-bold text-on-surface">
            Welcome Back
          </h1>
          <p className="font-body-sm text-on-surface-variant mt-1">
            Sign in to continue your productivity journey
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
            {/* Email Input */}
            <div>
              <label className="font-label-caps text-outline mb-xs block text-xs">
                Email Address
              </label>
              <div className="relative">
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@gmail.com"
                  required
                  className={`w-full p-md pr-10 rounded-xl bg-surface-container-low border font-body-md text-sm focus:outline-none transition-all ${
                    !emailValid
                      ? 'border-error focus:border-error'
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
              {!emailValid && (
                <p className="text-xs text-error font-title-sm mt-1">
                  Must be a valid email format (e.g., user@gmail.com)
                </p>
              )}
            </div>

            {/* Password Input */}
            <div>
              <label className="font-label-caps text-outline mb-xs block text-xs">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
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
            </div>

            <button
              id="login-submit"
              type="submit"
              disabled={loading || !emailValid}
              className="w-full bg-primary hover:bg-primary-container text-white font-title-sm py-sm rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-md mt-md"
            >
              {loading ? 'Signing In…' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center font-body-sm text-on-surface-variant mt-lg">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-primary hover:underline font-title-sm">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}
