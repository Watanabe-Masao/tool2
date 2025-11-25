/**
 * UI テキスト
 *
 * @description
 * UIコンポーネントで使用するラベル、ボタンテキストなどの単一情報源
 */

/**
 * ボタンテキスト
 */
export const BUTTON_LABELS = {
  // 基本操作
  save: '保存',
  cancel: 'キャンセル',
  close: '閉じる',
  ok: 'OK',
  yes: 'はい',
  no: 'いいえ',
  confirm: '確認',
  submit: '送信',
  reset: 'リセット',
  clear: 'クリア',
  delete: '削除',
  edit: '編集',
  add: '追加',
  remove: '削除',
  update: '更新',
  create: '作成',
  copy: 'コピー',
  download: 'ダウンロード',
  upload: 'アップロード',
  preview: 'プレビュー',
  print: '印刷',
  search: '検索',
  filter: '絞り込み',
  sort: '並べ替え',
  refresh: '更新',
  reload: '再読み込み',
  back: '戻る',
  next: '次へ',
  previous: '前へ',
  skip: 'スキップ',
  finish: '完了',

  // 認証
  login: 'ログイン',
  logout: 'ログアウト',
  signup: '新規登録',
  forgotPassword: 'パスワードを忘れた方',

  // 注文関連
  newOrder: '新規注文',
  editOrder: '注文編集',
  deleteOrder: '注文削除',
  submitOrder: '注文送信',
  saveAsDraft: '下書き保存',
  loadDraft: '下書き読み込み',
  clearDraft: '下書きクリア',

  // 商品関連
  addProduct: '商品追加',
  removeProduct: '商品削除',
  copyProduct: '商品コピー',
  pasteProduct: '商品貼り付け',

  // テンプレート関連
  generateTemplate: 'テンプレート生成',
  downloadExcel: 'Excel ダウンロード',
  downloadPDF: 'PDF ダウンロード',
  viewPDF: 'PDF 表示',

  // メール関連
  sendEmail: 'メール送信',
  addRecipient: '宛先追加',

  // プリセット関連
  savePreset: 'プリセット保存',
  loadPreset: 'プリセット読み込み',
  managePresets: 'プリセット管理',

  // カテゴリ関連
  addCategory: 'カテゴリ追加',
  editCategory: 'カテゴリ編集',
  deleteCategory: 'カテゴリ削除',

  // 履歴関連
  viewHistory: '履歴表示',
  clearHistory: '履歴クリア',
  pinHistory: 'ピン留め',
  unpinHistory: 'ピン留め解除',

  // その他
  showMore: 'もっと見る',
  showLess: '閉じる',
  expand: '展開',
  collapse: '折りたたむ',
  selectAll: 'すべて選択',
  deselectAll: 'すべて解除',
  apply: '適用',
} as const;

/**
 * フィールドラベル
 */
export const FIELD_LABELS = {
  // 注文情報
  deliveryDate: '納品日',
  orderDate: '注文日',
  buyerName: 'バイヤー名',
  suppliers: '帳合先',

  // 商品情報
  supplier: '帳合先',
  productName: '品名',
  origin: '産地',
  specification: '規格',
  quantityPerPackage: '入数',
  unit: '単位',
  categoryCode: 'カテゴリコード',

  // 価格情報
  centerCost: 'センター着原価',
  centerFeeRate: 'センターフィー率',
  storeCost: '店原',
  priceExcludingTax: '本体価格',
  priceIncludingTax: '税込価格',
  totalDelivery: '総納品数',
  storeAllocation: '店舗配分',

  // 認証情報
  email: 'メールアドレス',
  password: 'パスワード',
  confirmPassword: 'パスワード（確認）',
  displayName: '表示名',

  // 設定情報
  theme: 'テーマ',
  language: '言語',
  timezone: 'タイムゾーン',
  notifications: '通知',

  // ファイル情報
  filename: 'ファイル名',
  fileSize: 'ファイルサイズ',
  fileType: 'ファイル形式',
  uploadDate: 'アップロード日',

  // その他
  remarks: '備考',
  memo: 'メモ',
  description: '説明',
  status: 'ステータス',
  createdAt: '作成日時',
  updatedAt: '更新日時',
} as const;

/**
 * ページタイトル
 */
export const PAGE_TITLES = {
  home: 'ホーム',
  newOrder: '新規注文',
  calendar: 'カレンダー',
  history: '履歴',
  settings: '設定',
  profile: 'プロフィール',
  login: 'ログイン',
  signup: '新規登録',
  categoryManagement: 'カテゴリ管理',
  storeManagement: '店舗管理',
  supplierManagement: '帳合先管理',
  emailManagement: 'メールアドレス管理',
  about: 'このアプリについて',
} as const;

/**
 * セクションタイトル
 */
export const SECTION_TITLES = {
  orderInfo: '注文情報',
  productList: '商品リスト',
  storeAllocation: '店舗配分',
  priceInfo: '価格情報',
  template: 'テンプレート',
  preview: 'プレビュー',
  history: '履歴',
  settings: '設定',
  categories: 'カテゴリ',
  stores: '店舗',
} as const;

/**
 * プレースホルダーテキスト
 */
export const PLACEHOLDERS = {
  selectSupplier: '帳合先を選択',
  enterProductName: '品名を入力',
  enterOrigin: '産地を入力',
  enterSpecification: '規格を入力',
  enterUnit: '単位を入力',
  enterBuyerName: 'バイヤー名を入力',
  enterEmail: 'メールアドレスを入力',
  enterPassword: 'パスワードを入力',
  enterFilename: 'ファイル名を入力',
  search: '検索...',
  searchProducts: '商品を検索...',
  searchHistory: '履歴を検索...',
  selectDate: '日付を選択',
  selectCategory: 'カテゴリを選択',
  selectStore: '店舗を選択',
  enterMemo: 'メモを入力',
} as const;

/**
 * ステータステキスト
 */
export const STATUS_LABELS = {
  draft: '下書き',
  submitted: '送信済み',
  processing: '処理中',
  completed: '完了',
  cancelled: 'キャンセル',
  error: 'エラー',
  pending: '保留中',
  approved: '承認済み',
  rejected: '却下',
  active: '有効',
  inactive: '無効',
  online: 'オンライン',
  offline: 'オフライン',
} as const;

/**
 * ヘルプテキスト
 */
export const HELP_TEXT = {
  deliveryDate: '商品の納品予定日を選択してください',
  supplierSelection: '商品ごとに帳合先を選択できます',
  storeAllocation: '各店舗への配分数を入力してください。総納品数と一致している必要があります',
  centerFeeRate: 'センターフィー率は通常13%です',
  priceCalculation: '店原 = センター着原価 × (1 + センターフィー率 ÷ 100)',
  autoSave: '変更は自動的に保存されます',
  offlineMode: 'オフラインでも作業できます。オンラインに戻ると自動的に同期されます',
  draft: '下書きはブラウザに保存されます',
  templatePreview: 'テンプレートを生成する前にプレビューで確認できます',
  emailRecipients: '複数のメールアドレスを登録して、宛先を素早く選択できます',
  categoryFilter: 'カテゴリで店舗を絞り込めます',
  pinHistory: 'ピン留めした商品は履歴の上部に固定されます',
  keyboardShortcuts: 'キーボードショートカットで素早く操作できます',
} as const;

/**
 * 空状態メッセージ
 */
export const EMPTY_STATE_MESSAGES = {
  noOrders: '注文がありません',
  noProducts: '商品が登録されていません',
  noHistory: '履歴がありません',
  noCategories: 'カテゴリがありません',
  noPresets: 'プリセットがありません',
  noEmailAddresses: 'メールアドレスが登録されていません',
  noResults: '検索結果がありません',
  noData: 'データがありません',
} as const;

/**
 * タイムスタンプフォーマット
 */
export const TIME_LABELS = {
  justNow: 'たった今',
  minutesAgo: (n: number) => `${n}分前`,
  hoursAgo: (n: number) => `${n}時間前`,
  daysAgo: (n: number) => `${n}日前`,
  weeksAgo: (n: number) => `${n}週間前`,
  monthsAgo: (n: number) => `${n}ヶ月前`,
  yearsAgo: (n: number) => `${n}年前`,
  today: '今日',
  yesterday: '昨日',
  tomorrow: '明日',
} as const;

/**
 * 単位ラベル
 */
export const UNIT_LABELS = {
  count: '件',
  item: '個',
  piece: '点',
  box: '箱',
  pack: 'パック',
  kg: 'kg',
  g: 'g',
  l: 'L',
  ml: 'ml',
  yen: '円',
  percent: '%',
} as const;
