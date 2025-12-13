import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Button } from '../components/Button';

// Declare Razorpay on window and our global constants
declare global {
  interface Window {
    Razorpay: any;
  }
}
declare const __RAZORPAY_KEY__: string;
declare const __RAZORPAY_PLAN_ID__: string;

export const Premium: React.FC = () => {
  const { user, setUser } = useApp();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  // Helper to decode obfuscated keys
  const getDeobfuscatedKey = (obfuscated: string) => {
    try {
        const reversed = atob(obfuscated);
        return reversed.split('').reverse().join('');
    } catch (e) {
        console.error("Failed to decode key");
        return "";
    }
  };

  const createSubscriptionId = async (planId: string) => {
    // IMPORTANT: In a real production app, this function should call YOUR backend.
    // Your backend would then call Razorpay API (https://api.razorpay.com/v1/subscriptions)
    // using your Key ID and Secret Key to generate a 'sub_xxx' ID.
    // We cannot do this here safely because it requires the Secret Key.
    
    // Example Backend Call:
    // const res = await fetch('https://your-api.com/create-subscription', { 
    //    method: 'POST', 
    //    body: JSON.stringify({ plan_id: planId }) 
    // });
    // const data = await res.json();
    // return data.subscription_id;

    console.warn("Backend not connected: Cannot generate real Subscription ID for Auto-Pay.");
    return null; 
  };

  const handleUpgrade = async () => {
    setIsLoading(true);
    
    const key = getDeobfuscatedKey(__RAZORPAY_KEY__);
    const planId = getDeobfuscatedKey(__RAZORPAY_PLAN_ID__);

    if (!key) {
        alert("Configuration Error: RAZORPAY_KEY_ID is missing in environment variables.");
        setIsLoading(false);
        return;
    }

    // 1. Try to get a Subscription ID (for Recurring/Auto-Pay)
    let subscriptionId = null;
    if (planId) {
        subscriptionId = await createSubscriptionId(planId);
    }

    // 2. Configure Options
    // If we have a subscriptionId, we use the Subscription Flow (Recurring).
    // If not, we fall back to One-Time Payment Flow so the app doesn't break.
    
    const options: any = {
        key: key,
        name: "Dr Foodie Premium",
        description: "Monthly Subscription (Auto-Pay)",
        image: "https://www.foodieqr.com/assets/img/og_img.png",
        handler: async function (response: any) {
            // Success Callback
            // Check for subscription_id or payment_id
            if (response.razorpay_payment_id || response.razorpay_subscription_id) {
                if (user) {
                    const updatedUser = { ...user, isPremium: true };
                    await setUser(updatedUser);
                    navigate('/profile');
                }
            }
            setIsLoading(false);
        },
        prefill: {
            name: user?.name || "",
            email: "user@example.com", // Recommended to prefill for better success rate
            contact: ""
        },
        notes: {
            address: "Dr Foodie App"
        },
        theme: {
            color: "#18181b"
        },
        modal: {
            ondismiss: function() {
                setIsLoading(false);
            }
        }
    };

    if (subscriptionId) {
        // RECURRING FLOW (UPI Auto-Pay)
        options.subscription_id = subscriptionId;
        // Do NOT pass 'amount' for subscriptions, it's determined by the Plan
    } else {
        // ONE-TIME FLOW (Fallback)
        // If we couldn't generate a subscription ID (no backend), we process a one-time charge.
        options.amount = 4900; // 49.00 INR
        options.currency = "INR";
        if (planId) {
            console.log("Note: Falling back to one-time payment because subscription_id could not be generated client-side.");
        }
    }

    try {
        const rzp1 = new window.Razorpay(options);
        rzp1.open();
        
        rzp1.on('payment.failed', function (response: any){
            alert("Payment Failed: " + (response.error.description || response.error.reason));
            setIsLoading(false);
        });
    } catch (e) {
        console.error("Razorpay Error:", e);
        alert("Failed to initiate payment. Please try again.");
        setIsLoading(false);
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

      {/* Footer Action - Monthly Subscription */}
      <div className="fixed bottom-0 left-0 w-full p-6 bg-white border-t border-zinc-200 z-50 pb-8">
         <div className="max-w-md mx-auto flex items-center gap-6">
            <div className="flex-1">
               <div className="flex items-center gap-2">
                 <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded uppercase">Auto-Pay</span>
               </div>
               <div className="flex items-baseline gap-1">
                  <span className="block text-3xl font-bold text-zinc-900 tracking-tight">₹49</span>
                  <span className="text-sm text-zinc-500 font-medium">/ month</span>
               </div>
            </div>
            <Button onClick={handleUpgrade} isLoading={isLoading} className="!w-auto px-8 bg-zinc-900 text-white shadow-xl shadow-zinc-300 hover:shadow-zinc-400 hover:scale-105">
               Subscribe
            </Button>
         </div>
      </div>
    </div>
  );
};