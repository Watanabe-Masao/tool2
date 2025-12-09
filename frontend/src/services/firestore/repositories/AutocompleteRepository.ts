import {
  Firestore,

  query,
  where,
  getDocs,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { FirestoreBaseService } from '../base/FirestoreBaseService';
import type { AutocompleteField, AutocompleteHistory } from '@/types/repository';

/**
 * Firestore保存形式
 */
interface FirestoreAutocompleteHistory {
  userId: string;
  field: AutocompleteField;
  values: string[];
  last_updated: Timestamp;
}

/**
 * オートコンプリート履歴Repository
 *
 * 入力履歴の保存・取得を担当
 * ユーザーごと・フィールドごとに履歴を管理し、最大50件まで保持
 *
 * @example
 * ```typescript
 * const autocompleteRepo = new AutocompleteRepository(firestore);
 *
 * // 値を追加（重複排除、最大50件）
 * await autocompleteRepo.saveValue('user-123', 'productName', 'トマト');
 *
 * // フィールドの履歴を取得
 * const history = await autocompleteRepo.findByField('user-123', 'productName');
 * console.log(history.values); // ['トマト', 'きゅうり', ...]
 *
 * // 特定の値を削除
 * await autocompleteRepo.deleteValue('user-123', 'productName', 'きゅうり');
 *
 * // フィールドの履歴をクリア
 * await autocompleteRepo.clearField('user-123', 'productName');
 * ```
 */
export class AutocompleteRepository extends FirestoreBaseService<
  AutocompleteHistory,
  FirestoreAutocompleteHistory
> {
  /**
   * 最大保持件数
   */
  private readonly MAX_VALUES = 50;

  constructor(db: Firestore) {
    super('autocomplete_history', db);
  }

  /**
   * AutocompleteHistory → Firestore形式に変換
   */
  toFirestoreFormat(history: AutocompleteHistory): FirestoreAutocompleteHistory {
    return {
      userId: history.userId,
      field: history.field,
      values: history.values,
      last_updated: history.lastUpdated
        ? Timestamp.fromDate(history.lastUpdated)
        : Timestamp.now(),
    };
  }

  /**
   * Firestore形式 → AutocompleteHistory に変換
   */
  fromFirestoreFormat(
    data: FirestoreAutocompleteHistory,
    id: string
  ): AutocompleteHistory {
    return {
      id,
      userId: data.userId,
      field: data.field,
      values: data.values || [],
      lastUpdated: data.last_updated?.toDate(),
    };
  }

  /**
   * フィールドの履歴を取得
   *
   * @param userId - ユーザーID
   * @param field - フィールド名
   * @returns オートコンプリート履歴（存在しない場合はnull）
   */
  async findByField(userId: string, field: AutocompleteField): Promise<AutocompleteHistory | null> {
    const ref = this.getCollectionRef();
    const q = query(ref, where('userId', '==', userId), where('field', '==', field));

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return this.fromFirestoreFormat(doc.data() as FirestoreAutocompleteHistory, doc.id);
  }

  /**
   * 値を保存
   *
   * 空文字列はスキップし、重複を排除して先頭に追加
   * 最大50件まで保持し、古いものを削除
   *
   * @param userId - ユーザーID
   * @param field - フィールド名
   * @param value - 追加する値
   * @returns 履歴ID
   */
  async saveValue(userId: string, field: AutocompleteField, value: string): Promise<string> {
    if (!value || value.trim() === '') {
      return '';
    }

    const trimmedValue = value.trim();
    const existing = await this.findByField(userId, field);

    if (!existing) {
      // 新規作成
      const id = await this.save({
        userId,
        field,
        values: [trimmedValue],
        lastUpdated: new Date(),
      });

      return id;
    }

    // 既存の値に追加
    const existingValues = existing.values || [];

    // 重複を除外
    if (existingValues.includes(trimmedValue)) {
      return existing.id || '';
    }

    // 先頭に追加し、最大件数を超えた場合は古いものを削除
    const newValues = [trimmedValue, ...existingValues].slice(0, this.MAX_VALUES);

    // ドキュメントを更新
    const docRef = this.getDocRef(existing.id!);
    await updateDoc(docRef, {
      values: newValues,
      last_updated: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    return existing.id || '';
  }

  /**
   * 特定の値を削除
   *
   * @param userId - ユーザーID
   * @param field - フィールド名
   * @param value - 削除する値
   * @returns 削除が成功したかどうか
   */
  async deleteValue(userId: string, field: AutocompleteField, value: string): Promise<boolean> {
    const existing = await this.findByField(userId, field);

    if (!existing) {
      return false;
    }

    const existingValues = existing.values || [];
    const newValues = existingValues.filter((v) => v !== value);

    if (newValues.length === existingValues.length) {
      return false;
    }

    // 値が空になった場合はドキュメントごと削除
    if (newValues.length === 0) {
      await this.delete(existing.id!);
      return true;
    }

    // ドキュメントを更新
    const docRef = this.getDocRef(existing.id!);
    await updateDoc(docRef, {
      values: newValues,
      last_updated: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    return true;
  }

  /**
   * フィールドの履歴をクリア
   *
   * @param userId - ユーザーID
   * @param field - フィールド名
   * @returns 削除が成功したかどうか
   */
  async clearField(userId: string, field: AutocompleteField): Promise<boolean> {
    const existing = await this.findByField(userId, field);

    if (!existing) {
      return false;
    }

    await this.delete(existing.id!);
    return true;
  }

  /**
   * ユーザーのすべての履歴を取得
   *
   * @param userId - ユーザーID
   * @returns すべてのフィールドの履歴配列
   */
  async findAllByUserId(userId: string): Promise<AutocompleteHistory[]> {
    const ref = this.getCollectionRef();
    const q = query(ref, where('userId', '==', userId));

    return this.executeQuery(q);
  }
}

// Re-export for backward compatibility
export type { AutocompleteField, AutocompleteHistory } from '@/types/repository';
