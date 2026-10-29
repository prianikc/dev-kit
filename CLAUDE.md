# dev-kit

Личный плагин Claude Code: git-команды и скиллы процесса разработки. Дополняет review-kit, не зависит от него.

| Путь | Что это |
|---|---|
| `.claude-plugin/` | манифест (`plugin.json`: версия) и `marketplace.json` |
| `hooks/hooks.json` | подключает мод `mod/register.ts` |
| `mod/register.ts` | учёт файлов сессии (Edit/Write) и их список в промпте `/commit` |
| `mod/session.ts` | чистые функции учёта |
| `skills/` | git-команды (`commit`, `push`, `merge`, `gsync`, `main`, `cleanup`, `confl`) и скиллы процесса из superpowers (`NOTICE.md`) |

## Правила

- Всё, что видит пользователь, — на русском; тексты скиллов — на английском.
- Ссылки между скиллами — `dev-kit:<скилл>`; на review-kit — только через его публичные скиллы и конфиг
  (`.claude/review-kit.local.json` → `manualCommitCommands`), без знания его внутреннего состояния.
- TS в `mod/`: без точек с запятой, одинарные кавычки, константы `UPPER_CASE` в начале файла.

## Проверка

- Тесты: `node --test 'mod/**/*.test.ts' '.github/scripts/*.test.mjs'`. Валидация: `claude plugin validate .`.
- `version` в `.claude-plugin/plugin.json` поднимает CI после мержа в `main`, если менялись файлы плагина: patch, а с
  меткой PR `minor` / `major` — их. Вручную в PR — только когда нужна своя; уменьшать нельзя.
- CI (`.github/workflows/ci.yml`): на PR и пуш в `main` — тесты, валидация, проверка `version`; после пуша в `main` —
  коммит новой `version` (`.github/scripts/release-version.mjs`), тег `vX.Y.Z` и GitHub Release.
