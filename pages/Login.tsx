import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { auth, googleProvider } from '../services/firebase';
import { Button } from '../components/Button';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { syncWithFirebase, setUser, user } = useApp();
  
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-redirect if already logged in (e.g. from local storage persistence)
  useEffect(() => {
    if (user && user.onboardingComplete) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const getAuthErrorMessage = (code: string) => {
    switch (code) {
        case 'auth/invalid-email': return 'Invalid email address format.';
        case 'auth/wrong-password': return 'Incorrect password.';
        case 'auth/email-already-in-use': return 'Email is already registered.';
        case 'auth/weak-password': return 'Password should be at least 6 characters.';
        case 'auth/user-not-found': return 'No account found with this email.';
        case 'auth/popup-closed-by-user': return 'Sign in was cancelled.';
        default: return 'Authentication failed. ' + code;
    }
  };

  const handleAuthSuccess = async (uid: string) => {
    const hasProfile = await syncWithFirebase(uid);
    if (hasProfile) {
        navigate('/dashboard');
    } else {
        navigate('/onboarding');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    if (!auth) {
        setError("Firebase API Key missing. Please check your environment variables or use Guest Mode.");
        return;
    }
    
    setError(null);
    setIsLoading(true);

    try {
      if (isSignUp) {
        // Sign Up Flow
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        if (cred.user) navigate('/onboarding');
      } else {
        // Login Flow
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        if (userCredential.user) {
            await handleAuthSuccess(userCredential.user.uid);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(getAuthErrorMessage(err.code));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!auth || !googleProvider) {
        setError("Google Sign In not configured (API Key missing).");
        return;
    }
    setError(null);
    setIsLoading(true);
    try {
        const result = await auth.signInWithPopup(googleProvider);
        if (result.user) {
            await handleAuthSuccess(result.user.uid);
        }
    } catch (err: any) {
        console.error(err);
        setError(getAuthErrorMessage(err.code));
    } finally {
        setIsLoading(false);
    }
  };

  const handleGuest = () => {
    setIsLoading(true);
    const localUser = localStorage.getItem('ni_user');
    setTimeout(() => {
        if (localUser) {
            navigate('/dashboard');
        } else {
            navigate('/onboarding');
        }
    }, 500);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center p-6 bg-zinc-50">
      <div className="text-center space-y-6 animate-fade-in mb-8">
          <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-zinc-200 overflow-hidden border border-zinc-100 p-2">
               <div className="text-5xl">🥗</div>
          </div>
          <div className="space-y-2">
              <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Dr Foodie</h1>
              <p className="text-zinc-500">
                  {isSignUp ? "Create an account to track your health." : "Sign in to your personal nutrition dashboard."}
              </p>
          </div>
      </div>

      {!auth && (
          <div className="mb-6 p-3 bg-amber-50 text-amber-700 text-xs rounded-xl border border-amber-100 text-center">
              ⚠️ Cloud features disabled (Missing API Key). <br/> You can still use Guest Mode.
          </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100 flex items-center gap-2">
           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
           {error}
        </div>
      )}

      {/* Auth Toggle Tabs */}
      <div className="flex bg-zinc-100 p-1 rounded-xl mb-6">
        <button 
          onClick={() => { setIsSignUp(false); setError(null); }}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${!isSignUp ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
        >
          Login
        </button>
        <button 
          onClick={() => { setIsSignUp(true); setError(null); }}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${isSignUp ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
        >
          Create Account
        </button>
      </div>

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

      <div className="mt-4 space-y-3">
         {/* Google Sign In */}
         <button 
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full py-3.5 px-6 rounded-xl font-medium bg-white text-zinc-700 border border-zinc-200 shadow-sm hover:bg-zinc-50 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
         >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="20px" height="20px"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/></svg>
            Sign in with Google
         </button>
      </div>

      <button onClick={handleGuest} className="mt-8 text-xs text-zinc-400 underline hover:text-zinc-600">
         Continue as Guest (Device Only)
      </button>
    </div>
  );
};