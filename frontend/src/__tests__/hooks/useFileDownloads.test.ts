import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFileDownloads } from '@/hooks/useFileDownloads';
import type { GeneratedFiles } from '@/hooks/useTemplateGeneration';

// Mock global objects
global.fetch = vi.fn();
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

describe('useFileDownloads', () => {
  const mockShowError = vi.fn();
  const mockShowLoading = vi.fn();
  const mockHideLoading = vi.fn();

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

  let mockLink: HTMLAnchorElement;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock successful fetch
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      headers: {
        get: (name: string) => {
          if (name === 'Content-Type') return 'application/vnd.ms-excel';
          return null;
        },
      },
      blob: () => Promise.resolve(new Blob(['test'], { type: 'application/vnd.ms-excel' })),
    } as Response);

    // Mock document.createElement
    mockLink = {
      href: '',
      download: '',
      click: vi.fn(),
    } as unknown as HTMLAnchorElement;

    vi.spyOn(document, 'createElement').mockReturnValue(mockLink);
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink);
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('downloadExcel', () => {
    it('Excelファイルをダウンロードできる', async () => {
      const { result } = renderHook(() => useFileDownloads(defaultParams));

      await act(async () => {
        await result.current.downloadExcel();
      });

      expect(mockShowLoading).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/downloads/test.xlsx'));
      expect(mockLink.download).toBe('配分表_TestBook_20240115.xlsx');
      expect(mockLink.click).toHaveBeenCalled();
      expect(mockHideLoading).toHaveBeenCalled();
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

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('ダウンロードエラー時にエラーメッセージを表示', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      const { result } = renderHook(() => useFileDownloads(defaultParams));

      await act(async () => {
        await result.current.downloadExcel();
      });

      expect(mockShowError).toHaveBeenCalledWith('ダウンロード失敗: 404 Not Found');
      expect(mockHideLoading).toHaveBeenCalled();
    });

    it('HTMLが返された場合はエラー', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        headers: {
          get: () => 'text/html',
        },
        text: () => Promise.resolve('<html>Error page</html>'),
      } as Response);

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

      expect(mockShowLoading).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/downloads/test.pdf'));
      expect(mockLink.download).toBe('配分表_TestBook_20240115.pdf'); // .xlsx → .pdf
      expect(mockLink.click).toHaveBeenCalled();
      expect(mockHideLoading).toHaveBeenCalled();
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

      expect(global.fetch).not.toHaveBeenCalled();
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

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('ダウンロードエラー時にエラーメッセージを表示', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

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

      const excelFetchCall = vi.mocked(global.fetch).mock.calls[0][0];

      vi.clearAllMocks();

      // PDF
      await act(async () => {
        await result.current.downloadPdf();
      });

      const pdfFetchCall = vi.mocked(global.fetch).mock.calls[0][0];

      // 両方とも同じロジックフロー
      expect(typeof excelFetchCall).toBe('string');
      expect(typeof pdfFetchCall).toBe('string');
    });

    it('環境変数VITE_API_BASE_URLがある場合', async () => {
      const originalEnv = import.meta.env.VITE_API_BASE_URL;
      import.meta.env.VITE_API_BASE_URL = 'https://api.example.com/api';

      const { result } = renderHook(() => useFileDownloads(defaultParams));

      await act(async () => {
        await result.current.downloadExcel();
      });

      const fetchUrl = vi.mocked(global.fetch).mock.calls[0][0] as string;
      expect(fetchUrl).toContain('https://api.example.com');
      expect(fetchUrl).not.toContain('/api/api'); // /apiサフィックスが削除される

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
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useFileDownloads(defaultParams));

      await act(async () => {
        await result.current.downloadExcel();
      });

      expect(consoleSpy).toHaveBeenCalledWith('Excel download error:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });
});
