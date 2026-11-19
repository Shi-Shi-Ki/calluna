#!/usr/bin/env node
// specs/*/cases.yaml を検証し、人がレビューする cases.md を生成する。
//   node specflow/bin/render-cases.mjs           生成して書き込む
//   node specflow/bin/render-cases.mjs --check   検証のみ。cases.md が古ければ失敗（CI用）
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

const CHECK = process.argv.includes('--check');
const ROOT = process.cwd();
const SPECS = path.join(ROOT, 'specs');
const ID = { case: /^TC\d+-\d{2,3}$/, assumption: /^A\d+-\d+$/, manual: /^M\d+-\d{2,3}$/ };
const VIEWPOINTS = ['正常', '空の値', '重複', '境界値', '異常値', 'シートの破損', '権限', '同時実行', 'その他'];
const REQUIRED = ['id', 'spec_ref', 'viewpoint', 'title', 'given', 'when', 'then', 'expected'];

const errors = [];
const seenIds = new Map();
let stale = 0;

for (const dir of fs.existsSync(SPECS) ? fs.readdirSync(SPECS).sort() : []) {
  const yamlPath = path.join(SPECS, dir, 'cases.yaml');
  if (!fs.existsSync(yamlPath)) continue;
  const rel = path.relative(ROOT, yamlPath);
  let doc;
  try {
    doc = YAML.parse(fs.readFileSync(yamlPath, 'utf8'));
  } catch (e) {
    errors.push(`${rel}: YAMLとして読めません: ${e.message}`);
    continue;
  }
  validate(doc, rel);
  const md = render(doc, dir);
  const mdPath = path.join(SPECS, dir, 'cases.md');
  const current = fs.existsSync(mdPath) ? fs.readFileSync(mdPath, 'utf8') : '';
  if (current !== md) {
    if (CHECK) { stale++; errors.push(`${path.relative(ROOT, mdPath)}: cases.yaml と一致しません。npm run cases:render を実行してください`); }
    else { fs.writeFileSync(mdPath, md); console.log(`生成: ${path.relative(ROOT, mdPath)}`); }
  }
}

if (errors.length) {
  console.error(errors.map((e) => `::error::${e}`).join('\n'));
  process.exit(1);
}
console.log(CHECK ? 'ケース表の検証: OK' : 'ケース表の生成: 完了');

function validate(doc, rel) {
  const issueNo = String(doc?.spec ?? '').match(/^#(\d+)$/)?.[1];
  if (!issueNo) errors.push(`${rel}: spec は "#<Issue番号>" の形式で書いてください`);
  if (!Array.isArray(doc?.cases) || doc.cases.length === 0) errors.push(`${rel}: cases が空です`);
  const check = (kind, list) => (list ?? []).forEach((item, i) => {
    const where = `${rel}: ${kind}[${i}]`;
    if (!ID[kind].test(item.id ?? '')) errors.push(`${where}: id "${item.id}" の形式が不正です`);
    else if (issueNo && item.id.match(/\d+/)[0] !== issueNo) errors.push(`${where}: id "${item.id}" に Issue番号 ${issueNo} を含めてください`);
    if (seenIds.has(item.id)) errors.push(`${where}: id "${item.id}" が ${seenIds.get(item.id)} と重複しています`);
    seenIds.set(item.id, rel);
  });
  check('case', doc?.cases);
  check('assumption', doc?.assumptions);
  check('manual', doc?.manual_checks);
  const caseIds = new Set((doc?.cases ?? []).map((c) => c.id));
  const hasBoundaryCase = (doc?.cases ?? []).some((c) => c.viewpoint === '境界値');
  if (hasBoundaryCase && !(doc?.boundaries ?? []).length) errors.push(`${rel}: 観点「境界値」のケースがあるのに boundaries がありません`);
  (doc?.boundaries ?? []).forEach((b, i) => {
    const where = `${rel}: boundaries[${i}]`;
    if (!b.name) errors.push(`${where}: name がありません`);
    if (!Array.isArray(b.points) || b.points.length < 2) errors.push(`${where}: points は2点以上（日付・数量は「すぐ内側・ちょうど・すぐ外側」の3点）にしてください`);
    for (const pt of b.points ?? []) {
      if (!pt.value) errors.push(`${where}: points に value がありません`);
      if (!caseIds.has(pt.case)) errors.push(`${where}: 「${pt.value}」のケース "${pt.case}" が cases にありません`);
    }
  });
  (doc?.cases ?? []).forEach((c) => {
    for (const k of REQUIRED) if (c[k] === undefined || c[k] === '') errors.push(`${rel}: ${c.id}: ${k} がありません`);
    if (c.viewpoint && !VIEWPOINTS.includes(c.viewpoint)) errors.push(`${rel}: ${c.id}: viewpoint "${c.viewpoint}" は ${VIEWPOINTS.join(' / ')} のいずれか`);
  });
}

function cell(v) {
  return String(v ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
}

function render(doc, dir) {
  const L = [];
  L.push(`<!-- 自動生成: specs/${dir}/cases.yaml から。直接編集しないでください -->`);
  L.push(`# ケース表: ${doc.title ?? dir}`, '');
  L.push(`- 仕様: ${doc.spec}`);
  if (doc.risk) L.push(`- リスク: ${doc.risk}`);
  if (doc.target) L.push(`- 対象: \`${doc.target}\``);
  L.push('');
  if (doc.assumptions?.length) {
    L.push('## 仮定（AIが選んだ解釈。承認すると仕様の一部になります）', '');
    for (const a of doc.assumptions) L.push(`- **${a.id}** ${a.text}`);
    L.push('');
  }
  if (doc.boundaries?.length) {
    L.push('## 境界の一覧（見落としがないかを確認してください）', '');
    L.push('| 境界 | 確認する値 → ケース |');
    L.push('| --- | --- |');
    for (const b of doc.boundaries) L.push(`| ${cell(b.name)} | ${b.points.map((p) => `${cell(p.value)} → ${cell(p.case)}`).join('<br>')} |`);
    L.push('');
  }
  L.push('## 機械で判定するケース', '');
  L.push('| ID | 仕様の該当箇所 | 観点 | 前提 | 操作 | 期待結果 |');
  L.push('| --- | --- | --- | --- | --- | --- |');
  for (const c of doc.cases ?? []) {
    L.push(`| ${cell(c.id)} | ${cell(c.spec_ref)} | ${cell(c.viewpoint)} | ${cell(c.given)} | ${cell(c.when)} | ${cell(c.then)} |`);
  }
  L.push('');
  const counts = {};
  for (const c of doc.cases ?? []) counts[c.viewpoint] = (counts[c.viewpoint] ?? 0) + 1;
  const missing = VIEWPOINTS.filter((v) => v !== 'その他' && v !== '正常' && !counts[v]);
  L.push(`観点の内訳: ${Object.entries(counts).map(([k, n]) => `${k} ${n}`).join('、')}`);
  if (missing.length) L.push(`ケースがない観点: ${missing.join('、')}（対象外なら理由を仕様の「保証しない範囲」に）`);
  L.push('');
  if (doc.manual_checks?.length) {
    L.push('## 人が確認する項目', '');
    L.push('| ID | 確認すること | いつ |');
    L.push('| --- | --- | --- |');
    for (const m of doc.manual_checks) L.push(`| ${cell(m.id)} | ${cell(m.item)} | ${cell(m.when)} |`);
    L.push('');
  }
  return L.join('\n');
}
