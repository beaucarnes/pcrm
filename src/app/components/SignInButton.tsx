'use client'

import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

export default function SignInButton() {
  const [user, setUser] = useState(auth.currentUser);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    // Force account selection even when one account is available
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Error signing in with Google', error);
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
      className="text-sm font-semibold text-gray-900 hover:text-gray-700"
    >
      Sign in with Google
    </button>
  );
} 