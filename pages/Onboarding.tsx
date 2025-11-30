import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Goal, Gender, ActivityLevel, UserProfile } from '../types';
import { Button } from '../components/Button';

export const Onboarding: React.FC = () => {
  const { setUser } = useApp();
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    name: '',
    age: 30,
    height: 170,
    weight: 70,
    gender: Gender.MALE,
    activityLevel: ActivityLevel.MODERATE,
    goal: Goal.MAINTAIN,
  });

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

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

    // Goal adjustment
    if (data.goal === Goal.LOSE) tdee -= 500;
    if (data.goal === Goal.GAIN) tdee += 300;

    return Math.round(tdee);
  };

  const finishOnboarding = () => {
    const dailyTarget = calculateTDEE(formData);
    const finalProfile: UserProfile = {
      ...formData as UserProfile,
      dailyCalorieTarget: dailyTarget,
      onboardingComplete: true
    };
    setUser(finalProfile);
    navigate('/dashboard');
  };

  return (
    <div className="flex flex-col h-full pt-10">
      <div className="flex-1 space-y-8 animate-fade-in">
        <div className="space-y-2">
          <p className="text-zinc-400 text-sm font-medium tracking-widest uppercase">Step {step} of 3</p>
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">
            {step === 1 && "Tell us about yourself."}
            {step === 2 && "What is your main goal?"}
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
            {Object.values(Goal).map((g) => (
              <button
                key={g}
                onClick={() => setFormData({...formData, goal: g})}
                className={`w-full p-6 text-left rounded-2xl border-2 transition-all ${formData.goal === g ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-100 bg-white hover:border-zinc-200'}`}
              >
                <span className="text-lg font-semibold block">{g}</span>
                <span className="text-sm text-zinc-500">
                  {g === Goal.LOSE && "Focus on deficit and nutrient density."}
                  {g === Goal.MAINTAIN && "Balanced approach for sustainable health."}
                  {g === Goal.GAIN && "Surplus calories with protein priority."}
                </span>
              </button>
            ))}
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
             <p className="text-zinc-500 leading-relaxed text-sm">
                Based on your profile, this target will help you achieve your goal of <strong>{formData.goal}</strong>.
             </p>
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