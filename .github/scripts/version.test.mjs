import { test } from 'node:test'
import assert from 'node:assert/strict'
import { versionProblem } from './version.mjs'

test('versionProblem: файлы плагина — нужна большая версия; только документы — не нужна', () => {
  assert.equal(versionProblem({ changed: ['README.md', 'docs/a.md'], before: '6.0.0', after: '6.0.0' }), null)
  assert.equal(versionProblem({ changed: ['mod/session.ts'], before: '6.0.0', after: '6.0.1' }), null)
  assert.equal(versionProblem({ changed: ['mod/session.ts'], before: '6.0.0', after: '6.0.0' }), 'изменены файлы плагина (mod/session.ts), а version осталась 6.0.0 — поднимите в .claude-plugin/plugin.json')
  assert.match(versionProblem({ changed: ['skills/cleanup/SKILL.md'], before: '6.10.0', after: '6.9.9' }), /6\.9\.9 не больше 6\.10\.0/)
  assert.match(versionProblem({ changed: ['types/index.d.ts'], before: '6.0.0', after: 'abc' }), /не semver/)
})

test('versionProblem: много файлов — первые три и «и ещё N»', () => {
  const changed = ['mod/a.ts', 'mod/b.ts', 'mod/c.ts', 'mod/d.ts', 'mod/e.ts']
  assert.match(versionProblem({ changed, before: '1.0.0', after: '1.0.0' }), /\(mod\/a\.ts, mod\/b\.ts, mod\/c\.ts и ещё 2\)/)
})

test('versionProblem: hooks и манифест — файлы плагина, NOTICE и CLAUDE.md — нет', () => {
  assert.match(versionProblem({ changed: ['hooks/hooks.json'], before: '1.0.0', after: '1.0.0' }), /hooks\/hooks\.json/)
  assert.match(versionProblem({ changed: ['.claude-plugin/plugin.json'], before: '1.0.0', after: '1.0.0' }), /осталась 1\.0\.0/)
  assert.equal(versionProblem({ changed: ['NOTICE.md', 'CLAUDE.md', '.github/workflows/ci.yml'], before: '1.0.0', after: '1.0.0' }), null)
})
