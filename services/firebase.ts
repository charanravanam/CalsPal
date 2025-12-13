import { initializeApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

// Declare global constant injected by Vite
declare const __FIREBASE_KEY__: string;

// De-obfuscate: Base64 decode -> Reverse string
let apiKey = "";
try {
    const reversed = atob(__FIREBASE_KEY__);
    apiKey = reversed.split('').reverse().join('');
} catch(e) {
    console.error("Failed to decode Firebase Key");
}

const firebaseConfig = {
    apiKey: apiKey,
    authDomain: "dr-foodie-bc477.firebaseapp.com",
    projectId: "dr-foodie-bc477",
    storageBucket: "dr-foodie-bc477.firebasestorage.app",
    messagingSenderId: "162055987584",
    appId: "1:162055987584:web:e11db26bb62ae6544f6165",
    measurementId: "G-HXM8JW7Q1Z"
};

let app;
let auth: Auth | undefined;
let db: Firestore | undefined;

// Only initialize if we have a valid-looking key
if (apiKey && !apiKey.includes("PLACEHOLDER") && !apiKey.includes("YOUR_FIREBASE") && apiKey !== "") {
    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        console.log("Firebase initialized successfully");
    } catch (e) {
        console.warn("Firebase initialization failed (App will run in offline mode):", e);
    }
} else {
    console.warn("Firebase API Key missing. App running in offline mode.");
}

export { auth, db };