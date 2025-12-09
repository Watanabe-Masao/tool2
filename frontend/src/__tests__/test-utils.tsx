import type { ReactElement, ReactNode, ComponentType } from 'react';
import { render } from '@testing-library/react';
import type { RenderOptions, RenderResult } from '@testing-library/react';
import { vi } from 'vitest';
import { ServiceProvider } from '@/context/ServiceContext';

/**
 * テストで使用するサービスのモック型定義
 */
export interface MockServices {
  templateService?: any;
  sessionStorageService?: any;
  [key: string]: any;
}

/**
 * カスタムレンダーオプション
 */
export interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  /**
   * ServiceProvider に注入するモックサービス
   */
  services?: MockServices;
  /**
   * 追加のラッパーコンポーネント
   */
  wrapper?: ComponentType<{ children: ReactNode }>;
}

/**
 * Testing Library カスタムレンダー関数
 *
 * @description
 * ServiceProvider やその他の共通プロバイダーでラップされた
 * コンポーネントをレンダリングします。
 *
 * @example
 * ```tsx
 * import { renderWithProviders } from '@/__tests__/test-utils';
 *
 * const mockTemplateService = {
 *   generateTemplate: vi.fn(),
 * };
 *
 * const { getByText } = renderWithProviders(
 *   <MyComponent />,
 *   {
 *     services: {
 *       templateService: mockTemplateService,
 *     },
 *   }
 * );
 * ```
 */
export function renderWithProviders(
  ui: ReactElement,
  {
    services = {},
    wrapper,
    ...renderOptions
  }: CustomRenderOptions = {}
): RenderResult {
  // デフォルトのサービスモック
  const defaultServices = {
    firestoreService: services.firestoreService || {
      saveProductHistory: vi.fn(),
      getProductHistories: vi.fn(),
      updateProductHistoryPinned: vi.fn(),
      deleteProductHistory: vi.fn(),
      saveAllocationBatch: vi.fn(),
      getAllocationBatches: vi.fn(),
      getAllocationBatchesByDateRange: vi.fn(),
      getAllocationDetails: vi.fn(),
      deleteAllocationBatch: vi.fn(),
      saveOrder: vi.fn(),
      findOrdersByUserId: vi.fn(),
      findOrdersByUserIdPaginated: vi.fn(),
      findOrdersByDate: vi.fn(),
      findOrdersByDateRange: vi.fn(),
      getOrderById: vi.fn(),
      updateOrder: vi.fn(),
      deleteOrder: vi.fn(),
      updateOrderPinned: vi.fn(),
    },
    templateService: services.templateService || {
      generateTemplate: vi.fn(),
    },
    sessionStorageService: services.sessionStorageService || {
      saveDraft: vi.fn(),
      loadDraft: vi.fn(),
      clearDraft: vi.fn(),
    },
  };

  // プロバイダーのラッパー
  function AllProviders({ children }: { children: ReactNode }) {
    const content = (
      <ServiceProvider services={defaultServices as any}>
        {children}
      </ServiceProvider>
    );

    // 追加のラッパーがあれば適用
    if (wrapper) {
      const AdditionalWrapper = wrapper;
      return <AdditionalWrapper>{content}</AdditionalWrapper>;
    }

    return content;
  }

  return render(ui, { wrapper: AllProviders, ...renderOptions });
}

/**
 * Testing Library の re-export
 *
 * @description
 * カスタムレンダー関数以外は元の Testing Library をそのまま使用できるようにします。
 *
 * @example
 * ```tsx
 * import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';
 * ```
 */
export * from '@testing-library/react';

/**
 * デフォルトエクスポート
 */
export { renderWithProviders as render };
