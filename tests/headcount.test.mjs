// 仕様: Issue #2
// ケース表: specs/2-headcount-by-department/cases.md（正本は cases.yaml）
// このファイルは「合意したケース表を実行できる形にしたもの」。実装フェーズでは変更しない。
import { createRequire } from 'node:module';
import { describe, test, expect } from 'vitest';
import { loadCases } from './helpers/cases.mjs';

const require = createRequire(import.meta.url);
const { buildHeadcount, runHeadcount } = require('../src/headcount.js');

const cases = loadCases('2-headcount-by-department');

describe('#2 部署ごとの在籍人数を集計する', () => {
  test.each(cases)('$name', ({ input, expected }) => {
    const result = buildHeadcount(input.sheet, input.today);
    const fake = fakeSpreadsheet(input.sheet);

    if (expected.error) {
      expect(result).toMatchObject({ ok: false, code: expected.error });
      // 異常時は「何も書かずに止める」: アダプターでも書き込みが起きないことを確かめる
      expect(() => runHeadcount(fake, input.today)).toThrow(expected.error);
      expect(fake.writes).toEqual([]);
    } else {
      expect(result.ok).toBe(true);
      expect(result.rows).toEqual(expected.rows);
      // 「クリアして書き直し」: クリア → 見出し + 集計結果を書く
      runHeadcount(fake, input.today);
      expect(fake.writes).toEqual(['clear', [['部署', '人数'], ...expected.rows]]);
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
    getSheetByName: (n) => ({ 名簿: src, 部署別人数: out })[n] ?? null,
  };
}
