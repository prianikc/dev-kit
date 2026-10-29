import { execFileSync } from 'node:child_process'
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs'
import { nextVersion } from './version.mjs'

const MANIFEST = '.claude-plugin/plugin.json'
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim()

const base = process.argv[2]
if (!base) {
  console.error('использование: LABELS=minor node .github/scripts/release-version.mjs <sha до пуша>')
  process.exit(2)
}
const changed = git('diff', '--name-only', base, 'HEAD').split('\n').filter(Boolean)
const before = JSON.parse(git('show', `${base}:${MANIFEST}`)).version
const manifest = readFileSync(MANIFEST, 'utf8')
const after = JSON.parse(manifest).version
const labels = (process.env.LABELS ?? '').split(',').filter(Boolean)
const next = nextVersion({ changed, before, after, labels })
if (!next) {
  console.log('файлы плагина не менялись — релиза нет')
  process.exit(0)
}
if (next.bump) writeFileSync(MANIFEST, manifest.replace(`"version": "${after}"`, `"version": "${next.version}"`))
console.log(next.bump ? `версия: ${after} → ${next.version}` : `версия: ${next.version} (поднята в PR)`)
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `version=${next.version}\nbump=${next.bump}\n`)
