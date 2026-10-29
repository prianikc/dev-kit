#!/usr/bin/env bash
# Тестовый репозиторий для /cleanup: bash cleanup-fixture.sh <dir> → <dir>/origin.git, <dir>/work
set -euo pipefail

D=$(cd "$1" && pwd)
git init -q --bare -b main "$D/origin.git"
git clone -q "$D/origin.git" "$D/work" 2>/dev/null
cd "$D/work"
git config user.name fixture
git config user.email fixture@example.com
echo '.claude/' >> .git/info/exclude

commit() { echo "$1" >> "$2"; git add "$2"; git commit -qm "$1"; }

commit base README
git push -qu origin main
git remote set-head origin -a >/dev/null

branch() { git switch -qc "$1" main; commit "$1" "${1//\//-}.txt"; git push -qu origin "$1"; git switch -q main; }

branch merged-gone
branch feature/squash
branch merged-kept
branch gone-local
branch busy
git merge -q --no-ff -m 'merge merged-gone' merged-gone
git merge -q --no-ff -m 'merge merged-kept' merged-kept
git merge -q --no-ff -m 'merge gone-local' gone-local
git merge -q --no-ff -m 'merge busy' busy
git push -q origin main
git -C "$D/origin.git" branch -qD merged-gone feature/squash gone-local busy

git switch -q gone-local
commit 'local only' gone-local.txt
git switch -q main

git switch -qc fresh main
commit fresh fresh.txt
git switch -q main

git worktree add -q .claude/worktrees/pr-1 busy
git worktree add -q --detach ../stale main
rm -rf ../stale

echo on-main >> README
git stash push -qm on-main
git switch -q feature/squash
echo on-squash >> feature-squash.txt
git stash push -qm on-squash
git switch -q main
