// Firebase Configuration
// セキュリティのため、設定は環境変数から動的に取得します

// Import the functions you need from the SDKs you need
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, query, where, orderBy, limit, updateDoc, deleteDoc, onSnapshot, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js';

// Firebase設定をサーバーから取得
let app, auth, db;

async function initializeFirebase() {
  try {
    // サーバーからFirebase設定を取得（環境変数経由）
    const response = await fetch('/api/firebase-config');
    if (!response.ok) {
      throw new Error('Firebase設定の取得に失敗しました');
    }

    const firebaseConfig = await response.json();

    // Initialize Firebase
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);

    console.log('Firebase initialized successfully');
    return { app, auth, db };
  } catch (error) {
    console.error('Firebase initialization error:', error);
    throw error;
  }
}

// Firebaseを初期化（Promise）
const firebaseInitPromise = initializeFirebase();

// Export: 他のモジュールで使用前にawaitする必要あり
export { firebaseInitPromise, app, auth, db, collection, doc, setDoc, getDoc, getDocs, query, where, orderBy, limit, updateDoc, deleteDoc, onSnapshot, serverTimestamp, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged };
