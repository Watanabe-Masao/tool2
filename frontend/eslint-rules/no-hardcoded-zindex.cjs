/**
 * ESLint Rule: no-hardcoded-zindex
 *
 * z-indexにハードコードされた数値を使用することを禁止し、
 * 定数（MODAL_Z_INDEX, LAYER_Z_INDEX, zIndex関数）の使用を強制します。
 *
 * AIによるコーディング時の事故を防ぐためのルールです。
 *
 * @example
 * // NG: ハードコードされたz-index
 * sx={{ zIndex: 1300 }}
 * style={{ zIndex: 1000 }}
 *
 * // OK: 定数を使用
 * sx={{ zIndex: MODAL_Z_INDEX.PAGE_MODAL }}
 * sx={{ zIndex: zIndex('PAGE_MODAL') }}
 * sx={{ zIndex: LAYER_Z_INDEX.HEADER }}
 */

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'z-indexにハードコードされた数値の使用を禁止',
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
            items: { type: 'number' },
            description: '許可するz-index値のリスト（例: [1, 10]など小さい値）',
          },
          maxAllowedValue: {
            type: 'number',
            description: 'この値以下のz-indexは許可（デフォルト: 100）',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      noHardcodedZIndex:
        'z-indexにハードコードされた数値 "{{value}}" を使用しないでください。' +
        '代わりに @/constants/zIndex の定数（MODAL_Z_INDEX, LAYER_Z_INDEX, zIndex関数）を使用してください。',
    },
  },

  create(context) {
    const options = context.options[0] || {};
    const allowedValues = options.allowedValues || [];
    const maxAllowedValue = options.maxAllowedValue ?? 100;

    /**
     * 値がz-indexとして許可されているかチェック
     */
    function isAllowedValue(value) {
      if (typeof value !== 'number') return true;
      if (allowedValues.includes(value)) return true;
      if (value <= maxAllowedValue) return true;
      return false;
    }

    /**
     * プロパティ名がz-indexかどうかチェック
     */
    function isZIndexProperty(node) {
      if (!node.key) return false;

      // オブジェクトプロパティの場合
      if (node.key.type === 'Identifier') {
        return node.key.name === 'zIndex';
      }

      // 文字列キーの場合
      if (node.key.type === 'Literal' && typeof node.key.value === 'string') {
        return node.key.value === 'zIndex' || node.key.value === 'z-index';
      }

      return false;
    }

    /**
     * 数値リテラルをチェック
     */
    function checkNumericLiteral(node, value) {
      if (!isAllowedValue(value)) {
        context.report({
          node,
          messageId: 'noHardcodedZIndex',
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
          if (typeof node.value === 'number') {
            checkNumericLiteral(node, node.value);
          }
          break;

        case 'UnaryExpression':
          // -100 などの負数
          if (node.operator === '-' && node.argument.type === 'Literal') {
            checkNumericLiteral(node, -node.argument.value);
          }
          break;

        case 'ConditionalExpression':
          // condition ? value1 : value2
          checkValue(node.consequent);
          checkValue(node.alternate);
          break;

        case 'LogicalExpression':
          // value1 || value2
          checkValue(node.left);
          checkValue(node.right);
          break;

        // 以下は許可（定数参照、関数呼び出しなど）
        case 'Identifier':
        case 'MemberExpression':
        case 'CallExpression':
        case 'TemplateLiteral':
        case 'ArrowFunctionExpression':
        case 'FunctionExpression':
          // これらは定数や関数を使っているので OK
          break;

        default:
          // その他のケースは無視
          break;
      }
    }

    return {
      // オブジェクトプロパティをチェック（sx={{ zIndex: 1300 }}）
      Property(node) {
        if (isZIndexProperty(node)) {
          checkValue(node.value);
        }
      },

      // JSXスタイル属性をチェック（style={{ zIndex: 1300 }}）
      JSXAttribute(node) {
        if (
          node.name &&
          node.name.type === 'JSXIdentifier' &&
          node.name.name === 'style'
        ) {
          // style属性内のzIndexをチェック
          if (
            node.value &&
            node.value.type === 'JSXExpressionContainer' &&
            node.value.expression.type === 'ObjectExpression'
          ) {
            node.value.expression.properties.forEach((prop) => {
              if (prop.type === 'Property' && isZIndexProperty(prop)) {
                checkValue(prop.value);
              }
            });
          }
        }
      },
    };
  },
};
