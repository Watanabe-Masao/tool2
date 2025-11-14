import { initializeApp } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import type { Auth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';

/**
 * Firebase設定を環境変数から取得
 *
 * 開発環境: .env ファイルから読み込み
 * 本番環境: Viteのビルド時に環境変数が埋め込まれる
 */
const getFirebaseConfig = () => {
  // 環境変数から直接読み込み
  const config = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };

  // 環境変数の検証
  const missingVars = [];
  if (!config.apiKey) missingVars.push('VITE_FIREBASE_API_KEY');
  if (!config.authDomain) missingVars.push('VITE_FIREBASE_AUTH_DOMAIN');
  if (!config.projectId) missingVars.push('VITE_FIREBASE_PROJECT_ID');
  if (!config.storageBucket) missingVars.push('VITE_FIREBASE_STORAGE_BUCKET');
  if (!config.messagingSenderId) missingVars.push('VITE_FIREBASE_MESSAGING_SENDER_ID');
  if (!config.appId) missingVars.push('VITE_FIREBASE_APP_ID');

  if (missingVars.length > 0) {
    throw new Error(
      `Firebase環境変数が設定されていません。\n` +
      `.envファイルに以下を設定してください:\n${missingVars.join('\n')}\n\n` +
      `例:\n` +
      `VITE_FIREBASE_API_KEY=your_api_key_here\n` +
      `VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com\n` +
      `VITE_FIREBASE_PROJECT_ID=your_project_id`
    );
  }

  return config;
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

      // 環境変数からFirebase設定を取得
      const config = getFirebaseConfig();

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
