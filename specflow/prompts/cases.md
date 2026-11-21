あなたは仕様書からケース表とテストを作る担当です。.claude/rules/specflow.md の「ケース表のルール」に従ってください。

入力:
- 仕様（Issue本文とコメント）: {{ISSUE_FILE}}
- Issue番号: {{ISSUE_NUMBER}}
- テストの実行コマンド: {{TEST_COMMAND}}

手順:
1. 仕様を読み、まず業務ルールの中の「比較」と「区切り」を境界として洗い出す（ルールの「境界値の作り方」）。
   次に、曖昧な点をルールの「ブロッカーと仮定の線引き」に従って分ける。境界ちょうどの扱いが仕様にも例にもなければブロッカー。
   Issueのコメントにブロッカーへの回答があれば、それを仕様として扱い、`decisions` に書く（`assumptions` には書かない）。
2. ブロッカーが1つでも残るなら、ファイルは作らずに `.specflow-out/result.json` に次を書いて終了する:
   {"status":"blocked","blockers":[{"id":"B1","question":"…","why":"期待結果が決まらない理由","options":["案A","案B"]}]}
3. ブロッカーがなければ:
   - `specs/{{ISSUE_NUMBER}}-<英小文字のslug>/cases.yaml` を作る（既存の specs/*/cases.yaml を書式の見本にする）。
     回答済みの点は `decisions: [{id: D<番号>-1, text: "…", source: "回答B1"}]` に書く。
     `boundaries` に洗い出した境界を全部書き、各境界の3点に対応するケースIDを `cases` に並べる。
     既にこの仕様の cases.yaml がある場合（2回目以降の /cases）は、それを直す。
   - `cases.yaml` を読み込む単体テストを `tests/` に作る。テスト名は `<ID> <title>`。
   - 実装対象のファイルに、シグネチャだけのスタブ（呼ぶと「未実装」で例外）を置く。実装はしない。
   - `node specflow/bin/render-cases.mjs` を実行し、エラーがなくなるまで cases.yaml を直す。
   - 各ケースの `given` / `then` の文と `input` / `expected` の値を1件ずつ見比べ、並び順・件数・値が一致していることを確かめる。
   - `{{TEST_COMMAND}}` を実行し、全ケースが「失敗」することを確認する（構文エラーで全体が落ちるのは不可）。
   - `.specflow-out/result.json` に次を書く:
     {"status":"ready","spec_dir":"specs/…","summary":"…","automation":[{"item":"…","how":"機械|人","reason":"…","cost":"準備コストの目安"}]}
4. 最後に、作ったケース数、仮定、人が確認する項目を3〜6行で報告する。
