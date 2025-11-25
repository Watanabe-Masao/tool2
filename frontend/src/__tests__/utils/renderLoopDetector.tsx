/**
 * React無限ループ（Maximum update depth exceeded）検出ユーティリティ
 *
 * @description
 * コンポーネントのレンダリング回数を監視し、無限ループを検出します。
 * CI/CDパイプラインで使用することで、React #185エラーを事前に検出できます。
 *
 * @example
 * ```tsx
 * import { createRenderCounter, assertNoInfiniteLoop } from './renderLoopDetector';
 *
 * it('should not cause infinite loop', () => {
 *   const counter = createRenderCounter();
 *   render(<MyComponent onRender={counter.increment} />);
 *   assertNoInfiniteLoop(counter.count, 'MyComponent');
 * });
 * ```
 */

/**
 * レンダリングカウンターの型定義
 */
export interface RenderCounter {
  /** 現在のレンダリング回数 */
  count: number;
  /** カウントをインクリメント */
  increment: () => void;
  /** カウントをリセット */
  reset: () => void;
}

/**
 * レンダリングカウンターを作成
 */
export function createRenderCounter(): RenderCounter {
  let count = 0;
  return {
    get count() {
      return count;
    },
    increment: () => {
      count++;
    },
    reset: () => {
      count = 0;
    },
  };
}

/**
 * 無限ループ検出のデフォルト閾値
 */
export const DEFAULT_MAX_RENDERS = 50;

/**
 * 無限ループが発生していないことをアサート
 *
 * @param renderCount - 実際のレンダリング回数
 * @param componentName - コンポーネント名（エラーメッセージ用）
 * @param maxRenders - 許容する最大レンダリング回数（デフォルト: 50）
 */
export function assertNoInfiniteLoop(
  renderCount: number,
  componentName: string,
  maxRenders: number = DEFAULT_MAX_RENDERS
): void {
  if (renderCount > maxRenders) {
    throw new Error(
      `[Infinite Loop Detected] ${componentName} rendered ${renderCount} times, ` +
        `exceeding the threshold of ${maxRenders}. ` +
        `This may indicate a React #185 (Maximum update depth exceeded) error. ` +
        `Check for:\n` +
        `  - Missing useMemo/useCallback for objects/functions passed as props\n` +
        `  - Inline object/function creation in JSX\n` +
        `  - useEffect with unstable dependencies\n` +
        `  - State updates inside render`
    );
  }
}

/**
 * 安全なレンダリング回数の目安
 * - 初回レンダリング: 1回
 * - StrictMode: 2回
 * - 通常の再レンダリング: 数回
 */
export const EXPECTED_RENDER_COUNTS = {
  /** 初回のみ */
  INITIAL_ONLY: 2, // StrictMode considers
  /** 軽微な操作 */
  LIGHT_INTERACTION: 5,
  /** 通常の操作 */
  NORMAL_INTERACTION: 10,
  /** 複雑な操作 */
  COMPLEX_INTERACTION: 20,
};

/**
 * コンポーネントのレンダリング回数を監視するラッパーを作成
 *
 * @example
 * ```tsx
 * const { WrappedComponent, getCount } = withRenderTracking(MyComponent);
 * render(<WrappedComponent {...props} />);
 * expect(getCount()).toBeLessThan(10);
 * ```
 */
export function withRenderTracking<P extends object>(
  Component: React.ComponentType<P>
): {
  WrappedComponent: React.FC<P>;
  getCount: () => number;
  resetCount: () => void;
} {
  const counter = createRenderCounter();

  const WrappedComponent: React.FC<P> = (props) => {
    counter.increment();
    // @ts-expect-error - Dynamic component type
    return <Component {...props} />;
  };

  return {
    WrappedComponent,
    getCount: () => counter.count,
    resetCount: counter.reset,
  };
}

/**
 * レンダリング回数のレポートを生成
 */
export function generateRenderReport(
  results: Array<{ component: string; count: number; threshold: number }>
): string {
  const failed = results.filter((r) => r.count > r.threshold);
  const passed = results.filter((r) => r.count <= r.threshold);

  let report = '\n=== Render Loop Detection Report ===\n\n';

  if (failed.length > 0) {
    report += '❌ FAILED:\n';
    failed.forEach((r) => {
      report += `  - ${r.component}: ${r.count} renders (threshold: ${r.threshold})\n`;
    });
    report += '\n';
  }

  if (passed.length > 0) {
    report += '✅ PASSED:\n';
    passed.forEach((r) => {
      report += `  - ${r.component}: ${r.count} renders (threshold: ${r.threshold})\n`;
    });
  }

  report += '\n=====================================\n';

  return report;
}
