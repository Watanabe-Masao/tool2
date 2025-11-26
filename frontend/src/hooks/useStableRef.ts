import { useRef, useEffect } from 'react';

/**
 * useStableRef
 *
 * 値をrefで保持し、常に最新の値にアクセスできるようにするユーティリティフック。
 * useEffectやuseCallbackの依存配列に含めても安定した参照を維持できる。
 *
 * 用途:
 * - コールバック関数（showSuccess, showError等）の安定化
 * - サービスインスタンス（firestoreService等）の安定化
 * - 頻繁に変更される値への参照（依存配列から除外したい場合）
 *
 * NOTE: このパターンにより無限ループ(React #185)を防止
 *
 * @example
 * ```typescript
 * const showSuccessRef = useStableRef(showSuccess);
 *
 * useEffect(() => {
 *   // showSuccessRef.currentは常に最新のshowSuccessを参照
 *   showSuccessRef.current('成功しました');
 * }, []); // 依存配列にshowSuccessを含めなくてもOK
 * ```
 */
export const useStableRef = <T>(value: T) => {
  const ref = useRef(value);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref;
};

/**
 * useStableCallback
 *
 * コールバック関数を安定した参照で提供するユーティリティフック。
 * 呼び出し時に常に最新のコールバックを実行する。
 *
 * 用途:
 * - イベントリスナーに渡すコールバック
 * - 子コンポーネントに渡すコールバック
 * - 依存配列に含めたくないコールバック
 *
 * @example
 * ```typescript
 * const stableOnChange = useStableCallback(onChange);
 *
 * useEffect(() => {
 *   element.addEventListener('change', stableOnChange);
 *   return () => element.removeEventListener('change', stableOnChange);
 * }, []); // 依存配列に含めなくてもOK
 * ```
 */
export const useStableCallback = <T extends (...args: any[]) => any>(callback: T): T => {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // 安定した参照を持つラッパー関数を返す
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableCallback = useRef((...args: Parameters<T>): ReturnType<T> => {
    return callbackRef.current(...args);
  }).current as T;

  return stableCallback;
};
