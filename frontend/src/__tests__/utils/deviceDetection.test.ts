import { describe, it, expect, beforeEach } from 'vitest';
import { getDeviceInfo, isIPhoneSafari } from '@/utils/deviceDetection';

describe('deviceDetection', () => {
  describe('getDeviceInfo', () => {
    beforeEach(() => {
      // Reset navigator.userAgent before each test
      Object.defineProperty(window.navigator, 'userAgent', {
        writable: true,
        value: '',
      });
    });

    it('should detect iPhone', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        writable: true,
        value:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
      });

      const info = getDeviceInfo();
      expect(info.isIOS).toBe(true);
      expect(info.isSafari).toBe(true);
      expect(info.isMobile).toBe(true);
    });

    it('should detect iPad', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        writable: true,
        value:
          'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
      });

      const info = getDeviceInfo();
      expect(info.isIOS).toBe(true);
      expect(info.isSafari).toBe(true);
      expect(info.isTablet).toBe(true);
    });

    it('should detect Android mobile', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        writable: true,
        value:
          'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36',
      });

      const info = getDeviceInfo();
      expect(info.isIOS).toBe(false);
      expect(info.isSafari).toBe(false);
      expect(info.isMobile).toBe(true);
    });

    it('should detect desktop', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        writable: true,
        value:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36',
      });

      const info = getDeviceInfo();
      expect(info.isIOS).toBe(false);
      expect(info.isSafari).toBe(false);
    });
  });

  describe('isIPhoneSafari', () => {
    it('should return true for iPhone Safari', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        writable: true,
        value:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
      });

      expect(isIPhoneSafari()).toBe(true);
    });

    it('should return false for iPhone Chrome', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        writable: true,
        value:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/90.0.4430.78 Mobile/15E148 Safari/604.1',
      });

      expect(isIPhoneSafari()).toBe(false);
    });

    it('should return false for iPad Safari', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        writable: true,
        value:
          'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
      });

      expect(isIPhoneSafari()).toBe(false);
    });

    it('should return false for desktop Safari', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        writable: true,
        value:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15',
      });

      expect(isIPhoneSafari()).toBe(false);
    });
  });
});
