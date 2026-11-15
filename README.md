# calluna — specflow（仕様書駆動のテスト合意フロー）

GitHub Issue の日本語の仕様から、AI がケース表とテストを作り、人がケース表を承認したら AI が実装する。
人は「何が正しいか」を決めて最終判断だけをする。設計の背景は設計書（Claude Docs）を参照。

## 流れ

| # | 人がすること | 自動で起きること |
|---|---|---|
| 1 | Issue テンプレート「仕様書」で仕様を書き、`/cases` とコメント | AI が曖昧な点を確認。ブロッカーがあれば質問を返して止まる（ラベル `spec:blocked`） |
| 2 | （ブロッカーがあれば）Issue に回答して、もう一度 `/cases` | AI が `specs/<番号>-<slug>/cases.yaml`・テスト・スタブを作り、ケース表PRを開く |
| 3 | PR の `cases.md` を読む。良ければラベル `cases:approved` | CI が「全ケースが一度失敗する」ことを確認済みなら、承認タグ `specflow/approved/pr-<番号>` を記録 |
| 4 | `/implement` とコメント | AI が実装を push。`specs/` `tests/` は hook で変更不可。CI が全ケース成功と、承認後に合意済みファイルが変わっていないことを検査 |
| 5 | 差分を見て、`cases.md` の「人が確認する項目」を検証用環境で確認し、マージ | — |

## ファイル

| パス | 役割 |
|---|---|
| `.github/ISSUE_TEMPLATE/spec.yml` | 仕様書テンプレート |
| `.github/workflows/specflow-cases.yml` | `/cases`：ブロッカー質問 or ケース表PR |
| `.github/workflows/specflow-approve.yml` | `cases:approved`：権限とRed確認をチェックして承認タグを記録 |
| `.github/workflows/specflow-implement.yml` | `/implement`：実装して同じPRに push |
| `.github/workflows/specflow-ci.yml` | 必須チェック `verify`：表とテストの1対1、Red/Green、ロック検査 |
| `.github/actions/specflow-setup` | `specflow.config.json` に従い Node / PHP を準備 |
| `specflow.config.json` | 言語ごとの差（テストコマンド、JUnit XML の場所）をここだけに置く |
| `specflow/bin/render-cases.mjs` | `cases.yaml` の検証と `cases.md` の生成（`--check` でCI用） |
| `specflow/bin/check-report.mjs` | JUnit XML とケース表の突き合わせ（言語非依存） |
| `specflow/bin/usage.mjs` | AIのターン数・所要時間・API換算額をコメントに添える |
| `specflow/bin/leadtime.sh` | Issue作成〜マージのリードタイムを GitHub の記録から出す |
| `specflow/prompts/*.md` | `/cases` と `/implement` のプロンプト |
| `CLAUDE.md` / `.claude/settings.json` / `.claude/hooks/guard-cases.sh` | ルールと hook（VS Code でも CI でも同じものが効く） |
| `.github/CODEOWNERS` | `specs/` `tests/` `.claude/` `.github/` の変更に人の承認を必須に |
| `specs/1-overdue-reminder/` `src/overdue.js` `tests/` | GAS の見本（期限切れ申請の督促リスト、9ケース） |
| `metrics/poc-log.csv` | 人の時間と費用の記録表 |

## 初期設定（リポジトリ作成後）

1. Secrets: `CLAUDE_CODE_OAUTH_TOKEN`（Team シートで `claude setup-token`）、`SPECFLOW_APP_PRIVATE_KEY`
2. Variables: `SPECFLOW_APP_ID`、任意で `SPECFLOW_MODEL`
3. GitHub App（無料）を作成して対象リポジトリにインストール。権限: Contents / Issues / Pull requests を Read and write
4. ラベル: `spec` `spec:blocked` `cases:review` `cases:approved`
5. ルールセット（main）: PR必須、必須チェック `verify`、Code Owners のレビュー必須。タグ `specflow/approved/*` は作成・削除を Actions と管理者に限定
6. `anthropics/claude-code-action@v1` などの外部 Action をコミットSHAで固定

## 手元での確認

```bash
npm ci
npm test                                   # 見本の9ケースが通る（Vitest）
node specflow/bin/render-cases.mjs --check # cases.md が cases.yaml と一致するか
npm run test:ci && node specflow/bin/check-report.mjs --junit reports/junit.xml
```
