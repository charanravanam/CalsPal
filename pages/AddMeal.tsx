import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Button } from '../components/Button';
import { analyzeMealWithGemini, generateFoodImage } from '../services/geminiService';
import { MealType, MealLog } from '../types';

export const AddMeal: React.FC = () => {
  const { user, addMeal } = useApp();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<'camera' | 'text'>('camera');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  const [mealType, setMealType] = useState<MealType>(MealType.LUNCH);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!user) return;
    
    // --- FREE PLAN LIMIT CHECK ---
    const FREE_LIMIT = 3;
    const currentScans = user.scanCount || 0;
    
    if (!user.isPremium && currentScans >= FREE_LIMIT) {
        if (window.confirm(`You've reached your limit of ${FREE_LIMIT} free scans.\n\nUnlock unlimited scans and premium themes for just ₹49/month!`)) {
            navigate('/premium');
        }
        return;
    }
    // -----------------------------

    if (mode === 'camera' && !imagePreview) return;
    if (mode === 'text' && !textInput) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      // Create promises for both analysis and image generation (if needed)
      const analysisPromise = analyzeMealWithGemini(
        mode === 'camera' ? (imagePreview as string) : undefined,
        mode === 'text' ? textInput : undefined,
        user
      );

      // If text mode, try to generate an image in parallel to fill the placeholder
      let imageGenerationPromise: Promise<string | null> = Promise.resolve(null);
      if (mode === 'text' && textInput) {
        imageGenerationPromise = generateFoodImage(textInput);
      }

      // Wait for both results
      const [analysis, generatedImage] = await Promise.all([analysisPromise, imageGenerationPromise]);

      const newMeal: MealLog = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        type: mealType,
        imageUri: (mode === 'camera' ? imagePreview : generatedImage) || undefined,
        textInput: textInput || undefined,
        analysis
      };

      await addMeal(newMeal);
      navigate(`/report/${newMeal.id}`);
      
    } catch (err: any) {
      console.error(err);
      if (err.message && err.message.includes("API_KEY")) {
         setError("Configuration Error: API Key is missing.");
      } else {
         setError("Failed to analyze meal. Please try again.");
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="h-full flex flex-col pt-4">
      <div className="flex items-center justify-between mb-6">
         <h1 className="text-2xl font-bold">Log Meal</h1>
         <button onClick={() => navigate('/dashboard')} className="text-sm text-zinc-500">Cancel</button>
      </div>
      
      {!user?.isPremium && (
         <div className="mb-4 px-4 py-2 bg-amber-50 text-amber-800 text-xs rounded-lg border border-amber-100 flex justify-between items-center">
             <span>Free Scans: <strong>{3 - (user?.scanCount || 0)} left</strong></span>
             <button onClick={() => navigate('/premium')} className="underline font-bold">Upgrade</button>
         </div>
      )}

      {/* Mode Switcher */}
      <div className="bg-zinc-100 p-1 rounded-xl flex mb-6">
        <button 
          onClick={() => { setMode('camera'); setError(null); }}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'camera' ? 'bg-white shadow text-zinc-900' : 'text-zinc-500'}`}
        >
          Photo
        </button>
        <button 
           onClick={() => { setMode('text'); setError(null); }}
           className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'text' ? 'bg-white shadow text-zinc-900' : 'text-zinc-500'}`}
        >
          Text
        </button>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto no-scrollbar pb-20">
        
        {/* Camera Mode */}
        {mode === 'camera' && (
          <div className="space-y-4">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`w-full aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors relative overflow-hidden ${imagePreview ? 'border-zinc-900' : 'border-zinc-200 hover:border-zinc-300 bg-zinc-50'}`}
            >
               {imagePreview ? (
                 <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
               ) : (
                 <>
                   <div className="w-16 h-16 rounded-full bg-zinc-200 flex items-center justify-center mb-3">
                     <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                   </div>
                   <p className="text-zinc-500 font-medium">Tap to take photo</p>
                 </>
               )}
               <input 
                 ref={fileInputRef} 
                 type="file" 
                 accept="image/*" 
                 className="hidden" 
                 onChange={handleFileChange} 
               />
               {imagePreview && (
                 <button 
                   onClick={(e) => { e.stopPropagation(); setImagePreview(null); }}
                   className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full backdrop-blur"
                 >
                   <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                 </button>
               )}
            </div>
            {/* Disclaimer for demo */}
            <p className="text-xs text-zinc-400 text-center">Tip: For best results, ensure good lighting and clear view of food.</p>
          </div>
        )}

        {/* Text Mode */}
        {mode === 'text' && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700">What did you eat?</label>
            <textarea 
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="e.g. Grilled chicken breast with roasted vegetables and quinoa..."
              className="w-full h-40 p-4 bg-white border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-zinc-900 resize-none"
            />
             <p className="text-xs text-zinc-400">We'll automatically generate an image of your meal from Google for you.</p>
          </div>
        )}

        {/* Meal Type & Actions */}
        <div className="space-y-4">
          <label className="text-sm font-medium text-zinc-700">Meal Type</label>
          <div className="grid grid-cols-4 gap-2">
            {Object.values(MealType).map((t) => (
              <button
                key={t}
                onClick={() => setMealType(t)}
                className={`py-2 text-xs font-semibold rounded-lg border transition-colors ${mealType === t ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100 flex items-center gap-2 animate-fade-in">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {error}
          </div>
        )}

        <Button 
          onClick={handleAnalyze} 
          isLoading={isAnalyzing}
          disabled={mode === 'camera' ? !imagePreview : !textInput}
        >
          {isAnalyzing ? (mode === 'text' ? 'Analysing & Generating Image...' : 'Analyzing Meal...') : 'Analyze Meal'}
        </Button>

      </div>
    </div>
  );
};