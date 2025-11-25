import React, { Profiler } from 'react';
import type { ProfilerOnRenderCallback } from 'react';
import type { ProfilerMeasurement, ProfilerCallback } from '@/types/utils';

/**
 * グローバルプロファイラーコールバック
 *
 * @description
 * 開発環境でのみ有効。本番環境では無視されます。
 */
let globalProfilerCallback: ProfilerCallback | null = null;

/**
 * プロファイラーコールバックを設定
 *
 * @example
 * ```typescript
 * // 開発環境で遅いレンダリングを検出
 * setProfilerCallback((measurement) => {
 *   if (measurement.actualDuration > 100) {
 *     console.warn(`Slow render detected: ${measurement.id}`, measurement);
 *   }
 * });
 * ```
 */
export function setProfilerCallback(callback: ProfilerCallback | null): void {
  if (import.meta.env.DEV) {
    globalProfilerCallback = callback;
  }
}

/**
 * プロファイラーメトリクスをコンソールに出力
 */
export function logProfilerMetrics(measurement: ProfilerMeasurement): void {
  if (import.meta.env.DEV) {
    console.log(
      `[Profiler] ${measurement.id} (${measurement.phase}):`,
      `${measurement.actualDuration.toFixed(2)}ms`,
      measurement.actualDuration > 16 ? '⚠️ SLOW' : '✓'
    );
  }
}

/**
 * プロファイラーメトリクスを収集
 *
 * @description
 * ローカルストレージに測定結果を保存します（開発環境のみ）。
 */
const PROFILER_STORAGE_KEY = 'react-profiler-metrics';
const MAX_METRICS = 1000;

export function collectProfilerMetrics(measurement: ProfilerMeasurement): void {
  if (!import.meta.env.DEV) return;

  try {
    const stored = localStorage.getItem(PROFILER_STORAGE_KEY);
    const metrics: ProfilerMeasurement[] = stored ? JSON.parse(stored) : [];

    metrics.push(measurement);

    // 最大件数を超えたら古いものを削除
    if (metrics.length > MAX_METRICS) {
      metrics.splice(0, metrics.length - MAX_METRICS);
    }

    localStorage.setItem(PROFILER_STORAGE_KEY, JSON.stringify(metrics));
  } catch (error) {
    console.error('[Profiler] Failed to collect metrics:', error);
  }
}

/**
 * 収集したメトリクスを取得
 */
export function getCollectedMetrics(): ProfilerMeasurement[] {
  if (!import.meta.env.DEV) return [];

  try {
    const stored = localStorage.getItem(PROFILER_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('[Profiler] Failed to get metrics:', error);
    return [];
  }
}

/**
 * 収集したメトリクスをクリア
 */
export function clearCollectedMetrics(): void {
  if (import.meta.env.DEV) {
    localStorage.removeItem(PROFILER_STORAGE_KEY);
  }
}

/**
 * 遅いレンダリングを分析
 */
export function analyzeSlowRenders(threshold = 16): {
  total: number;
  slow: ProfilerMeasurement[];
  average: number;
  slowest: ProfilerMeasurement | null;
} {
  const metrics = getCollectedMetrics();
  const slow = metrics.filter((m) => m.actualDuration > threshold);

  const average =
    metrics.length > 0
      ? metrics.reduce((sum, m) => sum + m.actualDuration, 0) / metrics.length
      : 0;

  const slowest = slow.length > 0
    ? slow.reduce((prev, current) =>
        current.actualDuration > prev.actualDuration ? current : prev
      )
    : null;

  return {
    total: metrics.length,
    slow,
    average,
    slowest,
  };
}

/**
 * React Profiler ラッパーコンポーネント
 *
 * @description
 * React の Profiler API を使用してコンポーネントのレンダリングパフォーマンスを測定します。
 * 開発環境でのみ有効で、本番環境では通常の Fragment として動作します。
 *
 * @example
 * ```tsx
 * import { ProfilerWrapper } from '@/utils/profiler';
 *
 * function App() {
 *   return (
 *     <ProfilerWrapper id="App" onRender="log">
 *       <YourComponent />
 *     </ProfilerWrapper>
 *   );
 * }
 * ```
 */
export interface ProfilerWrapperProps {
  /** プロファイラーの識別子 */
  id: string;
  /** レンダリング時のコールバック */
  onRender?: 'log' | 'collect' | ProfilerCallback;
  /** 子要素 */
  children: React.ReactNode;
}

export function ProfilerWrapper({
  id,
  onRender = 'log',
  children,
}: ProfilerWrapperProps): React.ReactElement {
  // 本番環境では Profiler を無効化（Fragment として動作）
  if (!import.meta.env.DEV) {
    return <>{children}</>;
  }

  const handleRender: ProfilerOnRenderCallback = (
    id,
    phase,
    actualDuration,
    baseDuration,
    startTime,
    commitTime
  ) => {
    const measurement: ProfilerMeasurement = {
      id,
      phase,
      actualDuration,
      baseDuration,
      startTime,
      commitTime,
      timestamp: Date.now(),
    };

    // コールバック処理
    if (onRender === 'log') {
      logProfilerMetrics(measurement);
    } else if (onRender === 'collect') {
      collectProfilerMetrics(measurement);
    } else if (typeof onRender === 'function') {
      onRender(measurement);
    }

    // グローバルコールバックがあれば実行
    if (globalProfilerCallback) {
      globalProfilerCallback(measurement);
    }
  };

  return (
    <Profiler id={id} onRender={handleRender}>
      {children}
    </Profiler>
  );
}

/**
 * パフォーマンス閾値チェック用 HOC
 *
 * @description
 * 指定した閾値を超えるレンダリングを警告します。
 *
 * @example
 * ```tsx
 * const MonitoredComponent = withPerformanceMonitor(
 *   YourComponent,
 *   'YourComponent',
 *   { threshold: 50 }
 * );
 * ```
 */
export function withPerformanceMonitor<P extends object>(
  Component: React.ComponentType<P>,
  id: string,
  options: { threshold?: number; onSlow?: (measurement: ProfilerMeasurement) => void } = {}
): React.ComponentType<P> {
  const { threshold = 16, onSlow } = options;

  return function PerformanceMonitoredComponent(props: P) {
    const handleRender = (measurement: ProfilerMeasurement) => {
      if (measurement.actualDuration > threshold) {
        console.warn(
          `[Performance] Slow render detected in ${id}: ${measurement.actualDuration.toFixed(2)}ms`
        );
        if (onSlow) {
          onSlow(measurement);
        }
      }
    };

    return (
      <ProfilerWrapper id={id} onRender={handleRender}>
        <Component {...props} />
      </ProfilerWrapper>
    );
  };
}
