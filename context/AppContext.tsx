import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, MealLog } from '../types';
import { auth, db } from '../services/firebase';
import { doc, getDoc, setDoc, collection, query, orderBy, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

interface AppContextType {
  user: UserProfile | null;
  setUser: (user: UserProfile | null) => Promise<void>;
  meals: MealLog[];
  addMeal: (meal: MealLog) => Promise<void>;
  getDailyCalories: () => number;
  isLoading: boolean;
  syncWithFirebase: (uid: string) => Promise<boolean>;
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
      const parsedUser = JSON.parse(savedUser);
      // Ensure scanCount exists
      if (parsedUser.scanCount === undefined) parsedUser.scanCount = 0;
      setUserState(parsedUser);
    }
    if (savedMeals) {
      setMeals(JSON.parse(savedMeals));
    }
    
    // Setup Auth Listener if auth is available
    if (auth) {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // User is signed in.
                // If we don't have local data, try to sync
                if (!savedUser) {
                    await syncWithFirebase(firebaseUser.uid);
                }
            }
            setIsLoading(false);
        });
        return () => unsubscribe();
    } else {
        // No auth service, just finish loading
        setIsLoading(false);
    }
  }, []);

  // Theme Effect
  useEffect(() => {
    document.body.classList.remove('dark', 'gold');
    if (user?.theme && user.theme !== 'light') {
      document.body.classList.add(user.theme);
    }
  }, [user?.theme]);

  // Sync data from Firestore
  const syncWithFirebase = async (uid: string) => {
    if (!db) return false;
    
    try {
      // 1. Get User Profile
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        
        const userData: UserProfile = {
            ...data as UserProfile,
            onboardingComplete: data.onboardingComplete ?? true,
            scanCount: data.scanCount ?? 0
        };
        
        setUserState(userData);
        localStorage.setItem('ni_user', JSON.stringify(userData));
        
        // 2. Get Meals
        const q = query(collection(db, "users", uid, "meals"), orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);
        const fetchedMeals: MealLog[] = [];
        querySnapshot.forEach((doc) => {
            fetchedMeals.push(doc.data() as MealLog);
        });
        
        setMeals(fetchedMeals);
        localStorage.setItem('ni_meals', JSON.stringify(fetchedMeals));
        return true;
      } else {
        return false; // User document doesn't exist (new user via auth)
      }
    } catch (e) {
      console.error("Sync Error:", e);
      return false;
    }
  };

  const setUser = async (newUser: UserProfile | null) => {
    if (newUser) {
      // Enforce theme rules
      if (newUser.theme && newUser.theme !== 'light' && !newUser.isPremium) {
        newUser.theme = 'light';
      }
      
      setUserState(newUser);
      localStorage.setItem('ni_user', JSON.stringify(newUser));

      // Sync to Firebase if logged in and db is available
      if (auth?.currentUser && db) {
        try {
          // Remove undefined values for Firestore
          const firestoreUser = JSON.parse(JSON.stringify(newUser));
          await setDoc(doc(db, "users", auth.currentUser.uid), firestoreUser, { merge: true });
        } catch (e) { console.error("Error saving user to DB:", e); }
      }

    } else {
      // Logout logic
      localStorage.removeItem('ni_user');
      localStorage.removeItem('ni_meals');
      setMeals([]);
      setUserState(null);
      if (auth) {
        try { await auth.signOut(); } catch(e) {}
      }
    }
  };

  const addMeal = async (meal: MealLog) => {
    const updatedMeals = [meal, ...meals];
    setMeals(updatedMeals);
    localStorage.setItem('ni_meals', JSON.stringify(updatedMeals));

    // Save meal to DB
    if (auth?.currentUser && db) {
      try {
        const firestoreMeal = JSON.parse(JSON.stringify(meal));
        await setDoc(doc(db, "users", auth.currentUser.uid, "meals", meal.id), firestoreMeal);
      } catch (e) { console.error("Error saving meal to DB:", e); }
    }

    // Increment Scan Count
    if (user) {
        const newCount = (user.scanCount || 0) + 1;
        const updatedUser = { ...user, scanCount: newCount };
        await setUser(updatedUser);
    }
  };

  const getDailyCalories = () => {
    const today = new Date().setHours(0, 0, 0, 0);
    return meals
      .filter(m => new Date(m.timestamp).setHours(0, 0, 0, 0) === today)
      .reduce((acc, curr) => acc + (curr.analysis.calories || 0), 0);
  };

  return (
    <AppContext.Provider value={{ user, setUser, meals, addMeal, getDailyCalories, isLoading, syncWithFirebase }}>
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