import React, { createContext, useContext, useMemo } from 'react';
import { FirestoreService } from '@/services/firebase/firestoreService';
import { TemplateService } from '@/services/api/templateService';
import { SessionStorageService } from '@/utils/sessionStorageService';

/**
 * Service インターフェース定義
 *
 * 各 Service の型を定義し、DI（Dependency Injection）を可能にする。
 */
export interface IFirestoreService {
  saveProductHistory: typeof FirestoreService.saveProductHistory;
  savePricingHistory: typeof FirestoreService.savePricingHistory;
  saveAutocompleteHistory: typeof FirestoreService.saveAutocompleteHistory;
  getAutocompleteHistory: typeof FirestoreService.getAutocompleteHistory;
  getUserSettings: typeof FirestoreService.getUserSettings;
}

export interface ITemplateService {
  generateTemplate: typeof TemplateService.generateTemplate;
  getDownloadUrl: typeof TemplateService.getDownloadUrl;
}

export interface ISessionStorageService {
  saveDraft: typeof SessionStorageService.saveDraft;
  getDraft: typeof SessionStorageService.getDraft;
  clearDraft: typeof SessionStorageService.clearDraft;
}

/**
 * Services の型定義
 *
 * アプリケーション全体で使用する Service の集合。
 */
export interface Services {
  firestoreService: IFirestoreService;
  templateService: ITemplateService;
  sessionStorageService: ISessionStorageService;
}

/**
 * Service Context
 *
 * アプリケーション全体に Service を提供する Context。
 */
const ServiceContext = createContext<Services | null>(null);

/**
 * ServiceProvider Props
 */
export interface ServiceProviderProps {
  children: React.ReactNode;
  /**
   * テスト用 Service override
   *
   * テスト時に Service をモック実装に置き換えるために使用。
   */
  services?: Partial<Services>;
}

/**
 * ServiceProvider
 *
 * アプリケーション全体に Service を提供する Context Provider。
 * テスト時は services prop で Service をオーバーライド可能。
 *
 * @example
 * ```tsx
 * // 本番環境での使用
 * <ServiceProvider>
 *   <App />
 * </ServiceProvider>
 *
 * // テスト環境での使用（モック注入）
 * <ServiceProvider services={{ firestoreService: mockFirestoreService }}>
 *   <ComponentUnderTest />
 * </ServiceProvider>
 * ```
 */
export const ServiceProvider: React.FC<ServiceProviderProps> = ({
  children,
  services: overrideServices,
}) => {
  const services = useMemo<Services>(
    () => ({
      firestoreService: overrideServices?.firestoreService ?? FirestoreService,
      templateService: overrideServices?.templateService ?? TemplateService,
      sessionStorageService: overrideServices?.sessionStorageService ?? SessionStorageService,
    }),
    [overrideServices]
  );

  return <ServiceContext.Provider value={services}>{children}</ServiceContext.Provider>;
};

/**
 * useServices Hook
 *
 * Service Context から Services を取得する。
 * ServiceProvider の外で使用するとエラーを投げる。
 *
 * @returns Services オブジェクト
 * @throws ServiceProvider の外で使用した場合
 *
 * @example
 * ```tsx
 * const { firestoreService, templateService } = useServices();
 *
 * await firestoreService.saveProductHistory(...);
 * await templateService.generateTemplate(...);
 * ```
 */
export const useServices = (): Services => {
  const services = useContext(ServiceContext);

  if (!services) {
    throw new Error(
      'useServices must be used within a ServiceProvider. ' +
        'Make sure your component is wrapped with <ServiceProvider>.'
    );
  }

  return services;
};

/**
 * 個別 Service Hooks
 *
 * 特定の Service のみを取得する convenience hooks。
 */

/**
 * useFirestoreService
 *
 * Firestore Service を取得する。
 *
 * @returns IFirestoreService
 *
 * @example
 * ```tsx
 * const firestoreService = useFirestoreService();
 * await firestoreService.saveProductHistory(...);
 * ```
 */
export const useFirestoreService = (): IFirestoreService => {
  return useServices().firestoreService;
};

/**
 * useTemplateService
 *
 * Template Service を取得する。
 *
 * @returns ITemplateService
 *
 * @example
 * ```tsx
 * const templateService = useTemplateService();
 * const response = await templateService.generateTemplate(...);
 * ```
 */
export const useTemplateService = (): ITemplateService => {
  return useServices().templateService;
};

/**
 * useSessionStorageService
 *
 * SessionStorage Service を取得する。
 *
 * @returns ISessionStorageService
 *
 * @example
 * ```tsx
 * const sessionStorageService = useSessionStorageService();
 * await sessionStorageService.saveDraft(...);
 * ```
 */
export const useSessionStorageService = (): ISessionStorageService => {
  return useServices().sessionStorageService;
};
