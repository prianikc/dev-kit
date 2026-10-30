---
name: plannotator-fix
description: "review-kit extension: fix review — Plannotator. The round's uncommitted fixes before push. Used by review-kit:pr-fix-run when the user picks Plannotator."
user-invocable: false
---

# plannotator-fix

1. `plannotator_open` with `pr`, `mode: "fix"`. `unavailable: …` → show it and continue review-kit:pr-fix-run at step 6
   with `failed`. `started: …` → tell the user the URL and end the turn; do nothing until «Plannotator result for PR <N>
   (fix): …» arrives.
2. On it, continue review-kit:pr-fix-run at step 6 with the decision: `approved`; `annotated` with the feedback file
   `.review-kit/run/<N>/ext/plannotator/feedback.md`; `dismissed`; `failed` with the reason.
