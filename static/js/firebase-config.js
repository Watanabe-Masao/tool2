// Firebase Configuration
// Import the functions you need from the SDKs you need
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, query, where, orderBy, limit, updateDoc, deleteDoc, onSnapshot, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Firebase configuration (仮の設定 - 後で実際の値に置き換える)
const firebaseConfig = {
  apiKey: "AIzaSyDEMO_API_KEY_REPLACE_WITH_REAL",
  authDomain: "haibun-distribution.firebaseapp.com",
  projectId: "haibun-distribution",
  storageBucket: "haibun-distribution.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456",
  measurementId: "G-XXXXXXXXXX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

console.log('Firebase initialized successfully');

// Export for use in other modules
export { app, auth, db, collection, doc, setDoc, getDoc, getDocs, query, where, orderBy, limit, updateDoc, deleteDoc, onSnapshot, serverTimestamp, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged };
