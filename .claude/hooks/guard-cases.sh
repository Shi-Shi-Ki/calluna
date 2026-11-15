#!/usr/bin/env bash
# PreToolUse hook: 合意済みのケース表・テストと、ガードレール自体を AI が書き換えるのを止める。
#   - specs/ tests/ : 既定でロック。ケース表を作るフェーズ（CIの /cases）だけ SPECFLOW_PHASE=author で解除
#   - .claude/ .github/ CLAUDE.md : 常にロック（人が直接変更する）
# これは「うっかり」を止める補助。本当の保証は CI のロック検査（承認SHAとの差分）と CODEOWNERS。
# 必要なもの: bash, jq（Windows は Git Bash + jq）
set -euo pipefail

input="$(cat)"
tool="$(jq -r '.tool_name // empty' <<<"$input")"
GUARD='(^|/)\.claude/|(^|/)\.github/|(^|/)CLAUDE\.md$'
CASES='(^|/)(specs|tests)/'
[[ "${SPECFLOW_PHASE:-}" == "author" ]] && PROTECTED="$GUARD" || PROTECTED="$GUARD|$CASES"

deny() {
  echo "ブロック: $1 合意済みのケース表・テスト・ガードレールはこのフェーズでは変更できません。仕様やケースに問題があると考えた場合は、変更せずに理由を最終報告に書いてください。" >&2
  exit 2
}

case "$tool" in
  Edit|Write|MultiEdit|NotebookEdit)
    file="$(jq -r '.tool_input.file_path // .tool_input.notebook_path // empty' <<<"$input")"
    rel="${file#"${CLAUDE_PROJECT_DIR:-$PWD}"/}"
    if [[ "$rel" =~ $PROTECTED ]]; then deny "$rel への $tool。"; fi
    ;;
  Bash)
    cmd="$(jq -r '.tool_input.command // empty' <<<"$input")"
    # 2>&1 や >/dev/null は書き込みとみなさない
    scrubbed="$(sed -E 's/[0-9]?>&[0-9]//g; s/[0-9]?>+ *\/dev\/null//g' <<<"$cmd")"
    paths='(^|[^[:alnum:]_])(\.claude|\.github)/|CLAUDE\.md'
    [[ "${SPECFLOW_PHASE:-}" == "author" ]] || paths="$paths|(^|[^[:alnum:]_])(specs|tests)/"
    if grep -Eq "$paths" <<<"$scrubbed" &&
       grep -Eq '(>|\btee\b|\bsed\b.*-i|\bperl\b.*-i|\brm\b|\bmv\b|\bcp\b|\btouch\b|\bchmod\b|\bln\b|\bgit\b +(checkout|restore|reset|rm|mv|apply|stash)|\bpatch\b|\btruncate\b|\bdd\b)' <<<"$scrubbed"; then
      deny "コマンド: $cmd"
    fi
    ;;
esac
exit 0
