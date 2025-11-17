import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  Timestamp,
} from 'firebase/firestore';
import { getFirebaseFirestore } from './config';
import type { StoreSettings, CreateStoreSettingsInput, UpdateStoreSettingsInput } from '@/types/storeSettings';

const COLLECTION_NAME = 'store_settings';

/**
 * 店舗設定管理サービス
 */
export class StoreSettingsService {
  /**
   * 全ての店舗設定を取得
   */
  static async getAll(userId: string): Promise<StoreSettings[]> {
    try {
      const db = getFirebaseFirestore();
      const settingsRef = collection(db, 'users', userId, COLLECTION_NAME);
      const q = query(settingsRef);
      const snapshot = await getDocs(q);

      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          storeCode: data.storeCode,
          salesRatio: data.salesRatio || 0,
          enabled: data.enabled ?? true,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        };
      });
    } catch (error) {
      console.error('Error fetching store settings:', error);
      throw error;
    }
  }

  /**
   * 特定の店舗設定を取得
   */
  static async getByStoreCode(userId: string, storeCode: string): Promise<StoreSettings | null> {
    try {
      const db = getFirebaseFirestore();
      const docRef = doc(db, 'users', userId, COLLECTION_NAME, storeCode);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      const data = docSnap.data();
      return {
        id: docSnap.id,
        userId: data.userId,
        storeCode: data.storeCode,
        salesRatio: data.salesRatio || 0,
        enabled: data.enabled ?? true,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      };
    } catch (error) {
      console.error('Error fetching store settings:', error);
      throw error;
    }
  }

  /**
   * 店舗設定を作成または更新
   */
  static async upsert(userId: string, storeCode: string, input: CreateStoreSettingsInput): Promise<void> {
    try {
      const db = getFirebaseFirestore();
      const docRef = doc(db, 'users', userId, COLLECTION_NAME, storeCode);
      const now = Timestamp.now();

      // 既存のドキュメントを確認
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        // 更新
        await updateDoc(docRef, {
          salesRatio: input.salesRatio,
          enabled: input.enabled,
          updatedAt: now,
        });
      } else {
        // 新規作成
        await setDoc(docRef, {
          userId: input.userId,
          storeCode: input.storeCode,
          salesRatio: input.salesRatio,
          enabled: input.enabled,
          createdAt: now,
          updatedAt: now,
        });
      }
    } catch (error) {
      console.error('Error upserting store settings:', error);
      throw error;
    }
  }

  /**
   * 店舗設定を更新
   */
  static async update(userId: string, storeCode: string, input: UpdateStoreSettingsInput): Promise<void> {
    try {
      const db = getFirebaseFirestore();
      const docRef = doc(db, 'users', userId, COLLECTION_NAME, storeCode);
      const now = Timestamp.now();

      await updateDoc(docRef, {
        ...input,
        updatedAt: now,
      });
    } catch (error) {
      console.error('Error updating store settings:', error);
      throw error;
    }
  }

  /**
   * 一括で店舗設定を作成または更新
   */
  static async batchUpsert(userId: string, settings: Array<{ storeCode: string; salesRatio: number; enabled: boolean }>): Promise<void> {
    try {
      // 順次処理（Firestoreのbatch書き込みは500件まで）
      for (const setting of settings) {
        await this.upsert(userId, setting.storeCode, {
          userId,
          storeCode: setting.storeCode,
          salesRatio: setting.salesRatio,
          enabled: setting.enabled,
        });
      }
    } catch (error) {
      console.error('Error batch upserting store settings:', error);
      throw error;
    }
  }
}
