import {
  Firestore,

  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { FirestoreBaseService } from '../base/FirestoreBaseService';

/**
 * 帳合先プリセットエンティティ
 */
export interface SupplierPreset {
  id?: string;
  userId: string;
  supplier: string;
  displayOrder?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Firestore保存形式
 */
interface FirestoreSupplierPreset {
  userId: string;
  supplier: string;
  displayOrder?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * 帳合先プリセットRepository
 *
 * 帳合先のプリセット管理を担当
 * ユーザーごとに複数のプリセットを保存し、表示順序を管理
 *
 * @example
 * ```typescript
 * const presetRepo = new PresetRepository(firestore);
 *
 * // プリセットを保存
 * const presetId = await presetRepo.save({
 *   userId: 'user-123',
 *   supplier: '帳合先A',
 * });
 *
 * // プリセット一覧を取得（displayOrderでソート）
 * const presets = await presetRepo.findByUserId('user-123');
 *
 * // リアルタイム購読
 * const unsubscribe = presetRepo.subscribeToPresets(
 *   'user-123',
 *   (presets) => console.log('Updated:', presets),
 *   (error) => console.error(error)
 * );
 *
 * // 並び順を更新
 * await presetRepo.reorder([
 *   { id: 'preset-1', displayOrder: 0 },
 *   { id: 'preset-2', displayOrder: 1 },
 * ]);
 *
 * // 購読解除
 * unsubscribe();
 * ```
 */
export class PresetRepository extends FirestoreBaseService<
  SupplierPreset,
  FirestoreSupplierPreset
> {
  constructor(db: Firestore) {
    super('supplier_presets', db);
  }

  /**
   * SupplierPreset → Firestore形式に変換
   */
  toFirestoreFormat(preset: SupplierPreset): FirestoreSupplierPreset {
    return {
      userId: preset.userId,
      supplier: preset.supplier,
      displayOrder: preset.displayOrder,
      createdAt: preset.createdAt ? Timestamp.fromDate(preset.createdAt) : Timestamp.now(),
      updatedAt: preset.updatedAt ? Timestamp.fromDate(preset.updatedAt) : Timestamp.now(),
    };
  }

  /**
   * Firestore形式 → SupplierPreset に変換
   */
  fromFirestoreFormat(data: FirestoreSupplierPreset, id: string): SupplierPreset {
    return {
      id,
      userId: data.userId,
      supplier: data.supplier,
      displayOrder: data.displayOrder,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
    };
  }

  /**
   * ユーザーのプリセット一覧を取得
   *
   * displayOrderでソート（設定されていない場合は作成日時順）
   *
   * @param userId - ユーザーID
   * @returns プリセット配列
   */
  async findByUserId(userId: string): Promise<SupplierPreset[]> {
    const ref = this.getCollectionRef();
    const q = query(ref, where('userId', '==', userId), orderBy('createdAt', 'desc'));

    const presets = await this.executeQuery(q);

    // displayOrderでソート（設定されていない場合は最後に）
    presets.sort((a, b) => {
      if (a.displayOrder !== undefined && b.displayOrder !== undefined) {
        return a.displayOrder - b.displayOrder;
      }
      if (a.displayOrder !== undefined) return -1;
      if (b.displayOrder !== undefined) return 1;
      return 0;
    });

    console.log(`[${this.collectionName}] Retrieved ${presets.length} presets for user ${userId}`);
    return presets;
  }

  /**
   * プリセット一覧をリアルタイムで監視
   *
   * @param userId - ユーザーID
   * @param onSuccess - データ更新時のコールバック
   * @param onError - エラー発生時のコールバック
   * @returns アンサブスクライブ関数
   *
   * @example
   * ```typescript
   * const unsubscribe = presetRepo.subscribeToPresets(
   *   'user-123',
   *   (presets) => {
   *     console.log('Presets updated:', presets);
   *   },
   *   (error) => {
   *     console.error('Subscription error:', error);
   *   }
   * );
   *
   * // コンポーネントのクリーンアップ時
   * useEffect(() => {
   *   return () => unsubscribe();
   * }, []);
   * ```
   */
  subscribeToPresets(
    userId: string,
    onSuccess: (presets: SupplierPreset[]) => void,
    onError: (error: Error) => void
  ): Unsubscribe {
    const ref = this.getCollectionRef();
    const q = query(ref, where('userId', '==', userId), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const presets: SupplierPreset[] = [];

        snapshot.forEach((doc) => {
          try {
            const preset = this.fromFirestoreFormat(
              doc.data() as FirestoreSupplierPreset,
              doc.id
            );
            presets.push(preset);
          } catch (error) {
            console.error(`[${this.collectionName}] Error converting document ${doc.id}:`, error);
          }
        });

        // displayOrderでソート
        presets.sort((a, b) => {
          if (a.displayOrder !== undefined && b.displayOrder !== undefined) {
            return a.displayOrder - b.displayOrder;
          }
          if (a.displayOrder !== undefined) return -1;
          if (b.displayOrder !== undefined) return 1;
          return 0;
        });

        onSuccess(presets);
      },
      (error) => {
        onError(error as Error);
      }
    );

    return unsubscribe;
  }

  /**
   * プリセットの並び順を更新
   *
   * @param reorderedItems - 並び替え後のアイテム配列（IDとdisplayOrderのペア）
   *
   * @example
   * ```typescript
   * // ドラッグ&ドロップ後の並び順を反映
   * await presetRepo.reorder([
   *   { id: 'preset-3', displayOrder: 0 },
   *   { id: 'preset-1', displayOrder: 1 },
   *   { id: 'preset-2', displayOrder: 2 },
   * ]);
   * ```
   */
  async reorder(reorderedItems: Array<{ id: string; displayOrder: number }>): Promise<void> {
    const updates = reorderedItems.map(async (item) => {
      const docRef = this.getDocRef(item.id);
      await updateDoc(docRef, {
        displayOrder: item.displayOrder,
        updatedAt: Timestamp.now(),
      });
    });

    await Promise.all(updates);

    console.log(`[${this.collectionName}] Reordered ${reorderedItems.length} presets`);
  }

  /**
   * プリセットを更新
   *
   * @param presetId - プリセットID
   * @param supplier - 帳合先の値
   */
  async updateSupplier(presetId: string, supplier: string): Promise<void> {
    const docRef = this.getDocRef(presetId);

    await updateDoc(docRef, {
      supplier,
      updatedAt: Timestamp.now(),
    });

    console.log(`[${this.collectionName}] Updated preset ${presetId}: ${supplier}`);
  }
}
