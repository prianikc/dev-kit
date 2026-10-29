import { test } from 'node:test'
import assert from 'node:assert/strict'
import { nextVersion, versionProblem } from './version.mjs'

test('versionProblem: на PR version можно не трогать, но нельзя испортить или уменьшить', () => {
  assert.equal(versionProblem({ before: '1.0.0', after: '1.0.0' }), null)
  assert.equal(versionProblem({ before: '1.0.0', after: '1.1.0' }), null)
  assert.match(versionProblem({ before: '1.10.0', after: '1.9.9' }), /1\.9\.9 меньше 1\.10\.0/)
  assert.match(versionProblem({ before: '1.0.0', after: 'abc' }), /abc не semver/)
})

test('nextVersion: без файлов плагина релиза нет', () => {
  assert.equal(nextVersion({ changed: ['README.md', 'docs/a.md', 'CLAUDE.md', '.github/workflows/ci.yml'], before: '1.0.0', after: '1.0.0' }), null)
})

test('nextVersion: файлы плагина — patch по умолчанию, minor и major по метке PR', () => {
  assert.deepEqual(nextVersion({ changed: ['skills/cleanup/SKILL.md'], before: '1.2.3', after: '1.2.3' }), { version: '1.2.4', bump: true })
  assert.deepEqual(nextVersion({ changed: ['mod/session.ts'], before: '1.2.3', after: '1.2.3', labels: ['minor'] }), { version: '1.3.0', bump: true })
  assert.deepEqual(nextVersion({ changed: ['hooks/hooks.json'], before: '1.2.3', after: '1.2.3', labels: ['bug', 'major'] }), { version: '2.0.0', bump: true })
  assert.deepEqual(nextVersion({ changed: ['types/index.d.ts', '.claude-plugin/plugin.json'], before: '1.9.9', after: '1.9.9', labels: ['minor', 'major'] }), { version: '2.0.0', bump: true })
})

test('nextVersion: version уже поднята в PR — берётся она, без нового коммита', () => {
  assert.deepEqual(nextVersion({ changed: ['skills/cleanup/SKILL.md', '.claude-plugin/plugin.json'], before: '1.0.0', after: '1.1.0', labels: ['major'] }), { version: '1.1.0', bump: false })
})
