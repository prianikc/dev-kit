export const PLUGIN_PATHS = ['.claude-plugin/', 'hooks/', 'mod/', 'skills/', 'types/']
const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/
const BUMPS = ['major', 'minor', 'patch']

function parts(version) {
  const match = SEMVER.exec(version)
  return match ? match.slice(1).map(Number) : null
}

function compare(a, b) {
  const index = a.findIndex((value, i) => value !== b[i])
  return index < 0 ? 0 : a[index] - b[index]
}

export function versionProblem({ before, after }) {
  const [old, next] = [parts(before), parts(after)]
  if (!next) return `version ${after} не semver (x.y.z)`
  if (old && compare(next, old) < 0) return `version ${after} меньше ${before}`
  return null
}

export function nextVersion({ changed, before, after, labels = [] }) {
  if (!changed.some(path => PLUGIN_PATHS.some(prefix => path.startsWith(prefix)))) return null
  if (after !== before) return { version: after, bump: false }
  const kind = BUMPS.find(name => labels.includes(name)) ?? 'patch'
  const [major, minor, patch] = parts(before)
  const version = kind === 'major' ? `${major + 1}.0.0` : kind === 'minor' ? `${major}.${minor + 1}.0` : `${major}.${minor}.${patch + 1}`
  return { version, bump: true }
}
