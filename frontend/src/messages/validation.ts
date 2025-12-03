/**
 * バリデーションメッセージ
 *
 * @description
 * フォームバリデーションで使用するエラーメッセージの単一情報源
 */

/**
 * 必須フィールドメッセージ
 */
export const REQUIRED_MESSAGES = {
  supplier: '帳合先を選択してください',
  productName: '品名を入力してください',
  origin: '産地を入力してください',
  deliveryDate: '納品日を選択してください',
  buyerName: 'バイヤー名を入力してください',
  email: 'メールアドレスを入力してください',
  password: 'パスワードを入力してください',
  categoryName: 'カテゴリ名を入力してください',
  storeName: '店舗名を入力してください',
} as const;

/**
 * 文字数制限メッセージ生成
 */
export const createMaxLengthMessage = (fieldName: string, maxLength: number): string =>
  `${fieldName}は${maxLength}文字以内で入力してください`;

export const createMinLengthMessage = (fieldName: string, minLength: number): string =>
  `${fieldName}は${minLength}文字以上で入力してください`;

/**
 * 数値範囲メッセージ生成
 */
export const createMinValueMessage = (fieldName: string, minValue: number): string =>
  `${fieldName}は${minValue}以上で入力してください`;

export const createMaxValueMessage = (fieldName: string, maxValue: number): string =>
  `${fieldName}は${maxValue}以下で入力してください`;

export const createRangeMessage = (fieldName: string, min: number, max: number): string =>
  `${fieldName}は${min}〜${max}の範囲で入力してください`;

/**
 * 型エラーメッセージ
 */
export const TYPE_ERROR_MESSAGES = {
  number: '数値で入力してください',
  integer: '整数で入力してください',
  date: '日付の形式が正しくありません',
  email: 'メールアドレスの形式が正しくありません',
  url: 'URLの形式が正しくありません',
} as const;

/**
 * フィールド別バリデーションメッセージ
 */
export const FIELD_VALIDATION_MESSAGES = {
  // 商品関連
  product: {
    supplier: {
      required: REQUIRED_MESSAGES.supplier,
      maxLength: (max: number) => createMaxLengthMessage('帳合先', max),
    },
    name: {
      required: REQUIRED_MESSAGES.productName,
      maxLength: (max: number) => createMaxLengthMessage('品名', max),
    },
    origin: {
      required: REQUIRED_MESSAGES.origin,
      maxLength: (max: number) => createMaxLengthMessage('産地', max),
    },
    specification: {
      maxLength: (max: number) => createMaxLengthMessage('規格', max),
    },
    quantityPerPackage: {
      typeError: TYPE_ERROR_MESSAGES.number,
      integer: TYPE_ERROR_MESSAGES.integer,
      min: (min: number) => createMinValueMessage('入数', min),
      max: (max: number) => createMaxValueMessage('入数', max),
    },
    specificationUnit: {
      maxLength: (max: number) => createMaxLengthMessage('単位', max),
    },
    centerCost: {
      min: (min: number) => createMinValueMessage('センター着原価', min),
      max: (max: number) => createMaxValueMessage('センター着原価', max),
    },
    centerFeeRate: {
      min: (min: number) => createMinValueMessage('センターフィー率', min),
      max: (max: number) => createMaxValueMessage('センターフィー率', max),
    },
    storeCost: {
      min: (min: number) => createMinValueMessage('店原', min),
      max: (max: number) => createMaxValueMessage('店原', max),
    },
    priceExcludingTax: {
      min: (min: number) => createMinValueMessage('本体価格', min),
      max: (max: number) => createMaxValueMessage('本体価格', max),
    },
    totalDelivery: {
      min: (min: number) => createMinValueMessage('総納品数', min),
      max: (max: number) => createMaxValueMessage('総納品数', max),
    },
    storeAllocation: {
      min: (min: number) => createMinValueMessage('店舗配分数', min),
      max: (max: number) => createMaxValueMessage('店舗配分数', max),
    },
  },

  // 注文関連
  order: {
    deliveryDate: {
      required: REQUIRED_MESSAGES.deliveryDate,
      invalid: TYPE_ERROR_MESSAGES.date,
    },
    buyerName: {
      required: REQUIRED_MESSAGES.buyerName,
      maxLength: (max: number) => createMaxLengthMessage('バイヤー名', max),
    },
    customFilename: {
      maxLength: (max: number) => createMaxLengthMessage('ファイル名', max),
    },
    products: {
      required: '商品を1つ以上追加してください',
      minLength: (min: number) => `商品は${min}つ以上追加してください`,
    },
  },

  // 認証関連
  auth: {
    email: {
      required: REQUIRED_MESSAGES.email,
      invalid: TYPE_ERROR_MESSAGES.email,
    },
    password: {
      required: REQUIRED_MESSAGES.password,
      minLength: (min: number) => createMinLengthMessage('パスワード', min),
      weak: 'パスワードは英数字を組み合わせてください',
    },
  },

  // カテゴリ関連
  category: {
    name: {
      required: REQUIRED_MESSAGES.categoryName,
      maxLength: (max: number) => createMaxLengthMessage('カテゴリ名', max),
    },
    code: {
      required: 'カテゴリコードを入力してください',
      pattern: 'カテゴリコードは半角英数字で入力してください',
    },
  },

  // 店舗関連
  store: {
    name: {
      required: REQUIRED_MESSAGES.storeName,
      maxLength: (max: number) => createMaxLengthMessage('店舗名', max),
    },
    code: {
      required: '店舗コードを入力してください',
      pattern: '店舗コードは半角英数字で入力してください',
    },
  },
} as const;

/**
 * カスタムバリデーションメッセージ
 */
export const CUSTOM_VALIDATION_MESSAGES = {
  futureDate: (fieldName: string) => `${fieldName}は未来の日付を選択してください`,
  pastDate: (fieldName: string) => `${fieldName}は過去の日付を選択してください`,
  uniqueValue: (fieldName: string) => `この${fieldName}は既に使用されています`,
  mismatch: (field1: string, field2: string) => `${field1}と${field2}が一致しません`,
  invalidFormat: (fieldName: string) => `${fieldName}の形式が正しくありません`,
} as const;
