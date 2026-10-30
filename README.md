# dev-kit

Личные инструменты разработки для Claude Code: git-команды и скиллы процесса. Дополняет
[review-kit](https://github.com/prianikc/review-kit), но работает и без него.

## Установка

```
/plugin marketplace add prianikc/dev-kit
/plugin install dev-kit@dev-kit
```

Обновление:

```
claude plugin marketplace update dev-kit
claude plugin update dev-kit@dev-kit
```

## Команды

| Команда | Что делает |
|---|---|
| `/commit [all] [текст]` | коммит файлов сессии (или всех с `all`) с придуманным сообщением |
| `/push` | запушить текущую ветку и показать ссылку на PR |
| `/merge [ветка]` | влить свежий main (или указанную ветку) в текущую, конфликты — через `/confl`; не пушит |
| `/gsync` | подтянуть с origin и перемотать текущую ветку; остальные не трогает — таблица их состояний |
| `/main` | переключиться на main и перемотать её с origin; другие ветки не трогает |
| `/cleanup` | убрать локальные ветки, чьи коммиты все на origin (удалены там или влиты в main), разобрать stash по одному, убрать записи пропавших worktree; живые worktree не трогает |
| `/confl` | разрешить конфликты в дереве (merge, rebase, cherry-pick, revert, stash); с номером PR — передаёт `review-kit:pr-confl` |

## Скиллы процесса

`brainstorming`, `writing-plans`, `executing-plans`, `subagent-driven-development`, `requesting-code-review`,
`using-git-worktrees`, `finishing-a-development-branch`, `systematic-debugging`, `test-driven-development`,
`verification-before-completion`, `writing-skills` — копии из superpowers (см. `NOTICE.md`), чтобы superpowers не ставить.

## Вместе с review-kit

dev-kit подключается к точкам расширения review-kit — сам кит о нём не знает:

| Что | Как |
|---|---|
| публикация ревью через Plannotator | в вопросе кита «Как публикуем?» появляется вариант «Plannotator»: находки — аннотации поверх diff PR, узкие места гайда — по выбору; решение публикует кит после «Да» |
| проверка правок перед push | в вопросе кита «Правки PR N перед push» появляется вариант «Plannotator» |
| `/pr-tabs [номера]` | ревью PR во вкладках Orca: worktree создаёт кит (`review_worktree`), вкладку открывает dev-kit; без номеров — все PR, по которым есть дело; вкладки удалённых worktree закрываются при следующем старте сессии |

Нужны программы `plannotator` и Orca. Бинарь Orca — `ORCA_BIN`, иначе `orca.exe` в WSL; вне WSL — только `ORCA_BIN` (`orca` там — экранный диктор GNOME). Закрываются только вкладки, которые открыл dev-kit.
