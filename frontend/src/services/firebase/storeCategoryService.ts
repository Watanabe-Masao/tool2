import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/services/firebase/firebaseConfig';
import type { StoreCategory, CreateStoreCategoryInput, UpdateStoreCategoryInput } from '@/types/storeCategory';

const COLLECTION_NAME = 'store_categories';

/**
 * 店舗カテゴリー管理サービス
 */
export class StoreCategoryService {
  /**
   * 全ての店舗カテゴリーを取得
   */
  static async getAll(userId: string): Promise<StoreCategory[]> {
    try {
      const categoriesRef = collection(db, 'users', userId, COLLECTION_NAME);
      const q = query(categoriesRef, orderBy('order', 'asc'));
      const snapshot = await getDocs(q);

      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          storeIds: data.storeIds || [],
          order: data.order || 0,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        };
      });
    } catch (error) {
      console.error('Error fetching store categories:', error);
      throw error;
    }
  }

  /**
   * 特定の店舗カテゴリーを取得
   */
  static async getById(userId: string, categoryId: string): Promise<StoreCategory | null> {
    try {
      const docRef = doc(db, 'users', userId, COLLECTION_NAME, categoryId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      const data = docSnap.data();
      return {
        id: docSnap.id,
        name: data.name,
        storeIds: data.storeIds || [],
        order: data.order || 0,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      };
    } catch (error) {
      console.error('Error fetching store category:', error);
      throw error;
    }
  }

  /**
   * 店舗カテゴリーを作成
   */
  static async create(userId: string, input: CreateStoreCategoryInput): Promise<string> {
    try {
      const categoriesRef = collection(db, 'users', userId, COLLECTION_NAME);
      const now = Timestamp.now();

      const docRef = await addDoc(categoriesRef, {
        name: input.name,
        storeIds: input.storeIds || [],
        order: input.order,
        createdAt: now,
        updatedAt: now,
      });

      return docRef.id;
    } catch (error) {
      console.error('Error creating store category:', error);
      throw error;
    }
  }

  /**
   * 店舗カテゴリーを更新
   */
  static async update(userId: string, categoryId: string, input: UpdateStoreCategoryInput): Promise<void> {
    try {
      const docRef = doc(db, 'users', userId, COLLECTION_NAME, categoryId);
      const now = Timestamp.now();

      await updateDoc(docRef, {
        ...input,
        updatedAt: now,
      });
    } catch (error) {
      console.error('Error updating store category:', error);
      throw error;
    }
  }

  /**
   * 店舗カテゴリーを削除
   */
  static async delete(userId: string, categoryId: string): Promise<void> {
    try {
      const docRef = doc(db, 'users', userId, COLLECTION_NAME, categoryId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting store category:', error);
      throw error;
    }
  }

  /**
   * 店舗を別のカテゴリーに移動
   */
  static async moveStore(
    userId: string,
    storeId: string,
    fromCategoryId: string | null,
    toCategoryId: string
  ): Promise<void> {
    try {
      // 元のカテゴリーから削除
      if (fromCategoryId) {
        const fromCategory = await this.getById(userId, fromCategoryId);
        if (fromCategory) {
          const newStoreIds = fromCategory.storeIds.filter((id) => id !== storeId);
          await this.update(userId, fromCategoryId, { storeIds: newStoreIds });
        }
      }

      // 新しいカテゴリーに追加
      const toCategory = await this.getById(userId, toCategoryId);
      if (toCategory) {
        const newStoreIds = [...toCategory.storeIds, storeId];
        await this.update(userId, toCategoryId, { storeIds: newStoreIds });
      }
    } catch (error) {
      console.error('Error moving store:', error);
      throw error;
    }
  }

  /**
   * 店舗をカテゴリーから削除（未分類に戻す）
   */
  static async removeStoreFromCategory(userId: string, storeId: string, categoryId: string): Promise<void> {
    try {
      const category = await this.getById(userId, categoryId);
      if (category) {
        const newStoreIds = category.storeIds.filter((id) => id !== storeId);
        await this.update(userId, categoryId, { storeIds: newStoreIds });
      }
    } catch (error) {
      console.error('Error removing store from category:', error);
      throw error;
    }
  }
}
