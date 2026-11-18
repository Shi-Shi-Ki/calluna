// 仕様: Issue #1  https://github.com/<owner>/<repo>/issues/1
// ケース表: specs/1-overdue-reminder/cases.md（正本は cases.yaml）
// このファイルは「合意したケース表を実行できる形にしたもの」。実装フェーズでは変更しない。
import { createRequire } from 'node:module';
import { describe, test, expect } from 'vitest';
import { loadCases, ymd } from './helpers/cases.mjs';

// GAS のコードは import/export なしで書くので、Node の require で読む（末尾の module.exports ガード）
const require = createRequire(import.meta.url);
const { buildOverdueList, runOverdueReminder } = require('../src/overdue.js');

const cases = loadCases('1-overdue-reminder');

describe('#1 期限切れの未処理申請を督促リストに出す', () => {
  test.each(cases)('$name', ({ input, expected }) => {
    const result = buildOverdueList(input.sheet, input.today);

    if (expected.error) {
      expect(result).toMatchObject({ ok: false, code: expected.error });
      // 異常時は「何も書かずに止める」: アダプターでも書き込みが起きないことを確かめる
      const fake = fakeSpreadsheet(input.sheet);
      expect(() => runOverdueReminder(fake, input.today)).toThrow(expected.error);
      expect(fake.writes).toEqual([]);
    } else {
      expect(result.ok).toBe(true);
      expect(result.rows.map(([id, who, due, days]) => [id, who, ymd(due), days])).toEqual(expected.rows);
    }
  });
});

// 外部（SpreadsheetApp）はすべて偽物。書き込みは writes に記録するだけ。
function fakeSpreadsheet(values) {
  const writes = [];
  const out = {
    clearContents: () => writes.push('clear'),
    getRange: () => ({ setValues: (v) => writes.push(v) }),
  };
  const src = { getDataRange: () => ({ getValues: () => values }) };
  return {
    writes,
    getSheetByName: (n) => ({ 申請一覧: src, 督促リスト: out })[n] ?? null,
  };
}
