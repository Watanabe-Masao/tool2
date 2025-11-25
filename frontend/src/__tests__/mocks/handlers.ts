import { http, HttpResponse } from 'msw';

/**
 * MSW Request Handlers
 *
 * APIリクエストをモックするハンドラー定義
 * useFileDownloads.test.ts で使用
 */

export const handlers = [
  // Excel ダウンロード（正常系）
  // パスパターン: /downloads/ を含む .xlsx ファイル（絶対URL/相対URL両対応）
  http.get(/\/downloads\/.*\.xlsx/, () => {
    const mockBlob = new Blob(['Excel mock data'], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    return new HttpResponse(mockBlob, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    });
  }),

  // PDF ダウンロード（正常系）
  // パスパターン: /downloads/ を含む .pdf ファイル（絶対URL/相対URL両対応）
  http.get(/\/downloads\/.*\.pdf/, () => {
    const mockBlob = new Blob(['PDF mock data'], {
      type: 'application/pdf',
    });
    return new HttpResponse(mockBlob, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
      },
    });
  }),
];
