/**
 * 部署ごとの在籍人数を集計する。
 * 仕様: Issue #2 / ケース表: specs/2-headcount-by-department/cases.md
 *
 * clasp 2.x（ts2gas）でも動くように import/export は使わない。
 * 末尾の module.exports は Node（テスト）でだけ有効になり、GAS では無視される。
 */

/**
 * 純粋関数。名簿の getValues() の2次元配列を受け取り、部署別人数の行を返す。
 * @param {Array<Array<*>>} values 先頭行がヘッダー
 * @param {string} today 基準日 'YYYY-MM-DD'
 * @return {{ok: true, rows: Array<Array<*>>} | {ok: false, code: string, message: string}}
 */
function buildHeadcount(values, today) {
  throw new Error('未実装: buildHeadcount');
}

/**
 * 薄いアダプター。名簿を読み、純粋関数に渡し、成功したときだけ書く。
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {string} today 'YYYY-MM-DD'
 */
function runHeadcount(ss, today) {
  throw new Error('未実装: runHeadcount');
}

if (typeof module !== 'undefined') {
  module.exports = { buildHeadcount: buildHeadcount, runHeadcount: runHeadcount };
}
