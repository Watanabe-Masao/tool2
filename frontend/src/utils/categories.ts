/**
 * カテゴリー定数
 */

import type { Category, MainCategory } from '@/types/utils';

/**
 * 果実カテゴリー（61）
 */
export const FRUIT_CATEGORIES: Category[] = [
  { code: '000601', name: '柑橘' },
  { code: '000602', name: 'りんご' },
  { code: '000603', name: 'ぶどう' },
  { code: '000604', name: 'いちご' },
  { code: '000605', name: '果瓜' },
  { code: '000606', name: '輸入果実' },
  { code: '000607', name: '季節果実' },
  { code: '000608', name: '果実加工品' },
  { code: '000609', name: 'ギフト' },
  { code: '000611', name: '移動販売' },
  { code: '000612', name: 'バナナ' },
];

/**
 * 野菜カテゴリー（62）
 */
export const VEGETABLE_CATEGORIES: Category[] = [
  { code: '000620', name: '土物' },
  { code: '000621', name: '根菜' },
  { code: '000622', name: '果菜' },
  { code: '000623', name: '豆' },
  { code: '000624', name: '洋菜' },
  { code: '000625', name: '葉茎' },
  { code: '000626', name: '菌茸' },
  { code: '000627', name: '季節野菜' },
  { code: '000628', name: '薬味' },
  { code: '000629', name: 'スプラウト' },
  { code: '000630', name: 'カット野菜' },
  { code: '000631', name: '野菜加工品' },
  { code: '000637', name: 'トマト' },
  { code: '000639', name: 'ギフト' },
];

/**
 * 全カテゴリー
 */
export const MAIN_CATEGORIES: MainCategory[] = [
  {
    code: '61',
    name: '果実',
    subCategories: FRUIT_CATEGORIES,
  },
  {
    code: '62',
    name: '野菜',
    subCategories: VEGETABLE_CATEGORIES,
  },
];

/**
 * カテゴリーコードから名前を取得
 */
export const getCategoryName = (code: string): string => {
  for (const main of MAIN_CATEGORIES) {
    const sub = main.subCategories.find((cat) => cat.code === code);
    if (sub) {
      return `${main.name} > ${sub.name}`;
    }
  }
  return '';
};

/**
 * カテゴリーコードから大カテゴリーコードを取得
 */
export const getMainCategoryCode = (code: string): string => {
  for (const main of MAIN_CATEGORIES) {
    const sub = main.subCategories.find((cat) => cat.code === code);
    if (sub) {
      return main.code;
    }
  }
  return '';
};

// Re-export for backward compatibility
export type { MainCategory, Category } from '@/types/utils';
