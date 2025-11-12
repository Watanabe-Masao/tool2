// Authentication Service
import { firebaseInitPromise, auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, db, doc, setDoc, getDoc } from './firebase-config.js';

class AuthService {
  constructor() {
    this.currentUser = null;
    this.onAuthStateChangedCallbacks = [];
    this.initialized = false;

    // Firebase初期化を待ってから認証状態を監視
    this.init();
  }

  async init() {
    try {
      // Firebase初期化を待つ
      await firebaseInitPromise;
      this.initialized = true;

      // 認証状態の監視
      onAuthStateChanged(auth, async (user) => {
      if (user) {
        // ログイン中
        this.currentUser = user;

        // Firestoreからユーザー詳細情報を取得
        const userDoc = await this.getUserProfile(user.uid);
        if (userDoc) {
          this.currentUser.profile = userDoc;
        }

        console.log('User logged in:', user.email);
      } else {
        // ログアウト
        this.currentUser = null;
        console.log('User logged out');
      }

        // コールバック実行
        this.onAuthStateChangedCallbacks.forEach(callback => callback(this.currentUser));
      });
    } catch (error) {
      console.error('AuthService initialization error:', error);
      this.initialized = false;
    }
  }

  /**
   * ログイン
   */
  async login(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: this.getErrorMessage(error.code) };
    }
  }

  /**
   * 新規登録
   */
  async register(email, password, displayName, role = 'buyer') {
    try {
      // ユーザー作成
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Firestoreにユーザープロファイルを保存
      await setDoc(doc(db, 'users', user.uid), {
        email: email,
        displayName: displayName,
        role: role,
        createdAt: new Date().toISOString(),
        settings: {
          defaultPixel100: 13.5714285714,
          defaultPixel50: 6.4285714286
        }
      });

      return { success: true, user: user };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: this.getErrorMessage(error.code) };
    }
  }

  /**
   * ログアウト
   */
  async logout() {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ユーザープロファイル取得
   */
  async getUserProfile(userId) {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        return userSnap.data();
      }
      return null;
    } catch (error) {
      console.error('Get user profile error:', error);
      return null;
    }
  }

  /**
   * 現在のユーザーを取得
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * 認証状態変更のリスナー登録
   */
  onAuthStateChange(callback) {
    this.onAuthStateChangedCallbacks.push(callback);
  }

  /**
   * エラーメッセージの日本語化
   */
  getErrorMessage(errorCode) {
    const errorMessages = {
      'auth/invalid-email': 'メールアドレスの形式が正しくありません',
      'auth/user-disabled': 'このアカウントは無効化されています',
      'auth/user-not-found': 'メールアドレスまたはパスワードが間違っています',
      'auth/wrong-password': 'メールアドレスまたはパスワードが間違っています',
      'auth/email-already-in-use': 'このメールアドレスは既に使用されています',
      'auth/weak-password': 'パスワードは6文字以上である必要があります',
      'auth/operation-not-allowed': 'この操作は許可されていません',
      'auth/too-many-requests': 'リクエストが多すぎます。しばらくしてから再試行してください'
    };

    return errorMessages[errorCode] || 'エラーが発生しました';
  }
}

// シングルトンインスタンスをエクスポート
const authService = new AuthService();
export default authService;
