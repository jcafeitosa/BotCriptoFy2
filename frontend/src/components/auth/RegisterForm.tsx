import React, { useState } from 'react';
import { Input } from '../ui/Input';
import { signUp } from '../../lib/auth-client';

interface RegisterFormProps {
  onSuccess?: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accountType, setAccountType] = useState<'trader' | 'influencer'>('trader');
  const [phone, setPhone] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validations
    if (!name || !email || !password) {
      setError('Please fill in all required fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (!acceptTerms) {
      setError('Please accept the Terms of Service and Privacy Policy');
      return;
    }

    setIsLoading(true);

    console.log('═'.repeat(60));
    console.log('🚀 REGISTRATION FLOW STARTED');
    console.log('═'.repeat(60));
    console.log('Name:', name);
    console.log('Email:', email);
    console.log('Account Type:', accountType);
    console.log('Timestamp:', new Date().toISOString());

    try {
      console.log('\n1️⃣ Calling Better Auth signUp.email...');

      const { data, error: signUpError } = await signUp.email(
        {
          name,
          email,
          password,
        },
        {
          onSuccess: async () => {
            console.log('✅ Better Auth onSuccess callback triggered');
          },
          onError: (ctx) => {
            console.error('❌ Better Auth onError callback:', ctx.error);
          },
        }
      );

      console.log('Better Auth response:', { data, error: signUpError });

      if (signUpError) {
        console.error('❌ Sign up error detected:', signUpError);
        throw new Error(signUpError.message || 'Registration failed');
      }

      // Registration successful
      console.log('✅ Registration successful!');
      console.log('User data:', data?.user);

      // SECURITY: Email verification required
      console.log('\n⚠️  Email verification required');
      console.log('User must verify email before logging in');

      if (onSuccess) {
        onSuccess();
      } else {
        // Redirect to login with success message
        console.log('➡️  Redirecting to login page');
        window.location.href = '/login?registered=true';
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Account Type Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">Account Type</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setAccountType('trader')}
            disabled={isLoading}
            className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
              accountType === 'trader'
                ? 'border-cyan-400 bg-cyan-400/10 text-cyan-400'
                : 'border-white/10 bg-black text-gray-400 hover:border-white/20'
            }`}
          >
            <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <span className="text-xs font-semibold">Trader</span>
          </button>
          <button
            type="button"
            onClick={() => setAccountType('influencer')}
            disabled={isLoading}
            className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
              accountType === 'influencer'
                ? 'border-cyan-400 bg-cyan-400/10 text-cyan-400'
                : 'border-white/10 bg-black text-gray-400 hover:border-white/20'
            }`}
          >
            <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
            <span className="text-xs font-semibold">Influencer</span>
          </button>
        </div>
      </div>

      <Input
        type="text"
        label="Full Name"
        placeholder="John Doe"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        disabled={isLoading}
      />

      <div className="pt-1">
        <Input
          type="email"
          label="Email"
          placeholder="trader@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isLoading}
        />
      </div>

      <Input
        type="password"
        label="Password"
        placeholder="Min. 8 characters"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        disabled={isLoading}
      />

      <Input
        type="password"
        label="Confirm Password"
        placeholder="Re-enter your password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        required
        disabled={isLoading}
      />

      <div className="-mt-2">
        <Input
          type="tel"
          label="Phone (Optional - for Telegram MFA)"
          placeholder="+55 11 99999-9999"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={isLoading}
        />
      </div>

      {/* Terms */}
      <div className="flex justify-center pt-2">
        <label className="flex items-start space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
            required
            disabled={isLoading}
            className="mt-1 rounded border-gray-700 bg-black text-cyan-400 focus:ring-cyan-400 focus:ring-offset-black"
          />
          <span className="text-sm text-gray-400">
            I agree to the{' '}
            <a href="/terms" className="text-cyan-400 hover:text-cyan-300">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" className="text-cyan-400 hover:text-cyan-300">
              Privacy Policy
            </a>
          </span>
        </label>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-white text-black hover:bg-gray-200 transition-colors text-base font-semibold px-6 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Creating account...
          </span>
        ) : (
          'Create Account →'
        )}
      </button>

      <p className="text-center text-sm text-gray-500">
        Already have an account?{' '}
        <a href="/login" className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
          Sign in
        </a>
      </p>
    </form>
  );
};
