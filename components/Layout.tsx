import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Hide nav on onboarding and login
  const hideNav = location.pathname === '/onboarding' || location.pathname === '/' || location.pathname === '/login';

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans selection:bg-zinc-200">
      <main className="max-w-md mx-auto min-h-screen relative flex flex-col">
        <div className="flex-1 p-6 pb-24">
          {children}
        </div>
        
        {!hideNav && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-sm z-50">
             <nav className="bg-white/90 backdrop-blur-md border border-zinc-200 rounded-full px-6 py-4 shadow-xl shadow-zinc-200/50 flex justify-between items-center">
                <button 
                  onClick={() => navigate('/dashboard')}
                  className={`p-2 rounded-full transition-colors ${location.pathname === '/dashboard' ? 'text-zinc-900 bg-zinc-100' : 'text-zinc-400 hover:text-zinc-600'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                </button>
                
                <button 
                   onClick={() => navigate('/add-meal')}
                   className="bg-zinc-900 text-white p-4 rounded-full -mt-8 border-4 border-zinc-50 shadow-lg hover:scale-105 transition-transform"
                >
                   <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>

                <button 
                  onClick={() => navigate('/profile')}
                  className={`p-2 rounded-full transition-colors ${location.pathname === '/profile' ? 'text-zinc-900 bg-zinc-100' : 'text-zinc-400 hover:text-zinc-600'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </button>
             </nav>
          </div>
        )}
      </main>
    </div>
  );
};