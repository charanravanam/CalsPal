import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Card } from '../components/Card';
import { VerdictStatus } from '../types';

export const Dashboard: React.FC = () => {
  const { user, meals, getDailyCalories } = useApp();
  const navigate = useNavigate();

  const consumed = getDailyCalories();
  const target = user?.dailyCalorieTarget || 2000;
  const percentage = Math.min(100, Math.round((consumed / target) * 100));
  
  // Color logic for progress bar based on Theme
  // Strictly enforces: Light -> Black, Dark -> White, Gold -> Beige
  let progressColor = 'bg-zinc-900'; // Default (Light Mode)

  if (user?.theme === 'dark') {
    progressColor = 'bg-white'; // White on Dark Background
  } else if (user?.theme === 'gold') {
    progressColor = 'bg-amber-200'; // Beige on Dark Blue Background (Gold Theme)
  } else {
    // Light Mode defaults to bg-zinc-900 (Black)
    progressColor = 'bg-zinc-900';
  }

  const recentMeals = meals.slice(0, 5); // Show last 5

  const getVerdictColor = (v: VerdictStatus) => {
    switch (v) {
      case VerdictStatus.NEEDED: return 'text-emerald-600 bg-emerald-50 border-emerald-100';
      case VerdictStatus.DANGEROUS: 
      case VerdictStatus.VERY_UNHEALTHY: 
        return 'text-red-600 bg-red-50 border-red-100';
      case VerdictStatus.HIGH_CALORIE: return 'text-amber-600 bg-amber-50 border-amber-100';
      default: return 'text-zinc-600 bg-zinc-50 border-zinc-100';
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pt-4">
      
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
           <p className="text-zinc-500 text-sm mb-1 font-medium">{new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
           <h1 className="text-2xl font-bold tracking-tight">Hello, {user?.name}</h1>
        </div>
        <div className="text-right flex flex-col gap-1 items-end">
           {user?.goal.slice(0, 2).map((g) => (
               <span key={g} className="text-[10px] font-bold bg-zinc-100 text-zinc-600 px-2 py-1 rounded uppercase tracking-wider">{g}</span>
           ))}
           {(user?.goal.length || 0) > 2 && <span className="text-[10px] text-zinc-400">+{user!.goal.length - 2} more</span>}
        </div>
      </div>

      {/* Daily Overview Card */}
      <Card className="relative overflow-hidden">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-zinc-700">Daily Intake</h2>
          <span className={`text-xs font-bold px-2 py-1 rounded ${consumed > target ? 'bg-red-100 text-red-700' : 'bg-zinc-100 text-zinc-600'}`}>
             {consumed > target ? 'Over Limit' : 'On Track'}
          </span>
        </div>
        
        <div className="flex items-end gap-1 mb-2">
          <span className="text-5xl font-bold tracking-tighter text-zinc-900">{consumed}</span>
          <span className="text-xl text-zinc-400 font-medium mb-1">/ {target} kcal</span>
        </div>

        <div className="w-full h-3 bg-zinc-100 rounded-full overflow-hidden">
          <div 
            className={`h-full ${progressColor} transition-all duration-1000 ease-out`} 
            style={{ width: `${percentage}%` }}
          />
        </div>
        
        <div className="mt-4 flex gap-8">
            <div>
              <p className="text-xs text-zinc-400 uppercase tracking-wider font-bold">Remaining</p>
              <p className="text-lg font-semibold">{Math.max(0, target - consumed)}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-400 uppercase tracking-wider font-bold">Meals</p>
              <p className="text-lg font-semibold">{meals.filter(m => new Date(m.timestamp).setHours(0,0,0,0) === new Date().setHours(0,0,0,0)).length}</p>
            </div>
        </div>
      </Card>

      {/* Recent Meals */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-zinc-900">Recent Meals</h3>
        
        {recentMeals.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-zinc-200">
             <p className="text-zinc-400">No meals logged yet today.</p>
             <button onClick={() => navigate('/add-meal')} className="text-sm font-medium text-zinc-900 underline mt-2">Log your first meal</button>
          </div>
        ) : (
          recentMeals.map((meal) => (
            <div 
              key={meal.id}
              onClick={() => navigate(`/report/${meal.id}`)} 
              className="bg-white p-4 rounded-xl border border-zinc-100 shadow-sm flex items-center gap-4 active:scale-[0.99] transition-transform cursor-pointer"
            >
              <div className="w-16 h-16 rounded-lg bg-zinc-100 overflow-hidden flex-shrink-0">
                 {meal.imageUri ? (
                   <img src={meal.imageUri} alt={meal.analysis.foodName} className="w-full h-full object-cover" />
                 ) : (
                   <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
                 )}
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-zinc-900 truncate">{meal.analysis.foodName}</h4>
                <p className="text-sm text-zinc-500">{new Date(meal.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • {meal.type}</p>
              </div>

              <div className="text-right flex flex-col items-end gap-1">
                 <span className="font-bold text-zinc-900">{meal.analysis.calories}</span>
                 <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getVerdictColor(meal.analysis.primaryVerdict)}`}>
                   {meal.analysis.primaryVerdict.split(" ")[0]}
                 </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};