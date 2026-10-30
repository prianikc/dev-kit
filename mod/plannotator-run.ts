import type { EngineInterface, HookStream, ProcessSpawnChunk, ProcessSpawnResult } from 'claude-code'
import { annotations, decisionOf, fixResult, hotspotAnnotations, parseMessage, reconcile, type Finding, type Hotspot, type Texts } from './plannotator.ts'
import { projectRoot, runner } from './git.ts'

const SESSION_POLLS = 20
const SESSION_POLL_MS = 500
const RUN_POLL_MS = 5000

export type PlannotatorMode = 'review' | 'fix'

export interface PlannotatorChild {
  stop: () => void
  mode: PlannotatorMode
  started: boolean
  exit?: number | null
  url?: string
}

export const plannotatorChildren = new Map<number, PlannotatorChild>()

function runDir(root: string, pr: number): string {
  return `${root}/.review-kit/run/${pr}`
}

async function readJson<T>($: EngineInterface, path: string, fallback: T): Promise<T> {
  return $.fs.read(path).then(text => JSON.parse(String(text)) as T, () => fallback)
}

function wake($: EngineInterface, text: string): void {
  $.prompt.submit({ text }).catch(error => $.ui.log(`dev-kit: prompt.submit не прошёл: ${String(error)}`))
}

export async function kitRunActive($: EngineInterface, root: string, pr: number): Promise<boolean> {
  return (await readJson<{ status?: string }>($, `${runDir(root, pr)}/session.json`, {})).status === 'active'
}

export function watchRun($: EngineInterface, { root, pr, alive, stop }: { root: string; pr: number; alive: () => boolean; stop: () => void }): void {
  const tick = async () => {
    if (!alive()) return
    if (!(await kitRunActive($, root, pr))) return stop()
    $.clock.after(RUN_POLL_MS, () => void tick())
  }
  $.clock.after(RUN_POLL_MS, () => void tick())
}

export function reviewPool(stored: { findings?: Finding[]; belowBar?: Finding[]; unconfirmed?: Finding[] }): Finding[] {
  return [...(stored.findings ?? []), ...(stored.belowBar ?? []).map(item => ({ ...item, mark: item.mark ?? 'ниже порога' })), ...(stored.unconfirmed ?? [])]
}

export function lineCount(text: string): number {
  if (text === '') return 0
  const lines = text.split(/\r\n|\r|\n/)
  return lines[lines.length - 1] === '' ? lines.length - 1 : lines.length
}

export async function settlePlannotator($: EngineInterface, { pr, root, dir, stdout, code }: { pr: number; root: string; dir: string; stdout: string; code: number | null }): Promise<void> {
  const child = plannotatorChildren.get(pr)
  if (!child) return
  plannotatorChildren.delete(pr)
  if (!child.started) {
    child.exit = code
    return
  }
  if (!(await kitRunActive($, root, pr))) return

  const ext = `${dir}/ext/plannotator`
  if (child.mode === 'fix') return settleFix($, { pr, ext, stdout, code })
  const step = 'Continue dev-kit:plannotator-publish step 3'
  if (code !== 0) return wake($, `Plannotator result for PR ${pr}: failed — Plannotator завершился с кодом ${code}. ${step}.`)
  await $.fs.write(`${ext}/decision.out`, stdout)
  try {
    const record = decisionOf(stdout)
    const posted = JSON.parse(String(await $.fs.read(`${ext}/items.json`))) as Finding[]
    const texts = JSON.parse(String(await $.fs.read(`${dir}/texts.json`))) as Texts
    const result = reconcile(record.decision, parseMessage(record.message ?? ''), posted, texts)
    await $.fs.write(`${ext}/texts.json`, JSON.stringify(result.texts, null, 2))
    await $.fs.write(`${ext}/findings.json`, JSON.stringify({ findings: result.findings }, null, 2))
    await $.fs.write(`${ext}/result.json`, JSON.stringify({ decision: record.decision, ids: result.ids }, null, 2))
    wake($, `Plannotator result for PR ${pr}: ${record.decision}, ids ${result.ids.join(',') || '—'}. ${step}: .review-kit/run/${pr}/ext/plannotator/result.json`)
  } catch (error) {
    wake($, `Plannotator result for PR ${pr}: failed — ${(error as Error).message}. ${step}.`)
  }
}

export async function settleFix($: EngineInterface, { pr, ext, stdout, code }: { pr: number; ext: string; stdout: string; code: number | null }): Promise<void> {
  const step = 'Continue dev-kit:plannotator-fix step 2'
  if (code !== 0) return wake($, `Plannotator result for PR ${pr} (fix): failed — Plannotator завершился с кодом ${code}. ${step}.`)
  await $.fs.write(`${ext}/decision.out`, stdout)
  try {
    const { summary, feedback } = fixResult(decisionOf(stdout))
    await $.fs.write(`${ext}/feedback.md`, `${feedback}\n`)
    await $.fs.write(`${ext}/result.json`, JSON.stringify(summary, null, 2))
    wake($, `Plannotator result for PR ${pr} (fix): ${summary.decision}. ${step}: .review-kit/run/${pr}/ext/plannotator/result.json`)
  } catch (error) {
    wake($, `Plannotator result for PR ${pr} (fix): failed — ${(error as Error).message}. ${step}.`)
  }
}

export async function watchPlannotator($: EngineInterface, { pr, root, dir, stream }: { pr: number; root: string; dir: string; stream: HookStream<ProcessSpawnChunk, ProcessSpawnResult> }): Promise<void> {
  const out: string[] = []
  try {
    for (;;) {
      const step = await stream.next()
      if (step.done) return await settlePlannotator($, { pr, root, dir, stdout: out.join(''), code: step.value?.code ?? null })
      if (step.value.stream === 'stdout') out.push(step.value.text)
    }
  } catch (error) {
    await settlePlannotator($, { pr, root, dir, stdout: '', code: null }).catch(() => undefined)
    $.ui.log(`dev-kit: Plannotator: ${String(error)}`)
  }
}

export async function reviewAnnotations($: EngineInterface, dir: string): Promise<string> {
  const findings = reviewPool(JSON.parse(String(await $.fs.read(`${dir}/findings.json`))) as { findings?: Finding[]; belowBar?: Finding[]; unconfirmed?: Finding[] })
  const texts = JSON.parse(String(await $.fs.read(`${dir}/texts.json`))) as Texts
  await $.fs.write(`${dir}/ext/plannotator/items.json`, JSON.stringify(findings, null, 2))
  return JSON.stringify(annotations(findings, texts))
}

export async function hotspotBody($: EngineInterface, dir: string): Promise<ReturnType<typeof hotspotAnnotations>> {
  const items = (await readJson<{ items?: Hotspot[] }>($, `${dir}/hotspots.json`, {})).items ?? []
  if (items.length === 0) return { annotations: [], skipped: [] }
  const { base, head } = JSON.parse(String(await $.fs.read(`${dir}/context.json`))) as { base: string; head: string }
  const run = runner($)
  const changed = new Set((await run(['git', 'diff', '--name-only', '-z', '--no-renames', base, head])).stdout.split('\0').filter(Boolean))
  const files = [...new Set(items.map(item => item.file))].filter(file => changed.has(file))
  const counts = new Map(await Promise.all(files.map(async file => [file, lineCount((await run(['git', 'show', `${head}:${file}`])).stdout)] as const)))
  return hotspotAnnotations(items, counts)
}

export function hotspotNote({ annotations: added, skipped }: ReturnType<typeof hotspotAnnotations>): string {
  return `узких мест гайда ${added.length}${skipped.length ? `, пропущено (не строка PR): ${skipped.join(', ')}` : ''}`
}

export async function addHotspots($: EngineInterface, { pr, dir, url }: { pr: number; dir: string; url: string }): Promise<string> {
  const spots = await hotspotBody($, dir)
  if (spots.annotations.length === 0) return `not added: узких мест гайда для PR ${pr} нет${spots.skipped.length ? ` (пропущено: ${spots.skipped.join(', ')})` : ''}`
  const posted = await $.http.fetch(`${url}/api/external-annotations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ source: 'review-kit', annotations: spots.annotations }) })
  return posted.ok ? `added: в Plannotator ${hotspotNote(spots)}` : `not added: Plannotator не принял аннотации (${posted.status})`
}

export function sessionProject(root: string): string {
  return (root.split('/').pop() ?? '').toLowerCase().replace(/[\s_]+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-')
}

export async function sessionUrls($: EngineInterface, project: string): Promise<string[]> {
  const { stdout, stderr } = await runner($)(['plannotator', 'sessions'])
  return `${stdout}\n${stderr}`.split('\n').map(line => line.trim().split(/\s+/)).filter(cols => cols[1] === 'review' && cols[2] === project).map(cols => cols[3])
}

export async function awaitSessionUrl($: EngineInterface, { project, child }: { project: string; child: PlannotatorChild }): Promise<string | undefined> {
  for (let poll = 0; poll < SESSION_POLLS && child.exit === undefined; poll++) {
    const urls = await sessionUrls($, project)
    if (urls.length > 1) return undefined
    if (urls.length === 1) return urls[0]
    await $.clock.sleep(SESSION_POLL_MS)
  }
  return undefined
}

export async function openPlannotator($: EngineInterface, pr: number, mode: PlannotatorMode, hotspots: boolean): Promise<string> {
  const root = await projectRoot($)
  const dir = runDir(root, pr)
  if (!(await kitRunActive($, root, pr))) return `unavailable: нет активного прогона review-kit для PR ${pr} в этом дереве`
  const context = await readJson<{ base?: string; isOwn?: boolean; state?: string }>($, `${dir}/context.json`, {})
  if (mode === 'review' && (context.isOwn || context.state === 'closed')) return 'unavailable: свой или закрытый PR не публикуется — только отчёт'
  if (mode === 'fix' && (!context.isOwn || context.state === 'closed')) return 'unavailable: раунд правок — только свой открытый PR'
  const open = plannotatorChildren.get(pr)
  if (open?.started && open.url && open.mode === 'review' && mode === 'review' && hotspots) return addHotspots($, { pr, dir, url: open.url })
  if (open) return `unavailable: Plannotator по PR ${pr} уже открыт — дождитесь итога`

  const project = sessionProject(root)
  if ((await sessionUrls($, project)).length > 0) return 'unavailable: в этом дереве уже открыта сессия Plannotator — закройте её'
  const findingsBody = mode === 'fix' ? '' : await reviewAnnotations($, dir)
  const spots = mode === 'review' && hotspots ? await hotspotBody($, dir) : undefined
  const body = spots ? JSON.stringify({ ...JSON.parse(findingsBody), annotations: [...JSON.parse(findingsBody).annotations, ...spots.annotations] }) : findingsBody
  const argv = mode === 'fix' ? ['plannotator', 'review', '--diff-type', 'uncommitted', '--json'] : ['plannotator', 'review', '--base', String(context.base), '--diff-type', 'branch', '--json']

  const stream = $.process.spawn({ argv, cwd: root })
  const child: PlannotatorChild = {
    mode,
    stop: () => {
      plannotatorChildren.delete(pr)
      void stream.return(undefined as unknown as ProcessSpawnResult).catch(() => undefined)
    },
    started: false,
  }
  plannotatorChildren.set(pr, child)
  void watchPlannotator($, { pr, root, dir, stream })

  try {
    const url = await awaitSessionUrl($, { project, child })
    if (child.exit !== undefined) return `unavailable: Plannotator завершился до открытия сессии (код ${child.exit})`
    if (!url) return 'unavailable: сессия Plannotator не найдена (или их несколько)'
    if (mode === 'review') {
      const posted = await $.http.fetch(`${url}/api/external-annotations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
      if (!posted.ok) return `unavailable: Plannotator не принял аннотации (${posted.status})`
    }
    if (child.exit !== undefined) return `unavailable: Plannotator завершился до открытия сессии (код ${child.exit})`

    child.started = true
    child.url = url
    watchRun($, { root, pr, alive: () => plannotatorChildren.get(pr) === child, stop: child.stop })
    const count = mode === 'fix' ? 0 : (JSON.parse(body) as { annotations: unknown[] }).annotations.length
    return `started: Plannotator открыт — ${url}, аннотаций ${count}${spots ? ` (${hotspotNote(spots)})` : ''}. Итог придёт отдельным сообщением; закончи ход и ничего не делай.`
  } finally {
    if (!child.started) child.stop()
  }
}
