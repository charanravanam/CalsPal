import { analyzeMealWithGemini } from './gemini.js';

// --- STATE MANAGEMENT ---
const state = {
    user: JSON.parse(localStorage.getItem('ni_user')) || null,
    meals: JSON.parse(localStorage.getItem('ni_meals')) || [],
};

const saveUser = (user) => {
    state.user = user;
    localStorage.setItem('ni_user', JSON.stringify(user));
};

const saveMeal = (meal) => {
    state.meals = [meal, ...state.meals];
    localStorage.setItem('ni_meals', JSON.stringify(state.meals));
};

// --- ROUTER ---
const views = {
    onboarding: document.getElementById('view-onboarding'),
    dashboard: document.getElementById('view-dashboard'),
    addMeal: document.getElementById('view-add-meal'),
    report: document.getElementById('view-report')
};

const router = {
    navigate: (viewName, params = {}) => {
        // Hide all views
        Object.values(views).forEach(el => el.classList.add('hidden'));
        
        // Show target view
        if (views[viewName]) {
            views[viewName].classList.remove('hidden');
        }

        // Logic per view
        if (viewName === 'dashboard') renderDashboard();
        if (viewName === 'report' && params.id) renderReport(params.id);
        if (viewName === 'addMeal') resetAddMealForm();

        // Nav bar visibility
        const nav = document.getElementById('nav-bar');
        const header = document.getElementById('header');
        
        if (viewName === 'dashboard') {
            nav.classList.remove('hidden');
            header.classList.remove('hidden');
        } else {
            nav.classList.add('hidden');
            header.classList.add('hidden');
        }
    }
};

// Make router global for inline onclick handlers
window.router = router;

// --- ONBOARDING LOGIC ---
const obLogic = () => {
    let step = 1;
    const formData = {
        name: '', height: 170, weight: 70, age: 30, gender: 'Male', goal: 'Maintain Weight'
    };

    const updateStep = () => {
        document.getElementById('ob-step-num').innerText = step;
        [1, 2, 3].forEach(i => {
            const el = document.getElementById(`ob-step-${i}`);
            if (i === step) el.classList.remove('hidden');
            else el.classList.add('hidden');
        });
        
        if (step === 2) document.getElementById('ob-title').innerText = "What is your main goal?";
        if (step === 3) document.getElementById('ob-title').innerText = "Let's check the numbers.";
        
        // Button state
        document.getElementById('btn-back').classList.toggle('hidden', step === 1);
        document.getElementById('btn-next').innerText = step === 3 ? "Get Started" : "Continue";
    };

    document.getElementById('btn-next').onclick = () => {
        if (step === 1) {
            formData.name = document.getElementById('inp-name').value;
            formData.height = Number(document.getElementById('inp-height').value);
            formData.weight = Number(document.getElementById('inp-weight').value);
            formData.age = Number(document.getElementById('inp-age').value);
            formData.gender = document.getElementById('inp-gender').value;
            if (!formData.name) return alert("Please enter your name");
            step++;
        } else if (step === 2) {
            // Goal is selected via buttons
            step++;
            calculateTDEE();
        } else if (step === 3) {
            saveUser({ ...formData, dailyCalorieTarget: Number(document.getElementById('tdee-display').innerText) });
            router.navigate('dashboard');
        }
        updateStep();
    };

    document.getElementById('btn-back').onclick = () => {
        if (step > 1) step--;
        updateStep();
    };

    // Goal Selection
    document.querySelectorAll('.goal-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.goal-btn').forEach(b => {
                b.classList.remove('border-zinc-900', 'bg-zinc-50');
                b.classList.add('border-zinc-100', 'bg-white');
            });
            btn.classList.add('border-zinc-900', 'bg-zinc-50');
            btn.classList.remove('border-zinc-100', 'bg-white');
            formData.goal = btn.dataset.goal;
        };
    });

    const calculateTDEE = () => {
        let bmr = 0;
        if (formData.gender === 'Male') {
            bmr = 88.362 + (13.397 * formData.weight) + (4.799 * formData.height) - (5.677 * formData.age);
        } else {
            bmr = 447.593 + (9.247 * formData.weight) + (3.098 * formData.height) - (4.330 * formData.age);
        }
        
        // Assume Moderate Activity (1.55) + Goal Adjustment
        let tdee = bmr * 1.55;
        if (formData.goal === 'Lose Weight') tdee -= 500;
        if (formData.goal === 'Build Muscle') tdee += 300;
        
        document.getElementById('tdee-display').innerText = Math.round(tdee);
    };
};

// --- DASHBOARD LOGIC ---
const renderDashboard = () => {
    const user = state.user;
    if (!user) return router.navigate('onboarding');

    // Header
    const dateOpts = { weekday: 'long', day: 'numeric', month: 'long' };
    document.getElementById('date-display').innerText = new Date().toLocaleDateString('en-US', dateOpts);
    document.getElementById('user-name-display').innerText = user.name;
    document.getElementById('user-goal-display').innerText = user.goal;

    // Daily Stats
    const today = new Date().setHours(0,0,0,0);
    const todayMeals = state.meals.filter(m => new Date(m.timestamp).setHours(0,0,0,0) === today);
    const consumed = todayMeals.reduce((acc, curr) => acc + (curr.analysis.calories || 0), 0);
    const target = user.dailyCalorieTarget;
    
    document.getElementById('consumed-val').innerText = consumed;
    document.getElementById('target-val').innerText = `/ ${target} kcal`;
    document.getElementById('remaining-val').innerText = Math.max(0, target - consumed);
    document.getElementById('meals-count').innerText = todayMeals.length;

    // Progress Bar
    const pct = Math.min(100, (consumed / target) * 100);
    const bar = document.getElementById('progress-bar');
    bar.style.width = `${pct}%`;
    bar.className = `h-full transition-all duration-1000 ease-out ${consumed > target ? 'bg-red-500' : 'bg-zinc-900'}`;

    document.getElementById('status-badge').innerText = consumed > target ? 'Over Limit' : 'On Track';
    document.getElementById('status-badge').className = `text-xs font-bold px-2 py-1 rounded ${consumed > target ? 'bg-red-100 text-red-700' : 'bg-zinc-100 text-zinc-600'}`;

    // Recent Meals List
    const list = document.getElementById('meals-list');
    list.innerHTML = '';
    
    if (todayMeals.length === 0) {
        list.innerHTML = `<div class="text-center py-10 bg-white rounded-2xl border border-dashed border-zinc-200"><p class="text-zinc-400">No meals logged yet today.</p></div>`;
    } else {
        todayMeals.slice(0, 5).forEach(meal => {
            const item = document.createElement('div');
            item.className = "bg-white p-4 rounded-xl border border-zinc-100 shadow-sm flex items-center gap-4 active:scale-[0.99] transition-transform cursor-pointer";
            item.onclick = () => router.navigate('report', { id: meal.id });
            
            const imgHtml = meal.imageUri 
                ? `<img src="${meal.imageUri}" class="w-full h-full object-cover">`
                : `<div class="w-full h-full flex items-center justify-center text-2xl">🍽️</div>`;

            // Verdict Color Map
            const v = meal.analysis.primaryVerdict;
            let vClass = "text-zinc-600 bg-zinc-50 border-zinc-100";
            if(v.includes("Needed")) vClass = "text-emerald-600 bg-emerald-50 border-emerald-100";
            if(v.includes("Dangerous") || v.includes("Unhealthy")) vClass = "text-red-600 bg-red-50 border-red-100";
            if(v.includes("High Calorie")) vClass = "text-amber-600 bg-amber-50 border-amber-100";

            item.innerHTML = `
                <div class="w-16 h-16 rounded-lg bg-zinc-100 overflow-hidden flex-shrink-0 border border-zinc-50">${imgHtml}</div>
                <div class="flex-1 min-w-0">
                    <h4 class="font-semibold text-zinc-900 truncate">${meal.analysis.foodName}</h4>
                    <p class="text-sm text-zinc-500">${new Date(meal.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} • ${meal.type}</p>
                </div>
                <div class="text-right flex flex-col items-end gap-1">
                     <span class="font-bold text-zinc-900">${meal.analysis.calories}</span>
                     <span class="text-[10px] font-bold px-1.5 py-0.5 rounded border ${vClass}">${v.split(" ")[0]}</span>
                </div>
            `;
            list.appendChild(item);
        });
    }
};

// --- ADD MEAL LOGIC ---
const addMealLogic = () => {
    let mode = 'camera';
    let imageBase64 = null;
    let selectedType = 'Lunch';

    const setMode = (m) => {
        mode = m;
        document.getElementById('tab-camera').className = `flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'camera' ? 'bg-white shadow text-zinc-900' : 'text-zinc-500'}`;
        document.getElementById('tab-text').className = `flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'text' ? 'bg-white shadow text-zinc-900' : 'text-zinc-500'}`;
        
        document.getElementById('input-camera-container').classList.toggle('hidden', mode !== 'camera');
        document.getElementById('input-text-container').classList.toggle('hidden', mode !== 'text');
    };

    document.getElementById('tab-camera').onclick = () => setMode('camera');
    document.getElementById('tab-text').onclick = () => setMode('text');

    // File Input
    const fileInp = document.getElementById('file-input');
    document.getElementById('drop-zone').onclick = () => fileInp.click();
    fileInp.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                imageBase64 = reader.result;
                document.getElementById('image-preview').src = imageBase64;
                document.getElementById('image-preview').classList.remove('hidden');
                document.getElementById('drop-zone-content').classList.add('hidden');
            };
            reader.readAsDataURL(file);
        }
    };

    // Meal Type
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.type-btn').forEach(b => {
                b.className = "type-btn py-2 text-xs font-semibold rounded-lg border bg-white text-zinc-600 border-zinc-200";
            });
            btn.className = "type-btn py-2 text-xs font-semibold rounded-lg border bg-zinc-900 text-white border-zinc-900";
            selectedType = btn.dataset.type;
        };
    });

    document.getElementById('btn-cancel-add').onclick = () => router.navigate('dashboard');

    document.getElementById('btn-analyze').onclick = async () => {
        const textVal = document.getElementById('text-input').value;
        const btn = document.getElementById('btn-analyze');
        const errEl = document.getElementById('error-message');
        
        if (mode === 'camera' && !imageBase64) return;
        if (mode === 'text' && !textVal) return;

        btn.disabled = true;
        btn.innerHTML = `<svg class="animate-spin h-5 w-5 mr-2 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Analyzing...`;
        errEl.classList.add('hidden');

        try {
            const analysis = await analyzeMealWithGemini(
                mode === 'camera' ? imageBase64 : undefined,
                mode === 'text' ? textVal : undefined,
                state.user
            );

            const newMeal = {
                id: crypto.randomUUID(),
                timestamp: Date.now(),
                type: selectedType,
                imageUri: imageBase64,
                textInput: textVal,
                analysis
            };

            saveMeal(newMeal);
            router.navigate('report', { id: newMeal.id });

        } catch (error) {
            errEl.innerText = error.message.includes("API_KEY") ? error.message : "Failed to analyze meal. Please try again.";
            errEl.classList.remove('hidden');
        } finally {
            btn.disabled = false;
            btn.innerText = "Analyze Meal";
        }
    };

    window.resetAddMealForm = () => {
        setMode('camera');
        imageBase64 = null;
        document.getElementById('image-preview').classList.add('hidden');
        document.getElementById('drop-zone-content').classList.remove('hidden');
        document.getElementById('text-input').value = '';
        document.getElementById('error-message').classList.add('hidden');
    };
};

// --- REPORT LOGIC ---
const renderReport = (id) => {
    const meal = state.meals.find(m => m.id === id);
    if (!meal) return router.navigate('dashboard');

    const data = meal.analysis;

    // Header
    const imgEl = document.getElementById('report-img');
    const iconEl = document.getElementById('report-icon');
    if (meal.imageUri) {
        imgEl.src = meal.imageUri;
        imgEl.classList.remove('hidden');
        iconEl.classList.add('hidden');
    } else {
        imgEl.classList.add('hidden');
        iconEl.classList.remove('hidden');
    }
    
    document.getElementById('report-title').innerText = data.foodName;
    document.getElementById('report-meta').innerText = `${new Date(meal.timestamp).toLocaleDateString()} • ${meal.type}`;

    // Metrics
    document.getElementById('report-cals').innerText = data.calories;
    document.getElementById('report-burn').innerText = data.burnTimeText;
    
    const vEl = document.getElementById('report-verdict');
    vEl.innerText = data.primaryVerdict;
    
    // Verdict Colors
    let vColor = 'bg-zinc-100 text-zinc-800 border-zinc-200';
    if (data.primaryVerdict.includes("Needed")) vColor = 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (data.primaryVerdict.includes("Dangerous")) vColor = 'bg-red-100 text-red-800 border-red-200';
    if (data.primaryVerdict.includes("High Calorie")) vColor = 'bg-amber-100 text-amber-800 border-amber-200';
    vEl.className = `inline-block px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${vColor}`;

    // Secondary Verdicts
    const subVEl = document.getElementById('report-sub-verdicts');
    subVEl.innerHTML = '';
    if (data.secondaryVerdicts) {
        data.secondaryVerdicts.forEach(sv => {
            const s = document.createElement('span');
            s.className = "text-xs text-zinc-500 font-medium";
            s.innerText = sv;
            subVEl.appendChild(s);
        });
    }

    // Macros
    const macrosEl = document.getElementById('report-macros');
    macrosEl.innerHTML = '';
    if (data.macros) {
        macrosEl.innerHTML = `
            <div class="text-center">
                <span class="block text-xl font-bold text-zinc-900">${data.macros.protein}g</span>
                <span class="text-xs text-zinc-400 uppercase">Protein</span>
            </div>
            <div class="text-center border-l border-zinc-100">
                <span class="block text-xl font-bold text-zinc-900">${data.macros.carbs}g</span>
                <span class="text-xs text-zinc-400 uppercase">Carbs</span>
            </div>
            <div class="text-center border-l border-zinc-100">
                <span class="block text-xl font-bold text-zinc-900">${data.macros.fat}g</span>
                <span class="text-xs text-zinc-400 uppercase">Fat</span>
            </div>
        `;
    }

    // Text Content
    document.getElementById('report-goal-text').innerText = `"${data.goalAlignmentText}"`;
    document.getElementById('report-portion').innerText = data.portionGuidance;
    document.getElementById('report-freq').innerText = data.frequencyGuidance;

    // Alerts
    const alertsEl = document.getElementById('report-alerts');
    const alertsList = document.getElementById('report-alerts-list');
    alertsList.innerHTML = '';
    
    const allAlerts = [...(data.allergens || []), ...(data.risks || [])];
    if (allAlerts.length > 0) {
        alertsEl.classList.remove('hidden');
        allAlerts.forEach(a => {
            const li = document.createElement('li');
            li.className = "text-sm text-red-700 flex items-start gap-2";
            li.innerHTML = `<span class="font-bold text-xs uppercase bg-red-100 px-1.5 py-0.5 rounded">Alert</span> ${a}`;
            alertsList.appendChild(li);
        });
    } else {
        alertsEl.classList.add('hidden');
    }

    document.getElementById('btn-close-report').onclick = () => router.navigate('dashboard');
};

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    obLogic();
    addMealLogic();

    if (state.user) {
        router.navigate('dashboard');
    } else {
        router.navigate('onboarding');
    }
});