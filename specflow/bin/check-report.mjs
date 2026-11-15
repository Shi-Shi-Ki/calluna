#!/usr/bin/env node
// テスト結果（JUnit XML）とケース表（specs/*/cases.yaml）を突き合わせる。言語に依存しない。
//
//   node specflow/bin/check-report.mjs --junit reports/junit.xml [--red-from origin/main] [--red specs/1-foo]
//
// 実装前（Red）のケース: 全ケースにテストがあり、すべて「失敗」していること。
//   --red-from <ref> : その ref と比べて追加・変更されたケースを Red とみなす（ケース表PRのCI用）
//   --red <dir>      : その仕様のケースをすべて Red とみなす（手元での確認用）
// それ以外のケース : 全ケースにテストがあり、すべて「成功」していること。
// 共通             : ケース表にない TC ID のテストがないこと（表とテストの1対1対応）。
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { isDeepStrictEqual } from 'node:util';
import YAML from 'yaml';

const args = process.argv.slice(2);
const junitPaths = [];
const redDirs = new Set();
let redFrom = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--junit') junitPaths.push(args[++i]);
  else if (args[i] === '--red') redDirs.add(path.basename(args[++i]));
  else if (args[i] === '--red-from') redFrom = args[++i];
}
if (!junitPaths.length) {
  console.error('使い方: check-report.mjs --junit <file> [--junit <file>] [--red specs/<dir>]');
  process.exit(2);
}

// 1. ケース表を読む
const SPECS = path.join(process.cwd(), 'specs');
const caseDir = new Map(); // TC ID -> spec dir
const redIds = new Set();
for (const dir of fs.readdirSync(SPECS)) {
  const f = path.join(SPECS, dir, 'cases.yaml');
  if (!fs.existsSync(f)) continue;
  const base = redFrom ? baseCases(`specs/${dir}/cases.yaml`) : new Map();
  for (const c of YAML.parse(fs.readFileSync(f, 'utf8')).cases ?? []) {
    caseDir.set(c.id, dir);
    if (redDirs.has(dir) || (redFrom && !isDeepStrictEqual(base.get(c.id), c))) redIds.add(c.id);
  }
}
for (const d of redDirs) if (![...caseDir.values()].includes(d)) fail(`--red に指定した specs/${d} にケースがありません`);

function baseCases(rel) {
  try {
    const text = execFileSync('git', ['show', `${redFrom}:${rel}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return new Map((YAML.parse(text).cases ?? []).map((c) => [c.id, c]));
  } catch {
    return new Map(); // base に無い = 新しい仕様
  }
}

// 2. JUnit XML を読む（Vitest / Jest / PHPUnit / Pestで共通の最小部分だけ）
const results = new Map(); // TC ID -> [status]
const others = [];
const decode = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
for (const p of junitPaths) {
  const xml = fs.readFileSync(p, 'utf8');
  const re = /<testcase\b([^>]*?)(\/>|>([\s\S]*?)<\/testcase>)/g;
  for (const m of xml.matchAll(re)) {
    const attrs = Object.fromEntries([...m[1].matchAll(/([\w:-]+)="([^"]*)"/g)].map((a) => [a[1], decode(a[2])]));
    const body = m[3] ?? '';
    const status = /<(failure|error)\b/.test(body) ? 'fail' : /<skipped\b/.test(body) ? 'skip' : 'pass';
    const label = `${attrs.classname ?? ''} ${attrs.name ?? ''}`;
    const ids = [...new Set(label.match(/\bTC\d+-\d{2,3}\b/g) ?? [])];
    if (!ids.length) others.push({ label: label.trim(), status });
    for (const id of ids) results.set(id, [...(results.get(id) ?? []), status]);
  }
}

// 3. 突き合わせ
const errors = [];
const warnings = [];
const rows = [];
for (const [id, dir] of caseDir) {
  const st = results.get(id) ?? [];
  const red = redIds.has(id);
  const want = red ? 'fail' : 'pass';
  let verdict = 'OK';
  if (!st.length) { verdict = 'テストなし'; errors.push(`${id}（specs/${dir}）: 対応するテストがありません`); }
  else if (st.includes('skip')) { verdict = 'スキップ'; errors.push(`${id}: スキップされています。ケースを外すならケース表から外してください`); }
  else if (!st.every((s) => s === want)) {
    verdict = red ? '実装前に成功' : '失敗';
    errors.push(red
      ? `${id}: 実装前なのに成功しています。テストが仕様を検証できていない可能性があります`
      : `${id}: 失敗しています`);
  }
  rows.push(`| ${id} | specs/${dir} | ${red ? '実装前（失敗が正）' : '実装後（成功が正）'} | ${st.join(', ') || '-'} | ${verdict} |`);
}
for (const id of results.keys()) if (!caseDir.has(id)) errors.push(`${id}: ケース表にない ID のテストがあります`);
for (const o of others) {
  if (o.status === 'fail') (redIds.size ? warnings : errors).push(`ケース表に紐づかないテストが失敗: ${o.label}`);
}

const summary = [
  '### ケース表とテスト結果の突き合わせ', '',
  '| ID | 仕様 | 期待 | 結果 | 判定 |', '| --- | --- | --- | --- | --- |', ...rows, '',
  ...errors.map((e) => `- ❌ ${e}`), ...warnings.map((w) => `- ⚠️ ${w}`),
  errors.length ? '' : '- ✅ すべてのケースが期待どおりです', '',
].join('\n');
console.log(summary);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary + '\n');
if (errors.length) process.exit(1);

function fail(msg) { console.error(`::error::${msg}`); process.exit(1); }
