import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { FirebaseConfigResponse } from '@/types';

/**
 * Firebase設定をサーバーから取得
 * セキュリティのため、環境変数はサーバー側で管理
 */
const fetchFirebaseConfig = async (): Promise<FirebaseConfigResponse> => {
  const response = await fetch('/api/firebase-config');
  if (!response.ok) {
    throw new Error('Firebase設定の取得に失敗しました');
  }
  return response.json();
};

/**
 * Firebaseアプリケーションインスタンス
 */
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

/**
 * Firebaseの初期化状態
 */
let initializePromise: Promise<void> | null = null;

/**
 * Firebaseを初期化
 */
export const initializeFirebase = async (): Promise<void> => {
  // 既に初期化済みの場合は何もしない
  if (app && auth && db) {
    return;
  }

  // 初期化中の場合は、その完了を待つ
  if (initializePromise) {
    return initializePromise;
  }

  // 新しい初期化を開始
  initializePromise = (async () => {
    try {
      console.log('Firebase初期化を開始...');

      // サーバーからFirebase設定を取得
      const config = await fetchFirebaseConfig();

      // Firebaseアプリを初期化
      app = initializeApp(config);
      auth = getAuth(app);
      db = getFirestore(app);

      console.log('Firebase初期化完了');
    } catch (error) {
      console.error('Firebase初期化エラー:', error);
      // 初期化失敗時はリセット
      app = null;
      auth = null;
      db = null;
      initializePromise = null;
      throw error;
    }
  })();

  return initializePromise;
};

/**
 * Firebaseアプリインスタンスを取得
 */
export const getApp = (): FirebaseApp => {
  if (!app) {
    throw new Error('Firebaseが初期化されていません。initializeFirebase()を先に呼び出してください。');
  }
  return app;
};

/**
 * Firebase Authenticationインスタンスを取得
 */
export const getFirebaseAuth = (): Auth => {
  if (!auth) {
    throw new Error('Firebase Authが初期化されていません。initializeFirebase()を先に呼び出してください。');
  }
  return auth;
};

/**
 * Firestore インスタンスを取得
 */
export const getFirebaseFirestore = (): Firestore => {
  if (!db) {
    throw new Error('Firestoreが初期化されていません。initializeFirebase()を先に呼び出してください。');
  }
  return db;
};
