import React, { useState } from 'react';
import { Input } from '../ui/Input';
import { signIn } from '../../lib/auth-client';
import { fetchUserProfile, redirectToDashboard, type ProfileType } from '../../lib/auth-utils';

interface LoginFormProps {
  onSuccess?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    console.log('═'.repeat(60));
    console.log('🚀 LOGIN FLOW STARTED');
    console.log('═'.repeat(60));
    console.log('Email:', email);
    console.log('Remember Me:', rememberMe);
    console.log('Timestamp:', new Date().toISOString());

    try {
      // SECURITY & PERFORMANCE: Usar cliente oficial Better Auth
      console.log('\n1️⃣ Calling Better Auth signIn.email...');
      
      const { data, error: signInError } = await signIn.email(
        {
          email,
          password,
          rememberMe,
        },
        {
          onSuccess: async () => {
            console.log('✅ Better Auth onSuccess callback triggered');
            console.log('Remember Me setting:', rememberMe);
          },
          onError: (ctx) => {
            console.error('❌ Better Auth onError callback:', ctx.error);
          },
        }
      );

      console.log('Better Auth response:', { data, error: signInError });

      if (signInError) {
        console.error('❌ Sign in error detected:', signInError);
        throw new Error(signInError.message || 'Login failed');
      }

      // Login successful
      console.log('✅ Authentication successful!');
      console.log('User data:', data?.user);
      console.log('Session data:', data?.session);
      console.log('Remember Me was set to:', rememberMe);

      // SECURITY & UX: Aguardar cookie de sessão ser estabelecido
      // Better Auth usa cookies httpOnly que precisam ser propagados
      console.log('\n2️⃣  Waiting for session cookie to be established...');
      await new Promise(resolve => setTimeout(resolve, 500)); // 500ms para cookie propagation

      // SOLUÇÃO: Redirecionar para dashboard genérico
      // O middleware do Astro vai verificar a sessão e redirecionar corretamente
      if (onSuccess) {
        onSuccess();
      } else {
        console.log('✅ User logged in successfully');
        console.log('➡️  Navigating to /dashboard (will redirect based on profile)');
        
        // PERFORMANCE: Usar reload completo para garantir que middleware seja executado
        window.location.href = '/dashboard';
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'Invalid email or password');
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

      <Input
        type="email"
        label="Email"
        placeholder="trader@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        disabled={isLoading}
      />

      <Input
        type="password"
        label="Password"
        placeholder="Enter your password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        disabled={isLoading}
      />

      <div className="flex items-center justify-between">
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="rounded border-gray-700 bg-black text-cyan-400 focus:ring-cyan-400 focus:ring-offset-black"
            disabled={isLoading}
          />
          <span className="ml-2 text-sm text-gray-400">Remember me</span>
        </label>

        <a
          href="/forgot-password"
          className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          Forgot password?
        </a>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-white text-black hover:bg-gray-200 transition-colors text-base font-semibold px-6 py-3.5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
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
            Signing in...
          </span>
        ) : (
          'Sign In →'
        )}
      </button>

      <p className="text-center text-sm text-gray-500">
        Don't have an account?{' '}
        <a
          href="/register"
          className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
        >
          Sign up for free
        </a>
      </p>
    </form>
  );
};
