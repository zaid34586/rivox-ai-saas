// One-off: print eslint error breakdown (for baseline vs after comparison).
import { execSync } from 'node:child_process'
import { writeFileSync, readFileSync, rmSync } from 'node:fs'

try {
  execSync('npx eslint . -f json -o eslint-tmp.json', { stdio: 'ignore' })
} catch {
  // eslint exits non-zero when it finds problems — the report file is written anyway
}
const raw = readFileSync('eslint-tmp.json', 'utf8').replace(/^﻿/, '')
rmSync('eslint-tmp.json')

const report = JSON.parse(raw)
const counts = new Map()
const warnings = new Map()
let errors = 0
let warn = 0
for (const f of report) {
  for (const m of f.messages) {
    if (m.severity === 2) {
      errors++
      counts.set(m.ruleId, (counts.get(m.ruleId) || 0) + 1)
    } else {
      warn++
      warnings.set(m.ruleId, (warnings.get(m.ruleId) || 0) + 1)
    }
  }
}
console.log(`TOTAL: ${errors} errors, ${warn} warnings`)
console.log('\nERRORS by rule:')
for (const [k, v] of [...counts].sort((a, b) => b[1] - a[1])) console.log(`  ${String(v).padStart(3)}  ${k}`)
console.log('\nWARNINGS by rule:')
for (const [k, v] of [...warnings].sort((a, b) => b[1] - a[1])) console.log(`  ${String(v).padStart(3)}  ${k}`)

// per-file error list for quick inspection
const files = report.filter((f) => f.messages.some((m) => m.severity === 2))
writeFileSync('eslint-errors.txt', files.map((f) => `${f.errorCount}  ${f.filePath}`).join('\n'))
console.log(`\nfiles with errors: ${files.length} (listed in eslint-errors.txt)`)
