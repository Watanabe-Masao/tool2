import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { getFirebaseFirestore } from './config';
import type { UserSettings, CreateUserSettingsInput, UpdateUserSettingsInput } from '@/types/userSettings';

const COLLECTION_NAME = 'user_settings';

/**
 * ユーザー設定管理サービス
 */
export class UserSettingsService {
  /**
   * ユーザー設定を取得
   */
  static async get(userId: string): Promise<UserSettings | null> {
    try {
      const db = getFirebaseFirestore();
      const settingsRef = doc(db, 'users', userId, COLLECTION_NAME, 'settings');
      const snapshot = await getDoc(settingsRef);

      if (!snapshot.exists()) {
        return null;
      }

      const data = snapshot.data();
      return {
        id: snapshot.id,
        userId: data.userId,
        emailSenderName: data.emailSenderName,
        buyerName: data.buyerName,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      };
    } catch (error) {
      console.error('Error fetching user settings:', error);
      throw error;
    }
  }

  /**
   * ユーザー設定を作成
   */
  static async create(input: CreateUserSettingsInput): Promise<UserSettings> {
    try {
      const db = getFirebaseFirestore();
      const settingsRef = doc(db, 'users', input.userId, COLLECTION_NAME, 'settings');

      const now = Timestamp.now();
      const data = {
        userId: input.userId,
        emailSenderName: input.emailSenderName || '',
        buyerName: input.buyerName || '',
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(settingsRef, data);

      return {
        id: settingsRef.id,
        userId: input.userId,
        emailSenderName: input.emailSenderName,
        buyerName: input.buyerName,
        createdAt: now.toDate(),
        updatedAt: now.toDate(),
      };
    } catch (error) {
      console.error('Error creating user settings:', error);
      throw error;
    }
  }

  /**
   * ユーザー設定を更新
   */
  static async update(userId: string, input: UpdateUserSettingsInput): Promise<void> {
    try {
      const db = getFirebaseFirestore();
      const settingsRef = doc(db, 'users', userId, COLLECTION_NAME, 'settings');

      const updates: Record<string, unknown> = {
        ...input,
        updatedAt: Timestamp.now(),
      };

      await updateDoc(settingsRef, updates);
    } catch (error) {
      console.error('Error updating user settings:', error);
      throw error;
    }
  }

  /**
   * ユーザー設定を取得または作成
   */
  static async getOrCreate(userId: string): Promise<UserSettings> {
    const settings = await this.get(userId);
    if (settings) {
      return settings;
    }

    return await this.create({ userId });
  }
}
