import { useState, useCallback } from 'react';

/**
 * useFormLockState
 *
 * フォームロック状態管理 Hook
 *
 * 責務:
 * - フォームのロック状態管理
 * - 未保存変更フラグ管理
 * - 送信中状態管理
 *
 * useOrderFormState から分割された hook。
 * 単一責任原則に従い、ロック・状態管理のみに責務を限定。
 *
 * @returns ロック状態と操作関数
 *
 * @example
 * ```tsx
 * const {
 *   isLocked,
 *   hasUnsavedChanges,
 *   lockForm,
 *   unlockForm,
 *   markAsUnsaved,
 *   markAsSaved
 * } = useFormLockState();
 *
 * // フォーム送信時
 * const handleSubmit = async () => {
 *   lockForm();
 *   try {
 *     await submitForm();
 *     markAsSaved();
 *   } finally {
 *     unlockForm();
 *   }
 * };
 *
 * // フォーム入力時
 * const handleChange = () => {
 *   markAsUnsaved();
 * };
 *
 * // ページ離脱警告
 * useEffect(() => {
 *   if (hasUnsavedChanges) {
 *     window.onbeforeunload = () => '未保存の変更があります';
 *   }
 * }, [hasUnsavedChanges]);
 * ```
 */
export const useFormLockState = () => {
  const [isLocked, setIsLocked] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * フォームをロック
   *
   * フォーム送信中やデータ処理中にユーザーの入力を防ぐ。
   */
  const lockForm = useCallback(() => {
    setIsLocked(true);
  }, []);

  /**
   * フォームをアンロック
   *
   * 処理完了後、ユーザーの入力を再び許可する。
   */
  const unlockForm = useCallback(() => {
    setIsLocked(false);
  }, []);

  /**
   * 未保存変更をマーク
   *
   * フォーム入力時に呼び出し、未保存の変更があることを記録する。
   */
  const markAsUnsaved = useCallback(() => {
    setHasUnsavedChanges(true);
  }, []);

  /**
   * 未保存変更をクリア
   *
   * 保存成功時に呼び出し、未保存変更フラグをクリアする。
   */
  const markAsSaved = useCallback(() => {
    setHasUnsavedChanges(false);
  }, []);

  /**
   * 送信中状態を開始
   *
   * フォーム送信開始時に呼び出す。
   * 自動的にフォームもロックする。
   */
  const startSubmitting = useCallback(() => {
    setIsSubmitting(true);
    setIsLocked(true);
  }, []);

  /**
   * 送信中状態を終了
   *
   * フォーム送信完了時に呼び出す。
   * 自動的にフォームのロックも解除する。
   *
   * @param success - 送信が成功したかどうか
   */
  const endSubmitting = useCallback((success: boolean = true) => {
    setIsSubmitting(false);
    setIsLocked(false);

    // 成功した場合は未保存変更もクリア
    if (success) {
      setHasUnsavedChanges(false);
    }
  }, []);

  /**
   * 状態をリセット
   *
   * すべての状態を初期値に戻す。
   * 新規フォーム作成時などに使用。
   */
  const resetState = useCallback(() => {
    setIsLocked(false);
    setHasUnsavedChanges(false);
    setIsSubmitting(false);
  }, []);

  return {
    // State
    isLocked,
    setIsLocked,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    isSubmitting,
    setIsSubmitting,

    // ロック操作
    lockForm,
    unlockForm,

    // 未保存変更操作
    markAsUnsaved,
    markAsSaved,

    // 送信状態操作
    startSubmitting,
    endSubmitting,

    // Utility
    resetState,

    // Computed
    canSubmit: !isLocked && !isSubmitting,
    shouldWarnBeforeLeave: hasUnsavedChanges,
  };
};

/**
 * Return type for useFormLockState
 *
 * TypeScript 型定義用。
 */
export type UseFormLockStateReturn = ReturnType<typeof useFormLockState>;
