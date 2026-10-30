import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { kitRunActive, plannotatorChildren, settlePlannotator, watchRun } from './plannotator-run.ts'
import { fakeEngine } from './testing/engine.ts'

function runDir(): { root: string; dir: string } {
  const root = mkdtempSync(join(tmpdir(), 'dk-run-'))
  const dir = join(root, '.review-kit/run/7')
  mkdirSync(dir, { recursive: true })
  return { root, dir }
}

test('kitRunActive: нет session.json — false; status active — true; другой статус — false', async () => {
  const { root, dir } = runDir()
  const { $ } = fakeEngine({ root })
  assert.equal(await kitRunActive($, root, 7), false)
  writeFileSync(join(dir, 'session.json'), JSON.stringify({ status: 'active' }))
  assert.equal(await kitRunActive($, root, 7), true)
  writeFileSync(join(dir, 'session.json'), JSON.stringify({ status: 'done' }))
  assert.equal(await kitRunActive($, root, 7), false)
})

test('settlePlannotator: прогон кита закрыт — итог никого не будит', async () => {
  const { root, dir } = runDir()
  const { $, submitted } = fakeEngine({ root })
  plannotatorChildren.set(7, { mode: 'review', started: true, stop: () => undefined, url: 'http://x' })
  await settlePlannotator($, { pr: 7, root, dir, stdout: '{"decision":"approved"}', code: 0 })
  assert.deepEqual(submitted, [])
  assert.equal(plannotatorChildren.has(7), false)
})

test('watchRun: прогон закрыли между тиками — процесс остановлен ровно раз', async () => {
  const { root, dir } = runDir()
  writeFileSync(join(dir, 'session.json'), JSON.stringify({ status: 'active' }))
  const { $ } = fakeEngine({ root })
  const ticks = { n: 0, stopped: 0 }
  await new Promise<void>(done => {
    watchRun($, {
      root,
      pr: 7,
      alive: () => {
        ticks.n++
        if (ticks.n === 2) rmSync(join(dir, 'session.json'))
        return ticks.stopped === 0
      },
      stop: () => {
        ticks.stopped++
        done()
      },
    })
  })
  await new Promise(resolve => setTimeout(resolve, 20))
  assert.equal(ticks.stopped, 1)
})

test('watchRun: процесс закончился сам — stop не вызван, опрос прекратился', async () => {
  const { root, dir } = runDir()
  writeFileSync(join(dir, 'session.json'), JSON.stringify({ status: 'active' }))
  const { $ } = fakeEngine({ root })
  const ticks = { n: 0, stopped: 0 }
  watchRun($, { root, pr: 7, alive: () => ++ticks.n <= 3, stop: () => { ticks.stopped++ } })
  await new Promise(resolve => setTimeout(resolve, 50))
  assert.equal(ticks.stopped, 0)
  assert.equal(ticks.n, 4)
})
