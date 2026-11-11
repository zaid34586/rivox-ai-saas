// One-off: optimizer/page.tsx — <a href> (internal) -> next/link <Link>,
// plus dead-href fixes. Re-running is a no-op (no <a href> left).
import { readFileSync, writeFileSync } from 'node:fs'

const f = 'src/app/dashboard/optimizer/page.tsx'
let t = readFileSync(f, 'utf8')
const before = t

// 1. dead routes -> the budgets page (it owns the Set Budget / Edit dialog)
t = t.replaceAll('href="/dashboard/optimizer/budgets/new"', 'href="/dashboard/optimizer/budgets"')
t = t.replaceAll('href={`/dashboard/optimizer/budgets/${budget.id}`}', 'href="/dashboard/optimizer/budgets"')

// 2. anchor -> Link
const openCount = (t.match(/<a href=/g) || []).length
const closeCount = (t.match(/<\/a>/g) || []).length
t = t.replaceAll('<a href=', '<Link href=')
t = t.replaceAll('</a>', '</Link>')

// 3. import
if (!t.includes("from 'next/link'")) {
  t = t.replace("import { createClient } from '@/lib/supabase'", "import Link from 'next/link'\nimport { createClient } from '@/lib/supabase'")
}

writeFileSync(f, t)
console.log(`anchors: ${openCount} open / ${closeCount} close; changed=${t !== before}`)
