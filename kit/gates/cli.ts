import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { checkSpec, GATES, STEPS, type GateId, type Report } from './validate'

const args = process.argv.slice(2)
const flag = (name: string) => args.includes(name)
const value = (name: string) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : undefined
}

if (flag('--help')) {
  console.log(`demo-gates [path/to/demo-spec.json] [--spec] [--step N] [--all-samples] [--json]

  (default)       Full check of pack/demo-spec.json. Exits 1 on any error.
  --spec          Wizard mode: checks only the steps marked completed.
  --step N        With --spec, checks steps 1..N.
  --all-samples   Also checks every samples/*/demo-spec.json.
  --json          Machine-readable output.`)
  process.exit(0)
}

const cwd = process.cwd()
const explicit = args.find((a) => a.endsWith('.json'))
const targets = [resolve(cwd, explicit ?? 'pack/demo-spec.json')]
if (flag('--all-samples') && existsSync(join(cwd, 'samples')))
  for (const d of readdirSync(join(cwd, 'samples'))) {
    const p = join(cwd, 'samples', d, 'demo-spec.json')
    if (existsSync(p)) targets.push(p)
  }

const partial = flag('--spec')
const stepArg = value('--step')
let failed = false
const results: { file: string; report: Report }[] = []

for (const file of targets) {
  if (!existsSync(file)) {
    console.error(`No spec at ${relative(cwd, file)}`)
    process.exit(2)
  }
  const spec = JSON.parse(readFileSync(file, 'utf8'))
  const assetExists = (p: string) => existsSync(join(cwd, 'public', p.replace(/^\.?\//, '')))
  const report = checkSpec(spec, { assetExists, ...(partial ? { upToStep: stepArg ? Number(stepArg) : 9 } : {}) })
  results.push({ file: relative(cwd, file), report })
  if (report.issues.some((i) => i.level === 'error')) failed = true
}

if (flag('--json')) {
  console.log(JSON.stringify(results, null, 2))
  process.exit(failed ? 1 : 0)
}

const green = (s: string) => `\x1b[32m${s}\x1b[0m`
const red = (s: string) => `\x1b[31m${s}\x1b[0m`
const amber = (s: string) => `\x1b[33m${s}\x1b[0m`
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`

for (const { file, report } of results) {
  console.log(`\n${file}${partial ? dim(`  (wizard steps checked: ${report.stepsChecked.map((s) => `${s} ${STEPS[s]}`).join(', ') || 'none'})`) : ''}`)
  for (const [gate, title] of Object.entries(GATES) as [GateId, string][]) {
    const mine = report.issues.filter((i) => i.gate === gate)
    const errors = mine.filter((i) => i.level === 'error')
    const warns = mine.filter((i) => i.level === 'warn')
    const mark = errors.length ? red('✗') : warns.length ? amber('!') : green('✓')
    console.log(`  ${mark} ${title}${mine.length ? dim(`  ${errors.length} error(s), ${warns.length} warning(s)`) : ''}`)
    for (const i of mine) console.log(`      ${i.level === 'error' ? red('error') : amber('warn ')} ${dim(i.path)}  ${i.message}`)
  }
  const n = report.assumptions.length
  console.log(`  ${n ? amber('i') : green('✓')} Assumed values: ${n}${n ? dim('  (listed at review and in the presenter notes)') : ''}`)
  for (const a of report.assumptions) console.log(`      ${dim(a.path)}  ${a.label}${a.why ? dim(` — ${a.why}`) : ''}`)
}
console.log(failed ? red('\nGates failed.') : green('\nAll gates passed.'))
process.exit(failed ? 1 : 0)
