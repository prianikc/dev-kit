---
name: pr-tabs
description: Use when the user asks to review PRs in separate Orca tabs or worktrees, to run several PR reviews in parallel, or to open every PR with something to do at once (/pr-tabs, /pr-tabs 156 157, «открой ревью 156 во вкладке», «все PR по вкладкам»), or to remove such a review worktree («убери вкладку 156»). Needs review-kit.
argument-hint: "[номера PR]"
---

# pr-tabs

Each PR gets its own git worktree, created by review-kit, and an Orca tab where `/pr N` runs. Tabs of removed worktrees
are closed at the next session start.

## Open

1. `review_worktree` with `prs` = the numbers the user named, in their order; none named → without `prs` (every PR with
   something to do). `review_worktree` unavailable → «review-kit не загружен», stop. Its answer is JSON
   `{ trees, here, skipped }`.
2. `trees` not empty → `orca_open` with `trees`. Show its lines; with a tree's `note`, add it to that line.
   `unavailable: Orca не найдена` → show, for each tree, `cd '<path>' && <command>` to run in a terminal.
3. Every `skipped` entry → «PR <pr>: <reason>». `here` not empty → «В основном дереве: /pr <pr>» for each — own PRs checked out in
   the main tree. Then stop: do not poll the tabs.

## Remove

1. `git worktree list --porcelain` → the worktree whose path ends in `/.claude/worktrees/pr-<N>-<branch>`. None → say so, stop.
2. `git -C <W> status --porcelain --ignore-submodules=all` not empty → AskUserQuestion «В worktree есть изменения — удалить
   вместе с ними?» (Удалить / Оставить); Оставить → stop.
3. `git worktree remove --force <W>` (`--force`: an initialised submodule). Branches stay — `/cleanup` offers them.
   The Orca tab closes at the next session start.
