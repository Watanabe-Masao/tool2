/**
 * ESLint Rule: no-hardcoded-fontsize
 *
 * ハードコードされたフォントサイズを禁止し、テーマのタイポグラフィ設定を使用を強制します。
 *
 * AIによるコーディング時の事故を防ぐためのルールです。
 *
 * @example
 * // NG: ハードコードされたフォントサイズ
 * sx={{ fontSize: '16px' }}
 * sx={{ fontSize: '1.5rem' }}
 * style={{ fontSize: 14 }}
 *
 * // OK: テーマを使用
 * sx={{ fontSize: 'body1.fontSize' }}
 * sx={{ typography: 'h1' }}
 * variant="body1"
 *
 * // OK: レスポンシブ対応（オブジェクト形式）
 * sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
 */

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'ハードコードされたフォントサイズの使用を禁止',
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
            description: '許可するフォントサイズ値のリスト',
          },
          allowResponsive: {
            type: 'boolean',
            description: 'レスポンシブ対応のオブジェクト形式を許可（デフォルト: true）',
          },
          allowResponsiveConditional: {
            type: 'boolean',
            description: 'isMobile等のレスポンシブ条件式を許可（デフォルト: true）',
          },
          allowIconSizes: {
            type: 'boolean',
            description: 'アイコン用の数値サイズ（12-72）を許可（デフォルト: true）',
          },
          allowSmallRem: {
            type: 'boolean',
            description: '小さなrem値（≤1rem）を許可（デフォルト: true）',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      noHardcodedFontSize:
        'ハードコードされたフォントサイズ "{{value}}" を使用しないでください。' +
        '代わりに MUI の typography variant（例: variant="body1"）または ' +
        'theme.typography を使用してください。' +
        'レスポンシブ対応が必要な場合は sx={{ fontSize: { xs: "...", sm: "..." } }} 形式を使用してください。',
    },
  },

  create(context) {
    const options = context.options[0] || {};
    const allowedValues = options.allowedValues || ['inherit', 'unset', 'initial', '16px', '1rem'];
    const allowResponsive = options.allowResponsive !== false;
    const allowResponsiveConditional = options.allowResponsiveConditional !== false;
    const allowIconSizes = options.allowIconSizes !== false;
    const allowSmallRem = options.allowSmallRem !== false;

    // フォントサイズに関連するプロパティ名
    const fontSizeProperties = new Set(['fontSize']);

    // px/rem/em値のパターン
    const sizeValuePattern = /^[\d.]+\s*(px|rem|em|pt|%)$/i;

    // 数値のみのパターン（暗黙のpx）
    const numericPattern = /^\d+(\.\d+)?$/;

    /**
     * 値が許可されているかチェック
     */
    function isAllowedValue(value) {
      if (typeof value === 'number') {
        // 0は許可
        if (value === 0) return true;
        // アイコンサイズ（12-72）は許可
        if (allowIconSizes && value >= 12 && value <= 72) return true;
        return false;
      }

      if (typeof value !== 'string') return true;

      // 空文字列は許可
      if (value === '') return true;

      // 明示的に許可されている値
      if (allowedValues.includes(value.toLowerCase())) return true;

      // 小さなrem値（≤1.25rem、body/subtitle相当）は許可
      if (allowSmallRem) {
        const remMatch = value.match(/^([\d.]+)\s*rem$/i);
        if (remMatch) {
          const remValue = parseFloat(remMatch[1]);
          if (remValue <= 1.25) return true;
        }
      }

      // px/rem/em値は禁止
      if (sizeValuePattern.test(value)) return false;

      // 数値文字列も禁止
      if (numericPattern.test(value)) return false;

      // その他は許可（変数参照など）
      return true;
    }

    /**
     * プロパティ名がfontSize関連かどうかチェック
     */
    function isFontSizeProperty(node) {
      if (!node.key) return false;

      let propertyName = null;

      if (node.key.type === 'Identifier') {
        propertyName = node.key.name;
      } else if (node.key.type === 'Literal' && typeof node.key.value === 'string') {
        propertyName = node.key.value;
      }

      return propertyName && fontSizeProperties.has(propertyName);
    }

    /**
     * レスポンシブオブジェクトかどうかチェック
     * 例: { xs: '0.75rem', sm: '0.875rem' }
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
     * レスポンシブ条件式かどうかチェック
     * 例: isMobile ? '0.7rem' : '0.875rem'
     */
    function isResponsiveConditional(node) {
      if (node.type !== 'ConditionalExpression') return false;

      // 条件部分にレスポンシブ関連の識別子が含まれているかチェック
      const responsiveIdentifiers = new Set([
        'isMobile', 'isTablet', 'isDesktop', 'isSm', 'isMd', 'isLg', 'isXl',
        'mobile', 'tablet', 'desktop', 'smUp', 'mdUp', 'lgUp', 'xlUp',
        'smDown', 'mdDown', 'lgDown', 'xlDown',
      ]);

      function containsResponsiveIdentifier(testNode) {
        if (!testNode) return false;

        if (testNode.type === 'Identifier') {
          return responsiveIdentifiers.has(testNode.name);
        }
        if (testNode.type === 'UnaryExpression') {
          return containsResponsiveIdentifier(testNode.argument);
        }
        if (testNode.type === 'LogicalExpression' || testNode.type === 'BinaryExpression') {
          return containsResponsiveIdentifier(testNode.left) || containsResponsiveIdentifier(testNode.right);
        }
        return false;
      }

      return containsResponsiveIdentifier(node.test);
    }

    /**
     * 値をチェックしてエラーを報告
     */
    function checkFontSizeValue(node, value) {
      if (!isAllowedValue(value)) {
        context.report({
          node,
          messageId: 'noHardcodedFontSize',
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
          if (typeof node.value === 'string' || typeof node.value === 'number') {
            checkFontSizeValue(node, node.value);
          }
          break;

        case 'ObjectExpression':
          // レスポンシブオブジェクトは許可
          if (allowResponsive && isResponsiveObject(node)) {
            return;
          }
          break;

        case 'ConditionalExpression':
          // レスポンシブ条件式（isMobile ? 'small' : 'large'）は許可
          if (allowResponsiveConditional && isResponsiveConditional(node)) {
            return;
          }
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
        case 'TemplateLiteral':
          break;

        default:
          break;
      }
    }

    return {
      Property(node) {
        if (isFontSizeProperty(node)) {
          checkValue(node.value);
        }
      },
    };
  },
};
