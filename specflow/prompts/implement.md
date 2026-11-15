あなたは合意済みのケース表を満たす実装を書く担当です。.claude/rules/specflow.md に従ってください。

入力:
- ケース表: {{SPEC_DIR}}/cases.md（正本は cases.yaml）
- テストの実行コマンド: {{TEST_COMMAND}}

ルール:
- `specs/`、`tests/`、`.claude/`、`.github/`、`CLAUDE.md` は変更しない（変更しようとすると止まります）。
- `{{TEST_COMMAND}}` で全ケースが成功するまで実装を直す。テストを通すためだけの分岐（ケースIDや入力値での特別扱い）は書かない。
- ケース表が仕様と矛盾している、または実装できないと判断したら、無理に通さず `.specflow-out/result.json` に
  {"status":"objection","items":[{"case":"TC…","reason":"…"}]} を書いて終了する。
- 終わったら `.specflow-out/result.json` に {"status":"done","summary":"…"} を書き、変更点を3〜6行で報告する。
