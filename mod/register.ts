import { update, type Register } from 'claude-code'
import { addSessionFile, isCommitSkill, sessionFilesBlock } from './session.ts'
import { openPlannotator } from './plannotator-run.ts'
import { closeOrphanTabs, openTab, orcaBin } from './tabs.ts'

const SESSION_FILES = { plugin: 'dev-kit', key: 'sessionFiles' } as const
const TOOL_SPECS = [
  {
    name: 'plannotator_open',
    description: 'Open Plannotator for the active review-kit run of PR <pr> in this tree and wait for the human in the background. mode review (default): every finding of .review-kit/run/<N>/findings.json with its text from texts.json as annotations over the PR diff; hotspots: true also posts the guide\'s narrow places (hotspots.json) headed «[gN · узкое место гайда]», and with a review session already open only adds them. mode fix: the uncommitted fixes of the round, no annotations. Answers "started: …", "added: …" / "not added: …" or "unavailable: …"; the decision arrives later as a separate message «Plannotator result for PR <N>…», its files in .review-kit/run/<N>/ext/plannotator/.',
    inputSchema: { type: 'object', properties: { pr: { type: 'number' }, mode: { enum: ['review', 'fix'] }, hotspots: { type: 'boolean' } }, required: ['pr'] },
    isDeferred: false,
  },
  {
    name: 'orca_open',
    description: 'Open an Orca terminal tab for each review worktree from review-kit\'s review_worktree answer (trees: [{ pr, path, command }]) and run its command there. Answers one line per tree, or "unavailable: Orca не найдена" — then nothing is opened.',
    inputSchema: { type: 'object', properties: { trees: { type: 'array', items: { type: 'object', properties: { pr: { type: 'number' }, path: { type: 'string' }, command: { type: 'string' } }, required: ['pr', 'path', 'command'] } } }, required: ['trees'] },
    isDeferred: false,
  },
]

const EDIT_TOOLS = { Edit: 'file_path', Write: 'file_path', NotebookEdit: 'notebook_path' } as const

export const register: Register = on => {
  for (const [tool, field] of Object.entries(EDIT_TOOLS)) {
    on('tool.call', { tool }, async ($, e, next) => {
      const ran = await next(e)
      const path = (e as Record<string, unknown>)[field]
      if (ran.isError || 'deny' in ran || typeof path !== 'string') return ran
      await update($, SESSION_FILES, files => addSessionFile((files as string[] | undefined) ?? [], path)).catch(() => undefined)
      return ran
    }).catch(($, e, next) => next(e))
  }

  on('skill.prompt', async ($, e, next) => {
    if (!isCommitSkill(e.pluginName, e.skill)) return next(e)
    const files = ((await $.state.get(SESSION_FILES)).value as string[] | undefined) ?? []
    return next({ ...e, text: `${e.text}\n\n${sessionFilesBlock(files)}` })
  }).catch(($, e, next) => next(e))

  on('session.start', async ($, e, next) => {
    for (const spec of TOOL_SPECS) {
      await $.tool.register(spec).catch(error => $.ui.log(`dev-kit: инструмент ${spec.name} не зарегистрирован: ${String(error)}`))
    }
    await closeOrphanTabs($).catch(() => 0)
    return next(e)
  })

  on('tool.call', { tool: 'mcp__dev-kit__plannotator_open' }, async ($, e) => {
    const { pr, mode, hotspots } = e as unknown as { pr: number; mode?: string; hotspots?: boolean }
    try {
      return { result: await openPlannotator($, pr, mode === 'fix' ? 'fix' : 'review', hotspots === true) }
    } catch (error) {
      return { result: `unavailable: ${(error as Error).message}` }
    }
  }).catch(() => ({ result: 'unavailable: plannotator_open не выполнен' }))

  on('tool.call', { tool: 'mcp__dev-kit__orca_open' }, async ($, e) => {
    const { trees } = e as unknown as { trees: Array<{ pr: number; path: string; command: string }> }
    const orca = await orcaBin($)
    if (!orca) return { result: 'unavailable: Orca не найдена' }
    const lines: string[] = []
    for (const tree of trees) {
      lines.push(await openTab($, orca, { ...tree, title: 'pr' }) ? `PR ${tree.pr}: вкладка открыта (${tree.path})` : `PR ${tree.pr}: вкладку открыть не удалось — cd '${tree.path}' && ${tree.command}`)
    }
    return { result: lines.join('\n') }
  }).catch(() => ({ result: 'unavailable: orca_open не выполнен' }))
}
