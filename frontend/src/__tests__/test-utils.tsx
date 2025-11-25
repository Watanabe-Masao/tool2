import React, { ReactElement } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { ServiceProvider } from '@/context/ServiceContext';
import type { TemplateService } from '@/services/template/TemplateService';
import type { SessionStorageService } from '@/services/storage/SessionStorageService';

/**
 * テストで使用するサービスのモック型定義
 */
export interface MockServices {
  templateService?: Partial<TemplateService>;
  sessionStorageService?: Partial<SessionStorageService>;
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
  wrapper?: React.ComponentType<{ children: React.ReactNode }>;
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
  function AllProviders({ children }: { children: React.ReactNode }) {
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
