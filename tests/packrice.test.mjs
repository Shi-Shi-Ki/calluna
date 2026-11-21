// 仕様: Issue #9  ケース表: specs/9-packed-rice-reservation/cases.md（正本は cases.yaml）
// このファイルは「合意したケース表を実行できる形にしたもの」。実装フェーズでは変更しない。
import { createRequire } from 'node:module';
import { describe, test, expect } from 'vitest';
import { loadCases } from './helpers/cases.mjs';

const require = createRequire(import.meta.url);
const { buildReservationPlan, buildFloorChoices, reservationSheetTitle } = require('../src/packrice.js');

const cases = loadCases('9-packed-rice-reservation');

describe('#9 パックライスの予約一覧', () => {
  test.each(cases)('$name', ({ input, expected }) => {
    if (input.fn === 'title') {
      expect(reservationSheetTitle(input.today)).toBe(expected.title);
      return;
    }
    const result = input.fn === 'choices'
      ? buildFloorChoices(input.master)
      : buildReservationPlan(input.master, input.responses, input.channels);

    if (expected.error) {
      expect(result).toMatchObject({ ok: false, code: expected.error });
      return;
    }
    expect(result.ok).toBe(true);
    if (input.fn === 'choices') {
      expect(result.choices).toEqual(expected.choices);
    } else {
      expect(result.sites).toEqual(expected.sites);
      expect(result.alerts).toEqual(expected.alerts);
    }
  });
});
