import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { EngineInterface } from 'claude-code'
import { closeOrphanTabs, orcaBin, TABS_FILE } from './tabs.ts'
import { fakeEngine } from './testing/engine.ts'
import { repo } from './testing/repo.ts'

function withOrca($: EngineInterface, { ok, calls, proc = '', previewPath = '' }: { ok: boolean; calls: string[][]; proc?: string; previewPath?: string }): EngineInterface {
  const run = $.process.run.bind($.process)
  const fs = $.fs
  return {
    ...$,
    fs: { ...fs, read: async (path: string) => (path === '/proc/version' ? proc : fs.read(path)) },
    process: {
      ...$.process,
      run: async (argv: string[], init?: { cwd?: string }) => {
        if (argv[0] !== 'git') {
          calls.push(argv)
          return { exitCode: ok ? 0 : 127, stdout: argv.includes('list') ? JSON.stringify({ result: { terminals: [{ handle: 'term_main', tabId: 't1', preview: `PR 2: вкладка открыта (${previewPath})` }] } }) : '', stderr: '' }
        }
        return run(argv, init)
      },
    },
  } as unknown as EngineInterface
}

test('closeOrphanTabs: вкладка удалённого worktree закрыта и забыта, живого — не тронута; без Orca — ничего', async () => {
  const r = repo()
  r.commit('a.txt', '1', 'base')
  const alive = join(r.dir, '.claude/worktrees/pr-1-a')
  r.git('worktree', 'add', '-q', '-b', 'a', alive)
  const gone = join(r.dir, '.claude/worktrees/pr-2-b')
  writeFileSync(join(r.dir, TABS_FILE), JSON.stringify({ [alive]: ['term_a'], [gone]: ['term_b'] }))

  const none: string[][] = []
  assert.equal(await closeOrphanTabs(withOrca(fakeEngine({ root: r.dir, env: { ORCA_BIN: 'orca-x' } }).$, { ok: false, calls: none })), 0)
  assert.ok(none.every(argv => argv.includes('--version')))

  const calls: string[][] = []
  assert.equal(await closeOrphanTabs(withOrca(fakeEngine({ root: r.dir, env: { ORCA_BIN: 'orca-x' } }).$, { ok: true, calls, previewPath: gone })), 1)
  assert.ok(!calls.some(argv => argv.includes('term_main')), 'вкладка, где путь лишь упомянут, не закрывается')
  assert.ok(calls.some(argv => argv.join(' ') === 'orca-x terminal close --terminal term_b --tab --json'))
  assert.ok(!calls.some(argv => argv.includes('term_a')))
  assert.deepEqual(JSON.parse(readFileSync(join(r.dir, TABS_FILE), 'utf8')), { [alive]: ['term_a'] })
})

test('orcaBin: ORCA_BIN, иначе orca.exe в WSL; вне WSL без ORCA_BIN — нет (orca там — экранный диктор); не запускается — undefined', async () => {
  const r = repo()
  const calls: string[][] = []
  assert.equal(await orcaBin(withOrca(fakeEngine({ root: r.dir, env: { ORCA_BIN: 'x' } }).$, { ok: true, calls })), 'x')
  assert.equal(await orcaBin(withOrca(fakeEngine({ root: r.dir }).$, { ok: true, calls, proc: 'Linux 6.6 microsoft-standard-WSL2' })), 'orca.exe')
  assert.equal(await orcaBin(withOrca(fakeEngine({ root: r.dir }).$, { ok: true, calls, proc: 'Linux 6.6 generic' })), undefined)
  assert.equal(await orcaBin(withOrca(fakeEngine({ root: r.dir }).$, { ok: false, calls })), undefined)
})
