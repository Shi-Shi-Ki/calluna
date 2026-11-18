#!/usr/bin/env bash
# 仕様（Issue）ごとのリードタイムを GitHub の記録から出す。人の入力は不要。
#   使い方: specflow/bin/leadtime.sh <Issue番号> [owner/repo]
# 出力: Issue作成 → /cases → ケース表PR作成 → 承認 → /implement → マージ の各時刻と経過時間
set -euo pipefail
N="$1"
REPO="${2:-$(gh repo view --json nameWithOwner --jq .nameWithOwner)}"

issue=$(gh api "repos/$REPO/issues/$N")
created=$(jq -r .created_at <<<"$issue")
first_cases=$(gh api "repos/$REPO/issues/$N/comments" --paginate --jq '[.[] | select(.body | startswith("/cases"))][0].created_at // empty')
pr=$(gh pr list -R "$REPO" --head "specflow/issue-$N" --state all --json number,createdAt,mergedAt --jq '.[0] // empty')
pr_no=$(jq -r '.number // empty' <<<"${pr:-{}}")
pr_created=$(jq -r '.createdAt // empty' <<<"${pr:-{}}")
merged=$(jq -r '.mergedAt // empty' <<<"${pr:-{}}")
approved=""; implement=""
if [ -n "$pr_no" ]; then
  approved=$(gh api "repos/$REPO/issues/$pr_no/events" --paginate --jq '[.[] | select(.event=="labeled" and .label.name=="cases:approved")][-1].created_at // empty')
  implement=$(gh api "repos/$REPO/issues/$pr_no/comments" --paginate --jq '[.[] | select(.body | startswith("/implement"))][-1].created_at // empty')
fi

hours() { [ -n "$1" ] && [ -n "$2" ] && echo "scale=1; ($(date -d "$2" +%s) - $(date -d "$1" +%s)) / 3600" | bc || echo "-"; }
printf '%s\n' "仕様 #$N（$REPO）"
printf '  %-16s %s\n' "Issue作成" "$created" "/cases" "${first_cases:--}" "ケース表PR" "${pr_created:--}" "承認" "${approved:--}" "/implement" "${implement:--}" "マージ" "${merged:--}"
printf '  %-16s %s 時間\n' "リードタイム" "$(hours "$created" "$merged")" "うち承認待ち" "$(hours "$pr_created" "$approved")"
