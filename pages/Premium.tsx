import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Button } from '../components/Button';

// Declare Razorpay on window for TypeScript
declare global {
  interface Window {
    Razorpay: any;
  }
}

export const Premium: React.FC = () => {
  const { user, setUser } = useApp();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const activatePremium = async () => {
      if (user) {
          const updatedUser = { ...user, isPremium: true };
          await setUser(updatedUser);
          navigate('/profile');
      } else {
        setIsLoading(false);
      }
  };

  const simulatePremiumUpgrade = async () => {
    // Mock payment delay for demonstration or fallback
    await new Promise(resolve => setTimeout(resolve, 2000));
    await activatePremium();
  };

  const handleUpgrade = async () => {
    setIsLoading(true);

    // Check if Razorpay is loaded via script tag in index.html
    if (window.Razorpay) {
      try {
        const options = {
          key: "rzp_test_1DP5mmOlF5G5ag", // Test Key
          amount: 999, // 9.99 USD in cents (or approx in currency units)
          currency: "USD",
          name: "Dr Foodie",
          description: "Premium Upgrade",
          image: "https://www.foodieqr.com/assets/img/og_img.png",
          handler: async function (response: any) {
            console.log("Payment Success:", response);
            await activatePremium();
          },
          prefill: {
            name: user?.name || "Dr Foodie User",
            email: "user@example.com",
            contact: "9999999999"
          },
          theme: {
            color: "#f59e0b"
          },
          modal: {
            ondismiss: function() {
              setIsLoading(false);
            }
          }
        };
        
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response: any){
            console.error(response.error);
            alert("Payment failed. Please try again.");
            setIsLoading(false);
        });
        rzp.open();
      } catch (error) {
        console.error("Razorpay Initialization Error:", error);
        // Fallback to simulation if initialization fails (e.g. network blocker)
        await simulatePremiumUpgrade();
      }
    } else {
      // Fallback if script not loaded
      console.warn("Razorpay script not found. Using simulation.");
      await simulatePremiumUpgrade();
    }
  };

  return (
    <div className="flex flex-col min-h-screen pt-4 pb-32 animate-fade-in relative">
       {/* Header */}
       <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate('/profile')} className="p-2 -ml-2 rounded-full hover:bg-zinc-100">
           <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <h1 className="text-xl font-bold">Premium Plan</h1>
        <div className="w-8"></div> {/* spacer */}
      </div>

      {/* Hero Card */}
      <div className="bg-gradient-to-br from-amber-300 via-amber-400 to-yellow-500 p-8 rounded-3xl text-amber-950 shadow-xl shadow-amber-200/50 relative overflow-hidden mb-8">
         <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/20 rounded-full blur-2xl"></div>
         <div className="relative z-10 text-center space-y-2 py-4">
            <span className="inline-block text-[10px] font-bold tracking-widest uppercase bg-white/40 px-3 py-1 rounded-full text-amber-900 mb-2">Dr Foodie Gold</span>
            <h2 className="text-3xl font-black tracking-tight leading-none text-amber-950">Unlock<br/>Everything.</h2>
         </div>
      </div>

      {/* Benefits */}
      <div className="space-y-4 flex-1">
        <h3 className="font-bold text-lg px-1 text-zinc-900">Premium Benefits</h3>
        
        <div className="bg-white p-4 rounded-2xl border border-zinc-100 flex items-center gap-4 shadow-sm">
           <div className="w-12 h-12 rounded-xl bg-zinc-900 text-white flex items-center justify-center text-2xl shadow-lg shadow-zinc-200">🎨</div>
           <div>
              <h4 className="font-bold text-zinc-900">Exclusive Themes</h4>
              <p className="text-xs text-zinc-500">Access Dark Mode and Gold Theme.</p>
           </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-zinc-100 flex items-center gap-4 shadow-sm">
           <div className="w-12 h-12 rounded-xl bg-zinc-900 text-white flex items-center justify-center text-2xl shadow-lg shadow-zinc-200">⚡</div>
           <div>
              <h4 className="font-bold text-zinc-900">Priority Analysis</h4>
              <p className="text-xs text-zinc-500">Skip the queue with faster results.</p>
           </div>
        </div>
        
         <div className="bg-white p-4 rounded-2xl border border-zinc-100 flex items-center gap-4 shadow-sm">
           <div className="w-12 h-12 rounded-xl bg-zinc-900 text-white flex items-center justify-center text-2xl shadow-lg shadow-zinc-200">💎</div>
           <div>
              <h4 className="font-bold text-zinc-900">Unlimited Logs</h4>
              <p className="text-xs text-zinc-500">Track as many meals as you want.</p>
           </div>
        </div>
      </div>

      {/* Footer Action */}
      <div className="fixed bottom-0 left-0 w-full p-6 bg-white border-t border-zinc-200 z-50 pb-8">
         <div className="max-w-md mx-auto flex items-center gap-6">
            <div className="flex-1">
               <span className="block text-xs text-zinc-400 uppercase font-medium">One-time payment</span>
               <span className="block text-3xl font-bold text-zinc-900 tracking-tight">$9.99</span>
            </div>
            <Button onClick={handleUpgrade} isLoading={isLoading} className="!w-auto px-8 bg-zinc-900 text-white shadow-xl shadow-zinc-300 hover:shadow-zinc-400 hover:scale-105">
               Upgrade
            </Button>
         </div>
      </div>
    </div>
  );
};