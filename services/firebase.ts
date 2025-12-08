import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyB4AVx4xPWqBtRs2GXFShiqHQNfYtaXWkU",
    authDomain: "dr-foodie-bc477.firebaseapp.com",
    projectId: "dr-foodie-bc477",
    storageBucket: "dr-foodie-bc477.firebasestorage.app",
    messagingSenderId: "162055987584",
    appId: "1:162055987584:web:e11db26bb62ae6544f6165",
    measurementId: "G-HXM8JW7Q1Z"
};

let app;
let auth;
let db;

try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
} catch (e) {
    console.error("Firebase Initialization Error:", e);
}

export { auth, db };