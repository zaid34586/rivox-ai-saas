// One-off codemod: pastel (light-theme) status/platform chips -> semantic
// token-based soft badges. Safe to run once; re-running is a no-op because
// every rule rewrites to tokens that match none of the source patterns.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
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

// [pattern, replacement] — order matters (specific first).
const rules = [
  // Success family (emerald / green)
  [/\bbg-(?:emerald|green)-50\b/g, 'bg-success-soft'],
  [/\bbg-(?:emerald|green)-100\b/g, 'bg-success-soft'],
  [/\btext-(?:emerald|green)-700\b/g, 'text-success-foreground'],
  [/\btext-(?:emerald|green)-(?:600|500)\b/g, 'text-success'],
  [/\bborder-(?:emerald|green)-200\b/g, 'border-success/30'],
  [/\bborder-(?:emerald|green)-500\b/g, 'border-success'],

  // Error family (red)
  [/\bbg-red-50\b/g, 'bg-error-soft'],
  [/\bbg-red-100\b/g, 'bg-error-soft'],
  [/\btext-red-700\b/g, 'text-error-foreground'],
  [/\btext-red-(?:600|500)\b/g, 'text-error'],
  [/\bborder-red-200\b/g, 'border-error/30'],
  [/\bborder-red-500\b/g, 'border-error'],

  // Warning family (amber / orange)
  [/\bbg-(?:amber|orange)-50\b/g, 'bg-warning-soft'],
  [/\bbg-(?:amber|orange)-100\b/g, 'bg-warning-soft'],
  [/\btext-(?:amber|orange)-700\b/g, 'text-warning-foreground'],
  [/\btext-(?:amber|orange)-(?:600|500)\b/g, 'text-warning'],
  [/\bborder-amber-300\b/g, 'border-warning/40'],
  [/\bborder-amber-500\b/g, 'border-warning'],

  // Info family (blue / indigo)
  [/\bbg-(?:blue|indigo)-100\b/g, 'bg-info-soft'],
  [/\btext-(?:blue|indigo)-700\b/g, 'text-info-foreground'],
  [/\btext-(?:blue|indigo)-(?:600|500)\b/g, 'text-info'],
  [/\bborder-blue-500\b/g, 'border-info'],

  // Neutral family (gray / purple / violet / pink)
  [/\bbg-(?:gray|slate|zinc|purple|violet|pink)-100\b/g, 'bg-muted'],
  [/\btext-(?:gray|slate|zinc|purple|violet|pink)-(?:700|600)\b/g, 'text-muted-foreground'],
  [/\bborder-gray-300\b/g, 'border-border'],
]

let changedFiles = 0
let totalReplacements = 0

for (const f of files) {
  const before = readFileSync(f, 'utf8')
  let after = before
  let count = 0
  for (const [re, to] of rules) {
    after = after.replace(re, (m) => {
      count++
      return to
    })
  }
  if (after !== before) {
    writeFileSync(f, after)
    changedFiles++
    totalReplacements += count
    console.log(`${String(count).padStart(4)}  ${relative('.', f)}`)
  }
}

console.log(`\n${totalReplacements} replacements in ${changedFiles} files`)
