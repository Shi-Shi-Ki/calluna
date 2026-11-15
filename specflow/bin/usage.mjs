#!/usr/bin/env node
// claude-code-action の実行ログ（execution_file）から、ターン数・所要時間・API換算の金額を1行にする。
// Team プランの OAuth トークンでは従量の請求は発生しない。金額は「APIで同じことをした場合」の参考値で、
// 社内ツールとの比較や、シートの利用上限をどれだけ使ったかの目安に使う。
import fs from 'node:fs';

const file = process.argv[2];
if (!file || !fs.existsSync(file)) process.exit(0);
let log = JSON.parse(fs.readFileSync(file, 'utf8'));
if (!Array.isArray(log)) log = [log];
const r = log.filter((m) => m && m.type === 'result').at(-1);
if (!r) process.exit(0);
const min = r.duration_ms != null ? (r.duration_ms / 60000).toFixed(1) : '?';
const usd = typeof r.total_cost_usd === 'number' ? r.total_cost_usd.toFixed(2) : '?';
console.log(`<sub>specflow: ターン ${r.num_turns ?? '?'} / AI所要 ${min}分 / API換算 $${usd}（Teamプランでは請求なし・参考値）</sub>`);
