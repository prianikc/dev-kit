import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const FIXTURE = 'docs/superpowers/plans/cleanup-fixture.sh'

test('cleanup-fixture: ветки, stash и worktree — как в таблице плана', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cleanup-fixture-'))
  try {
    execFileSync('bash', [FIXTURE, dir], { stdio: 'pipe' })
    const work = join(dir, 'work')
    const git = (...args) => execFileSync('git', ['-C', work, ...args], { encoding: 'utf8' }).trim()
    assert.equal(git('branch', '--show-current'), 'main')
    assert.equal(git('status', '--porcelain'), '')
    assert.deepEqual(git('for-each-ref', '--format=%(refname:short)', 'refs/heads').split('\n'),
      ['busy', 'feature/squash', 'fresh', 'gone-local', 'main', 'merged-gone', 'merged-kept'])
    assert.equal(execFileSync('git', ['-C', join(dir, 'origin.git'), 'branch', '--format=%(refname:short)'], { encoding: 'utf8' }).trim(),
      'main\nmerged-kept')
    assert.deepEqual(git('stash', 'list', '--format=%gs').split('\n'), ['On feature/squash: on-squash', 'On main: on-main'])
    assert.equal(git('log', 'gone-local', '--not', '--remotes=origin', '--oneline').split('\n').length, 1)
    const worktrees = git('worktree', 'list', '--porcelain')
    assert.match(worktrees, /branch refs\/heads\/busy/)
    assert.match(worktrees, /\/stale\nHEAD \w+\ndetached\nprunable /)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
