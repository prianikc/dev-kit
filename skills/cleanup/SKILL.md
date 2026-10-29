---
name: cleanup
description: Use when local git leftovers should be cleaned up (/cleanup, «убери ветки», «почисти git», «удали старые ветки», «разбери stash») — offers to delete local branches whose commits are all on origin, goes through stashes one by one and prunes worktree records whose folders are gone. Never deletes a branch with unpushed commits, never removes a live worktree, never pushes, merges, rebases or resets.
---

# cleanup

Offer what can go, delete only what the user confirms. Never delete a branch with commits that are not on origin, the
current branch or the default branch; never remove a worktree whose folder exists — someone may be working in it; never
push, merge, rebase, reset or switch branches. Nothing is deleted without a question except `git worktree prune`, which
only forgets records whose folder is already gone.

1. `git rev-parse --show-toplevel` fails → «Не git-репозиторий», stop.
2. Before fetching, save where origin's branches stood:
   `git for-each-ref --format='%(refname:short) %(objectname)' refs/remotes/origin` — the prune below forgets the ones
   deleted on origin, and a squash-merged branch's commits live only there. Then `git fetch --prune origin`. Fails →
   show git's output, stop.
3. Default branch = `git symbolic-ref --short refs/remotes/origin/HEAD` without `origin/` (fails → `main`). Current
   branch = `git branch --show-current` (empty when HEAD is detached).
4. Branch candidates. Busy branches = every `branch refs/heads/<name>` line of `git worktree list --porcelain` (covers
   the current branch of every worktree, this one included). For each line of
   `git for-each-ref --format='%(refname:short)|%(upstream:track)' refs/heads`, a branch is a candidate when all hold:
   - it is not the current branch, not the default branch, not busy;
   - all its commits are on origin: `git log <branch> --not --remotes=origin --oneline` prints nothing, or — for a
     `[gone]` branch with a sha saved in step 2 for `origin/<branch>` — `git merge-base --is-ancestor <branch> <saved sha>`
     exits 0 (everything was pushed before origin deleted it);
   - and a reason exists — track is `[gone]` → «удалена на origin»; otherwise
     `git merge-base --is-ancestor <branch> origin/<default>` exits 0 → «влита в <default>». Any other exit code, an
     error included (no `origin/<default>`), means not merged — go on.
   A squash-merged branch is never an ancestor of the default; only `[gone]` catches it. Never offer a branch for any
   other reason. A `[gone]` branch that fails the commits check (local commits, or pruned before this run so no sha was
   saved) is not offered — remember it for the report.
5. Stashes: `git stash list --format='%H|%gs|%cr'`. The stash's branch is the text between the leading `WIP on ` or
   `On ` and the first `: ` (branch names never contain `:`). Keep the sha — it is how a stash is addressed later.
6. Worktree records: `git worktree prune --dry-run --verbose` lists the records whose folder is gone; count them.
7. No candidates, no untouched `[gone]` branches, no stashes and no records to prune → «Убирать нечего», stop.
8. Branches (when there are candidates): one AskUserQuestion, header «Ветки», the question lists every candidate on its
   own line as `<branch> — <reason>`, options «Удалить все (N)» / «Оставить». «Удалить все» → for each candidate, right
   before deleting, repeat the step-4 commits check (same saved sha): passes → `git branch -D <branch>`; fails → skip it as «<branch> — есть коммиты не на origin»; `branch -D` fails → skip it
   with git's reason.
9. Stashes, one AskUserQuestion per stash in list order, header «Stash»: the question names the branch, the
   message and the age. Options: «Оставить»; «Применить» — only when `git status --porcelain` prints nothing and the
   current branch equals the stash's branch (check again before each stash); «Удалить». Before acting, find the stash's
   current index: its line number (from 0) in `git stash list --format=%H`, by the saved sha — indexes shift after a
   drop or a pop; sha not found → «stash уже не найден». Then:
   - «Применить» → `git stash pop stash@{<i>}`. Conflict → «применён с конфликтом — /confl, stash сохранён»; the tree
     is no longer clean, so later stashes get no «Применить»;
   - «Удалить» → `git stash drop stash@{<i>}`.
10. `git worktree prune` when step 6 found records.
11. Report in Russian as a table `| Что | Результат |`:
    - «Ветки» — «удалено N» plus «, пропущено: …» with each skipped branch and its reason, or «оставлены» when the user
      kept them; no row when there were no candidates;
    - «Не тронуты» — the `[gone]` branches step 4 did not offer, each as «`<branch>` — коммиты не на origin, удалите
      сами (`git branch -D <branch>`)»; no row when there are none;
    - one row per stash, `stash <branch>: <message>` — «применён», «удалён», «оставлен», or the conflict text;
    - «Worktree» — «убрано записей: N» or «нечего убирать».
    Wrap branch names and commands in backticks. No text after the table except a failed step's reason.
