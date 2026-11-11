// One-off: convert internal <a href="/…"> anchors to next/link <Link>.
// Only files whose anchors are ALL internal are listed. Re-run is a no-op.
import { readFileSync, writeFileSync } from 'node:fs'

const files = [
  'src/app/dashboard/calendar/page.tsx',
  'src/app/auth/login/page.tsx',
  'src/app/dashboard/team/page.tsx',
  'src/app/dashboard/optimizer/rules/page.tsx',
  'src/app/dashboard/schedule/page.tsx',
  'src/components/ui/error-boundary.tsx',
]

function ensureLinkImport(t) {
  if (/from ['"]next\/link['"]/.test(t)) return t
  const m = t.match(/^('use client'\s*\n)/)
  if (m) return t.replace(m[1], m[1] + "import Link from 'next/link'\n")
  return "import Link from 'next/link'\n" + t
}

for (const f of files) {
  const before = readFileSync(f, 'utf8')
  // sanity: no hash/external anchors that must stay <a>
  const all = [...before.matchAll(/<a href=\{?["'`]([^"'`]*)/g)].map((m) => m[1])
  const bad = all.filter((h) => !h.startsWith('/'))
  if (bad.length) {
    console.log(`SKIP ${f} — non-internal anchors: ${bad.join(', ')}`)
    continue
  }
  let t = before
    .replaceAll('<a href=', '<Link href=')
    .replaceAll('</a>', '</Link>')
  t = ensureLinkImport(t)
  writeFileSync(f, t)
  console.log(`OK   ${f} — ${all.length} anchor(s)`)
}
