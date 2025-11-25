import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderWithProviders, screen } from './test-utils';
import { useServices } from '@/context/ServiceContext';

/**
 * テスト用コンポーネント: サービスを使用する
 */
function TestComponent() {
  const { templateService } = useServices();

  return (
    <div>
      <h1>Test Component</h1>
      <button onClick={() => templateService.generateTemplate({} as any, '', '')}>
        Generate Template
      </button>
    </div>
  );
}

describe('test-utils', () => {
  describe('renderWithProviders', () => {
    it('should render component with ServiceProvider', () => {
      renderWithProviders(<TestComponent />);
      expect(screen.getByText('Test Component')).toBeTruthy();
    });

    it('should inject custom services', () => {
      const mockGenerateTemplate = vi.fn().mockResolvedValue({
        filename: 'test.xlsx',
        download_url: '/test',
      });

      const mockTemplateService = {
        generateTemplate: mockGenerateTemplate,
      };

      renderWithProviders(<TestComponent />, {
        services: {
          templateService: mockTemplateService,
        },
      });

      const button = screen.getByText('Generate Template');
      button.click();

      expect(mockGenerateTemplate).toHaveBeenCalled();
    });

    it('should provide default mock services when not specified', () => {
      // デフォルトのモックサービスで正常にレンダリングできることを確認
      renderWithProviders(<TestComponent />);
      expect(screen.getByText('Test Component')).toBeTruthy();
    });

    it('should support additional wrapper components', () => {
      const AdditionalWrapper = ({ children }: { children: React.ReactNode }) => (
        <div data-testid="additional-wrapper">{children}</div>
      );

      renderWithProviders(<TestComponent />, {
        wrapper: AdditionalWrapper,
      });

      expect(screen.getByTestId('additional-wrapper')).toBeTruthy();
      expect(screen.getByText('Test Component')).toBeTruthy();
    });
  });
});
