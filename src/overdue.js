/**
 * 期限切れの未処理申請を督促リストに出す。
 * 仕様: Issue #1 / ケース表: specs/1-overdue-reminder/cases.md
 *
 * clasp 2.x（ts2gas）でも動くように import/export は使わない。
 * 末尾の module.exports は Node（テスト）でだけ有効になり、GAS では無視される。
 */

var OVERDUE_SOURCE_SHEET = '申請一覧';
var OVERDUE_OUTPUT_SHEET = '督促リスト';
var OVERDUE_REQUIRED_HEADERS = ['申請ID', '申請者', '期限', 'ステータス'];
var OVERDUE_OUTPUT_HEADERS = ['申請ID', '申請者', '期限', '超過日数'];

/**
 * 純粋関数。シートの getValues() の2次元配列を受け取り、督促リストの行を返す。
 * @param {Array<Array<*>>} values 先頭行がヘッダー
 * @param {string} today 基準日 'YYYY-MM-DD'
 * @return {{ok: true, rows: Array<Array<*>>} | {ok: false, code: string, message: string}}
 */
function buildOverdueList(values, today) {
  var header = (values[0] || []).map(function (h) { return String(h).trim(); });
  var col = {};
  for (var i = 0; i < OVERDUE_REQUIRED_HEADERS.length; i++) {
    var name = OVERDUE_REQUIRED_HEADERS[i];
    var idx = header.indexOf(name);
    if (idx < 0) return fail_('HEADER_MISSING', '「' + name + '」列が見つかりません');
    col[name] = idx;
  }

  var todayDay = ymdToDayNumber_(today);
  var seen = {};
  var hits = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    if (row.every(function (v) { return v === '' || v === null; })) continue; // 仮定A1-3

    var id = String(row[col['申請ID']]);
    if (seen[id]) return fail_('DUPLICATE_ID', '申請ID ' + id + ' が重複しています（' + (r + 1) + '行目）');
    seen[id] = true;

    var due = row[col['期限']];
    if (!(due instanceof Date) || isNaN(due.getTime())) {
      return fail_('INVALID_VALUE', (r + 1) + '行目の期限が日付ではありません: ' + due); // 仮定A1-2
    }
    if (row[col['ステータス']] !== '未処理') continue;

    var overdueDays = todayDay - dateToDayNumber_(due);
    if (overdueDays > 0) hits.push([id, row[col['申請者']], due, overdueDays]); // 仮定A1-1
  }
  hits.sort(function (a, b) { return a[2].getTime() - b[2].getTime(); });
  return { ok: true, rows: hits };
}

/**
 * 薄いアダプター。シートを読み、純粋関数に渡し、成功したときだけ書く。
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {string} today 'YYYY-MM-DD'
 */
function runOverdueReminder(ss, today) {
  var src = ss.getSheetByName(OVERDUE_SOURCE_SHEET);
  var out = ss.getSheetByName(OVERDUE_OUTPUT_SHEET);
  if (!src || !out) throw new Error('シートが見つかりません: ' + OVERDUE_SOURCE_SHEET + ' / ' + OVERDUE_OUTPUT_SHEET);

  var result = buildOverdueList(src.getDataRange().getValues(), today);
  if (!result.ok) throw new Error('[' + result.code + '] ' + result.message); // 何も書かずに止める

  var data = [OVERDUE_OUTPUT_HEADERS].concat(result.rows);
  out.clearContents();
  out.getRange(1, 1, data.length, OVERDUE_OUTPUT_HEADERS.length).setValues(data);
  return result.rows.length;
}

/** GAS のエントリーポイント（時間主導トリガーから呼ぶ）。 */
function main() {
  var today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  runOverdueReminder(SpreadsheetApp.getActiveSpreadsheet(), today);
}

function fail_(code, message) { return { ok: false, code: code, message: message }; }
function ymdToDayNumber_(ymd) {
  var p = ymd.split('-').map(Number);
  return Date.UTC(p[0], p[1] - 1, p[2]) / 86400000;
}
function dateToDayNumber_(d) {
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000;
}

if (typeof module !== 'undefined') {
  module.exports = { buildOverdueList: buildOverdueList, runOverdueReminder: runOverdueReminder };
}
