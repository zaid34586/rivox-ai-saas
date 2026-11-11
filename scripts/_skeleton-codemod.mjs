// One-off: swap the centred Loader2 spinner for the unused <PageSkeleton />
// loading state across dashboard pages. Only rewrites blocks that are the
// entire body of an `if (loading) return ( … )`, so nothing else is touched.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const files = []
function walk(d) {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, e.name)
    if (e.isDirectory()) walk(p)
    else if (e.name === 'page.tsx') files.push(p)
  }
}
walk('src/app/dashboard')

const blockRe =
  /([ \t]*)<div className="flex items-center justify-center h-64">\s*\n\s*<Loader2 className="h-8 w-8 animate-spin text-primary" \/>\s*\n\s*<\/div>/

let done = 0
for (const f of files) {
  const text = readFileSync(f, 'utf8')
  const m = blockRe.exec(text)
  if (!m) continue

  const beforeReturn = text.slice(0, m.index).trimEnd()
  const afterBlock = text.slice(m.index + m[0].length)
  const isWholeBody = beforeReturn.endsWith('return (') && /^\s*\)/.test(afterBlock)
  if (!isWholeBody) {
    console.log(`SKIP ${relative('.', f)} — spinner is not the whole loading return`)
    continue
  }

  let t = text.slice(0, m.index) + m[1] + '<PageSkeleton />' + text.slice(m.index + m[0].length)

  // import PageSkeleton — insert before the first `import` line so a
  // leading 'use client' directive is never displaced (and CRLF is safe)
  if (!/from ['"]@\/components\/ui\/skeleton['"]/.test(t)) {
    const line = "import { PageSkeleton } from '@/components/ui/skeleton'\n"
    const idx = t.search(/^import /m)
    t = idx >= 0 ? t.slice(0, idx) + line + t.slice(idx) : line + t
  }

  // drop Loader2 from the lucide import if it is no longer referenced
  if ((t.match(/\bLoader2\b/g) || []).length === 1) {
    t = t.replace(/import \{([^}]*)\} from 'lucide-react'\n?/, (full, inner) => {
      const kept = inner.split(',').map((s) => s.trim()).filter((s) => s && s !== 'Loader2')
      return kept.length ? `import { ${kept.join(', ')} } from 'lucide-react'` : ''
    })
  }

  writeFileSync(f, t)
  done++
  console.log(`OK   ${relative('.', f)}`)
}
console.log(`\n${done} files updated`)
