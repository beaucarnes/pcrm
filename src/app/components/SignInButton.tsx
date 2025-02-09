'use client'

import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import Link from 'next/link';

export default function SignInButton() {
  const [user, setUser] = useState(auth.currentUser);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
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
      await signInWithPopup(auth, provider);
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

  return (
    <div className="flex items-center gap-4">
      {user ? (
        <>
          <Link
            href="/contacts/new"
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 whitespace-nowrap"
          >
            Add Contact
          </Link>
          <button
            onClick={handleSignOut}
            className="text-sm font-semibold text-gray-900 hover:text-gray-700"
          >
            Sign out
          </button>
        </>
      ) : (
        <button
          onClick={signInWithGoogle}
          disabled={isSigningIn}
          className="text-sm font-semibold text-gray-900 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSigningIn ? 'Signing in...' : 'Sign in with Google'}
        </button>
      )}
    </div>
  );
} 