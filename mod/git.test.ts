import { test } from 'node:test'
import assert from 'node:assert/strict'
import { realpathSync } from 'node:fs'
import { join } from 'node:path'
import { mainRoot, projectRoot } from './git.ts'
import { fakeEngine } from './testing/engine.ts'
import { repo } from './testing/repo.ts'

test('mainRoot и projectRoot: из worktree — корень основного дерева и свой корень; из основного — оба корень', async () => {
  const r = repo()
  r.commit('a.txt', '1', 'base')
  const wt = join(r.dir, '..', `${r.dir.split('/').pop()}-wt`)
  r.git('worktree', 'add', '-q', wt)
  const root = realpathSync(r.dir)
  const inTree = fakeEngine({ root: wt }).$
  assert.equal(await mainRoot(inTree), root)
  assert.equal(await projectRoot(inTree), realpathSync(wt))
  const inMain = fakeEngine({ root: r.dir }).$
  assert.equal(await mainRoot(inMain), root)
  assert.equal(await projectRoot(inMain), root)
})
