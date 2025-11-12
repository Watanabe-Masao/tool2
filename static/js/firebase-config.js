// Firebase Configuration
// Import the functions you need from the SDKs you need
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, query, where, orderBy, limit, updateDoc, deleteDoc, onSnapshot, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCjuPCpB0wqHxdX4JWL6VnEj1LJWgr4cKc",
  authDomain: "haibun-distribution.firebaseapp.com",
  projectId: "haibun-distribution",
  storageBucket: "haibun-distribution.firebasestorage.app",
  messagingSenderId: "742220611313",
  appId: "1:742220611313:web:bec0f006c4c648adcbb350"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

console.log('Firebase initialized successfully');

// Export for use in other modules
export { app, auth, db, collection, doc, setDoc, getDoc, getDocs, query, where, orderBy, limit, updateDoc, deleteDoc, onSnapshot, serverTimestamp, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged };
