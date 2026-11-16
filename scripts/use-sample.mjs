// Loads a sample (or the blank wizard spec) into pack/: npm run use-sample -- water|telecom|blank [--force]
import { copyFileSync, existsSync, readdirSync, readFileSync } from 'node:fs'

const name = process.argv[2]
const force = process.argv.includes('--force')
const samples = readdirSync('samples').filter((d) => existsSync(`samples/${d}/demo-spec.json`))
const source = name === 'blank' ? 'kit/starters/blank-spec.json' : `samples/${name}/demo-spec.json`

if (!name || !existsSync(source)) {
  console.error(`Usage: npm run use-sample -- <${[...samples, 'blank'].join('|')}> [--force]`)
  process.exit(2)
}

const current = existsSync('pack/demo-spec.json') ? readFileSync('pack/demo-spec.json', 'utf8') : ''
const isSample = !current || ['kit/starters/blank-spec.json', ...samples.map((d) => `samples/${d}/demo-spec.json`)].some((p) => readFileSync(p, 'utf8') === current)
if (!isSample && !force) {
  console.error('pack/demo-spec.json has your own work in it. Commit it or save it under samples/<name>/ first, or pass --force to overwrite.')
  process.exit(1)
}

copyFileSync(source, 'pack/demo-spec.json')
console.log(`pack/demo-spec.json now holds ${name === 'blank' ? 'the blank wizard spec' : `the ${name} sample`}.`)
