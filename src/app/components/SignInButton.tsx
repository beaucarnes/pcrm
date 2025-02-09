'use client'

import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { GoogleAuthProvider, signInWithRedirect, getRedirectResult, signOut } from 'firebase/auth';

export default function SignInButton() {
  const [user, setUser] = useState(auth.currentUser);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
    });

    // Check for redirect result
    getRedirectResult(auth).then(() => {
      setIsSigningIn(false);
    }).catch((error) => {
      console.error('Error getting redirect result:', error);
      setIsSigningIn(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setIsSigningIn(true);
    const provider = new GoogleAuthProvider();
    // Force account selection even when one account is available
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    
    try {
      await signInWithRedirect(auth, provider);
    } catch (error) {
      console.error('Error signing in with Google', error);
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out', error);
    }
  };

  if (user) {
    return (
      <button
        onClick={handleSignOut}
        className="text-sm font-semibold text-gray-900 hover:text-gray-700"
      >
        Sign out
      </button>
    );
  }

  return (
    <button
      onClick={signInWithGoogle}
      disabled={isSigningIn}
      className="text-sm font-semibold text-gray-900 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isSigningIn ? 'Signing in...' : 'Sign in with Google'}
    </button>
  );
} 