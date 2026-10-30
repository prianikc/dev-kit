# dev-kit

Личный плагин Claude Code: git-команды, скиллы процесса разработки и расширения review-kit (Plannotator, вкладки Orca). Дополняет review-kit, не зависит от него.

| Путь | Что это |
|---|---|
| `.claude-plugin/` | манифест (`plugin.json`: версия) и `marketplace.json` |
| `hooks/hooks.json` | подключает мод `mod/register.ts` |
| `mod/register.ts` | учёт файлов сессии (Edit/Write) и их список в промпте `/commit`; инструменты `plannotator_open`, `orca_open`; закрытие осиротевших вкладок Orca на старте сессии |
| `mod/session.ts` | чистые функции учёта |
| `mod/git.ts` | `mainRoot` (основное дерево), `projectRoot` (текущее) |
| `mod/plannotator.ts`, `mod/plannotator-run.ts` | Plannotator: аннотации и разбор решения; запуск, ожидание, итог в `.review-kit/run/<N>/ext/plannotator/` |
| `mod/orca.ts`, `mod/tabs.ts` | Orca: разбор ответов CLI; бинарь, открытие и закрытие вкладок |
| `mod/testing/` | фейковый движок и git во временной папке |
| `skills/` | git-команды (`commit`, `push`, `merge`, `gsync`, `main`, `cleanup`, `confl`), `pr-tabs`, расширения review-kit (`plannotator-publish`, `plannotator-fix`) и скиллы процесса из superpowers (`NOTICE.md`) |

## Правила

- Всё, что видит пользователь, — на русском; тексты скиллов — на английском.
- Ссылки между скиллами — `dev-kit:<скилл>`; на review-kit — только через его точки расширения (раздел «Точки
  расширения» в его `CLAUDE.md`): инструменты `review_worktree`, `review_publish` с `source: "ext/<имя>"`, файлы прогона
  `.review-kit/run/<N>/` только на чтение, свои файлы — в `ext/plannotator/`. Его состояние мода не читается.
- TS в `mod/`: без точек с запятой, одинарные кавычки, константы `UPPER_CASE` в начале файла.

## Проверка

- Тесты: `node --test 'mod/**/*.test.ts' '.github/scripts/*.test.mjs'`. Валидация: `claude plugin validate .`.
- `version` в `.claude-plugin/plugin.json` поднимает CI после мержа в `main`, если менялись файлы плагина: patch, а с
  меткой PR `minor` / `major` — их. Вручную в PR — только когда нужна своя; уменьшать нельзя.
- CI (`.github/workflows/ci.yml`): на PR и пуш в `main` — тесты, валидация, проверка `version`; после пуша в `main` —
  коммит новой `version` (`.github/scripts/release-version.mjs`), тег `vX.Y.Z` и GitHub Release.
