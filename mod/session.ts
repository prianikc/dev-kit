const SESSION_FILES_TITLE = '## Session files (recorded by dev-kit)'
const COMMIT_SKILL = 'commit'

export function addSessionFile(files: readonly string[], path: string): string[] {
  return files.includes(path) ? [...files] : [...files, path]
}

export function sessionFilesBlock(files: readonly string[]): string {
  return `${SESSION_FILES_TITLE}\n\n${files.length > 0 ? files.map(file => `- ${file}`).join('\n') : 'None recorded.'}`
}

export function isCommitSkill(pluginName: string | undefined, skill: string | undefined): boolean {
  return pluginName === 'dev-kit' && (skill === COMMIT_SKILL || skill === `dev-kit:${COMMIT_SKILL}`)
}
