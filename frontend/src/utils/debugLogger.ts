/**
 * 環境変数ベースのデバッグロガー
 *
 * 本番環境ではログを出力せず、開発/テスト環境でのみ有効にします。
 * GitHub Actionsで実行するテストでレンダリング回数を監視できます。
 *
 * @example
 * ```typescript
 * // コンポーネント内で使用
 * const renderCount = useRenderCounter('MyComponent');
 *
 * // フック内で使用
 * debugLogger.hook('useMyHook');
 *
 * // カスタムログ
 * debugLogger.log('CustomMessage', { data: 'value' });
 * ```
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';
const isDebugEnabled = isDevelopment || isTest || process.env.VITE_DEBUG === 'true';

// 無限ループ検出のデフォルト閾値
const INFINITE_LOOP_THRESHOLD = 50;

// レンダリングカウンターのストレージ
const renderCounters = new Map<string, number>();

/**
 * デバッグロガー
 */
export const debugLogger = {
  /**
   * 一般的なログ出力
   */
  log: (message: string, data?: unknown) => {
    if (isDebugEnabled) {
      console.log(`[DEBUG] ${message}`, data !== undefined ? data : '');
    }
  },

  /**
   * 警告ログ出力
   */
  warn: (message: string, data?: unknown) => {
    if (isDebugEnabled) {
      console.warn(`[WARN] ${message}`, data !== undefined ? data : '');
    }
  },

  /**
   * エラーログ出力（本番でも出力）
   */
  error: (message: string, data?: unknown) => {
    console.error(`[ERROR] ${message}`, data !== undefined ? data : '');
  },

  /**
   * フック実行ログ
   */
  hook: (hookName: string) => {
    if (isDebugEnabled) {
      console.log(`[DEBUG] ${hookName}...`);
    }
  },

  /**
   * レンダリングカウントを記録・出力
   * @returns 現在のレンダリング回数
   */
  render: (componentName: string): number => {
    const currentCount = (renderCounters.get(componentName) || 0) + 1;
    renderCounters.set(componentName, currentCount);

    if (isDebugEnabled) {
      console.log(`[DEBUG] ${componentName} render #${currentCount}`);

      // 無限ループの可能性を警告
      if (currentCount > INFINITE_LOOP_THRESHOLD) {
        console.error(
          `[INFINITE LOOP WARNING] ${componentName} has rendered ${currentCount} times! ` +
            `This may indicate React #185 (Maximum update depth exceeded).`
        );
      }
    }

    return currentCount;
  },

  /**
   * 特定のコンポーネントのレンダリング回数を取得
   */
  getRenderCount: (componentName: string): number => {
    return renderCounters.get(componentName) || 0;
  },

  /**
   * すべてのレンダリングカウンターをリセット
   */
  resetCounters: () => {
    renderCounters.clear();
  },

  /**
   * 特定のコンポーネントのカウンターをリセット
   */
  resetCounter: (componentName: string) => {
    renderCounters.delete(componentName);
  },

  /**
   * 現在のすべてのレンダリング回数を取得（テスト用）
   */
  getAllRenderCounts: (): Record<string, number> => {
    const result: Record<string, number> = {};
    renderCounters.forEach((count, name) => {
      result[name] = count;
    });
    return result;
  },

  /**
   * デバッグモードが有効かどうか
   */
  isEnabled: isDebugEnabled,
};

/**
 * レンダリングカウント用カスタムフック
 *
 * @example
 * ```typescript
 * const MyComponent = () => {
 *   const renderCount = useRenderCounter('MyComponent');
 *   // ...
 * };
 * ```
 */
export function useRenderCounter(componentName: string): number {
  return debugLogger.render(componentName);
}

export default debugLogger;
