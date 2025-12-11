import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Goal, Gender, ActivityLevel, UserProfile } from '../types';
import { Button } from '../components/Button';

export const Onboarding: React.FC = () => {
  const { setUser, user } = useApp();
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    name: user?.name || '',
    age: user?.age || 30,
    height: user?.height || 170,
    weight: user?.weight || 70,
    gender: user?.gender || Gender.MALE,
    activityLevel: user?.activityLevel || ActivityLevel.MODERATE,
    goal: user?.goal || [Goal.MAINTAIN], // Initialize as array
  });

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const toggleGoal = (selectedGoal: Goal) => {
    const currentGoals = formData.goal || [];
    if (currentGoals.includes(selectedGoal)) {
      // Don't allow empty goals, keep at least one
      if (currentGoals.length > 1) {
        setFormData({ ...formData, goal: currentGoals.filter(g => g !== selectedGoal) });
      }
    } else {
      setFormData({ ...formData, goal: [...currentGoals, selectedGoal] });
    }
  };

  const calculateTDEE = (data: Partial<UserProfile>) => {
    // Harris-Benedict Equation
    let bmr = 0;
    if (data.gender === Gender.MALE) {
      bmr = 88.362 + (13.397 * (data.weight || 70)) + (4.799 * (data.height || 170)) - (5.677 * (data.age || 30));
    } else {
      bmr = 447.593 + (9.247 * (data.weight || 70)) + (3.098 * (data.height || 170)) - (4.330 * (data.age || 30));
    }

    let multiplier = 1.2;
    switch (data.activityLevel) {
      case ActivityLevel.SEDENTARY: multiplier = 1.2; break;
      case ActivityLevel.LIGHT: multiplier = 1.375; break;
      case ActivityLevel.MODERATE: multiplier = 1.55; break;
      case ActivityLevel.VERY: multiplier = 1.725; break;
    }

    let tdee = bmr * multiplier;

    // Multi-Goal adjustment logic
    // We sum up the adjustments.
    // Example: Lose (-500) + Build Muscle (+250) = Net -250 (Recomposition)
    if (data.goal) {
        if (data.goal.includes(Goal.LOSE)) tdee -= 500;
        if (data.goal.includes(Goal.GAIN)) tdee += 300;
        // Maintain adds 0
    }

    return Math.round(tdee);
  };

  const finishOnboarding = async () => {
    const dailyTarget = calculateTDEE(formData);
    const finalProfile: UserProfile = {
      ...formData as UserProfile,
      dailyCalorieTarget: dailyTarget,
      onboardingComplete: true
    };
    await setUser(finalProfile);
    navigate('/dashboard');
  };

  return (
    <div className="flex flex-col h-full pt-10">
      <div className="flex-1 space-y-8 animate-fade-in">
        <div className="space-y-2">
          <p className="text-zinc-400 text-sm font-medium tracking-widest uppercase">Step {step} of 3</p>
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">
            {step === 1 && "Tell us about yourself."}
            {step === 2 && "What are your goals?"}
            {step === 3 && "Let's check the numbers."}
          </h1>
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700">First Name</label>
              <input 
                type="text" 
                className="w-full p-4 bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="e.g. Alex"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                 <label className="text-sm font-medium text-zinc-700">Age</label>
                 <input type="number" className="w-full p-4 bg-white border border-zinc-200 rounded-xl" value={formData.age} onChange={e => setFormData({...formData, age: Number(e.target.value)})} />
              </div>
              <div className="space-y-2">
                 <label className="text-sm font-medium text-zinc-700">Gender</label>
                 <select className="w-full p-4 bg-white border border-zinc-200 rounded-xl" value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value as Gender})}>
                   {Object.values(Gender).map(g => <option key={g} value={g}>{g}</option>)}
                 </select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                 <label className="text-sm font-medium text-zinc-700">Height (cm)</label>
                 <input type="number" className="w-full p-4 bg-white border border-zinc-200 rounded-xl" value={formData.height} onChange={e => setFormData({...formData, height: Number(e.target.value)})} />
              </div>
              <div className="space-y-2">
                 <label className="text-sm font-medium text-zinc-700">Weight (kg)</label>
                 <input type="number" className="w-full p-4 bg-white border border-zinc-200 rounded-xl" value={formData.weight} onChange={e => setFormData({...formData, weight: Number(e.target.value)})} />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-zinc-500 mb-2">You can select multiple goals.</p>
            {Object.values(Goal).map((g) => {
              const isSelected = formData.goal?.includes(g);
              return (
                <button
                  key={g}
                  onClick={() => toggleGoal(g)}
                  className={`w-full p-6 text-left rounded-2xl border-2 transition-all relative ${isSelected ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-100 bg-white hover:border-zinc-200'}`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold block">{g}</span>
                    {isSelected && <span className="text-zinc-900 text-xl">✓</span>}
                  </div>
                  <span className="text-sm text-zinc-500">
                    {g === Goal.LOSE && "Focus on deficit and nutrient density."}
                    {g === Goal.MAINTAIN && "Balanced approach for sustainable health."}
                    {g === Goal.GAIN && "Surplus calories with protein priority."}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {step === 3 && (
          <div className="bg-white rounded-2xl p-8 border border-zinc-100 shadow-sm text-center space-y-4">
             <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto text-2xl">🎯</div>
             <h2 className="text-xl font-semibold">Your Daily Target</h2>
             <div className="text-5xl font-bold tracking-tighter text-zinc-900">
                {calculateTDEE(formData)}
                <span className="text-lg font-normal text-zinc-400 ml-2">kcal</span>
             </div>
             <div className="text-zinc-500 leading-relaxed text-sm">
                Based on your profile, this target will help you achieve:
                <div className="flex flex-wrap justify-center gap-2 mt-2">
                   {formData.goal?.map(g => (
                      <span key={g} className="px-2 py-1 bg-zinc-100 rounded-md text-xs font-bold text-zinc-700 uppercase">{g}</span>
                   ))}
                </div>
             </div>
          </div>
        )}
      </div>

      <div className="mt-8 flex gap-4">
        {step > 1 && <Button variant="secondary" onClick={handleBack}>Back</Button>}
        {step < 3 ? (
          <Button onClick={handleNext}>Continue</Button>
        ) : (
          <Button onClick={finishOnboarding}>Get Started</Button>
        )}
      </div>
    </div>
  );
};