import { useState, useEffect } from 'react';
import { User, LogIn, UserPlus, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { authApi, profileApi } from '../api/client';
import type { User as UserType } from '../types';

interface ProfileSelectorProps {
  onProfileSelected: (profileId: string) => void;
}

type AuthMode = 'login' | 'register' | 'set-password';

export function ProfileSelector({ onProfileSelected }: ProfileSelectorProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Form fields
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  // For set-password mode (legacy users)
  const [pendingUser, setPendingUser] = useState<(UserType & { needsPassword?: boolean }) | null>(null);

  // Check if there are any users on initial load
  useEffect(() => {
    checkExistingUsers();
  }, []);

  const checkExistingUsers = async () => {
    try {
      const profiles = await profileApi.list();
      // If no users exist, show register form
      if (profiles.length === 0) {
        setMode('register');
      }
    } catch (err) {
      console.error('Failed to check profiles:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please enter username and password');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const user = await authApi.login(username.trim(), password);

      // Check if user needs to set a password (legacy user)
      if (user.needsPassword) {
        setPendingUser(user);
        setMode('set-password');
        setPassword('');
        setConfirmPassword('');
        setSubmitting(false);
        return;
      }

      localStorage.setItem('selectedProfileId', user.id);
      onProfileSelected(user.id);
    } catch (err: any) {
      setError(err.message || 'Invalid username or password');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Username and password are required');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const user = await authApi.register({
        username: username.trim(),
        email: email.trim() || undefined,
        password,
        displayName: displayName.trim() || undefined,
      });

      localStorage.setItem('selectedProfileId', user.id);
      onProfileSelected(user.id);
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingUser) return;

    if (!password) {
      setError('Please enter a password');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await authApi.setPassword(pendingUser.id, password);
      localStorage.setItem('selectedProfileId', pendingUser.id);
      onProfileSelected(pendingUser.id);
    } catch (err: any) {
      setError(err.message || 'Failed to set password');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setUsername('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setDisplayName('');
    setError('');
    setPendingUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="text-blue-500" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Workout Tracker</h1>
          <p className="text-slate-400">
            {mode === 'login' && 'Sign in to your account'}
            {mode === 'register' && 'Create your account'}
            {mode === 'set-password' && 'Set your password'}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        {/* Login Form */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="card space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Username or Email</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username or email"
                  className="input w-full !pl-10"
                  autoFocus
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="input w-full !pl-10 !pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary w-full py-3"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <LogIn size={18} />
                  Sign In
                </span>
              )}
            </button>

            <div className="text-center pt-2">
              <p className="text-slate-400 text-sm">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setMode('register');
                  }}
                  className="text-blue-400 hover:text-blue-300"
                >
                  Create one
                </button>
              </p>
            </div>
          </form>
        )}

        {/* Register Form */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="card space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Username *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a username"
                  className="input w-full !pl-10"
                  autoFocus
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your display name (optional)"
                className="input w-full"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email (optional)"
                  className="input w-full !pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Password *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password (min 6 characters)"
                  className="input w-full !pl-10 !pr-10"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Confirm Password *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  className="input w-full !pl-10"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary w-full py-3"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <UserPlus size={18} />
                  Create Account
                </span>
              )}
            </button>

            <div className="text-center pt-2">
              <p className="text-slate-400 text-sm">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setMode('login');
                  }}
                  className="text-blue-400 hover:text-blue-300"
                >
                  Sign in
                </button>
              </p>
            </div>
          </form>
        )}

        {/* Set Password Form (for legacy users) */}
        {mode === 'set-password' && pendingUser && (
          <form onSubmit={handleSetPassword} className="card space-y-4">
            <div className="text-center mb-4">
              <p className="text-slate-300">
                Welcome back, <strong>{pendingUser.displayName || pendingUser.username}</strong>!
              </p>
              <p className="text-slate-400 text-sm mt-1">
                Please set a password to secure your account.
              </p>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">New Password *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password (min 6 characters)"
                  className="input w-full !pl-10 !pr-10"
                  autoFocus
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Confirm Password *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  className="input w-full !pl-10"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary w-full py-3"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Setting password...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Lock size={18} />
                  Set Password & Continue
                </span>
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setMode('login');
                }}
                className="text-slate-400 text-sm hover:text-slate-300"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
