import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { auth } from '../services/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { Button } from '../components/Button';
import { Card } from '../components/Card';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { syncWithFirebase, setUser } = useApp();
  
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAuthErrorMessage = (code: string) => {
    switch (code) {
        case 'auth/invalid-email': return 'Invalid email address format.';
        case 'auth/wrong-password': return 'Incorrect password.';
        case 'auth/email-already-in-use': return 'Email is already registered.';
        case 'auth/weak-password': return 'Password should be at least 6 characters.';
        case 'auth/user-not-found': return 'No account found with this email.';
        default: return 'Authentication failed. ' + code;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }
    
    setError(null);
    setIsLoading(true);

    try {
      if (isSignUp) {
        // Sign Up Flow
        await createUserWithEmailAndPassword(auth, email, password);
        // After signup, go to onboarding to create profile
        navigate('/onboarding');
      } else {
        // Login Flow
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;
        
        // Fetch data
        const hasProfile = await syncWithFirebase(uid);
        
        if (hasProfile) {
          navigate('/dashboard');
        } else {
          // User exists in Auth but no profile in Firestore (rare, or interrupted signup)
          navigate('/onboarding');
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(getAuthErrorMessage(err.code));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuest = () => {
    // Clear any previous session
    setUser(null);
    // Proceed to onboarding as a fresh "guest"
    const localUser = localStorage.getItem('ni_user');
    if (localUser) {
        navigate('/dashboard');
    } else {
        navigate('/onboarding');
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center p-6 bg-zinc-50">
      <div className="text-center space-y-6 animate-fade-in mb-8">
          <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-zinc-200 overflow-hidden border border-zinc-100 p-2">
              <img 
                src="https://www.foodieqr.com/assets/img/og_img.png" 
                alt="Dr Foodie Logo" 
                className="w-full h-full object-contain"
              />
          </div>
          <div className="space-y-2">
              <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Dr Foodie</h1>
              <p className="text-zinc-500">Sign in to track your meals and health goals.</p>
          </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100 flex items-center gap-2">
           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
           {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <input 
          type="email" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address" 
          className="w-full p-4 bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all text-sm"
        />
        <input 
          type="password" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password" 
          className="w-full p-4 bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all text-sm"
        />
        
        <Button isLoading={isLoading} type="submit" className="mt-2">
          {isSignUp ? "Create Account" : "Sign In"}
        </Button>
      </form>

      <div className="mt-4 grid grid-cols-1 gap-3">
         <Button variant="secondary" onClick={() => { setIsSignUp(!isSignUp); setError(null); }}>
            {isSignUp ? "Switch to Sign In" : "Create Account"}
         </Button>
      </div>

      <button onClick={handleGuest} className="mt-6 text-xs text-zinc-400 underline hover:text-zinc-600">
         Continue as Guest (Device Only)
      </button>
    </div>
  );
};