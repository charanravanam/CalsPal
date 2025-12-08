import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ActivityLevel, Gender, Goal, Theme } from '../types';

export const Profile: React.FC = () => {
  const { user, setUser } = useApp();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  
  if (!user) return null;

  const [formData, setFormData] = useState({
    name: user.name,
    age: user.age,
    height: user.height,
    weight: user.weight,
    goal: user.goal,
    activityLevel: user.activityLevel,
    gender: user.gender
  });

  const handleSave = () => {
    // Recalculate TDEE on save
    let bmr = 0;
    if (formData.gender === Gender.MALE) {
      bmr = 88.362 + (13.397 * formData.weight) + (4.799 * formData.height) - (5.677 * formData.age);
    } else {
      bmr = 447.593 + (9.247 * formData.weight) + (3.098 * formData.height) - (4.330 * formData.age);
    }
    
    let multiplier = 1.2;
    switch(formData.activityLevel) {
       case ActivityLevel.SEDENTARY: multiplier = 1.2; break;
       case ActivityLevel.LIGHT: multiplier = 1.375; break;
       case ActivityLevel.MODERATE: multiplier = 1.55; break;
       case ActivityLevel.VERY: multiplier = 1.725; break;
    }
    
    let tdee = Math.round(bmr * multiplier);
    if (formData.goal === Goal.LOSE) tdee -= 500;
    if (formData.goal === Goal.GAIN) tdee += 300;

    setUser({
      ...user,
      ...formData,
      dailyCalorieTarget: tdee
    });
    setIsEditing(false);
  };

  const handleThemeChange = (newTheme: Theme) => {
    if (!user.isPremium && newTheme !== 'light') {
      alert("Upgrade to Premium to unlock Dark and Gold themes!");
      return;
    }
    setUser({ ...user, theme: newTheme });
  };

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to log out?")) {
      setUser(null);
      navigate('/onboarding');
    }
  };

  return (
    <div className="pt-4 pb-24 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Profile</h1>
        <button onClick={() => navigate('/dashboard')} className="text-sm text-zinc-500">Back</button>
      </div>

      {/* Plan Status Card */}
      <Card className={`${user.isPremium ? 'bg-gradient-to-r from-amber-100 to-amber-50 border-amber-200' : ''}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium opacity-70 uppercase tracking-wide">Current Plan</p>
            <h2 className={`text-xl font-bold ${user.isPremium ? 'text-amber-900' : 'text-zinc-900'}`}>
              {user.isPremium ? 'Premium Member 🌟' : 'Free Plan'}
            </h2>
          </div>
          {!user.isPremium && (
            <Button className="!w-auto py-2 px-4 text-xs" onClick={() => navigate('/premium')}>Upgrade</Button>
          )}
        </div>
        {user.isPremium && <p className="text-xs text-amber-800 mt-2">You have access to unlimited scans and premium themes.</p>}
      </Card>

      {/* Theme Selection */}
      <Card>
        <h3 className="font-bold text-lg mb-4">App Appearance</h3>
        <div className="grid grid-cols-3 gap-3">
          {(['light', 'dark', 'gold'] as Theme[]).map((t) => (
            <button
              key={t}
              onClick={() => handleThemeChange(t)}
              className={`
                relative p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all
                ${user.theme === t || (!user.theme && t === 'light') ? 'border-zinc-900 ring-1 ring-zinc-900' : 'border-zinc-100 hover:border-zinc-300'}
                ${!user.isPremium && t !== 'light' ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <div className={`w-6 h-6 rounded-full border shadow-sm
                ${t === 'light' ? 'bg-white' : t === 'dark' ? 'bg-zinc-900' : 'bg-gradient-to-br from-amber-300 to-amber-600'}
              `}></div>
              <span className="text-xs font-medium capitalize">{t}</span>
              {!user.isPremium && t !== 'light' && (
                <span className="absolute top-1 right-1 text-xs">🔒</span>
              )}
            </button>
          ))}
        </div>
      </Card>

      {/* Personal Details */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Personal Details</h3>
          <button 
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            {isEditing ? 'Save' : 'Edit'}
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-zinc-500 uppercase">Name</label>
            <input 
              type="text" 
              disabled={!isEditing}
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full bg-zinc-50 p-3 rounded-lg border border-zinc-200 disabled:opacity-70 disabled:cursor-not-allowed"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-zinc-500 uppercase">Height (cm)</label>
              <input 
                type="number" 
                disabled={!isEditing}
                value={formData.height}
                onChange={e => setFormData({...formData, height: Number(e.target.value)})}
                className="w-full bg-zinc-50 p-3 rounded-lg border border-zinc-200 disabled:opacity-70"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-500 uppercase">Weight (kg)</label>
              <input 
                type="number" 
                disabled={!isEditing}
                value={formData.weight}
                onChange={e => setFormData({...formData, weight: Number(e.target.value)})}
                className="w-full bg-zinc-50 p-3 rounded-lg border border-zinc-200 disabled:opacity-70"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-zinc-500 uppercase">Age</label>
              <input 
                type="number" 
                disabled={!isEditing}
                value={formData.age}
                onChange={e => setFormData({...formData, age: Number(e.target.value)})}
                className="w-full bg-zinc-50 p-3 rounded-lg border border-zinc-200 disabled:opacity-70"
              />
            </div>
             <div className="space-y-1">
              <label className="text-xs text-zinc-500 uppercase">Gender</label>
              <select 
                disabled={!isEditing}
                value={formData.gender}
                onChange={e => setFormData({...formData, gender: e.target.value as Gender})}
                className="w-full bg-zinc-50 p-3 rounded-lg border border-zinc-200 disabled:opacity-70"
              >
                {Object.values(Gender).map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>

           <div className="space-y-1">
              <label className="text-xs text-zinc-500 uppercase">Goal</label>
              <select 
                disabled={!isEditing}
                value={formData.goal}
                onChange={e => setFormData({...formData, goal: e.target.value as Goal})}
                className="w-full bg-zinc-50 p-3 rounded-lg border border-zinc-200 disabled:opacity-70"
              >
                {Object.values(Goal).map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            
            <div className="p-3 bg-zinc-100 rounded-lg text-xs text-zinc-500">
               Current Daily Target: <span className="font-bold text-zinc-900">{user.dailyCalorieTarget} kcal</span>
               {isEditing && <span className="block mt-1 text-blue-600">Will update upon saving.</span>}
            </div>
        </div>
      </Card>

      <Button variant="danger" onClick={handleLogout} className="mt-8">Log Out</Button>
      
      <div className="text-center text-xs text-zinc-400 pt-4 pb-8">
        App Version 1.0.2
      </div>
    </div>
  );
};