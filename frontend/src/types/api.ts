/**
 * API 関連型定義
 *
 * @description
 * API リクエスト/レスポンス、エラーハンドリングなど、API 通信に関連する全ての型を定義
 */

/**
 * APIリクエスト: テンプレート生成
 */
export interface TemplateRequest {
  /** 店着日 (YYYY-MM-DD) */
  delivery_date: string;
  /** 帳合先 */
  supplier: string;
  /** バイヤー名 */
  buyer_name: string;
  /** 商品リスト */
  products: Array<{
    /** 品名 */
    name: string;
    /** 産地 */
    origin: string;
    /** 規格 */
    standard: string;
    /** 入数 */
    quantity: number | null;
    /** 単位 */
    specificationUnit: string;
    /** 店着原価 - フロントエンド側ではnull許容、バックエンドに送る前に必ずバリデーション済み */
    store_cost: number | null;
    /** 税抜売価 - フロントエンド側ではnull許容、バックエンドに送る前に必ずバリデーション済み */
    price: number | null;
    /** 総納品数 - フロントエンド側ではnull許容、バックエンドに送る前に必ずバリデーション済み */
    total_delivery: number | null;
    /** 納品先（帳合先） */
    delivery_dest: string;
    /** 店舗配分数（店舗コード→数量のマップ） */
    store_quantities: Record<string, number>;
  }>;
  /** 出力ファイル名（オプション） */
  output_filename?: string;
}

/**
 * APIレスポンス: テンプレート生成成功
 */
export interface TemplateResponse {
  /** 成功フラグ */
  success: boolean;
  /** 生成されたExcelファイル名 */
  filename: string;
  /** ExcelダウンロードURL */
  download_url: string;
  /** 生成されたPDFファイル名（オプション） */
  pdf_filename?: string;
  /** PDFダウンロードURL（オプション） */
  pdf_download_url?: string;
  /** メッセージ */
  message: string;
}

/**
 * APIレスポンス: エラー
 */
export interface ErrorResponse {
  /** エラー詳細 */
  detail: string;
}

/**
 * APIレスポンス: バージョン情報
 */
export interface VersionResponse {
  /** バージョン番号 */
  version: string;
  /** 環境 */
  environment: string;
}

/**
 * APIレスポンス: Firebase設定
 */
export interface FirebaseConfigResponse {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}
