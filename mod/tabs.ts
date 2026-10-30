import type { EngineInterface } from 'claude-code'
import { createdHandle } from './orca.ts'
import { mainRoot, runner } from './git.ts'

export const TABS_FILE = '.claude/worktrees/orca-tabs.json'

const ORCA_WSL = 'orca.exe'

async function readTabs($: EngineInterface, file: string): Promise<Record<string, string[]>> {
  return $.fs.read(file).then(text => JSON.parse(String(text)) as Record<string, string[]>, () => ({}))
}

export async function orcaBin($: EngineInterface): Promise<string | undefined> {
  const wsl = /microsoft/i.test(await $.fs.read('/proc/version').then(String, () => ''))
  const orca = (await $.env.get('ORCA_BIN')) ?? (wsl ? ORCA_WSL : undefined)
  if (!orca) return undefined
  return (await runner($)([orca, '--version']).then(result => result.exitCode === 0, () => false)) ? orca : undefined
}

export async function rememberTab($: EngineInterface, root: string, path: string, handle: string): Promise<void> {
  const file = `${root}/${TABS_FILE}`
  const tabs = await readTabs($, file)
  await $.fs.write(file, JSON.stringify({ ...tabs, [path]: [...new Set([...(tabs[path] ?? []), handle])] }, null, 2))
}

export async function openTab($: EngineInterface, orca: string, tree: { pr: number; path: string; command: string; title: string }): Promise<boolean> {
  const root = await mainRoot($)
  const command = `cd '${tree.path.replace(/'/g, `'\\''`)}' && ${tree.command}`
  const created = await runner($)([orca, 'terminal', 'create', '--worktree', `path:${root}`, '--title', `${tree.title} #${tree.pr}`, '--focus', '--json', '--command', command]).catch(() => undefined)
  if (created?.exitCode !== 0) return false
  const handle = createdHandle(created.stdout)
  if (handle) await rememberTab($, root, tree.path, handle).catch(() => undefined)
  return true
}

export async function closeOrphanTabs($: EngineInterface): Promise<number> {
  const root = await mainRoot($)
  const file = `${root}/${TABS_FILE}`
  const tabs = await readTabs($, file)
  const listed = new Set((await runner($)(['git', 'worktree', 'list', '--porcelain'])).stdout.split('\n').filter(line => line.startsWith('worktree ')).map(line => line.slice('worktree '.length)))
  const orphans = Object.keys(tabs).filter(path => !listed.has(path))
  if (orphans.length === 0) return 0
  const orca = await orcaBin($)
  if (!orca) return 0
  let closed = 0
  for (const path of orphans) {
    for (const handle of tabs[path] ?? []) {
      if ((await runner($)([orca, 'terminal', 'close', '--terminal', handle, '--tab', '--json']).catch(() => undefined))?.exitCode === 0) closed++
    }
    delete tabs[path]
  }
  await $.fs.write(file, JSON.stringify(tabs, null, 2)).catch(() => undefined)
  return closed
}
