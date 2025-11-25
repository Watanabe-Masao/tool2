/**
 * 通知メッセージ
 *
 * @description
 * アプリケーション全体で使用する通知メッセージの単一情報源
 */

/**
 * 成功メッセージ
 */
export const SUCCESS_MESSAGES = {
  // 注文関連
  orderSaved: '注文を保存しました',
  orderUpdated: '注文を更新しました',
  orderDeleted: '注文を削除しました',
  orderSubmitted: '注文を送信しました',

  // テンプレート関連
  templateGenerated: 'テンプレートを生成しました',
  templateDownloaded: 'テンプレートをダウンロードしました',

  // ファイル関連
  fileDownloaded: 'ファイルをダウンロードしました',
  fileUploaded: 'ファイルをアップロードしました',

  // 下書き関連
  draftSaved: '下書きを保存しました',
  draftLoaded: '下書きを読み込みました',
  draftCleared: '下書きをクリアしました',

  // ユーザー設定関連
  settingsSaved: '設定を保存しました',
  settingsUpdated: '設定を更新しました',

  // カテゴリ関連
  categorySaved: 'カテゴリを保存しました',
  categoryUpdated: 'カテゴリを更新しました',
  categoryDeleted: 'カテゴリを削除しました',

  // プリセット関連
  presetSaved: 'プリセットを保存しました',
  presetUpdated: 'プリセットを更新しました',
  presetDeleted: 'プリセットを削除しました',

  // メールアドレス関連
  emailSaved: 'メールアドレスを保存しました',
  emailUpdated: 'メールアドレスを更新しました',
  emailDeleted: 'メールアドレスを削除しました',
  emailSent: 'メールを送信しました',

  // 商品履歴関連
  historyCleared: '履歴をクリアしました',
  historyPinned: '履歴をピン留めしました',
  historyUnpinned: 'ピン留めを解除しました',

  // 認証関連
  loginSuccess: 'ログインしました',
  logoutSuccess: 'ログアウトしました',
  passwordChanged: 'パスワードを変更しました',

  // コピー関連
  copiedToClipboard: 'クリップボードにコピーしました',

  // その他
  dataSynced: 'データを同期しました',
  operationCompleted: '操作が完了しました',
} as const;

/**
 * エラーメッセージ
 */
export const ERROR_MESSAGES = {
  // ネットワークエラー
  networkError: 'ネットワークエラーが発生しました',
  serverError: 'サーバーエラーが発生しました',
  timeout: '通信がタイムアウトしました',
  connectionLost: 'ネットワーク接続が切断されました',

  // データエラー
  dataNotFound: 'データが見つかりませんでした',
  dataLoadFailed: 'データの読み込みに失敗しました',
  dataSaveFailed: 'データの保存に失敗しました',
  dataDeleteFailed: 'データの削除に失敗しました',
  dataUpdateFailed: 'データの更新に失敗しました',

  // バリデーションエラー
  validationError: '入力内容に誤りがあります',
  requiredFieldsEmpty: '必須項目が入力されていません',
  invalidFormat: '形式が正しくありません',

  // 認証エラー
  authenticationFailed: '認証に失敗しました',
  unauthorized: '権限がありません',
  sessionExpired: 'セッションの有効期限が切れました',
  loginFailed: 'ログインに失敗しました',
  logoutFailed: 'ログアウトに失敗しました',

  // ファイルエラー
  fileDownloadFailed: 'ファイルのダウンロードに失敗しました',
  fileUploadFailed: 'ファイルのアップロードに失敗しました',
  fileNotFound: 'ファイルが見つかりませんでした',
  fileTooLarge: 'ファイルサイズが大きすぎます',
  invalidFileType: 'ファイルの形式が正しくありません',

  // テンプレートエラー
  templateGenerationFailed: 'テンプレートの生成に失敗しました',

  // 下書きエラー
  draftSaveFailed: '下書きの保存に失敗しました',
  draftLoadFailed: '下書きの読み込みに失敗しました',

  // メールエラー
  emailSendFailed: 'メールの送信に失敗しました',
  invalidEmailAddress: 'メールアドレスが正しくありません',

  // その他
  unknownError: '予期しないエラーが発生しました',
  operationFailed: '操作に失敗しました',
  notImplemented: 'この機能は未実装です',
} as const;

/**
 * 警告メッセージ
 */
export const WARNING_MESSAGES = {
  // データ警告
  unsavedChanges: '保存されていない変更があります',
  dataWillBeLost: 'データが失われます。よろしいですか？',
  cannotUndo: 'この操作は取り消せません',

  // 接続警告
  offline: 'オフラインモードで動作しています',
  slowConnection: 'ネットワーク接続が不安定です',

  // 制限警告
  quotaExceeded: 'ストレージの容量が不足しています',
  limitReached: '上限に達しました',

  // その他
  beta: 'この機能はベータ版です',
  deprecated: 'この機能は非推奨です',
} as const;

/**
 * 情報メッセージ
 */
export const INFO_MESSAGES = {
  // データ情報
  loading: '読み込み中...',
  processing: '処理中...',
  saving: '保存中...',
  uploading: 'アップロード中...',
  downloading: 'ダウンロード中...',

  // 状態情報
  noData: 'データがありません',
  noResults: '該当するデータがありません',
  emptyList: 'リストが空です',

  // 操作情報
  clickToEdit: 'クリックして編集',
  dragToReorder: 'ドラッグして並べ替え',
  selectOption: '選択してください',

  // その他
  comingSoon: '近日公開予定',
  maintenanceMode: 'メンテナンス中です',
} as const;

/**
 * 確認メッセージ
 */
export const CONFIRM_MESSAGES = {
  // 削除確認
  confirmDelete: '本当に削除しますか？',
  confirmDeleteOrder: 'この注文を削除しますか？',
  confirmDeleteHistory: 'この履歴を削除しますか？',
  confirmDeletePreset: 'このプリセットを削除しますか？',
  confirmDeleteEmail: 'このメールアドレスを削除しますか？',
  confirmDeleteCategory: 'このカテゴリを削除しますか？',
  confirmClearDraft: '下書きをクリアしますか？',
  confirmClearHistory: '履歴をすべてクリアしますか？',

  // 上書き確認
  confirmOverwrite: '既存のデータを上書きしますか？',

  // 破棄確認
  confirmDiscard: '変更を破棄しますか？',

  // ログアウト確認
  confirmLogout: 'ログアウトしますか？',

  // その他
  confirmProceed: '続行しますか？',
  confirmAction: 'この操作を実行しますか？',
} as const;

/**
 * メッセージ生成ヘルパー
 */
export const createMessage = {
  /** 成功メッセージ生成 */
  success: (action: string, target: string) => `${target}を${action}しました`,

  /** エラーメッセージ生成 */
  error: (action: string, target: string) => `${target}の${action}に失敗しました`,

  /** 確認メッセージ生成 */
  confirm: (action: string, target: string) => `${target}を${action}しますか？`,

  /** カウント付きメッセージ生成 */
  count: (target: string, count: number) => `${target}: ${count}件`,
} as const;
