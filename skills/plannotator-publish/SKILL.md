---
name: plannotator-publish
description: "review-kit extension: publish — Plannotator. Findings as annotations over the PR diff; review-kit publishes the decision after «Да». Used by review-kit:pr-publish-run when the user picks Plannotator."
user-invocable: false
---

# plannotator-publish

review-kit already wrote `.review-kit/run/<N>/texts.json` with a comment for every finding. Read files of the run with
Read; never `cd` into the run folder.

1. `.review-kit/run/<N>/hotspots.json` has items (the guide's narrow places) → AskUserQuestion «Узкие места гайда тоже?»
   — «Только находки», «Находки и узкие места».
2. `plannotator_open` with `pr`, and `hotspots: true` when the user chose the narrow places. `unavailable: …` → show it
   and continue review-kit:pr-publish-run at «Directly». `started: …` → tell the user the URL: «Отправить аннотации» —
   запросить изменения с ними, «Approve» — одобрить (оставшиеся аннотации уйдут комментариями); a rewritten comment
   keeps its first line `[id · …]`. With narrow places also: they are hints for reading, headed
   `[gN · узкое место гайда]`, and never published while that line stays — to publish one as your own comment, delete
   that line. End the turn and do nothing until a message «Plannotator result for PR <N>: …» arrives. The user asks
   meanwhile to add the narrow places → `plannotator_open` with `pr`, `hotspots: true` (it adds them to the open
   session), show its line, end the turn again.
3. On «Plannotator result for PR <N>: …»:
   - `failed` → show the reason, continue review-kit:pr-publish-run at «Directly».
   - `dismissed` → «Ревью не публикуется: Plannotator закрыт без решения», continue review-kit:pr-publish-run at
     «Finish» with nothing published.
   - `annotated` with no ids → «В Plannotator остались только узкие места гайда — это подсказки, публиковать нечего»,
     continue review-kit:pr-publish-run at «Finish» with nothing published.
   - otherwise `review_publish` with `pr`, `ids` from `.review-kit/run/<N>/ext/plannotator/result.json`,
     `source: "ext/plannotator"`, `verdict`: `request-changes` for `annotated`, `approve` for `approved`. It asks the
     user «Да/Нет» itself. Then continue review-kit:pr-publish-run at «Finish» with its answer.
