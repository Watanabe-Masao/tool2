/**
 * ESLint Rule: no-hardcoded-spacing
 *
 * ハードコードされたスペーシング値を禁止し、テーマのスペーシングシステムを使用を強制します。
 *
 * AIによるコーディング時の事故を防ぐためのルールです。
 *
 * MUI のスペーシングシステム（8pxグリッド）を推奨:
 * - spacing(1) = 8px
 * - spacing(2) = 16px
 * - etc.
 *
 * @example
 * // NG: ハードコードされたスペーシング
 * sx={{ padding: '16px' }}
 * sx={{ margin: '24px' }}
 * sx={{ gap: '12px' }}
 *
 * // OK: テーマスペーシングを使用
 * sx={{ p: 2 }}  // = 16px
 * sx={{ m: 3 }}  // = 24px
 * sx={{ gap: 1.5 }}  // = 12px
 *
 * // OK: レスポンシブ対応
 * sx={{ p: { xs: 1, sm: 2 } }}
 */

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'ハードコードされたスペーシング値の使用を禁止',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: null,
    schema: [
      {
        type: 'object',
        properties: {
          allowedValues: {
            type: 'array',
            items: { type: 'string' },
            description: '許可するスペーシング値のリスト',
          },
          maxAllowedPx: {
            type: 'number',
            description: '許可する最大px値（デフォルト: 4）',
          },
          allowResponsive: {
            type: 'boolean',
            description: 'レスポンシブ対応のオブジェクト形式を許可（デフォルト: true）',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      noHardcodedSpacing:
        'ハードコードされたスペーシング値 "{{value}}" を使用しないでください。' +
        '代わりに MUI のスペーシングシステム（例: p: 2, m: 3）を使用してください。' +
        '8pxグリッドに基づく値（1=8px, 2=16px, 3=24px...）を推奨します。',
    },
  },

  create(context) {
    const options = context.options[0] || {};
    const allowedValues = options.allowedValues || ['auto', 'inherit', 'unset', 'initial', '0', '100%'];
    const maxAllowedPx = options.maxAllowedPx ?? 4; // 4px以下は許可
    const allowSmallRem = options.allowSmallRem !== false; // 0.5rem以下のrem値を許可（デフォルト: true）
    const allowResponsive = options.allowResponsive !== false;

    // スペーシングに関連するプロパティ名
    const spacingProperties = new Set([
      // padding
      'padding',
      'paddingTop',
      'paddingRight',
      'paddingBottom',
      'paddingLeft',
      'paddingInline',
      'paddingBlock',
      'paddingInlineStart',
      'paddingInlineEnd',
      'paddingBlockStart',
      'paddingBlockEnd',
      'p',
      'pt',
      'pr',
      'pb',
      'pl',
      'px',
      'py',
      // margin
      'margin',
      'marginTop',
      'marginRight',
      'marginBottom',
      'marginLeft',
      'marginInline',
      'marginBlock',
      'marginInlineStart',
      'marginInlineEnd',
      'marginBlockStart',
      'marginBlockEnd',
      'm',
      'mt',
      'mr',
      'mb',
      'ml',
      'mx',
      'my',
      // gap
      'gap',
      'rowGap',
      'columnGap',
      'gridGap',
      'gridRowGap',
      'gridColumnGap',
      // 位置
      'top',
      'right',
      'bottom',
      'left',
      'inset',
    ]);

    // px/rem/em値のパターン
    const sizeValuePattern = /^(-?[\d.]+)\s*(px|rem|em)$/i;

    /**
     * 値が許可されているかチェック
     */
    function isAllowedValue(value) {
      if (typeof value === 'number') {
        // 数値はMUIスペーシング単位として許可
        return true;
      }

      if (typeof value !== 'string') return true;

      // 空文字列は許可
      if (value === '') return true;

      // 明示的に許可されている値
      if (allowedValues.includes(value.toLowerCase())) return true;

      // px値をチェック
      const match = value.match(sizeValuePattern);
      if (match) {
        const numValue = parseFloat(match[1]);
        const unit = match[2].toLowerCase();

        // pxの場合、maxAllowedPx以下は許可
        if (unit === 'px' && Math.abs(numValue) <= maxAllowedPx) {
          return true;
        }

        // rem/emの場合
        if (unit === 'rem' || unit === 'em') {
          // 0は許可
          if (numValue === 0) return true;
          // 小さいrem値（0.5rem以下 ≒ 8px以下）は許可（ライブラリスタイル調整用）
          if (allowSmallRem && Math.abs(numValue) <= 0.5) return true;
        }

        return false;
      }

      // calc() は許可（複雑な計算が必要な場合）
      if (value.startsWith('calc(')) return true;

      // var() は許可（CSS変数）
      if (value.startsWith('var(')) return true;

      // その他は許可（変数参照など）
      return true;
    }

    /**
     * プロパティ名がスペーシング関連かどうかチェック
     */
    function isSpacingProperty(node) {
      if (!node.key) return false;

      let propertyName = null;

      if (node.key.type === 'Identifier') {
        propertyName = node.key.name;
      } else if (node.key.type === 'Literal' && typeof node.key.value === 'string') {
        propertyName = node.key.value;
      }

      return propertyName && spacingProperties.has(propertyName);
    }

    /**
     * レスポンシブオブジェクトかどうかチェック
     */
    function isResponsiveObject(node) {
      if (node.type !== 'ObjectExpression') return false;

      const responsiveKeys = new Set(['xs', 'sm', 'md', 'lg', 'xl']);
      return node.properties.some(
        (prop) =>
          prop.type === 'Property' &&
          prop.key.type === 'Identifier' &&
          responsiveKeys.has(prop.key.name)
      );
    }

    /**
     * 値をチェックしてエラーを報告
     */
    function checkSpacingValue(node, value) {
      if (!isAllowedValue(value)) {
        context.report({
          node,
          messageId: 'noHardcodedSpacing',
          data: { value: String(value) },
        });
      }
    }

    /**
     * 値ノードを再帰的にチェック
     */
    function checkValue(node) {
      if (!node) return;

      switch (node.type) {
        case 'Literal':
          if (typeof node.value === 'string') {
            checkSpacingValue(node, node.value);
          }
          // 数値はMUIスペーシング単位として許可
          break;

        case 'ObjectExpression':
          // レスポンシブオブジェクトは許可
          if (allowResponsive && isResponsiveObject(node)) {
            return;
          }
          break;

        case 'ConditionalExpression':
          checkValue(node.consequent);
          checkValue(node.alternate);
          break;

        case 'LogicalExpression':
          checkValue(node.left);
          checkValue(node.right);
          break;

        case 'TemplateLiteral':
          // テンプレートリテラルのquasisをチェック
          node.quasis.forEach((quasi) => {
            if (quasi.value && quasi.value.cooked) {
              const value = quasi.value.cooked.trim();
              if (sizeValuePattern.test(value)) {
                checkSpacingValue(quasi, value);
              }
            }
          });
          break;

        // 以下は許可（変数参照、関数呼び出しなど）
        case 'Identifier':
        case 'MemberExpression':
        case 'CallExpression':
        case 'ArrowFunctionExpression':
        case 'FunctionExpression':
          break;

        default:
          break;
      }
    }

    return {
      Property(node) {
        if (isSpacingProperty(node)) {
          checkValue(node.value);
        }
      },
    };
  },
};
