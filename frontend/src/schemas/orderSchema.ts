import { z } from 'zod';
import { STORE_COUNT, MAX_LENGTH, NUMBER_RANGE } from '@/utils/constants';

/**
 * 商品データのバリデーションスキーマ
 */
export const productSchema = z.object({
  /** カテゴリーコード（オプショナル） */
  categoryCode: z
    .string()
    .optional()
    .default(''),

  /** 品名 */
  name: z
    .string()
    .min(1, '品名を入力してください')
    .max(MAX_LENGTH.PRODUCT_NAME, `品名は${MAX_LENGTH.PRODUCT_NAME}文字以内で入力してください`),

  /** 産地 */
  origin: z
    .string()
    .min(1, '産地を入力してください')
    .max(MAX_LENGTH.ORIGIN, `産地は${MAX_LENGTH.ORIGIN}文字以内で入力してください`),

  /** 規格 */
  specification: z
    .string()
    .max(MAX_LENGTH.SPECIFICATION, `規格は${MAX_LENGTH.SPECIFICATION}文字以内で入力してください`)
    .optional()
    .default(''),

  /** 1パックの数量（入数） */
  quantityPerPackage: z
    .number({
      invalid_type_error: '入数は数値で入力してください',
    })
    .min(NUMBER_RANGE.QUANTITY_PER_PACKAGE.min, `入数は${NUMBER_RANGE.QUANTITY_PER_PACKAGE.min}以上で入力してください`)
    .max(NUMBER_RANGE.QUANTITY_PER_PACKAGE.max, `入数は${NUMBER_RANGE.QUANTITY_PER_PACKAGE.max}以下で入力してください`)
    .int('整数で入力してください')
    .nullable(),

  /** 単位 */
  unit: z
    .string()
    .max(MAX_LENGTH.SPECIFICATION, `単位は${MAX_LENGTH.SPECIFICATION}文字以内で入力してください`)
    .optional()
    .default(''),

  /** センター着原価 */
  centerCost: z
    .number()
    .min(NUMBER_RANGE.STORE_COST.min, `センター着原価は${NUMBER_RANGE.STORE_COST.min}以上で入力してください`)
    .max(NUMBER_RANGE.STORE_COST.max, `センター着原価は${NUMBER_RANGE.STORE_COST.max}以下で入力してください`),

  /** センターフィー率（%） */
  centerFeeRate: z
    .number()
    .min(0, 'センターフィー率は0以上で入力してください')
    .max(100, 'センターフィー率は100以下で入力してください')
    .default(13),

  /** 店原 */
  storeCost: z
    .number()
    .min(NUMBER_RANGE.STORE_COST.min, `店原は${NUMBER_RANGE.STORE_COST.min}以上で入力してください`)
    .max(NUMBER_RANGE.STORE_COST.max, `店原は${NUMBER_RANGE.STORE_COST.max}以下で入力してください`),

  /** 本体価格（税抜） */
  priceExcludingTax: z
    .number()
    .min(NUMBER_RANGE.PRICE_EXCLUDING_TAX.min, `本体価格は${NUMBER_RANGE.PRICE_EXCLUDING_TAX.min}以上で入力してください`)
    .max(NUMBER_RANGE.PRICE_EXCLUDING_TAX.max, `本体価格は${NUMBER_RANGE.PRICE_EXCLUDING_TAX.max}以下で入力してください`),

  /** 36店舗への配分数 */
  storeAllocations: z
    .array(
      z
        .number()
        .min(NUMBER_RANGE.STORE_ALLOCATION.min, `配分数は${NUMBER_RANGE.STORE_ALLOCATION.min}以上で入力してください`)
        .max(NUMBER_RANGE.STORE_ALLOCATION.max, `配分数は${NUMBER_RANGE.STORE_ALLOCATION.max}以下で入力してください`)
        .int('整数で入力してください')
    )
    .length(STORE_COUNT, `配分数は${STORE_COUNT}店舗分必要です`),
});

/**
 * 注文フォーム全体のバリデーションスキーマ
 */
export const orderFormSchema = z
  .object({
    /** 店着日 */
    deliveryDate: z.date({
      required_error: '店着日を選択してください',
      invalid_type_error: '有効な日付を選択してください',
    }),

    /** 帳合先 */
    supplier: z
      .string()
      .min(1, '帳合先を入力してください')
      .max(MAX_LENGTH.SUPPLIER, `帳合先は${MAX_LENGTH.SUPPLIER}文字以内で入力してください`),

    /** 総納品数 */
    totalDelivery: z
      .number()
      .min(NUMBER_RANGE.TOTAL_DELIVERY.min, `総納品数は${NUMBER_RANGE.TOTAL_DELIVERY.min}以上で入力してください`)
      .max(NUMBER_RANGE.TOTAL_DELIVERY.max, `総納品数は${NUMBER_RANGE.TOTAL_DELIVERY.max}以下で入力してください`)
      .int('整数で入力してください'),

    /** 商品リスト */
    products: z
      .array(productSchema)
      .min(1, '商品を少なくとも1つ追加してください')
      .max(10, '商品は最大10個まで追加できます'),
  })
  .refine(
    (data) => {
      // 各商品の配分合計が総納品数と一致しているか確認
      return data.products.every((product) => {
        const totalAllocation = product.storeAllocations.reduce((sum, val) => sum + val, 0);
        return totalAllocation === data.totalDelivery;
      });
    },
    {
      message: '各商品の配分合計は総納品数と一致している必要があります',
      path: ['products'],
    }
  );

/**
 * TypeScript型をZodスキーマから推論
 */
export type ProductFormData = z.infer<typeof productSchema>;
export type OrderFormData = z.infer<typeof orderFormSchema>;
