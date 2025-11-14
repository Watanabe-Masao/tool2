import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test case
afterEach(() => {
  cleanup();
});

// Mock environment variables for tests
vi.mock('import.meta.env', () => ({
  VITE_FIREBASE_API_KEY: 'test-api-key',
  VITE_FIREBASE_AUTH_DOMAIN: 'test.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'test-project',
  VITE_FIREBASE_STORAGE_BUCKET: 'test.appspot.com',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '123456789',
  VITE_FIREBASE_APP_ID: 'test-app-id',
}));

// Mock navigator.onLine for offline sync tests
Object.defineProperty(window.navigator, 'onLine', {
  writable: true,
  value: true,
});

// Extend expect with custom matchers
expect.extend({
  // Add custom matchers if needed
});
