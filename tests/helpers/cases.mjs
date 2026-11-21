// ケース表（specs/*/cases.yaml）を読み込み、テストに渡す共通ヘルパー。
// フィクスチャ内の {date: "YYYY-MM-DD"} は、getValues() が返すのと同じ Date に変換する。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const here = path.dirname(fileURLToPath(import.meta.url));

function revive(v) {
  if (Array.isArray(v)) return v.map(revive);
  if (v && typeof v === 'object') {
    const keys = Object.keys(v);
    if (keys.length === 1 && keys[0] === 'date') {
      // "YYYY-MM-DD" または "YYYY-MM-DD HH:mm"（セルに時刻が入っている場合）
      const [ds, ts = '0:0'] = v.date.split(' ');
      const [y, m, d] = ds.split('-').map(Number);
      const [hh, mm] = ts.split(':').map(Number);
      return new Date(y, m - 1, d, hh, mm); // スクリプトのタイムゾーン（TZ）のローカル日時
    }
    return Object.fromEntries(keys.map((k) => [k, revive(v[k])]));
  }
  return v;
}

export function loadCases(specDir) {
  const file = path.resolve(here, '../../specs', specDir, 'cases.yaml');
  const doc = YAML.parse(fs.readFileSync(file, 'utf8'));
  return doc.cases.map((c) => ({ ...c, input: revive(c.input), name: `${c.id} ${c.title}` }));
}

export const ymd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

