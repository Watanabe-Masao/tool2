/**
 * ESLint Rule: no-hardcoded-colors
 *
 * ハードコードされた色値を禁止し、テーマカラーの使用を強制します。
 *
 * AIによるコーディング時の事故を防ぐためのルールです。
 *
 * @example
 * // NG: ハードコードされた色
 * sx={{ color: '#ff0000' }}
 * sx={{ backgroundColor: 'rgb(255, 0, 0)' }}
 * style={{ borderColor: '#1976d2' }}
 *
 * // OK: テーマカラーを使用
 * sx={{ color: 'primary.main' }}
 * sx={{ bgcolor: 'error.light' }}
 * sx={{ color: theme.palette.primary.main }}
 */

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'ハードコードされた色値の使用を禁止',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: null,
    schema: [
      {
        type: 'object',
        properties: {
          allowedColors: {
            type: 'array',
            items: { type: 'string' },
            description: '許可する色値のリスト（例: ["transparent", "inherit", "currentColor"]）',
          },
          allowGrey: {
            type: 'boolean',
            description: 'grey.xxx形式のMUI色を許可（デフォルト: true）',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      noHardcodedColor:
        'ハードコードされた色値 "{{value}}" を使用しないでください。' +
        '代わりに MUI テーマカラー（例: "primary.main", "error.light"）または ' +
        '@/theme.ts の designTokens.colors を使用してください。',
    },
  },

  create(context) {
    const options = context.options[0] || {};
    const allowedColors = options.allowedColors || [
      'transparent',
      'inherit',
      'currentColor',
      'none',
      'unset',
      'initial',
    ];
    const allowGrey = options.allowGrey !== false;

    // 色に関連するプロパティ名
    const colorProperties = new Set([
      'color',
      'backgroundColor',
      'bgcolor',
      'background',
      'borderColor',
      'borderTopColor',
      'borderRightColor',
      'borderBottomColor',
      'borderLeftColor',
      'outlineColor',
      'textDecorationColor',
      'fill',
      'stroke',
      'stopColor',
      'floodColor',
      'lightingColor',
      'caretColor',
      'columnRuleColor',
      'accentColor',
    ]);

    // HEXカラーのパターン（#xxx, #xxxxxx, #xxxxxxxx）
    const hexColorPattern = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;

    // rgb/rgba/hsl/hsla のパターン
    const functionalColorPattern = /^(rgb|rgba|hsl|hsla)\s*\(/i;

    // MUI のパレットカラーパターン（許可）
    const muiPalettePattern = /^(primary|secondary|error|warning|info|success|text|background|action|divider|common)\./;

    // grey.xxx パターン（条件付き許可）
    const greyPattern = /^grey\./;

    /**
     * 値が許可されているかチェック
     */
    function isAllowedValue(value) {
      if (typeof value !== 'string') return true;

      // 空文字列は許可
      if (value === '') return true;

      // 明示的に許可されている値
      if (allowedColors.includes(value.toLowerCase())) return true;

      // MUI パレットカラーは許可
      if (muiPalettePattern.test(value)) return true;

      // grey.xxx は条件付き許可
      if (allowGrey && greyPattern.test(value)) return true;

      // HEXカラーは禁止
      if (hexColorPattern.test(value)) return false;

      // rgb/rgba/hsl/hsla は禁止
      if (functionalColorPattern.test(value)) return false;

      // その他は許可（変数参照など）
      return true;
    }

    /**
     * プロパティ名が色関連かどうかチェック
     */
    function isColorProperty(node) {
      if (!node.key) return false;

      let propertyName = null;

      if (node.key.type === 'Identifier') {
        propertyName = node.key.name;
      } else if (node.key.type === 'Literal' && typeof node.key.value === 'string') {
        propertyName = node.key.value;
      }

      return propertyName && colorProperties.has(propertyName);
    }

    /**
     * 値をチェックしてエラーを報告
     */
    function checkColorValue(node, value) {
      if (!isAllowedValue(value)) {
        context.report({
          node,
          messageId: 'noHardcodedColor',
          data: { value },
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
            checkColorValue(node, node.value);
          }
          break;

        case 'TemplateLiteral':
          // テンプレートリテラルのquasisをチェック
          node.quasis.forEach((quasi) => {
            if (quasi.value && quasi.value.cooked) {
              // テンプレートリテラル内のHEX値をチェック
              if (hexColorPattern.test(quasi.value.cooked.trim())) {
                checkColorValue(quasi, quasi.value.cooked);
              }
            }
          });
          break;

        case 'ConditionalExpression':
          checkValue(node.consequent);
          checkValue(node.alternate);
          break;

        case 'LogicalExpression':
          checkValue(node.left);
          checkValue(node.right);
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
        if (isColorProperty(node)) {
          checkValue(node.value);
        }
      },
    };
  },
};
