import { update, type Register } from 'claude-code'
import { addSessionFile, isCommitSkill, sessionFilesBlock } from './session.ts'

const SESSION_FILES = { plugin: 'dev-kit', key: 'sessionFiles' } as const
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
}
