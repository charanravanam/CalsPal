import { GoogleGenAI } from "@google/genai";

const getGenAI = () => {
    // Safety check for API Key
    const apiKey = window.process?.env?.API_KEY;
    
    // Check if key is missing or is still the default placeholder
    if (!apiKey || apiKey === "YOUR_API_KEY_HERE" || apiKey.includes("PLACEHOLDER")) {
        throw new Error("Configuration Error: API_KEY is missing. Please open index.html and replace 'YOUR_API_KEY_HERE' with your actual Gemini API Key.");
    }
    return new GoogleGenAI({ apiKey });
};

const cleanBase64 = (base64) => {
    return base64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
};

// Updated signature to accept quantity
export const analyzeMealWithGemini = async (imageBase64, textInput, quantity, userProfile) => {
    const ai = getGenAI();
    const modelId = "gemini-2.5-flash"; 

    // Include Health Issues and Quantity in the prompt
    const prompt = `
    Analyze this meal log for a user with the following profile:
    - Goal: ${userProfile.goal}
    - Daily Target: ${userProfile.dailyCalorieTarget} calories
    - Health Issues: ${userProfile.healthIssues && userProfile.healthIssues.length > 0 ? userProfile.healthIssues.join(', ') : 'None'}
    
    Meal Context:
    - Description: ${textInput || 'None provided'}
    - Specific Quantity/Portion: ${quantity || 'Not specified (Estimate based on standard serving or image)'}

    Provide a professional nutrition brief.
    
    Requirements:
    1. Estimate calories and macros based on the provided Quantity (if available) or visual estimate.
    2. Calculate burn time specifically for a "brisk walk". Format example: "24 min brisk walk".
    3. Choose ONE primary verdict from this list: "Needed for Body", "Not Needed for Body", "Dangerous for Body", "Useless for Body", "High Calorie Count", "Very Unhealthy", "High Chemicals".
    4. Provide structured guidance on portion and frequency.
    5. Identify specific risks or allergens. IMPORTANT: If the user has "Health Issues" (like High Sugar), flag ingredients that worsen that condition in the risks.
    6. Write a "Goal Alignment" sentence explaining how this meal fits their specific goal.
    
    Return pure JSON matching this schema:
    {
        "foodName": "string",
        "calories": number,
        "macros": { "protein": number, "carbs": number, "fat": number },
        "burnTimeText": "string",
        "primaryVerdict": "string",
        "secondaryVerdicts": ["string"],
        "goalAlignmentText": "string",
        "portionGuidance": "string",
        "frequencyGuidance": "string",
        "risks": ["string"],
        "allergens": ["string"]
    }
    `;

    const parts = [{ text: prompt }];

    // Note: We already added textInput to the prompt string above for better context integration
    
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
            contents: { parts: parts },
            config: {
                responseMimeType: "application/json"
            }
        });

        const text = response.text;
        if (!text) throw new Error("No data returned from AI");
        
        return JSON.parse(text);
    } catch (error) {
        console.error("Gemini Analysis Error:", error);
        throw error;
    }
};