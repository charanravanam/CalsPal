import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, MealLog } from '../types';

interface AppContextType {
  user: UserProfile | null;
  setUser: (user: UserProfile) => void;
  meals: MealLog[];
  addMeal: (meal: MealLog) => void;
  getDailyCalories: () => number;
  isLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<UserProfile | null>(null);
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load from local storage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('ni_user');
    const savedMeals = localStorage.getItem('ni_meals');

    if (savedUser) {
      setUserState(JSON.parse(savedUser));
    }
    if (savedMeals) {
      setMeals(JSON.parse(savedMeals));
    }
    setIsLoading(false);
  }, []);

  const setUser = (newUser: UserProfile) => {
    setUserState(newUser);
    localStorage.setItem('ni_user', JSON.stringify(newUser));
  };

  const addMeal = (meal: MealLog) => {
    const updatedMeals = [meal, ...meals];
    setMeals(updatedMeals);
    localStorage.setItem('ni_meals', JSON.stringify(updatedMeals));
  };

  const getDailyCalories = () => {
    const today = new Date().setHours(0, 0, 0, 0);
    return meals
      .filter(m => new Date(m.timestamp).setHours(0, 0, 0, 0) === today)
      .reduce((acc, curr) => acc + curr.analysis.calories, 0);
  };

  return (
    <AppContext.Provider value={{ user, setUser, meals, addMeal, getDailyCalories, isLoading }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};