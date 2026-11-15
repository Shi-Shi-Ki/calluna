あなたは仕様書からケース表とテストを作る担当です。CLAUDE.md の「ケース表のルール」に従ってください。

入力:
- 仕様（Issue本文とコメント）: {{ISSUE_FILE}}
- Issue番号: {{ISSUE_NUMBER}}
- テストの実行コマンド: {{TEST_COMMAND}}

手順:
1. 仕様を読み、曖昧な点を「ブロッカー」と「仮定」に分ける。Issueのコメントにブロッカーへの回答があれば、それを仕様として扱う。
2. ブロッカーが1つでも残るなら、ファイルは作らずに `.specflow-out/result.json` に次を書いて終了する:
   {"status":"blocked","blockers":[{"id":"B1","question":"…","why":"期待結果が決まらない理由","options":["案A","案B"]}]}
3. ブロッカーがなければ:
   - `specs/{{ISSUE_NUMBER}}-<英小文字のslug>/cases.yaml` を作る（既存の specs/*/cases.yaml を書式の見本にする）。
   - `cases.yaml` を読み込む単体テストを `tests/` に作る。テスト名は `<ID> <title>`。
   - 実装対象のファイルに、シグネチャだけのスタブ（呼ぶと「未実装」で例外）を置く。実装はしない。
   - `{{TEST_COMMAND}}` を実行し、全ケースが「失敗」することを確認する（構文エラーで全体が落ちるのは不可）。
   - `.specflow-out/result.json` に次を書く:
     {"status":"ready","spec_dir":"specs/…","summary":"…","automation":[{"item":"…","how":"機械|人","reason":"…","cost":"準備コストの目安"}]}
4. 最後に、作ったケース数、仮定、人が確認する項目を3〜6行で報告する。
