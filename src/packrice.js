/**
 * パックライス予約: 拠点ごとの予約一覧・上限通知・アラートを決める純粋関数。
 * 仕様: Issue #9 / ケース表: specs/9-packed-rice-reservation/cases.md
 *
 * clasp でも動くように import/export は使わない。
 * 末尾の module.exports は Node（テスト）でだけ有効になり、GAS では無視される。
 */

/**
 * @param {Array<Array<*>>} masterValues 管理シート（先頭行がヘッダー）
 * @param {Array<Array<*>>} responseValues フォーム回答シート（先頭行がヘッダー）
 * @param {string[]} channels 存在する Slack チャンネル名
 * @return {{ok: true, sites: Array<{name: string, rows: Array<Array<*>>, notify: (string|null)}>, alerts: Array<{code: string, row: number}>} | {ok: false, code: string, message: string}}
 */
function buildReservationPlan(masterValues, responseValues, channels) {
  throw new Error('未実装: buildReservationPlan');
}

/**
 * フォームのプルダウンの選択肢を管理シートの拠点名から作る。
 * @param {Array<Array<*>>} masterValues
 * @return {{ok: true, choices: string[]} | {ok: false, code: string, message: string}}
 */
function buildFloorChoices(masterValues) {
  throw new Error('未実装: buildFloorChoices');
}

/**
 * 日付ごとに作る集計スプレッドシートのタイトル。
 * @param {string} today 'YYYY-MM-DD'
 * @return {string}
 */
function reservationSheetTitle(today) {
  throw new Error('未実装: reservationSheetTitle');
}

if (typeof module !== 'undefined') {
  module.exports = { buildReservationPlan: buildReservationPlan, buildFloorChoices: buildFloorChoices, reservationSheetTitle: reservationSheetTitle };
}
