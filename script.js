/**
 * APP CONFIGURATION
 * Please replace these values with your actual API Keys.
 */
const CONFIG = {
    FIREBASE: {
        apiKey: "YOUR_FIREBASE_API_KEY",
        authDomain: "dr-foodie-bc477.firebaseapp.com",
        projectId: "dr-foodie-bc477",
        storageBucket: "dr-foodie-bc477.firebasestorage.app",
        messagingSenderId: "162055987584",
        appId: "1:162055987584:web:e11db26bb62ae6544f6165"
    },
    GEMINI_API_KEY: "YOUR_GEMINI_API_KEY",
    RAZORPAY_KEY_ID: "YOUR_RAZORPAY_KEY_ID",
    RAZORPAY_PLAN_ID: "" // Optional
};

// State Management
const store = {
    user: JSON.parse(localStorage.getItem('ni_user')) || null,
    meals: JSON.parse(localStorage.getItem('ni_meals')) || [],
    theme: 'light'
};

// --- SERVICES ---

// 1. Firebase Service
let auth, db;
function initFirebase() {
    if (firebase.apps.length === 0 && CONFIG.FIREBASE.apiKey !== "YOUR_FIREBASE_API_KEY") {
        firebase.initializeApp(CONFIG.FIREBASE);
        auth = firebase.auth();
        db = firebase.firestore();
        
        // Auth Listener
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                // If logged in, try to sync
                await syncUserData(user.uid);
                if (store.user && store.user.onboardingComplete) {
                    if (window.location.hash === '#login' || !window.location.hash) router.navigate('dashboard');
                } else {
                    router.navigate('onboarding');
                }
            }
        });
    } else {
        console.warn("Firebase not configured or invalid key.");
    }
}

async function syncUserData(uid) {
    if (!db) return;
    try {
        const doc = await db.collection("users").doc(uid).get();
        if (doc.exists) {
            store.user = { ...doc.data(), scanCount: doc.data().scanCount || 0 };
            localStorage.setItem('ni_user', JSON.stringify(store.user));
            
            const mealsSnap = await db.collection("users").doc(uid).collection("meals").orderBy("timestamp", "desc").get();
            store.meals = mealsSnap.docs.map(d => d.data());
            localStorage.setItem('ni_meals', JSON.stringify(store.meals));
            applyTheme();
        }
    } catch (e) { console.error("Sync failed", e); }
}

async function saveUser(user) {
    store.user = user;
    localStorage.setItem('ni_user', JSON.stringify(user));
    applyTheme();
    if (db && auth && auth.currentUser) {
        await db.collection("users").doc(auth.currentUser.uid).set(JSON.parse(JSON.stringify(user)), { merge: true });
    }
}

async function addMeal(meal) {
    store.meals = [meal, ...store.meals];
    localStorage.setItem('ni_meals', JSON.stringify(store.meals));
    
    // Increment scan count
    if (store.user) {
        store.user.scanCount = (store.user.scanCount || 0) + 1;
        await saveUser(store.user);
    }

    if (db && auth && auth.currentUser) {
        await db.collection("users").doc(auth.currentUser.uid).collection("meals").doc(meal.id).set(JSON.parse(JSON.stringify(meal)));
    }
}

// 2. Gemini Service (REST implementation to avoid bundler issues)
async function analyzeMeal(imageBase64, textInput) {
    if (CONFIG.GEMINI_API_KEY === "YOUR_GEMINI_API_KEY") {
        throw new Error("Gemini API Key missing. Check CONFIG.");
    }

    const model = "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${CONFIG.GEMINI_API_KEY}`;
    
    const userGoals = store.user.goal.join(", ");
    const prompt = `
      Analyze this meal log for a user:
      Goal: ${userGoals}, Target: ${store.user.dailyCalorieTarget} kcal.
      Provide a JSON with:
      1. foodName (string)
      2. calories (number)
      3. macros {protein, carbs, fat} (all numbers)
      4. burnTimeText (e.g. "24 min brisk walk")
      5. primaryVerdict (One of: "Needed for Body", "Not Needed for Body", "Dangerous for Body", "Useless for Body", "High Calorie Count", "Very Unhealthy", "High Chemicals")
      6. secondaryVerdicts (array of strings)
      7. goalAlignmentText (string)
      8. portionGuidance (string)
      9. frequencyGuidance (string)
      10. risks (array of strings)
      11. allergens (array of strings)
      
      Return raw JSON only, no markdown.
    `;

    const parts = [{ text: prompt }];
    if (textInput) parts.push({ text: `Description: ${textInput}` });
    if (imageBase64) {
        parts.push({
            inlineData: {
                mimeType: "image/jpeg",
                data: imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "")
            }
        });
    }

    const payload = {
        contents: [{ parts: parts }],
        generationConfig: { responseMimeType: "application/json" }
    };

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (data.candidates && data.candidates[0].content) {
        return JSON.parse(data.candidates[0].content.parts[0].text);
    }
    throw new Error("AI analysis failed.");
}

async function generateFoodImage(text) {
    if (CONFIG.GEMINI_API_KEY === "YOUR_GEMINI_API_KEY") return null;
    // Simple placeholder for image gen since 2.5-flash-image isn't always available on standard REST without tuning
    return null; 
}

// --- UTILS ---

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    const color = type === 'error' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-zinc-900 text-white';
    toast.className = `p-3 rounded-lg shadow-lg text-sm font-medium mb-2 transition-all transform translate-y-2 opacity-0 border ${color}`;
    toast.innerText = message;
    container.appendChild(toast);
    
    // Animate in
    setTimeout(() => toast.classList.remove('translate-y-2', 'opacity-0'), 10);
    // Remove
    setTimeout(() => {
        toast.classList.add('opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function applyTheme() {
    const body = document.body;
    body.classList.remove('dark', 'gold');
    if (store.user && store.user.theme) {
        if (store.user.theme !== 'light') body.classList.add(store.user.theme);
    }
}

// --- ROUTER & VIEWS ---

const appDiv = document.getElementById('app');
const navDiv = document.getElementById('bottom-nav');

const router = {
    navigate: (viewId, params = {}) => {
        // Guard Routes
        const publicViews = ['login', 'onboarding'];
        if (!publicViews.includes(viewId)) {
            if (!store.user) {
                renderLogin(); 
                return;
            }
            if (!store.user.onboardingComplete && viewId !== 'onboarding') {
                renderOnboarding();
                return;
            }
        }

        // Handle Nav Visibility
        if (['login', 'onboarding'].includes(viewId)) {
            navDiv.classList.add('hidden');
        } else {
            navDiv.classList.remove('hidden');
            updateNavActive(viewId);
        }

        // Render
        window.scrollTo(0, 0);
        switch(viewId) {
            case 'login': renderLogin(); break;
            case 'onboarding': renderOnboarding(); break;
            case 'dashboard': renderDashboard(); break;
            case 'add-meal': renderAddMeal(); break;
            case 'report': renderReport(params.id); break;
            case 'profile': renderProfile(); break;
            case 'premium': renderPremium(); break;
            default: renderLogin();
        }
    }
};

function updateNavActive(viewId) {
    const dashBtn = document.getElementById('nav-dashboard');
    const profBtn = document.getElementById('nav-profile');
    
    // Reset classes
    const baseClass = "p-2 rounded-full text-zinc-400 hover:text-zinc-600 transition-colors";
    const activeClass = "p-2 rounded-full text-zinc-900 bg-zinc-100 transition-colors";
    
    if (dashBtn) dashBtn.className = viewId === 'dashboard' ? activeClass : baseClass;
    if (profBtn) profBtn.className = viewId === 'profile' ? activeClass : baseClass;
}

// --- VIEW RENDERERS ---

function renderLogin() {
    appDiv.innerHTML = `
    <div class="min-h-screen flex flex-col justify-center p-6 bg-zinc-50 animate-fade-in">
        <div class="text-center space-y-6 mb-8">
            <div class="w-24 h-24 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-zinc-200 overflow-hidden border border-zinc-100 p-2">
                <div class="text-4xl">🥗</div>
            </div>
            <div class="space-y-2">
                <h1 class="text-3xl font-bold text-zinc-900 tracking-tight">Dr Foodie</h1>
                <p class="text-zinc-500">Personal nutrition intelligence.</p>
            </div>
        </div>
        
        <div class="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm space-y-4">
            <button id="btn-guest" class="w-full py-3.5 px-6 rounded-xl font-medium bg-zinc-900 text-white shadow-lg shadow-zinc-200 active:scale-[0.98] transition-transform">
                Start as Guest
            </button>
            <p class="text-xs text-center text-zinc-400">
                Data saved locally. Add API Keys in script.js to enable Cloud & AI.
            </p>
        </div>
    </div>
    `;

    document.getElementById('btn-guest').onclick = () => {
        if (store.user && store.user.onboardingComplete) {
            router.navigate('dashboard');
        } else {
            router.navigate('onboarding');
        }
    };
}

function renderOnboarding() {
    let step = 1;
    let data = {
        name: '', age: 30, height: 170, weight: 70, gender: 'Male', activity: 'Moderate', goal: ['Maintain Weight']
    };

    function renderStep() {
        if (step === 1) {
            appDiv.innerHTML = `
            <div class="flex flex-col h-full pt-10 p-6 animate-fade-in">
                <div class="flex-1 space-y-6">
                    <h1 class="text-3xl font-bold">Tell us about yourself.</h1>
                    <div class="space-y-4">
                        <input id="inp-name" type="text" placeholder="Name" class="w-full p-4 border rounded-xl" value="${data.name}">
                        <div class="grid grid-cols-2 gap-4">
                            <input id="inp-age" type="number" placeholder="Age" class="p-4 border rounded-xl" value="${data.age}">
                            <select id="inp-gender" class="p-4 border rounded-xl"><option>Male</option><option>Female</option></select>
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <input id="inp-height" type="number" placeholder="Height (cm)" class="p-4 border rounded-xl" value="${data.height}">
                            <input id="inp-weight" type="number" placeholder="Weight (kg)" class="p-4 border rounded-xl" value="${data.weight}">
                        </div>
                    </div>
                </div>
                <button id="btn-next" class="w-full py-4 bg-zinc-900 text-white rounded-xl">Continue</button>
            </div>`;
            
            document.getElementById('btn-next').onclick = () => {
                data.name = document.getElementById('inp-name').value || 'Guest';
                data.age = Number(document.getElementById('inp-age').value);
                data.height = Number(document.getElementById('inp-height').value);
                data.weight = Number(document.getElementById('inp-weight').value);
                data.gender = document.getElementById('inp-gender').value;
                step++;
                renderStep();
            };
        } else if (step === 2) {
            appDiv.innerHTML = `
            <div class="flex flex-col h-full pt-10 p-6 animate-fade-in">
                <div class="flex-1 space-y-6">
                    <h1 class="text-3xl font-bold">Your Goal?</h1>
                    <div class="space-y-3">
                        ${['Lose Weight', 'Maintain Weight', 'Build Muscle'].map(g => `
                            <button class="goal-btn w-full p-5 text-left border rounded-xl ${data.goal.includes(g) ? 'bg-zinc-900 text-white' : 'bg-white'}" data-val="${g}">
                                ${g}
                            </button>
                        `).join('')}
                    </div>
                </div>
                <button id="btn-finish" class="w-full py-4 bg-zinc-900 text-white rounded-xl">Get Started</button>
            </div>`;

            document.querySelectorAll('.goal-btn').forEach(b => {
                b.onclick = () => {
                    data.goal = [b.dataset.val];
                    renderStep();
                };
            });
            document.getElementById('btn-finish').onclick = async () => {
                // Calculate TDEE
                let bmr = data.gender === 'Male' 
                    ? 88.362 + (13.397 * data.weight) + (4.799 * data.height) - (5.677 * data.age)
                    : 447.593 + (9.247 * data.weight) + (3.098 * data.height) - (4.330 * data.age);
                
                let tdee = Math.round(bmr * 1.55); // Moderate default
                if (data.goal.includes('Lose Weight')) tdee -= 500;
                if (data.goal.includes('Build Muscle')) tdee += 300;

                const profile = { ...data, dailyCalorieTarget: tdee, onboardingComplete: true, theme: 'light', scanCount: 0 };
                await saveUser(profile);
                router.navigate('dashboard');
            };
        }
    }
    renderStep();
}

function renderDashboard() {
    const today = new Date().setHours(0,0,0,0);
    const todayMeals = store.meals.filter(m => new Date(m.timestamp).setHours(0,0,0,0) === today);
    const consumed = todayMeals.reduce((acc, curr) => acc + (curr.analysis.calories || 0), 0);
    const target = store.user.dailyCalorieTarget || 2000;
    const pct = Math.min(100, Math.round((consumed / target) * 100));

    // Theme logic for bar color
    let barColor = 'bg-zinc-900';
    if (store.user.theme === 'dark') barColor = 'bg-white';
    if (store.user.theme === 'gold') barColor = 'bg-amber-200';

    appDiv.innerHTML = `
    <div class="p-6 space-y-8 animate-fade-in pt-8">
        <div class="flex justify-between items-start">
            <div>
               <p class="text-zinc-500 text-sm font-medium">${new Date().toLocaleDateString()}</p>
               <h1 class="text-2xl font-bold">Hello, ${store.user.name}</h1>
            </div>
            <span class="text-[10px] font-bold bg-zinc-100 text-zinc-600 px-2 py-1 rounded uppercase tracking-wider">${store.user.goal[0]}</span>
        </div>

        <!-- Progress Card -->
        <div class="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6 relative overflow-hidden">
             <div class="flex justify-between items-center mb-6">
                <h2 class="text-lg font-semibold text-zinc-700">Daily Intake</h2>
                <span class="text-xs font-bold px-2 py-1 rounded ${consumed > target ? 'bg-red-100 text-red-700' : 'bg-zinc-100 text-zinc-600'}">
                    ${consumed > target ? 'Over Limit' : 'On Track'}
                </span>
            </div>
            <div class="flex items-end gap-1 mb-2">
                <span class="text-5xl font-bold tracking-tighter text-zinc-900">${consumed}</span>
                <span class="text-xl text-zinc-400 font-medium mb-1">/ ${target} kcal</span>
            </div>
            <div class="w-full h-3 bg-zinc-100 rounded-full overflow-hidden">
                <div class="h-full ${barColor} transition-all duration-1000" style="width: ${pct}%"></div>
            </div>
        </div>

        <!-- Recent Meals -->
        <div class="space-y-4">
            <h3 class="text-lg font-bold text-zinc-900">Recent Meals</h3>
            ${store.meals.slice(0, 5).map(meal => `
                <div onclick="router.navigate('report', {id: '${meal.id}'})" class="bg-white p-4 rounded-xl border border-zinc-100 shadow-sm flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-transform">
                    <div class="w-16 h-16 rounded-lg bg-zinc-100 overflow-hidden flex-shrink-0">
                        ${meal.imageUri ? `<img src="${meal.imageUri}" class="w-full h-full object-cover">` : '<div class="w-full h-full flex items-center justify-center">🍽️</div>'}
                    </div>
                    <div class="flex-1 min-w-0">
                        <h4 class="font-semibold text-zinc-900 truncate">${meal.analysis.foodName}</h4>
                        <p class="text-sm text-zinc-500 capitalize">${meal.type}</p>
                    </div>
                    <div class="text-right">
                        <span class="font-bold text-zinc-900 block">${meal.analysis.calories}</span>
                    </div>
                </div>
            `).join('')}
            ${store.meals.length === 0 ? '<p class="text-center text-zinc-400 py-4">No meals logged yet.</p>' : ''}
        </div>
    </div>
    `;
}

function renderAddMeal() {
    let mode = 'camera'; // or text
    let imageFile = null;

    appDiv.innerHTML = `
    <div class="flex flex-col h-full pt-6 px-6">
        <div class="flex items-center justify-between mb-6">
             <h1 class="text-2xl font-bold">Log Meal</h1>
             <button onclick="router.navigate('dashboard')" class="text-sm text-zinc-500">Cancel</button>
        </div>

        <!-- Mode Switcher -->
        <div class="bg-zinc-100 p-1 rounded-xl flex mb-6">
            <button id="btn-mode-camera" class="flex-1 py-2 rounded-lg text-sm font-medium bg-white shadow text-zinc-900 transition-all">Photo</button>
            <button id="btn-mode-text" class="flex-1 py-2 rounded-lg text-sm font-medium text-zinc-500 transition-all">Text</button>
        </div>

        <div id="camera-view" class="space-y-4">
            <div id="dropzone" class="w-full aspect-square rounded-2xl border-2 border-dashed border-zinc-300 flex items-center justify-center cursor-pointer hover:bg-zinc-50 relative overflow-hidden">
                <div class="text-center pointer-events-none" id="dropzone-text">
                    <span class="text-4xl block mb-2">📸</span>
                    <span class="text-zinc-500">Tap to capture</span>
                </div>
                <img id="preview-img" class="absolute inset-0 w-full h-full object-cover hidden">
                <input type="file" accept="image/*" class="absolute inset-0 opacity-0 cursor-pointer" id="inp-file">
            </div>
        </div>

        <div id="text-view" class="hidden space-y-4">
            <textarea id="inp-text" class="w-full h-40 p-4 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-zinc-900" placeholder="Describe your meal..."></textarea>
        </div>

        <div class="mt-6 space-y-4">
            <label class="text-sm font-medium">Meal Type</label>
            <div class="grid grid-cols-4 gap-2">
                ${['Breakfast', 'Lunch', 'Dinner', 'Snack'].map(t => `
                    <button class="type-btn py-2 text-xs font-semibold rounded-lg border ${t === 'Lunch' ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-600'}" data-val="${t}">${t}</button>
                `).join('')}
            </div>
        </div>

        <button id="btn-analyze" class="mt-auto mb-6 w-full py-4 bg-zinc-900 text-white rounded-xl shadow-lg disabled:opacity-50">Analyze Meal</button>
    </div>
    `;

    // Logic
    const dropzone = document.getElementById('dropzone');
    const inpFile = document.getElementById('inp-file');
    const preview = document.getElementById('preview-img');
    const dropText = document.getElementById('dropzone-text');
    let selectedType = 'Lunch';

    inpFile.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                imageFile = ev.target.result;
                preview.src = imageFile;
                preview.classList.remove('hidden');
                dropText.classList.add('hidden');
            };
            reader.readAsDataURL(file);
        }
    };

    document.getElementById('btn-mode-camera').onclick = (e) => {
        mode = 'camera';
        document.getElementById('camera-view').classList.remove('hidden');
        document.getElementById('text-view').classList.add('hidden');
        e.target.classList.add('bg-white', 'shadow', 'text-zinc-900');
        e.target.classList.remove('text-zinc-500');
        document.getElementById('btn-mode-text').classList.remove('bg-white', 'shadow', 'text-zinc-900');
        document.getElementById('btn-mode-text').classList.add('text-zinc-500');
    };

    document.getElementById('btn-mode-text').onclick = (e) => {
        mode = 'text';
        document.getElementById('camera-view').classList.add('hidden');
        document.getElementById('text-view').classList.remove('hidden');
        e.target.classList.add('bg-white', 'shadow', 'text-zinc-900');
        e.target.classList.remove('text-zinc-500');
        document.getElementById('btn-mode-camera').classList.remove('bg-white', 'shadow', 'text-zinc-900');
        document.getElementById('btn-mode-camera').classList.add('text-zinc-500');
    };

    document.querySelectorAll('.type-btn').forEach(b => {
        b.onclick = () => {
            document.querySelectorAll('.type-btn').forEach(x => {
                x.classList.remove('bg-zinc-900', 'text-white');
                x.classList.add('bg-white', 'text-zinc-600');
            });
            b.classList.remove('bg-white', 'text-zinc-600');
            b.classList.add('bg-zinc-900', 'text-white');
            selectedType = b.dataset.val;
        };
    });

    document.getElementById('btn-analyze').onclick = async function() {
        const textVal = document.getElementById('inp-text').value;
        if (mode === 'camera' && !imageFile) return showToast('Please take a photo', 'error');
        if (mode === 'text' && !textVal) return showToast('Please enter text', 'error');

        // Check limits
        const FREE_LIMIT = 3;
        if (!store.user.isPremium && store.user.scanCount >= FREE_LIMIT) {
            if (confirm("Free limit reached. Upgrade to Premium?")) router.navigate('premium');
            return;
        }

        this.innerText = "Analyzing...";
        this.disabled = true;

        try {
            const analysis = await analyzeMeal(mode === 'camera' ? imageFile : null, mode === 'text' ? textVal : null);
            
            const newMeal = {
                id: crypto.randomUUID(),
                timestamp: Date.now(),
                type: selectedType,
                imageUri: imageFile,
                textInput: textVal,
                analysis: analysis
            };
            
            await addMeal(newMeal);
            router.navigate('report', { id: newMeal.id });

        } catch (e) {
            showToast(e.message, 'error');
            this.innerText = "Analyze Meal";
            this.disabled = false;
        }
    };
}

function renderReport(id) {
    const meal = store.meals.find(m => m.id === id);
    if (!meal) return router.navigate('dashboard');
    const { analysis } = meal;

    appDiv.innerHTML = `
    <div class="p-6 pt-8 pb-24 space-y-6 animate-fade-in">
        <div class="flex items-center gap-4">
            <button onclick="router.navigate('dashboard')" class="p-2 -ml-2 rounded-full hover:bg-zinc-100">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <span class="font-semibold text-lg">Nutrition Brief</span>
        </div>

        <div class="flex items-center gap-4">
            <div class="w-20 h-20 rounded-xl bg-zinc-200 overflow-hidden border border-zinc-100 flex-shrink-0">
                ${meal.imageUri ? `<img src="${meal.imageUri}" class="w-full h-full object-cover">` : '<div class="w-full h-full flex items-center justify-center text-3xl">📝</div>'}
            </div>
            <div>
                <h1 class="text-xl font-bold leading-tight">${analysis.foodName}</h1>
                <p class="text-sm text-zinc-500 mt-1">${new Date(meal.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
            </div>
        </div>

        <div class="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm">
             <div class="flex justify-between items-start mb-6">
                <div>
                    <span class="text-sm text-zinc-500 font-medium uppercase tracking-wide">Calories</span>
                    <div class="text-6xl font-bold tracking-tighter text-zinc-900 mt-1">${analysis.calories}</div>
                </div>
                <div class="text-right">
                    <div class="inline-block px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border bg-zinc-100 text-zinc-800">
                        ${analysis.primaryVerdict}
                    </div>
                </div>
            </div>
             <div class="py-4 border-t border-zinc-100 flex items-center gap-3">
                 <div class="bg-orange-100 text-orange-600 p-2 rounded-full">🔥</div>
                 <div>
                    <p class="text-xs text-zinc-400 font-bold uppercase">Estimated Burn</p>
                    <p class="font-semibold text-zinc-900">${analysis.burnTimeText}</p>
                 </div>
            </div>
            <div class="pt-4 border-t border-zinc-100 grid grid-cols-3 gap-2 text-center">
                <div><span class="block text-xl font-bold">${analysis.macros.protein}g</span><span class="text-xs text-zinc-400">Protein</span></div>
                <div class="border-l border-zinc-100"><span class="block text-xl font-bold">${analysis.macros.carbs}g</span><span class="text-xs text-zinc-400">Carbs</span></div>
                <div class="border-l border-zinc-100"><span class="block text-xl font-bold">${analysis.macros.fat}g</span><span class="text-xs text-zinc-400">Fat</span></div>
            </div>
        </div>

        <div class="bg-zinc-900 text-white p-6 rounded-2xl shadow-lg">
            <h3 class="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-2">Goal Impact</h3>
            <p class="text-lg font-medium leading-relaxed">"${analysis.goalAlignmentText}"</p>
        </div>
        
        <div class="bg-white p-5 rounded-2xl border border-zinc-100 shadow-sm">
             <h4 class="text-sm font-bold text-zinc-900 mb-2">Guidance</h4>
             <div class="space-y-3">
                <div><p class="text-xs text-zinc-500 uppercase">Portion</p><p class="text-sm text-zinc-800">${analysis.portionGuidance}</p></div>
             </div>
        </div>
    </div>
    `;
}

function renderProfile() {
    appDiv.innerHTML = `
    <div class="p-6 pt-8 pb-24 space-y-6 animate-fade-in">
        <h1 class="text-2xl font-bold">Profile</h1>
        
        <div class="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm ${store.user.isPremium ? 'bg-gradient-to-r from-amber-100 to-amber-50 border-amber-200' : ''}">
             <p class="text-sm font-medium opacity-70 uppercase tracking-wide">Plan</p>
             <h2 class="text-xl font-bold ${store.user.isPremium ? 'text-amber-900' : 'text-zinc-900'}">
                ${store.user.isPremium ? 'Premium Subscription 🌟' : 'Free Plan'}
             </h2>
             ${!store.user.isPremium ? '<button onclick="router.navigate(\'premium\')" class="mt-4 px-4 py-2 text-xs bg-zinc-900 text-white rounded-lg">Upgrade</button>' : ''}
        </div>

        <div class="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm">
             <h3 class="font-bold text-lg mb-4">Appearance</h3>
             <div class="grid grid-cols-3 gap-3">
                ${['light', 'dark', 'gold'].map(t => `
                    <button class="theme-btn p-4 rounded-xl border-2 flex flex-col items-center gap-2 ${store.user.theme === t ? 'border-zinc-900' : 'border-zinc-100'}" data-val="${t}">
                        <div class="w-6 h-6 rounded-full border shadow-sm ${t === 'light' ? 'bg-white' : t === 'dark' ? 'bg-zinc-900' : 'bg-yellow-400'}"></div>
                        <span class="text-xs capitalize">${t}</span>
                    </button>
                `).join('')}
             </div>
        </div>

        <button onclick="logout()" class="w-full py-3 text-red-600 bg-red-50 rounded-xl">Log Out</button>
    </div>
    `;

    document.querySelectorAll('.theme-btn').forEach(b => {
        b.onclick = async () => {
            const t = b.dataset.val;
            if (!store.user.isPremium && t !== 'light') {
                if (confirm("Upgrade to Premium for themes?")) router.navigate('premium');
                return;
            }
            store.user.theme = t;
            await saveUser(store.user);
            renderProfile(); // re-render
        };
    });
}

function renderPremium() {
    appDiv.innerHTML = `
    <div class="flex flex-col min-h-screen pt-6 px-6 pb-32 animate-fade-in relative bg-white">
        <div class="flex items-center gap-4 mb-6">
            <button onclick="router.navigate('profile')" class="p-2 -ml-2 rounded-full hover:bg-zinc-100">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <h1 class="text-xl font-bold">Premium Plan</h1>
        </div>

        <div class="bg-gradient-to-br from-amber-300 via-amber-400 to-yellow-500 p-8 rounded-3xl text-amber-950 shadow-xl mb-8 relative overflow-hidden">
             <div class="relative z-10 text-center space-y-2 py-4">
                <h2 class="text-3xl font-black">Unlock<br>Everything.</h2>
             </div>
        </div>

        <div class="space-y-4">
            <div class="flex items-center gap-4 p-4 border rounded-2xl">
                <div class="text-2xl">🎨</div>
                <div><h4 class="font-bold">Exclusive Themes</h4><p class="text-xs text-zinc-500">Dark & Gold Mode.</p></div>
            </div>
            <div class="flex items-center gap-4 p-4 border rounded-2xl">
                <div class="text-2xl">💎</div>
                <div><h4 class="font-bold">Unlimited Logs</h4><p class="text-xs text-zinc-500">No daily limits.</p></div>
            </div>
        </div>

        <div class="fixed bottom-0 left-0 w-full p-6 bg-white border-t border-zinc-200 z-50">
             <div class="max-w-md mx-auto flex items-center justify-between">
                <div>
                   <span class="block text-3xl font-bold text-zinc-900">₹49</span>
                   <span class="text-sm text-zinc-500">/ month</span>
                </div>
                <button id="btn-sub" class="px-8 py-3 bg-zinc-900 text-white rounded-xl shadow-lg">Subscribe</button>
             </div>
        </div>
    </div>
    `;

    document.getElementById('btn-sub').onclick = async function() {
        if (!CONFIG.RAZORPAY_KEY_ID || CONFIG.RAZORPAY_KEY_ID === "YOUR_RAZORPAY_KEY_ID") {
            alert("Razorpay API Key missing in script.js");
            return;
        }

        const options = {
            key: CONFIG.RAZORPAY_KEY_ID,
            amount: 4900, // ₹49.00
            currency: "INR",
            name: "Dr Foodie",
            description: "Premium Subscription",
            image: "https://www.foodieqr.com/assets/img/og_img.png",
            handler: async function (response) {
                if (response.razorpay_payment_id) {
                    store.user.isPremium = true;
                    await saveUser(store.user);
                    router.navigate('profile');
                    showToast('Welcome to Premium!');
                }
            },
            prefill: { name: store.user.name, email: "user@example.com" },
            theme: { color: "#18181b" }
        };

        const rzp = new Razorpay(options);
        rzp.open();
    };
}

// Global Logout
window.logout = async () => {
    if (confirm("Log out?")) {
        store.user = null;
        store.meals = [];
        localStorage.removeItem('ni_user');
        localStorage.removeItem('ni_meals');
        if (auth) await auth.signOut();
        window.location.reload();
    }
};

// --- INIT ---
initFirebase();
applyTheme();

// Expose router to window for onclick handlers in HTML
window.router = router;

// Start App
if (store.user && store.user.onboardingComplete) {
    router.navigate('dashboard');
} else if (store.user) {
    router.navigate('onboarding');
} else {
    router.navigate('login');
}
