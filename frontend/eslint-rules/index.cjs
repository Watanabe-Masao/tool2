/**
 * カスタムESLintルールプラグイン
 *
 * AIによるコーディング時の事故を防ぐためのルール集
 */

const noHardcodedZIndex = require('./no-hardcoded-zindex.cjs');

module.exports = {
  rules: {
    'no-hardcoded-zindex': noHardcodedZIndex,
  },
};
