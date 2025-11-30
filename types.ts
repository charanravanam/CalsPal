export enum Goal {
  LOSE = 'Lose Weight',
  MAINTAIN = 'Maintain Weight',
  GAIN = 'Build Muscle'
}

export enum Gender {
  MALE = 'Male',
  FEMALE = 'Female',
  OTHER = 'Other'
}

export enum ActivityLevel {
  SEDENTARY = 'Sedentary',
  LIGHT = 'Lightly Active',
  MODERATE = 'Moderately Active',
  VERY = 'Very Active'
}

export enum MealType {
  BREAKFAST = 'Breakfast',
  LUNCH = 'Lunch',
  DINNER = 'Dinner',
  SNACK = 'Snack'
}

export enum VerdictStatus {
  NEEDED = 'Needed for Body',
  NOT_NEEDED = 'Not Needed for Body',
  DANGEROUS = 'Dangerous for Body',
  USELESS = 'Useless for Body',
  HIGH_CALORIE = 'High Calorie Count',
  VERY_UNHEALTHY = 'Very Unhealthy',
  HIGH_CHEMICALS = 'High Chemicals'
}

export interface UserProfile {
  name: string;
  age: number;
  height: number; // cm
  weight: number; // kg
  gender: Gender;
  activityLevel: ActivityLevel;
  goal: Goal;
  dailyCalorieTarget: number;
  onboardingComplete: boolean;
}

export interface NutritionAnalysis {
  foodName: string;
  calories: number;
  macros?: {
    protein: number;
    carbs: number;
    fat: number;
  };
  burnTimeText: string; // "24 min brisk walk"
  primaryVerdict: VerdictStatus;
  secondaryVerdicts: string[];
  goalAlignmentText: string;
  portionGuidance: string;
  frequencyGuidance: string;
  risks: string[];
  allergens: string[];
}

export interface MealLog {
  id: string;
  timestamp: number;
  type: MealType;
  imageUri?: string; // base64
  textInput?: string;
  analysis: NutritionAnalysis;
}

export interface AppState {
  user: UserProfile | null;
  meals: MealLog[];
}