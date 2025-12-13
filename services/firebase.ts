import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";

// Declare global constant injected by Vite
declare const __FIREBASE_KEY__: string;

// De-obfuscate: Base64 decode -> Reverse string
let apiKey = "";
try {
    // Safely check if key is defined and not empty before attempting decode
    const keyToDecode = (typeof __FIREBASE_KEY__ !== 'undefined') ? __FIREBASE_KEY__ : "";
    
    if (keyToDecode && keyToDecode.length > 0) {
        const reversed = atob(keyToDecode);
        apiKey = reversed.split('').reverse().join('');
    }
} catch(e) {
    // Suppress error, just warn. This happens if key is missing/invalid which is handled below.
    console.warn("Firebase Key check: No valid key found (Offline Mode).");
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
let auth: firebase.auth.Auth | undefined;
let db: firebase.firestore.Firestore | undefined;

// Only initialize if we have a valid-looking key
if (apiKey && !apiKey.includes("PLACEHOLDER") && !apiKey.includes("YOUR_FIREBASE") && apiKey !== "") {
    try {
        if (!firebase.apps.length) {
            app = firebase.initializeApp(firebaseConfig);
        } else {
            app = firebase.app();
        }
        auth = firebase.auth();
        db = firebase.firestore();
        console.log("Firebase initialized successfully");
    } catch (e) {
        console.warn("Firebase initialization failed (App will run in offline mode):", e);
    }
} else {
    console.warn("Firebase API Key missing. App running in offline mode.");
}

export { auth, db };