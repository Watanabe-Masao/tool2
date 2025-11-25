import { afterAll, afterEach, beforeAll } from 'vitest';
import { setupServer } from 'msw/node';
import { handlers } from './mocks/handlers';

/**
 * MSW Server Setup
 *
 * テスト環境用のMSWサーバー設定
 * すべてのテストで共有される
 */

export const server = setupServer(...handlers);

// テスト開始前にMSWサーバーを起動
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' });
});

// 各テスト後にハンドラーをリセット
afterEach(() => {
  server.resetHandlers();
});

// すべてのテスト完了後にMSWサーバーを停止
afterAll(() => {
  server.close();
});
