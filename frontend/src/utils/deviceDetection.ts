import type { DeviceInfo } from '@/types';

/**
 * デバイス情報を取得
 *
 * @returns デバイス情報
 */
export const getDeviceInfo = (): DeviceInfo => {
  const ua = navigator.userAgent;

  // iOS判定
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;

  // Safari判定（Chrome/Androidを除外）
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);

  // モバイル判定
  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
    window.innerWidth <= 768;

  // タブレット判定
  const isTablet = /iPad|Android/i.test(ua) && window.innerWidth >= 768 && window.innerWidth <= 1024;

  return {
    isIOS,
    isSafari,
    isMobile,
    isTablet,
  };
};

/**
 * iOSデバイスかどうか
 */
export const isIOSDevice = (): boolean => {
  return getDeviceInfo().isIOS;
};

/**
 * Safariブラウザかどうか
 */
export const isSafariBrowser = (): boolean => {
  return getDeviceInfo().isSafari;
};

/**
 * モバイルデバイスかどうか
 */
export const isMobileDevice = (): boolean => {
  return getDeviceInfo().isMobile;
};

/**
 * タブレットデバイスかどうか
 */
export const isTabletDevice = (): boolean => {
  return getDeviceInfo().isTablet;
};

/**
 * iPhone Safariかどうか
 *
 * iPhone Safariではプログラマティックダウンロードが制限されているため、
 * 特別な処理が必要です。
 */
export const isIPhoneSafari = (): boolean => {
  const deviceInfo = getDeviceInfo();
  return deviceInfo.isIOS && deviceInfo.isSafari && !deviceInfo.isTablet;
};
