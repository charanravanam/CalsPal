import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile, NutritionAnalysis } from "../types";

let genAI: GoogleGenAI | null = null;

const getGenAI = () => {
  if (!genAI) {
    const apiKey = process.env.API_KEY;
    
    // Explicitly check if the key is missing or is a placeholder
    if (!apiKey || apiKey.includes("PLACEHOLDER") || apiKey === "") {
        console.error("[GeminiService] API Key is missing or invalid.");
        // We still instantiate to allow the app to run until the call is made, 
        // where we can catch the specific error.
    }
    
    genAI = new GoogleGenAI({ apiKey: apiKey || "" });
  }
  return genAI;
};

// Helper to remove base64 prefix if present
const cleanBase64 = (base64: string) => {
  return base64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
};

export const generateFoodImage = async (textInput: string): Promise<string | null> => {
  const ai = getGenAI();
  const modelId = "gemini-2.5-flash-image";

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
         parts: [{ text: `Generate a realistic, appetizing food photography image of: ${textInput}` }]
      },
    });

    if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData && part.inlineData.mimeType.startsWith('image/')) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
    }
    return null;
  } catch (error) {
    console.error("Gemini Image Gen Error:", error);
    // Don't throw for image generation failure, just return null
    return null;
  }
};

export const analyzeMealWithGemini = async (
  imageBase64: string | undefined,
  textInput: string | undefined,
  userProfile: UserProfile
): Promise<NutritionAnalysis> => {
  
  const ai = getGenAI();
  const modelId = "gemini-2.5-flash"; 

  const prompt = `
    Analyze this meal log for a user with the following profile:
    - Goal: ${userProfile.goal}
    - Daily Target: ${userProfile.dailyCalorieTarget} calories
    
    Provide a professional nutrition brief.
    
    Requirements:
    1. Estimate calories and macros.
    2. Calculate burn time specifically for a "brisk walk". Format example: "24 min brisk walk".
    3. Choose ONE primary verdict from this list: "Needed for Body", "Not Needed for Body", "Dangerous for Body", "Useless for Body", "High Calorie Count", "Very Unhealthy", "High Chemicals".
    4. Provide structured guidance on portion and frequency.
    5. Identify specific risks or allergens.
    6. Write a "Goal Alignment" sentence explaining how this meal fits their specific goal (e.g., "High impact for weight loss").
    
    Return pure JSON matching the schema.
  `;

  const parts: any[] = [{ text: prompt }];

  if (textInput) {
    parts.push({ text: `Food description: ${textInput}` });
  }

  if (imageBase64) {
    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: cleanBase64(imageBase64),
      },
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: parts,
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            foodName: { type: Type.STRING },
            calories: { type: Type.NUMBER },
            macros: {
              type: Type.OBJECT,
              properties: {
                protein: { type: Type.NUMBER },
                carbs: { type: Type.NUMBER },
                fat: { type: Type.NUMBER },
              },
            },
            burnTimeText: { type: Type.STRING },
            primaryVerdict: { 
              type: Type.STRING, 
              enum: [
                "Needed for Body", 
                "Not Needed for Body", 
                "Dangerous for Body", 
                "Useless for Body", 
                "High Calorie Count", 
                "Very Unhealthy", 
                "High Chemicals"
              ] 
            },
            secondaryVerdicts: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            },
            goalAlignmentText: { type: Type.STRING },
            portionGuidance: { type: Type.STRING },
            frequencyGuidance: { type: Type.STRING },
            risks: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            },
            allergens: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            },
          },
          required: ["foodName", "calories", "burnTimeText", "primaryVerdict", "goalAlignmentText", "portionGuidance", "frequencyGuidance"]
        }
      },
    });

    const text = response.text;
    if (!text) throw new Error("No data returned from AI");
    
    try {
        const data = JSON.parse(text) as NutritionAnalysis;
        return data;
    } catch (parseError) {
        console.error("JSON Parse Error:", parseError);
        throw new Error("Failed to parse AI response. Please try again.");
    }

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};