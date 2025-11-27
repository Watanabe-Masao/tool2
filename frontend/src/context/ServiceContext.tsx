import React, { createContext, useContext, useMemo, useRef, useEffect } from 'react';
import { FirestoreServiceFacade } from '@/services/firestore/FirestoreServiceFacade';
import { getFirebaseFirestore } from '@/services/firebase/config';
import { TemplateService } from '@/services/api/templateService';
import { SessionStorageService } from '@/utils/sessionStorageService';
import type { IFirestoreService, ITemplateService, ISessionStorageService, Services } from '@/types/services';

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
 * デフォルトの FirestoreServiceFacade インスタンス
 *
 * シングルトンパターンで、アプリケーション全体で同一インスタンスを使用。
 */
let defaultFirestoreService: FirestoreServiceFacade | null = null;

const getDefaultFirestoreService = (): IFirestoreService => {
  if (!defaultFirestoreService) {
    const db = getFirebaseFirestore();
    defaultFirestoreService = new FirestoreServiceFacade(db);
  }
  return defaultFirestoreService;
};

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
      firestoreService: overrideServices?.firestoreService ?? getDefaultFirestoreService(),
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

/**
 * useFirestoreServiceRef
 *
 * Firestore Service の安定した参照を取得する。
 * useEffectやuseCallbackの依存配列に含めても無限ループを引き起こさない。
 *
 * NOTE: このフックは無限ループ(React #185)を防止するために使用する。
 * firestoreServiceを依存配列に含める必要がある場合は、このフックを使用する。
 *
 * @returns MutableRefObject<IFirestoreService>
 *
 * @example
 * ```tsx
 * const firestoreServiceRef = useFirestoreServiceRef();
 *
 * const loadData = useCallback(async () => {
 *   const data = await firestoreServiceRef.current.getData();
 *   // ...
 * }, []); // 依存配列にfirestoreServiceを含めなくてもOK
 * ```
 */
export const useFirestoreServiceRef = (): React.MutableRefObject<IFirestoreService> => {
  const firestoreService = useFirestoreService();
  const ref = useRef(firestoreService);

  useEffect(() => {
    ref.current = firestoreService;
  }, [firestoreService]);

  return ref;
};
