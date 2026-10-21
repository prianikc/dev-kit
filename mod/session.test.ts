import { test } from 'node:test'
import assert from 'node:assert/strict'
import { addSessionFile, isCommitSkill, sessionFilesBlock } from './session.ts'

test('addSessionFile: без дублей, порядок первой записи', () => {
  assert.deepEqual(addSessionFile([], '/r/a.ts'), ['/r/a.ts'])
  assert.deepEqual(addSessionFile(['/r/a.ts', '/r/b.ts'], '/r/a.ts'), ['/r/a.ts', '/r/b.ts'])
  assert.deepEqual(addSessionFile(['/r/a.ts'], '/r/b.ts'), ['/r/a.ts', '/r/b.ts'])
})

test('sessionFilesBlock: список путей или явное «нет записей»', () => {
  assert.equal(sessionFilesBlock(['/r/a.ts', '/r/b.ts']), '## Session files (recorded by dev-kit)\n\n- /r/a.ts\n- /r/b.ts')
  assert.equal(sessionFilesBlock([]), '## Session files (recorded by dev-kit)\n\nNone recorded.')
})

test('isCommitSkill: только скилл commit этого плагина', () => {
  assert.equal(isCommitSkill('dev-kit', 'commit'), true)
  assert.equal(isCommitSkill('dev-kit', 'dev-kit:commit'), true)
  assert.equal(isCommitSkill('review-kit', 'commit'), false)
  assert.equal(isCommitSkill('dev-kit', 'push'), false)
  assert.equal(isCommitSkill(undefined, 'commit'), false)
})
