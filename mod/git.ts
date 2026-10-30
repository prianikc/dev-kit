import type { EngineInterface } from 'claude-code'

export type Run = (argv: string[], init?: { cwd?: string; env?: Record<string, string>; stdin?: string }) => Promise<{ exitCode: number; stdout: string; stderr: string }>

export function runner($: EngineInterface): Run {
  return async (argv, init) => $.process.run(argv, { cwd: await $.session.root(), ...init })
}

export async function mainRoot($: EngineInterface): Promise<string> {
  const { stdout } = await runner($)(['git', 'rev-parse', '--path-format=absolute', '--git-common-dir'])
  return stdout.trim().replace(/\/\.git\/?$/, '')
}

export async function projectRoot($: EngineInterface): Promise<string> {
  const { stdout } = await runner($)(['git', 'rev-parse', '--show-toplevel'])
  return stdout.trim()
}
