import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../setup';
import { useFileDownloads } from '@/hooks/useFileDownloads';
import type { GeneratedFiles } from '@/hooks/useTemplateGeneration';

// Mock global URL methods (minimal DOM mocking)
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

describe('useFileDownloads', () => {
  const mockShowError = vi.fn();
  const mockShowLoading = vi.fn();
  const mockHideLoading = vi.fn();

  // Setup base URL for all tests
  beforeAll(() => {
    // Set a default base URL via environment variable to avoid "Invalid base URL" errors
    import.meta.env.VITE_API_BASE_URL = 'http://localhost:3000';
  });

  const mockGeneratedFiles: GeneratedFiles = {
    filename: '配分表_TestBook_20240115.xlsx',
    downloadUrl: '/downloads/test.xlsx',
    pdfFilename: '配分表_TestBook_20240115.pdf',
    pdfDownloadUrl: '/downloads/test.pdf',
  };

  const defaultParams = {
    generatedFiles: mockGeneratedFiles,
    showError: mockShowError,
    showLoading: mockShowLoading,
    hideLoading: mockHideLoading,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('downloadExcel', () => {
    it('Excelファイルをダウンロードできる', async () => {
      const { result } = renderHook(() => useFileDownloads(defaultParams));

      await act(async () => {
        await result.current.downloadExcel();
      });

      // MSWがリクエストを正常に処理し、ダウンロードが成功することを確認
      expect(mockShowLoading).toHaveBeenCalled();
      expect(mockHideLoading).toHaveBeenCalled();
      expect(mockShowError).not.toHaveBeenCalled();
    });

    it('generatedFilesがnullの場合は何もしない', async () => {
      const { result } = renderHook(() =>
        useFileDownloads({
          ...defaultParams,
          generatedFiles: null,
        })
      );

      await act(async () => {
        await result.current.downloadExcel();
      });

      expect(mockShowLoading).not.toHaveBeenCalled();
      expect(mockShowError).not.toHaveBeenCalled();
    });

    it('ダウンロードエラー時にエラーメッセージを表示', async () => {
      // MSW: 404エラーをモック
      server.use(
        http.get(/\/downloads\/.*\.xlsx/, () => {
          return new HttpResponse(null, { status: 404, statusText: 'Not Found' });
        })
      );

      const { result } = renderHook(() => useFileDownloads(defaultParams));

      await act(async () => {
        await result.current.downloadExcel();
      });

      expect(mockShowError).toHaveBeenCalledWith('ダウンロード失敗: 404 Not Found');
      expect(mockHideLoading).toHaveBeenCalled();
    });

    it('HTMLが返された場合はエラー', async () => {
      // MSW: HTMLレスポンスをモック
      server.use(
        http.get(/\/downloads\/.*\.xlsx/, () => {
          return new HttpResponse('<html>Error page</html>', {
            status: 200,
            headers: {
              'Content-Type': 'text/html',
            },
          });
        })
      );

      const { result } = renderHook(() => useFileDownloads(defaultParams));

      await act(async () => {
        await result.current.downloadExcel();
      });

      expect(mockShowError).toHaveBeenCalledWith(
        expect.stringContaining('サーバーからHTMLが返されました')
      );
    });

    it('Blob URLがクリーンアップされる', async () => {
      const { result } = renderHook(() => useFileDownloads(defaultParams));

      await act(async () => {
        await result.current.downloadExcel();
      });

      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });
  });

  describe('downloadPdf', () => {
    it('PDFファイルをダウンロードできる', async () => {
      const { result } = renderHook(() => useFileDownloads(defaultParams));

      await act(async () => {
        await result.current.downloadPdf();
      });

      // MSWがリクエストを正常に処理し、ダウンロードが成功することを確認
      expect(mockShowLoading).toHaveBeenCalled();
      expect(mockHideLoading).toHaveBeenCalled();
      expect(mockShowError).not.toHaveBeenCalled();
    });

    it('generatedFilesがnullの場合は何もしない', async () => {
      const { result } = renderHook(() =>
        useFileDownloads({
          ...defaultParams,
          generatedFiles: null,
        })
      );

      await act(async () => {
        await result.current.downloadPdf();
      });

      expect(mockShowLoading).not.toHaveBeenCalled();
      expect(mockShowError).not.toHaveBeenCalled();
    });

    it('pdfDownloadUrlがない場合は何もしない', async () => {
      const { result } = renderHook(() =>
        useFileDownloads({
          ...defaultParams,
          generatedFiles: {
            ...mockGeneratedFiles,
            pdfDownloadUrl: undefined,
          },
        })
      );

      await act(async () => {
        await result.current.downloadPdf();
      });

      expect(mockShowLoading).not.toHaveBeenCalled();
      expect(mockShowError).not.toHaveBeenCalled();
    });

    it('ダウンロードエラー時にエラーメッセージを表示', async () => {
      // MSW: 500エラーをモック
      server.use(
        http.get(/\/downloads\/.*\.pdf/, () => {
          return new HttpResponse(null, { status: 500, statusText: 'Internal Server Error' });
        })
      );

      const { result } = renderHook(() => useFileDownloads(defaultParams));

      await act(async () => {
        await result.current.downloadPdf();
      });

      expect(mockShowError).toHaveBeenCalledWith('ダウンロード失敗: 500 Internal Server Error');
    });
  });

  describe('共通ダウンロードロジック（DRY化）', () => {
    it('ExcelとPDFで共通のダウンロードロジックを使用', async () => {
      const { result } = renderHook(() => useFileDownloads(defaultParams));

      // Excel
      await act(async () => {
        await result.current.downloadExcel();
      });

      expect(mockShowLoading).toHaveBeenCalledTimes(1);
      expect(mockHideLoading).toHaveBeenCalledTimes(1);

      vi.clearAllMocks();

      // PDF
      await act(async () => {
        await result.current.downloadPdf();
      });

      expect(mockShowLoading).toHaveBeenCalledTimes(1);
      expect(mockHideLoading).toHaveBeenCalledTimes(1);
    });

    it('環境変数VITE_API_BASE_URLがある場合', async () => {
      const originalEnv = import.meta.env.VITE_API_BASE_URL;
      import.meta.env.VITE_API_BASE_URL = 'https://api.example.com/api';

      // デフォルトのhandlerが絶対URLもマッチするので、特別なhandler不要
      const { result } = renderHook(() => useFileDownloads(defaultParams));

      await act(async () => {
        await result.current.downloadExcel();
      });

      // ダウンロードが成功することを確認
      expect(mockShowLoading).toHaveBeenCalled();
      expect(mockHideLoading).toHaveBeenCalled();
      expect(mockShowError).not.toHaveBeenCalled();

      import.meta.env.VITE_API_BASE_URL = originalEnv;
    });

    it('console.logが呼ばれることを確認', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const { result } = renderHook(() => useFileDownloads(defaultParams));

      await act(async () => {
        await result.current.downloadExcel();
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        '📥 Excel download URL:',
        '/downloads/test.xlsx'
      );
      expect(consoleSpy).toHaveBeenCalledWith('Response status:', 200);
      expect(consoleSpy).toHaveBeenCalledWith('Downloaded blob size:', expect.any(Number), 'bytes');

      consoleSpy.mockRestore();
    });

    it('fetchエラー時のconsole.error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // MSW: ネットワークエラーをモック
      server.use(
        http.get(/\/downloads\/.*\.xlsx/, () => {
          return HttpResponse.error();
        })
      );

      const { result } = renderHook(() => useFileDownloads(defaultParams));

      await act(async () => {
        await result.current.downloadExcel();
      });

      expect(consoleSpy).toHaveBeenCalledWith('Excel download error:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });
});
