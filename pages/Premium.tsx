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
declare const __RAZORPAY_SUBSCRIPTION_ID__: string;

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
    // 1. Check for hardcoded/env testing ID (Useful for testing without backend)
    // To test Auto-Pay: Create a subscription in Razorpay Dashboard, get the 'sub_xxx' ID, 
    // and add RAZORPAY_SUBSCRIPTION_ID to your .env file.
    const envSubId = getDeobfuscatedKey(__RAZORPAY_SUBSCRIPTION_ID__);
    if (envSubId) return envSubId;

    // 2. Try to fetch from a standard backend endpoint
    // In production, your backend should create the subscription via Razorpay API.
    try {
      const response = await fetch('/api/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: planId })
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.subscription_id;
      }
    } catch (e) {
      // Backend not available
    }

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

    const options: any = {
        key: key,
        name: "Dr Foodie Premium",
        description: "Monthly Subscription (Auto-Pay)",
        image: "https://www.foodieqr.com/assets/img/og_img.png",
        handler: async function (response: any) {
            // Success Callback
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
            email: "user@example.com", 
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

    // LOGIC: If a Plan ID is present, we STRICTLY enforce the Subscription flow.
    // We do NOT fallback to one-time payment, as that causes confusion.
    if (planId) {
        // RECURRING FLOW (UPI Auto-Pay)
        const subscriptionId = await createSubscriptionId(planId);
        
        if (subscriptionId) {
            options.subscription_id = subscriptionId;
            // 'amount' must be omitted for subscriptions
        } else {
             alert(
                "Configuration Error: Recurring Payment requires a 'subscription_id'.\n\n" +
                "Since no backend is connected to generate one dynamically, please:\n" +
                "1. Create a Subscription manually in Razorpay Dashboard for your Plan.\n" +
                "2. Add the 'sub_...' ID as 'RAZORPAY_SUBSCRIPTION_ID' in your environment variables."
             );
             setIsLoading(false);
             return;
        }
    } else {
        // ONE-TIME FLOW (Only used if no Plan ID is configured)
        options.amount = 4900; // 49.00 INR
        options.currency = "INR";
        console.log("Using One-Time Payment flow (RAZORPAY_PLAN_ID not found).");
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