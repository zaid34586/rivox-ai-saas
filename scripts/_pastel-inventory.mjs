// One-off: inventory of pastel (light-theme) badge colors in tsx files.
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'

const files = []
const walk = (d) => {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, e.name)
    if (e.isDirectory()) walk(p)
    else if (/\.tsx$/.test(e.name)) files.push(p)
  }
}
walk('src')

const counts = new Map() // token -> count
const where = new Map() // token -> Set(file)
const re = /(?:bg|text|border)-(?:emerald|red|amber|blue|purple|cyan|pink|indigo|green|orange|gray|slate|zinc|teal|violet|lime|yellow)-(?:50|100|200|300|500|600|700)\b/g

for (const f of files) {
  const t = readFileSync(f, 'utf8')
  let m
  re.lastIndex = 0
  while ((m = re.exec(t))) {
    const tok = m[0]
    counts.set(tok, (counts.get(tok) || 0) + 1)
    if (!where.has(tok)) where.set(tok, new Set())
    where.get(tok).add(relative('.', f))
  }
}

const sorted = [...counts].sort((a, b) => b[1] - a[1])
for (const [tok, n] of sorted) {
  console.log(String(n).padStart(4), tok.padEnd(28), [...where.get(tok)].join(', '))
}
console.log('distinct:', sorted.length, 'total:', sorted.reduce((s, [, n]) => s + n, 0))
