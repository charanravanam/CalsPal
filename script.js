import { analyzeMealWithGemini } from './gemini.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
    signOut, 
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, query, orderBy, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
    apiKey: "AIzaSyB4AVx4xPWqBtRs2GXFShiqHQNfYtaXWkU",
    authDomain: "dr-foodie-bc477.firebaseapp.com",
    projectId: "dr-foodie-bc477",
    storageBucket: "dr-foodie-bc477.firebasestorage.app",
    messagingSenderId: "162055987584",
    appId: "1:162055987584:web:e11db26bb62ae6544f6165",
    measurementId: "G-HXM8JW7Q1Z"
};

let app, auth, db;
let currentUser = null;

try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
} catch (e) {
    console.error("Firebase Init Error:", e);
}

// --- STATE MANAGEMENT ---
const state = {
    user: null,
    meals: [],
};

const showLoading = (show) => {
    const el = document.getElementById('loading-overlay');
    if (show) el.classList.remove('hidden');
    else el.classList.add('hidden');
};

// Async Save User Profile
const saveUser = async (userProfile) => {
    state.user = userProfile;
    // Always save to local storage as backup/guest mode
    localStorage.setItem('ni_user', JSON.stringify(userProfile));

    if (currentUser && !currentUser.isAnonymous && db) {
        try {
            await setDoc(doc(db, "users", currentUser.uid), userProfile, { merge: true });
        } catch (e) {
            console.error("Error saving user:", e);
        }
    }
};

// Async Save Meal
const saveMeal = async (meal) => {
    state.meals = [meal, ...state.meals];
    // Always save to local storage as backup/guest mode
    localStorage.setItem('ni_meals', JSON.stringify(state.meals));
    
    if (currentUser && !currentUser.isAnonymous && db) {
        try {
            await setDoc(doc(db, "users", currentUser.uid, "meals", meal.id), meal);
        } catch (e) {
            console.error("Error saving meal:", e);
        }
    }
};

// Async Delete Meal
const deleteMeal = async (id) => {
    state.meals = state.meals.filter(m => m.id !== id);
    localStorage.setItem('ni_meals', JSON.stringify(state.meals));
    
    if (currentUser && !currentUser.isAnonymous && db) {
        try {
            await deleteDoc(doc(db, "users", currentUser.uid, "meals", id));
        } catch (e) {
            console.error("Error deleting meal:", e);
        }
    }

    // If currently viewing report, go back to dashboard
    const reportView = document.getElementById('view-report');
    if (!reportView.classList.contains('hidden')) {
        router.navigate('dashboard');
    } else {
        renderDashboard(); 
    }
};

// Auth Functions
const startGuestMode = () => {
     console.log("Starting Guest Mode");
     localStorage.setItem('ni_is_guest', 'true');
     currentUser = { uid: 'guest', isAnonymous: true, photoURL: null, displayName: 'Guest' };
     syncData('guest');
};

const loginWithEmail = async () => {
    const email = document.getElementById('inp-email').value;
    const pass = document.getElementById('inp-password').value;
    if(!email || !pass) return alert("Please enter email and password");
    
    showLoading(true);
    try {
         localStorage.removeItem('ni_is_guest');
        await signInWithEmailAndPassword(auth, email, pass);
    } catch(e) {
        showLoading(false);
        alert("Login Error: " + e.message);
    }
};

const signupWithEmail = async () => {
    const email = document.getElementById('inp-email').value;
    const pass = document.getElementById('inp-password').value;
    if(!email || !pass) return alert("Please enter email and password");
    
    showLoading(true);
    try {
        localStorage.removeItem('ni_is_guest');
        await createUserWithEmailAndPassword(auth, email, pass);
        // Success handled by auth state listener
    } catch(e) {
        showLoading(false);
        alert("Signup Error: " + e.message);
    }
};

const logout = async () => {
    if (confirm("Are you sure you want to log out?")) {
        try {
            localStorage.removeItem('ni_is_guest');
            if (auth) await signOut(auth);
            state.user = null;
            state.meals = [];
            currentUser = null;
            router.navigate('login');
        } catch (e) {
            console.error("Logout Error", e);
        }
    }
};

// Data Syncing
const syncData = async (uid) => {
    showLoading(true);
    try {
        if (uid === 'guest') {
            // Local Storage Sync
            const localUser = localStorage.getItem('ni_user');
            const localMeals = localStorage.getItem('ni_meals');
            
            if (localUser) {
                state.user = JSON.parse(localUser);
                state.meals = localMeals ? JSON.parse(localMeals) : [];
                router.navigate('dashboard');
            } else {
                state.user = null;
                state.meals = [];
                router.navigate('onboarding');
            }
        } else {
            // Firebase Sync
            const userDoc = await getDoc(doc(db, "users", uid));
            if (userDoc.exists()) {
                state.user = userDoc.data();
                const q = query(collection(db, "users", uid, "meals"), orderBy("timestamp", "desc"));
                const querySnapshot = await getDocs(q);
                state.meals = [];
                querySnapshot.forEach((doc) => {
                    state.meals.push(doc.data());
                });
                router.navigate('dashboard');
            } else {
                state.user = null;
                state.meals = [];
                router.navigate('onboarding');
            }
        }
    } catch (e) {
        console.error("Sync Error:", e);
        alert("Failed to sync data. Check console.");
    } finally {
        showLoading(false);
    }
};

// Helper: Calculate Age
const calculateAge = (dobString) => {
    if (!dobString) return 30; // Default
    const dob = new Date(dobString);
    const diff_ms = Date.now() - dob.getTime();
    const age_dt = new Date(diff_ms);
    return Math.abs(age_dt.getUTCFullYear() - 1970);
};

// Helper: Calculate TDEE
const calculateTDEEValue = (profile) => {
    const age = calculateAge(profile.dob);
    let bmr = 0;
    
    if (profile.gender === 'Male') {
        bmr = 88.362 + (13.397 * profile.weight) + (4.799 * profile.height) - (5.677 * age);
    } else {
        bmr = 447.593 + (9.247 * profile.weight) + (3.098 * profile.height) - (4.330 * age);
    }
    
    let tdee = bmr * 1.55; 
    
    if (profile.goal === 'Lose Weight') tdee -= 500;
    if (profile.goal === 'Gain Weight') tdee += 300; 
    if (profile.goal === 'Build Muscle') tdee += 500; 
    
    return Math.round(tdee);
};

// --- ROUTER ---
const views = {
    'login': document.getElementById('view-login'),
    'onboarding': document.getElementById('view-onboarding'),
    'dashboard': document.getElementById('view-dashboard'),
    'add-meal': document.getElementById('view-add-meal'),
    'report': document.getElementById('view-report'),
    'profile': document.getElementById('view-profile')
};

const router = {
    navigate: (viewName, params = {}) => {
        // Hide all views
        Object.values(views).forEach(el => {
            if(el) el.classList.add('hidden');
        });
        
        // Show target view
        if (views[viewName]) {
            views[viewName].classList.remove('hidden');
        } else {
            console.error(`View '${viewName}' not found.`);
            return;
        }

        // Logic per view
        if (viewName === 'dashboard') renderDashboard();
        if (viewName === 'report' && params.id) renderReport(params.id);
        if (viewName === 'profile') renderProfile();
        
        if (viewName === 'add-meal') {
            if (window.resetAddMealForm) window.resetAddMealForm();
        }

        // Nav bar & Header visibility
        const nav = document.getElementById('nav-bar');
        const header = document.getElementById('header');
        
        if (viewName === 'dashboard') {
            if(nav) nav.classList.remove('hidden');
            if(header) header.classList.remove('hidden');
            
            // Profile Image Logic
            const img = document.getElementById('header-profile-img');
            const ph = document.getElementById('header-profile-placeholder');
            const badge = document.getElementById('guest-badge');
            
            if (currentUser && currentUser.photoURL) {
                img.src = currentUser.photoURL;
                img.classList.remove('hidden');
                ph.classList.add('hidden');
                if(badge) badge.classList.add('hidden');
            } else if (currentUser && currentUser.isAnonymous) {
                 img.classList.add('hidden');
                 ph.classList.remove('hidden');
                 if(badge) badge.classList.remove('hidden');
            } else {
                 img.classList.add('hidden');
                 ph.classList.remove('hidden');
                 if(badge) badge.classList.add('hidden');
            }
        } else {
            if(nav) nav.classList.add('hidden');
            if(header) header.classList.add('hidden');
        }
    }
};

window.router = router;

// --- ONBOARDING LOGIC ---
const obLogic = () => {
    let step = 1;
    const formData = {
        name: '', height: 170, weight: 70, dob: '', gender: 'Male', 
        goal: 'Gain Weight', 
        healthIssues: [] 
    };

    const commonIssues = [
        "Diabetes", "High Sugar", "Hypertension", "High Blood Pressure", 
        "PCOS", "Thyroid", "Joint Pain", "Arthritis", "Acid Reflux", 
        "High Cholesterol", "Gluten Intolerance", "Lactose Intolerance", 
        "Kidney Issues"
    ];

    const updateHealthTags = () => {
        const container = document.getElementById('selected-health-tags');
        if(!container) return;
        container.innerHTML = '';
        formData.healthIssues.forEach(issue => {
            const tag = document.createElement('span');
            tag.className = "bg-zinc-900 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2";
            tag.innerHTML = `${issue} <button class="text-white/70 hover:text-white font-bold">&times;</button>`;
            tag.querySelector('button').onclick = () => {
                formData.healthIssues = formData.healthIssues.filter(i => i !== issue);
                updateHealthTags();
            };
            container.appendChild(tag);
        });
    };

    // Health Input Logic
    const healthInp = document.getElementById('inp-health');
    const suggestBox = document.getElementById('health-suggestions');
    
    if(healthInp && suggestBox) {
        healthInp.oninput = (e) => {
            const val = e.target.value.toLowerCase();
            suggestBox.innerHTML = '';
            if(!val) {
                suggestBox.classList.add('hidden');
                return;
            }
            const matches = commonIssues.filter(i => i.toLowerCase().includes(val) && !formData.healthIssues.includes(i));
            
            if(matches.length > 0) {
                suggestBox.classList.remove('hidden');
                matches.forEach(match => {
                    const div = document.createElement('div');
                    div.className = "p-3 hover:bg-zinc-50 cursor-pointer border-b border-zinc-50 last:border-0 text-sm";
                    div.innerText = match;
                    div.onclick = () => {
                        formData.healthIssues.push(match);
                        updateHealthTags();
                        healthInp.value = '';
                        suggestBox.classList.add('hidden');
                    };
                    suggestBox.appendChild(div);
                });
            } else {
                suggestBox.classList.add('hidden');
            }
        };
        healthInp.onkeydown = (e) => {
            if(e.key === 'Enter' && healthInp.value) {
                const val = healthInp.value.trim();
                if(val && !formData.healthIssues.includes(val)) {
                    formData.healthIssues.push(val);
                    updateHealthTags();
                    healthInp.value = '';
                    suggestBox.classList.add('hidden');
                }
            }
        };
    }

    const updateStep = () => {
        const stepNum = document.getElementById('ob-step-num');
        if(stepNum) stepNum.innerText = step;

        [1, 2, 3, 4].forEach(i => {
            const el = document.getElementById(`ob-step-${i}`);
            if(el) {
                if (i === step) el.classList.remove('hidden');
                else el.classList.add('hidden');
            }
        });
        
        const title = document.getElementById('ob-title');
        if(title) {
            if (step === 1) title.innerText = "Tell us about yourself.";
            if (step === 2) title.innerText = "Health Implications.";
            if (step === 3) title.innerText = "What is your main goal?";
            if (step === 4) title.innerText = "Let's check the numbers.";
        }
        
        const backBtn = document.getElementById('btn-back');
        if(backBtn) backBtn.classList.toggle('hidden', step === 1);
        
        const nextBtn = document.getElementById('btn-next');
        if(nextBtn) nextBtn.innerText = step === 4 ? "Get Started" : "Continue";
    };

    const nextBtn = document.getElementById('btn-next');
    if(nextBtn) {
        nextBtn.onclick = async () => {
            if (step === 1) {
                formData.name = document.getElementById('inp-name').value;
                formData.height = Number(document.getElementById('inp-height').value);
                formData.weight = Number(document.getElementById('inp-weight').value);
                formData.dob = document.getElementById('inp-dob').value; 
                formData.gender = document.getElementById('inp-gender').value;
                
                if (!formData.name) return alert("Please enter your name");
                if (!formData.dob) return alert("Please enter your date of birth");
                
                step++;
            } else if (step === 2) {
                step++;
            } else if (step === 3) {
                step++;
                const tdee = calculateTDEEValue(formData);
                const tdeeDisplay = document.getElementById('tdee-display');
                if(tdeeDisplay) tdeeDisplay.innerText = tdee;

            } else if (step === 4) {
                const finalTdee = Number(document.getElementById('tdee-display').innerText);
                showLoading(true);
                await saveUser({ ...formData, dailyCalorieTarget: finalTdee });
                showLoading(false);
                router.navigate('dashboard');
            }
            updateStep();
        };
    }

    const backBtn = document.getElementById('btn-back');
    if(backBtn) {
        backBtn.onclick = () => {
            if (step > 1) step--;
            updateStep();
        };
    }

    // Goal Selection
    document.querySelectorAll('.goal-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.goal-btn').forEach(b => {
                b.classList.remove('selected-goal');
                b.classList.add('border-zinc-100', 'bg-white', 'text-zinc-900');
                b.classList.remove('border-zinc-900', 'bg-zinc-900', 'text-white');
                const span = b.querySelector('span:last-child');
                if(span) { span.classList.add('opacity-70'); span.classList.remove('text-zinc-400'); }
            });

            btn.classList.add('selected-goal');
            btn.classList.remove('border-zinc-100', 'bg-white', 'text-zinc-900');
            btn.classList.add('border-zinc-900', 'bg-zinc-900', 'text-white');
            
            const span = btn.querySelector('span:last-child');
            if(span) { span.classList.remove('opacity-70'); span.classList.add('text-zinc-400'); }

            formData.goal = btn.dataset.goal;
        };
    });
};

// --- PROFILE EDIT LOGIC ---
const renderProfile = () => {
    const user = state.user;
    if(!user) return router.navigate('onboarding');

    document.getElementById('edit-name').value = user.name || '';
    document.getElementById('edit-height').value = user.height || 170;
    document.getElementById('edit-weight').value = user.weight || 70;
    document.getElementById('edit-dob').value = user.dob || ''; 
    document.getElementById('edit-gender').value = user.gender || 'Male';

    const saveBtn = document.getElementById('btn-save-profile');
    if(saveBtn) {
        saveBtn.onclick = async () => {
            const newHeight = Number(document.getElementById('edit-height').value);
            const newWeight = Number(document.getElementById('edit-weight').value);
            const newDob = document.getElementById('edit-dob').value;
            const newGender = document.getElementById('edit-gender').value;

            if(!newHeight || !newWeight || !newDob) {
                alert("Please fill in all fields");
                return;
            }

            const updatedUser = {
                ...user,
                height: newHeight,
                weight: newWeight,
                dob: newDob,
                gender: newGender
            };

            updatedUser.dailyCalorieTarget = calculateTDEEValue(updatedUser);

            showLoading(true);
            await saveUser(updatedUser);
            showLoading(false);
            router.navigate('dashboard');
        };
    }
};

// --- DASHBOARD LOGIC ---
const renderDashboard = () => {
    const user = state.user;
    if (!user) return router.navigate('login');

    const menuBtn = document.getElementById('btn-profile-menu');
    const menuDropdown = document.getElementById('profile-dropdown');
    
    if(menuBtn) {
        menuBtn.onclick = (e) => {
            e.stopPropagation();
            menuDropdown.classList.toggle('hidden');
        };
    }
    document.addEventListener('click', () => {
        if(menuDropdown && !menuDropdown.classList.contains('hidden')) menuDropdown.classList.add('hidden');
    });

    const logoutBtn = document.getElementById('btn-logout');
    if(logoutBtn) logoutBtn.onclick = logout;

    const editProfileBtn = document.getElementById('btn-edit-profile');
    if(editProfileBtn) editProfileBtn.onclick = () => router.navigate('profile');

    const contactBtn = document.getElementById('btn-contact-admin');
    if(contactBtn) contactBtn.onclick = () => {
        document.getElementById('modal-admin').classList.remove('hidden');
    };

    const dateOpts = { weekday: 'long', day: 'numeric', month: 'long' };
    document.getElementById('date-display').innerText = new Date().toLocaleDateString('en-US', dateOpts);
    document.getElementById('user-name-display').innerText = user.name;
    document.getElementById('user-goal-display').innerText = user.goal;

    const today = new Date().setHours(0,0,0,0);
    const todayMeals = state.meals.filter(m => new Date(m.timestamp).setHours(0,0,0,0) === today);
    const consumed = todayMeals.reduce((acc, curr) => acc + (curr.analysis.calories || 0), 0);
    const target = user.dailyCalorieTarget;
    
    document.getElementById('consumed-val').innerText = consumed;
    document.getElementById('target-val').innerText = `/ ${target} kcal`;
    document.getElementById('remaining-val').innerText = Math.max(0, target - consumed);
    document.getElementById('meals-count').innerText = todayMeals.length;

    const pct = Math.min(100, (consumed / target) * 100);
    const bar = document.getElementById('progress-bar');
    bar.style.width = `${pct}%`;
    bar.className = `h-full transition-all duration-1000 ease-out ${consumed > target ? 'bg-red-500' : 'bg-zinc-900'}`;

    const badge = document.getElementById('status-badge');
    badge.innerText = consumed > target ? 'Over Limit' : 'On Track';
    badge.className = `text-xs font-bold px-2 py-1 rounded ${consumed > target ? 'bg-red-100 text-red-700' : 'bg-zinc-100 text-zinc-600'}`;

    const list = document.getElementById('meals-list');
    list.innerHTML = '';
    
    if (todayMeals.length === 0) {
        list.innerHTML = `<div class="text-center py-10 bg-white rounded-2xl border border-dashed border-zinc-200"><p class="text-zinc-400">No meals logged yet today.</p></div>`;
    } else {
        todayMeals.sort((a, b) => b.timestamp - a.timestamp).forEach(meal => {
            const item = document.createElement('div');
            item.className = "bg-white p-4 rounded-xl border border-zinc-100 shadow-sm flex items-center gap-4 active:scale-[0.99] transition-transform cursor-pointer relative group";
            
            item.onclick = (e) => {
                if(!e.target.closest('.delete-btn')) {
                    router.navigate('report', { id: meal.id });
                }
            };
            
            const imgHtml = meal.imageUri 
                ? `<img src="${meal.imageUri}" class="w-full h-full object-cover">`
                : `<div class="w-full h-full flex items-center justify-center text-2xl">🍽️</div>`;

            const v = meal.analysis.primaryVerdict;
            let vClass = "text-zinc-600 bg-zinc-50 border-zinc-100";
            if(v.includes("Needed")) vClass = "text-emerald-600 bg-emerald-50 border-emerald-100";
            if(v.includes("Dangerous")) vClass = "text-red-600 bg-red-50 border-red-100";
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
                <button class="delete-btn absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity" title="Delete Meal">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            `;
            
            const delBtn = item.querySelector('.delete-btn');
            delBtn.onclick = (e) => {
                e.stopPropagation();
                if(confirm("Delete this meal?")) {
                    deleteMeal(meal.id);
                }
            };

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

    const fileInp = document.getElementById('file-input');
    const dropZone = document.getElementById('drop-zone');
    const clearBtn = document.getElementById('btn-clear-image');
    
    if(dropZone) dropZone.onclick = () => fileInp.click();
    
    if(fileInp) {
        fileInp.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    imageBase64 = reader.result;
                    document.getElementById('image-preview').src = imageBase64;
                    document.getElementById('image-preview').classList.remove('hidden');
                    document.getElementById('drop-zone-content').classList.add('hidden');
                    clearBtn.classList.remove('hidden');
                };
                reader.readAsDataURL(file);
            }
        };
    }

    if(clearBtn) {
        clearBtn.onclick = (e) => {
            e.stopPropagation();
            imageBase64 = null;
            document.getElementById('image-preview').src = '';
            document.getElementById('image-preview').classList.add('hidden');
            document.getElementById('drop-zone-content').classList.remove('hidden');
            clearBtn.classList.add('hidden');
            fileInp.value = '';
        };
    }

    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.type-btn').forEach(b => {
                b.className = "type-btn py-2 text-xs font-semibold rounded-lg border bg-white text-zinc-600 border-zinc-200";
            });
            btn.className = "type-btn py-2 text-xs font-semibold rounded-lg border bg-zinc-900 text-white border-zinc-900";
            selectedType = btn.dataset.type;
        };
    });

    const cancelBtn = document.getElementById('btn-cancel-add');
    if(cancelBtn) cancelBtn.onclick = () => router.navigate('dashboard');

    const analyzeBtn = document.getElementById('btn-analyze');
    if(analyzeBtn) {
        analyzeBtn.onclick = async () => {
            const textVal = mode === 'text' ? document.getElementById('text-input').value : document.getElementById('input-description').value;
            const quantityVal = document.getElementById('input-quantity').value;
            const errEl = document.getElementById('error-message');
            
            if (mode === 'camera' && !imageBase64) return;
            if (mode === 'text' && !textVal) return;

            analyzeBtn.disabled = true;
            analyzeBtn.innerHTML = `<svg class="animate-spin h-5 w-5 mr-2 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Analyzing...`;
            errEl.classList.add('hidden');

            try {
                const analysis = await analyzeMealWithGemini(
                    mode === 'camera' ? imageBase64 : undefined,
                    textVal,
                    quantityVal,
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

                await saveMeal(newMeal);
                router.navigate('report', { id: newMeal.id });

            } catch (error) {
                console.error(error);
                errEl.innerText = error.message.includes("API_KEY") ? error.message : "Failed to analyze meal. Please try again.";
                errEl.classList.remove('hidden');
            } finally {
                analyzeBtn.disabled = false;
                analyzeBtn.innerText = "Analyze Meal";
            }
        };
    }

    window.resetAddMealForm = () => {
        setMode('camera');
        imageBase64 = null;
        document.getElementById('image-preview').classList.add('hidden');
        document.getElementById('drop-zone-content').classList.remove('hidden');
        document.getElementById('btn-clear-image').classList.add('hidden');
        
        document.getElementById('text-input').value = '';
        document.getElementById('input-description').value = '';
        document.getElementById('input-quantity').value = '';
        
        const errMsg = document.getElementById('error-message');
        if(errMsg) errMsg.classList.add('hidden');
    };
};

// --- REPORT LOGIC ---
const renderReport = (id) => {
    const meal = state.meals.find(m => m.id === id);
    if (!meal) return router.navigate('dashboard');

    const data = meal.analysis;

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

    document.getElementById('report-cals').innerText = data.calories;
    document.getElementById('report-burn').innerText = data.burnTimeText;
    
    const vEl = document.getElementById('report-verdict');
    vEl.innerText = data.primaryVerdict;
    
    let vColor = 'bg-zinc-100 text-zinc-800 border-zinc-200';
    if (data.primaryVerdict.includes("Needed")) vColor = 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (data.primaryVerdict.includes("Dangerous")) vColor = 'bg-red-100 text-red-800 border-red-200';
    if (data.primaryVerdict.includes("High Calorie")) vColor = 'bg-amber-100 text-amber-800 border-amber-200';
    vEl.className = `inline-block px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${vColor}`;

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

    document.getElementById('report-goal-text').innerText = `"${data.goalAlignmentText}"`;
    document.getElementById('report-portion').innerText = data.portionGuidance;
    document.getElementById('report-freq').innerText = data.frequencyGuidance;

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
    document.getElementById('btn-delete-meal').onclick = () => {
        if(confirm("Delete this meal log?")) {
            deleteMeal(id);
        }
    };
};

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    obLogic();
    addMealLogic();

    const emailLoginBtn = document.getElementById('btn-email-login');
    if(emailLoginBtn) emailLoginBtn.onclick = loginWithEmail;

    const emailSignupBtn = document.getElementById('btn-email-signup');
    if(emailSignupBtn) emailSignupBtn.onclick = signupWithEmail;
    
    const guestBtn = document.getElementById('btn-guest-login');
    if(guestBtn) guestBtn.onclick = startGuestMode;

    // Check Firebase connection
    if (auth) {
        onAuthStateChanged(auth, (user) => {
            // Check local storage flag first to persist Guest Mode across reloads
            const isGuestSession = localStorage.getItem('ni_is_guest') === 'true';

            if (isGuestSession) {
                console.log("Restoring Guest Session");
                startGuestMode(); // Re-initialize guest user state
                return;
            }
            
            currentUser = user;
            if (user) {
                syncData(user.uid);
            } else {
                showLoading(false);
                router.navigate('login');
            }
        });
    } else {
        console.warn("Firebase not connected. Check config.");
        // Dev fallback logic if needed, or stick to login screen
        router.navigate('login');
    }
});