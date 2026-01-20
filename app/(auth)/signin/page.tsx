'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SignInPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Check if we're in development mode (client-side check)
  // Note: process.env.NODE_ENV is replaced at build time by Next.js
  // In production, it will be 'production', in dev it will be 'development'
  const isDevelopment = typeof window !== 'undefined' && 
    (process.env.NODE_ENV === 'development' || 
     (typeof window !== 'undefined' && window.location.hostname === 'localhost'));

  const handleMicrosoftSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await signIn('azure-ad', {
        callbackUrl: '/chat',
        redirect: false,
      });

      if (result?.error) {
        if (result.error === 'AccessDenied') {
          setError('Access Denied: Only authorized @cloudextel.com users are allowed. Please contact your administrator if you need access.');
        } else {
          setError(`Failed to sign in: ${result.error}`);
        }
        setLoading(false);
      } else if (result?.ok) {
        window.location.href = '/chat';
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      setError(`Failed to sign in: ${error.message || 'Unknown error'}`);
      setLoading(false);
    }
  };

  const handleSkipLogin = () => {
    console.log('Skip login clicked, isDevelopment:', isDevelopment);
    // Store a test session flag in localStorage and cookie for development
    // Always allow in development or on localhost
    if (isDevelopment || typeof window !== 'undefined') {
      try {
        localStorage.setItem('dev-bypass-auth', 'true');
        // Set cookie for server-side access
        document.cookie = 'dev-bypass-auth=true; path=/; max-age=86400'; // 24 hours
        console.log('Dev bypass set, redirecting to /chat');
        // Use window.location for a full page reload to ensure middleware picks up the cookie
        window.location.href = '/chat';
      } catch (error) {
        console.error('Error setting dev bypass:', error);
        setError('Failed to set dev bypass. Please check console.');
      }
    } else {
      console.warn('Dev bypass not available - not in development mode');
      setError('Dev bypass is only available in development mode');
    }
  };

  return (
    <main className="min-h-screen grid place-items-center p-6 bg-black">
      <div className="max-w-md w-full bg-[#111111] border border-[#333333] rounded-lg p-8 space-y-6">
        {/* Logo and Brand */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">DOA</span>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              DOA Chatbot
            </h1>
          </div>
          <p className="text-lg text-gray-400">
            Delegation of Authority Query System
          </p>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            Ask questions about company policies and approval requirements
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Sign In Options */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleMicrosoftSignIn}
            disabled={loading}
            className="flex items-center justify-center gap-3 bg-white border border-gray-300 rounded-lg px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 23 23" fill="none">
              <path fill="#f25022" d="M0 0h11.5v11.5H0z"/>
              <path fill="#00a4ef" d="M11.5 0H23v11.5H11.5z"/>
              <path fill="#7fba00" d="M0 11.5h11.5V23H0z"/>
              <path fill="#ffb900" d="M11.5 11.5H23V23H11.5z"/>
            </svg>
            {loading ? 'Signing in...' : 'Continue with Microsoft'}
          </button>
          
          <button
            onClick={handleSkipLogin}
            disabled={loading}
            className="flex items-center justify-center gap-3 bg-yellow-600 hover:bg-yellow-700 text-white border border-yellow-700 rounded-lg px-6 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Continue without Login (Dev Only)
          </button>
        </div>

        {/* Footer */}
        <div className="text-center pt-4 border-t border-[#333333]">
          <p className="text-xs text-gray-500">
            Access restricted to authorized @cloudextel.com users only
          </p>
        </div>
      </div>
    </main>
  );
}
