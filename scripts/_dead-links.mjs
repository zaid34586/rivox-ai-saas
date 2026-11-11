// One-off: verify every internal href in src points at a route that exists.
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'

// --- collect real routes from the app dir ---
const routes = new Set()
function collect(dir, prefix) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name === 'api') continue
      const seg = e.name.startsWith('[') ? '*' : e.name
      collect(p, `${prefix}/${seg}`)
    } else if (e.name === 'page.tsx' || e.name === 'page.ts') {
      routes.add(prefix || '/')
    }
  }
}
collect('src/app', '')

// --- collect hrefs ---
const files = []
function walk(d) {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, e.name)
    if (e.isDirectory()) walk(p)
    else if (/\.(tsx|ts)$/.test(e.name)) files.push(p)
  }
}
walk('src')

const re = /href\s*[:=]\s*\{?\s*["'`](\/[^"'`\s}]*)["'`]/g
const problems = []
for (const f of files) {
  const t = readFileSync(f, 'utf8')
  let m
  re.lastIndex = 0
  while ((m = re.exec(t))) {
    const raw = m[1]
    const path = raw.split(/[?#]/)[0].replace(/\/+$/, '') || '/'
    if (routes.has(path)) continue
    // dynamic route match: /team/abc -> /team/*
    const dynamic = [...routes].some((r) => r.includes('*') &&
      new RegExp('^' + r.replace(/\/\*$/, '/[^/]+') + '$').test(path))
    if (dynamic) continue
    const line = t.slice(0, m.index).split('\n').length
    problems.push(`${relative('.', f)}:${line}  ${raw}`)
  }
}

if (problems.length === 0) {
  console.log('OK — all internal hrefs resolve to real routes.')
} else {
  console.log(`BROKEN HREFS (${problems.length}):`)
  for (const p of problems) console.log('  ' + p)
  process.exitCode = 1
}
