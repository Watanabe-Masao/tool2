import type { OrderFormData } from '@/schemas/orderSchema';

/**
 * SessionStorage管理サービス
 *
 * フォームの下書きデータをSessionStorageに保存・復元・削除します。
 * キャッシュ管理として、タイムスタンプを使った有効期限チェックを行います。
 */

const DRAFT_KEY_PREFIX = 'order-draft';
const TIMESTAMP_KEY_SUFFIX = 'timestamp';
const CACHE_EXPIRY_HOURS = 24; // 24時間で期限切れ

export class SessionStorageService {
  /**
   * ユーザー固有のキーを生成
   */
  private static getDraftKey(userId: string): string {
    return `${DRAFT_KEY_PREFIX}-${userId}`;
  }

  /**
   * タイムスタンプキーを生成
   */
  private static getTimestampKey(userId: string): string {
    return `${DRAFT_KEY_PREFIX}-${userId}-${TIMESTAMP_KEY_SUFFIX}`;
  }

  /**
   * 下書きを保存
   */
  static saveDraft(userId: string, data: OrderFormData): void {
    try {
      const key = this.getDraftKey(userId);
      const timestampKey = this.getTimestampKey(userId);

      sessionStorage.setItem(key, JSON.stringify(data));
      sessionStorage.setItem(timestampKey, new Date().toISOString());
    } catch (error) {
      console.error('Failed to save draft to session storage:', error);
      // SessionStorage がいっぱいの場合など、エラーを黙って処理
    }
  }

  /**
   * 下書きを復元
   *
   * @returns 下書きデータ、または null（存在しない/期限切れの場合）
   */
  static loadDraft(userId: string): OrderFormData | null {
    try {
      const key = this.getDraftKey(userId);
      const timestampKey = this.getTimestampKey(userId);

      const draftJson = sessionStorage.getItem(key);
      const timestampStr = sessionStorage.getItem(timestampKey);

      if (!draftJson || !timestampStr) {
        return null;
      }

      // タイムスタンプをチェック
      const savedTime = new Date(timestampStr);
      const now = new Date();
      const hoursDiff = (now.getTime() - savedTime.getTime()) / (1000 * 60 * 60);

      if (hoursDiff > CACHE_EXPIRY_HOURS) {
        // 期限切れの場合は削除
        this.clearDraft(userId);
        return null;
      }

      // Date型のフィールドを復元
      const data = JSON.parse(draftJson) as OrderFormData;
      if (data.deliveryDate) {
        data.deliveryDate = new Date(data.deliveryDate);
      }

      return data;
    } catch (error) {
      console.error('Failed to load draft from session storage:', error);
      return null;
    }
  }

  /**
   * 下書きを削除
   */
  static clearDraft(userId: string): void {
    try {
      const key = this.getDraftKey(userId);
      const timestampKey = this.getTimestampKey(userId);

      sessionStorage.removeItem(key);
      sessionStorage.removeItem(timestampKey);
    } catch (error) {
      console.error('Failed to clear draft from session storage:', error);
    }
  }

  /**
   * 下書きが存在するかチェック
   */
  static hasDraft(userId: string): boolean {
    try {
      const key = this.getDraftKey(userId);
      return sessionStorage.getItem(key) !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * 下書きのタイムスタンプを取得
   */
  static getDraftTimestamp(userId: string): Date | null {
    try {
      const timestampKey = this.getTimestampKey(userId);
      const timestampStr = sessionStorage.getItem(timestampKey);

      if (!timestampStr) {
        return null;
      }

      return new Date(timestampStr);
    } catch (error) {
      return null;
    }
  }

  /**
   * すべての下書きを削除（管理用）
   */
  static clearAllDrafts(): void {
    try {
      const keys = Object.keys(sessionStorage);
      keys.forEach((key) => {
        if (key.startsWith(DRAFT_KEY_PREFIX)) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Failed to clear all drafts:', error);
    }
  }
}
