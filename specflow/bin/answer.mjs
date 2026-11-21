#!/usr/bin/env node
// claude-code-action の実行ログ（execution_file）から、AI の最終回答の本文を取り出す（/ask 用）。
import fs from 'node:fs';

const file = process.argv[2];
if (!file || !fs.existsSync(file)) process.exit(0);
let log = JSON.parse(fs.readFileSync(file, 'utf8'));
if (!Array.isArray(log)) log = [log];
const r = log.filter((m) => m && m.type === 'result').at(-1);
let text = typeof r?.result === 'string' ? r.result.trim() : '';
if (!text) {
  // 最大ターン数で止まった場合などは result が空になる。最後のアシスタントの文章を使う。
  const last = log.filter((m) => m?.type === 'assistant').at(-1);
  text = (last?.message?.content ?? []).filter((c) => c.type === 'text').map((c) => c.text).join('\n').trim();
}
if (text) console.log(text);
