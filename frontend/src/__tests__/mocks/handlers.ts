import { http, HttpResponse } from 'msw';

/**
 * MSW Request Handlers
 *
 * APIリクエストをモックするハンドラー定義
 * useFileDownloads.test.ts で使用
 */

export const handlers = [
  // Excel ダウンロード（正常系）
  http.get('/downloads/*.xlsx', async () => {
    const mockBlob = new Blob(['Excel mock data'], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    return HttpResponse.arrayBuffer(await mockBlob.arrayBuffer());
  }),

  // PDF ダウンロード（正常系）
  http.get('/downloads/*.pdf', async () => {
    const mockBlob = new Blob(['PDF mock data'], {
      type: 'application/pdf',
    });
    return HttpResponse.arrayBuffer(await mockBlob.arrayBuffer());
  }),
];
