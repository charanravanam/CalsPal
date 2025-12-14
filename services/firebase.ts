import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";

// Declare global constant injected by Vite
declare const __FIREBASE_KEY__: string;

let app;
let auth: firebase.auth.Auth | undefined;
let db: firebase.firestore.Firestore | undefined;
let googleProvider: firebase.auth.GoogleAuthProvider | undefined;

// Helper to decode key safely
const getApiKey = () => {
    try {
        const keyToDecode = (typeof __FIREBASE_KEY__ !== 'undefined') ? __FIREBASE_KEY__ : "";
        if (keyToDecode && keyToDecode.length > 0) {
            return atob(keyToDecode).split('').reverse().join('');
        }
    } catch(e) {
        console.warn("Error decoding Firebase key");
    }
    return "";
}

const apiKey = getApiKey();

const firebaseConfig = {
    apiKey: apiKey,
    authDomain: "dr-foodie-bc477.firebaseapp.com",
    projectId: "dr-foodie-bc477",
    storageBucket: "dr-foodie-bc477.firebasestorage.app",
    messagingSenderId: "162055987584",
    appId: "1:162055987584:web:e11db26bb62ae6544f6165",
    measurementId: "G-HXM8JW7Q1Z"
};

// Initialize only if we have a key
if (apiKey) {
    try {
        if (!firebase.apps.length) {
            app = firebase.initializeApp(firebaseConfig);
        } else {
            app = firebase.app();
        }
        auth = firebase.auth();
        db = firebase.firestore();
        googleProvider = new firebase.auth.GoogleAuthProvider();
        console.log("Firebase initialized");
    } catch (e) {
        console.warn("Firebase initialization failed:", e);
    }
} else {
    console.warn("No Firebase API Key found. Offline mode.");
}

export { auth, db, googleProvider };