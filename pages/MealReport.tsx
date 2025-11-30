import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Card } from '../components/Card';
import { VerdictStatus } from '../types';

export const MealReport: React.FC = () => {
  const { id } = useParams();
  const { meals } = useApp();
  const navigate = useNavigate();

  const meal = meals.find(m => m.id === id);

  if (!meal) {
    return <div className="p-10 text-center">Meal not found.</div>;
  }

  const { analysis } = meal;

  const getVerdictStyles = (v: VerdictStatus) => {
    switch (v) {
      case VerdictStatus.NEEDED: return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case VerdictStatus.DANGEROUS: return 'bg-red-100 text-red-800 border-red-200';
      case VerdictStatus.USELESS: return 'bg-zinc-100 text-zinc-600 border-zinc-200';
      case VerdictStatus.HIGH_CALORIE: return 'bg-amber-100 text-amber-800 border-amber-200';
      case VerdictStatus.VERY_UNHEALTHY: return 'bg-red-50 text-red-600 border-red-100';
      case VerdictStatus.HIGH_CHEMICALS: return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-zinc-100 text-zinc-800 border-zinc-200';
    }
  };

  return (
    <div className="pb-24 pt-4 animate-fade-in space-y-6">
      
      {/* Navbar Back */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/dashboard')} className="p-2 -ml-2 rounded-full hover:bg-zinc-100">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <span className="font-semibold text-lg">Nutrition Brief</span>
      </div>

      {/* Header Info */}
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-xl bg-zinc-200 overflow-hidden border border-zinc-100 flex-shrink-0">
          {meal.imageUri ? (
            <img src={meal.imageUri} alt={analysis.foodName} className="w-full h-full object-cover" />
          ) : (
             <div className="w-full h-full flex items-center justify-center text-3xl">📝</div>
          )}
        </div>
        <div>
          <h1 className="text-xl font-bold leading-tight">{analysis.foodName}</h1>
          <p className="text-sm text-zinc-500 mt-1">{new Date(meal.timestamp).toLocaleDateString()} • {meal.type}</p>
        </div>
      </div>

      {/* Primary Metrics Card */}
      <Card>
        <div className="flex justify-between items-start mb-6">
          <div>
            <span className="text-sm text-zinc-500 font-medium uppercase tracking-wide">Calories</span>
            <div className="text-6xl font-bold tracking-tighter text-zinc-900 mt-1">
              {analysis.calories}
            </div>
          </div>
          <div className="text-right">
             <div className={`inline-block px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${getVerdictStyles(analysis.primaryVerdict)}`}>
               {analysis.primaryVerdict}
             </div>
             {analysis.secondaryVerdicts?.length > 0 && (
               <div className="mt-2 flex flex-col items-end gap-1">
                 {analysis.secondaryVerdicts.map((sv, i) => (
                    <span key={i} className="text-xs text-zinc-500 font-medium">{sv}</span>
                 ))}
               </div>
             )}
          </div>
        </div>

        <div className="py-4 border-t border-zinc-100 flex items-center gap-3">
           <div className="bg-orange-100 text-orange-600 p-2 rounded-full">
             <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
           </div>
           <div>
             <p className="text-xs text-zinc-400 font-bold uppercase">Estimated Burn</p>
             <p className="font-semibold text-zinc-900">{analysis.burnTimeText}</p>
           </div>
        </div>

        {analysis.macros && (
          <div className="pt-4 border-t border-zinc-100 grid grid-cols-3 gap-2">
            <div className="text-center">
              <span className="block text-xl font-bold text-zinc-900">{analysis.macros.protein}g</span>
              <span className="text-xs text-zinc-400 uppercase">Protein</span>
            </div>
            <div className="text-center border-l border-zinc-100">
              <span className="block text-xl font-bold text-zinc-900">{analysis.macros.carbs}g</span>
              <span className="text-xs text-zinc-400 uppercase">Carbs</span>
            </div>
            <div className="text-center border-l border-zinc-100">
              <span className="block text-xl font-bold text-zinc-900">{analysis.macros.fat}g</span>
              <span className="text-xs text-zinc-400 uppercase">Fat</span>
            </div>
          </div>
        )}
      </Card>

      {/* Goal Alignment */}
      <div className="bg-zinc-900 text-white p-6 rounded-2xl shadow-lg">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-2">Goal Impact</h3>
        <p className="text-lg font-medium leading-relaxed text-balance">"{analysis.goalAlignmentText}"</p>
      </div>

      {/* Intelligence Grid */}
      <div className="grid gap-4">
        <Card className="!p-5">
           <h4 className="text-sm font-bold text-zinc-900 mb-2 flex items-center gap-2">
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
             Guidance
           </h4>
           <div className="space-y-3">
             <div>
               <p className="text-xs text-zinc-500 uppercase">Portion</p>
               <p className="text-sm text-zinc-800">{analysis.portionGuidance}</p>
             </div>
             <div>
               <p className="text-xs text-zinc-500 uppercase">Frequency</p>
               <p className="text-sm text-zinc-800">{analysis.frequencyGuidance}</p>
             </div>
           </div>
        </Card>

        {(analysis.risks.length > 0 || analysis.allergens.length > 0) && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
             <h4 className="text-sm font-bold text-red-800 mb-3 flex items-center gap-2">
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
               Alerts
             </h4>
             <ul className="space-y-2">
               {analysis.allergens.map((a, i) => (
                 <li key={`a-${i}`} className="text-sm text-red-700 flex items-start gap-2">
                   <span className="font-bold text-xs uppercase bg-red-100 px-1.5 py-0.5 rounded">Allergen</span>
                   {a}
                 </li>
               ))}
               {analysis.risks.map((r, i) => (
                 <li key={`r-${i}`} className="text-sm text-red-700 flex items-start gap-2">
                    <span className="font-bold text-xs uppercase bg-red-100 px-1.5 py-0.5 rounded">Risk</span>
                    {r}
                 </li>
               ))}
             </ul>
          </div>
        )}
      </div>

    </div>
  );
};