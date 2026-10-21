---
name: confl
description: Use when git conflicts in the tree need resolving — a merge, rebase, cherry-pick, revert or stash pop stopped on conflicts (/confl, «разреши конфликты»). Called by the merge skill too.
argument-hint: "[номер PR]"
---

# confl

Arguments: `$ARGUMENTS`. A PR number → the user's own PR conflicts with its base: use the `review-kit:pr-confl` skill with
that number (review-kit merges the base inside its run) and stop here; no review-kit → «Слияние базы в PR — в review-kit
(/pr-confl N)», stop. Nothing → section «Tree».

## Resolving a file

For every conflicted file: read the whole file and both sides — `git diff` of the file, `git log --oneline -5` of each side
for it (`HEAD` and `MERGE_HEAD`/`REBASE_HEAD`/`CHERRY_PICK_HEAD`). Keep the intent of both sides: combine changes, take
the newer API, drop only what one side deliberately removed. Remove every `<<<<<<<`, `=======`, `>>>>>>>` line, then
`git add -- <file>`. A deleted-vs-modified conflict or a choice you cannot justify from the code → AskUserQuestion with
the concrete options (in Russian) and follow the answer. Never take `--ours`/`--theirs` for a whole file without reading it.

## Tree

1. `git status`. No unmerged paths → «Конфликтов нет», stop. Note the operation: merge, rebase, cherry-pick, revert, or
   none (a stash pop/apply).
2. Resolve each unmerged file (section above).
3. Continue: merge → `git commit --no-edit`; rebase / cherry-pick / revert → `GIT_EDITOR=true git <op> --continue`; a
   rebase that stops on the next commit's conflicts → repeat from step 1. A stash → do not drop it: say the stash is kept.
   The review-kit guard refuses the command (an active run) → stop here: «Конфликты разрешены и проиндексированы —
   продолжите <op> сами», the calling skill or the user continues.
4. Report in Russian: the operation, resolved files with one line each, and where it stopped.

Never push, never `--abort` unless the user asks, never `--force`, `reset --hard` or `checkout -- <file>`.
