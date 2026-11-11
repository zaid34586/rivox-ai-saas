#!/usr/bin/env node
/**
 * audit-classes.mjs — reports class tokens used in UI source that do NOT
 * exist in the compiled Tailwind stylesheet (run `npm run build` first).
 *
 * How it works
 *   1. Scans every string literal in src/app (minus api/) and
 *      src/components with a small hand-written scanner — a single regex
 *      backtracks catastrophically on backslash-heavy files. Template
 *      literals are recursed into so classes hidden inside ${...}
 *      conditionals are audited too. Attribute values that are never
 *      classes (id=, htmlFor=, href=, placeholder=, ...) are skipped.
 *   2. Filters tokens through a Tailwind shape check: known variant
 *      prefixes (hover:, data-[...]:, sm:, ...) plus a value-shape check
 *      per utility prefix. This drops prose ("low-competition"), data
 *      strings, SVG path fragments and import specifiers without needing
 *      to know what they are.
 *   3. Looks each surviving token up as an escaped selector in the CSS
 *      emitted by `next build` (.next/static, .next/dev fallback).
 *
 * Usage:  node scripts/audit-classes.mjs   (exit 1 when unknown found)
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()
const SRC = join(ROOT, 'src')

/* ------------------------------------------------------------------ *
 * 1. String extraction
 * ------------------------------------------------------------------ */

function readSimple(text, i, end) {
  const quote = text[i]
  let j = i + 1
  let buf = ''
  while (j < end) {
    const c = text[j]
    if (c === '\\') { buf += text[j + 1] ?? ''; j += 2; continue }
    if (c === quote) return { body: buf, next: j + 1 }
    if (c === '\n') return { body: buf, next: j } // unterminated — stop
    buf += c
    j++
  }
  return { body: buf, next: end }
}

/** Skip a balanced region. Callers pass the position *after* the opening
 *  delimiter (e.g. inside `${…`), so depth starts at 1. */
function skipBalanced(text, i, end, open, close) {
  let depth = 1
  let j = i
  while (j < end) {
    const c = text[j]
    if (c === '\\') { j += 2; continue }
    if (c === '"' || c === "'") { j = readSimple(text, j, end).next; continue }
    if (c === '`') { j = skipTemplate(text, j, end); continue }
    if (c === open) depth++
    else if (c === close) { depth--; if (depth === 0) return j + 1 }
    j++
  }
  return end
}

function skipTemplate(text, i, end) {
  let j = i + 1
  while (j < end) {
    const c = text[j]
    if (c === '\\') { j += 2; continue }
    if (c === '`') return j + 1
    if (c === '$' && text[j + 1] === '{') {
      j = skipBalanced(text, j + 2, end, '{', '}')
      continue
    }
    j++
  }
  return end
}

/** Attribute values that are never class lists. */
const NON_CLASS_ATTRS = [
  'id=', 'htmlFor=', 'name=', 'href=', 'src=', 'action=',
  'placeholder=', 'alt=', 'title=', 'aria-labelledby=',
  'aria-describedby=', 'aria-controls=', 'aria-activedescendant=',
]

function scanFileStrings(text, out) {
  let i = 0
  const n = text.length
  while (i < n) {
    // Skip non-class attribute values wholesale.
    let skipped = false
    for (const attr of NON_CLASS_ATTRS) {
      if (text.startsWith(attr, i)) {
        let j = i + attr.length
        while (j < n && /\s/.test(text[j])) j++
        if (text[j] === '"' || text[j] === "'") {
          const r = readSimple(text, j, n)
          i = r.next
          skipped = true
        } else {
          i = i + attr.length
        }
        break
      }
    }
    if (skipped) continue

    const c = text[i]
    if (c === '/' && text[i + 1] === '/') {
      while (i < n && text[i] !== '\n') i++
      continue
    }
    if (c === '/' && text[i + 1] === '*') {
      i += 2
      while (i < n && !(text[i] === '*' && text[i + 1] === '/')) i++
      i += 2
      continue
    }
    if (c === '"' || c === "'") {
      const r = readSimple(text, i, n)
      out.push(r.body)
      i = r.next
      continue
    }
    if (c === '`') {
      let j = i + 1
      let buf = ''
      while (j < n) {
        const ch = text[j]
        if (ch === '\\') { buf += text[j + 1] ?? ''; j += 2; continue }
        if (ch === '`') { j++; break }
        if (ch === '$' && text[j + 1] === '{') {
          const innerStart = j + 2
          const innerEnd = skipBalanced(text, innerStart, n, '{', '}') - 1
          scanFileStrings(text.slice(innerStart, innerEnd), out)
          buf += ' ' // interpolation handled above; keep raw code out of buf
          j = innerEnd + 1
          continue
        }
        buf += ch
        j++
      }
      out.push(buf)
      i = j
      continue
    }
    i++
  }
}

/* ------------------------------------------------------------------ *
 * 2. Shape filter — is this token plausibly a Tailwind class?
 * ------------------------------------------------------------------ */

const VARIANTS = new Set([
  'hover', 'focus', 'focus-visible', 'focus-within', 'active', 'visited',
  'checked', 'required', 'invalid', 'indeterminate', 'empty', 'target',
  'open', 'disabled', 'enabled', 'first', 'last', 'only', 'odd', 'even',
  'placeholder', 'placeholder-shown', 'file', 'selection', 'marker',
  'before', 'after', 'group-hover', 'group-focus', 'group-focus-visible',
  'group-focus-within', 'group-active', 'group-disabled', 'group-checked',
  'group-open', 'group-required', 'group-invalid', 'peer-focus',
  'peer-checked', 'peer-disabled', 'peer-invalid', 'peer-required',
  'peer-placeholder-shown', 'peer-active', 'aria-busy', 'aria-checked',
  'aria-disabled', 'aria-expanded', 'aria-hidden', 'aria-invalid',
  'aria-pressed', 'aria-readonly', 'aria-required', 'aria-selected',
  'aria-modal', 'dark', 'motion-safe', 'motion-reduce', 'contrast-more',
  'contrast-less', 'print', 'rtl', 'ltr', 'sm', 'md', 'lg', 'xl', '2xl',
  'max-sm', 'max-md', 'max-lg', 'max-xl', 'max-2xl',
])

const ARBITRARY_VARIANT =
  /^(\[&.*\]|(data|aria|group|peer|has|not|supports|min|max|nth)-\[.*\]|(group|peer)-(data|aria|has|not)-\[.*\])$/

/* Loose prefixes: any lowercase value is plausible (colour/size/animation
   families). Prose collisions are prevented by the prefix itself. */
const LOOSE_PREFIXES = [
  'bg-', 'text-', 'border-', 'from-', 'via-', 'to-', 'fill-', 'stroke-',
  'decoration-', 'accent-', 'caret-', 'ring-', 'ring-offset-', 'outline-',
  'placeholder-', 'shadow-', 'drop-shadow-', 'mix-blend-', 'bg-blend-',
  'object-', 'overflow-', 'overscroll-', 'scroll-', 'snap-', 'cursor-',
  'select-', 'resize-', 'appearance-', 'pointer-events-', 'touch-',
  'will-change-', 'transition-', 'duration-', 'delay-', 'ease-',
  'animate-', 'backdrop-', 'blur-', 'brightness-', 'contrast-', 'grayscale-',
  'hue-rotate-', 'invert-', 'saturate-', 'sepia-', 'filter-', 'opacity-',
  'flex-', 'items-', 'justify-', 'self-', 'content-', 'place-',
  'place-items-', 'place-content-', 'place-self-', 'whitespace-', 'break-',
  'list-', 'underline-offset-', 'line-clamp-', 'columns-', 'divide-',
  'rounded-', 'aspect-', 'leading-', 'tracking-', 'order-', 'indent-',
  'basis-', 'gap-', 'gap-x-', 'gap-y-', 'space-x-', 'space-y-',
  'grid-cols-', 'grid-rows-', 'col-span-', 'row-span-', 'col-start-',
  'col-end-', 'row-start-', 'row-end-', 'auto-cols-', 'auto-rows-',
  // enter/exit animation helpers from tailwindcss-animate
  'fade-in-', 'fade-out-', 'zoom-in-', 'zoom-out-', 'slide-in-from-',
  'slide-out-to-', 'spin-in-', 'spin-out-', 'fill-mode-',
  // project-specific component classes
  'btn-', 'badge-', 'card-', 'avatar-', 'input-', 'dropdown-', 'table-',
  'scrollbar-', 'text-clamp-',
]

/* Strict prefixes: short/high-collision stems whose values must look like
   numbers or known keywords, so prose ("my-agency", "top-down",
   "font-src") is rejected. */
const STRICT_PREFIXES = [
  'p-', 'px-', 'py-', 'pt-', 'pb-', 'pl-', 'pr-', 'ps-', 'pe-',
  'm-', 'mx-', 'my-', 'mt-', 'mb-', 'ml-', 'mr-', 'ms-', 'me-',
  'w-', 'h-', 'min-w-', 'min-h-', 'max-w-', 'max-h-', 'size-',
  'inset-', 'inset-x-', 'inset-y-', 'top-', 'right-', 'bottom-', 'left-',
  'start-', 'end-', 'z-', 'font-', 'translate-', 'translate-x-',
  'translate-y-', 'rotate-', 'skew-', 'scale-', 'scale-x-', 'scale-y-',
]

const STRICT_KEYWORDS = new Set([
  'px', 'full', 'screen', 'auto', 'min', 'max', 'fit', 'none',
  'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl',
  '8xl', '9xl', 'svh', 'svw', 'dvh', 'dvw', 'lvh', 'lvw',
  'solid', 'dashed', 'dotted', 'double',
  'bold', 'medium', 'semibold', 'extrabold', 'black', 'light', 'normal',
  'serif', 'mono', 'sans',
  'center', 'start', 'end', 'between', 'around', 'evenly', 'baseline',
  'stretch', 'top', 'bottom', 'left', 'right', 'first', 'last', 'only',
  'square', 'video', 'portrait', 'subgrid', 'inline', 'block',
])

const LOOSE_VALUE = /^\[.*\]$|^[a-z0-9][a-z0-9\[\]%/.:-]*(?:\/[0-9.]+)?$/
const STRICT_VALUE = /^\[.*\]$|^[0-9]/

function splitVariants(token) {
  const parts = []
  let depth = 0
  let cur = ''
  for (const ch of token) {
    if (ch === '[') depth++
    else if (ch === ']') depth--
    if (ch === ':' && depth === 0) { parts.push(cur); cur = '' }
    else cur += ch
  }
  parts.push(cur)
  return parts
}

function stripBrackets(s) {
  return s.replace(/\[[^\]]*\]/g, '')
}

/** Returns the original token when it has the shape of a real class. */
function shapeFilter(raw) {
  let token = raw
  if (!token || token.length > 160) return null
  if (token.includes('$')) return null          // template residue
  if (token.startsWith('/') || token.startsWith('#')) return null
  if (token.includes('://')) return null

  // Variants must all be recognised.
  const parts = splitVariants(token)
  const base0 = parts.pop()
  for (const v of parts) {
    if (!(VARIANTS.has(v) || ARBITRARY_VARIANT.test(v))) return null
  }
  if (!base0) return null

  // Sanity on the bracket-stripped base: lowercase, no stray syntax.
  let base = base0.replace(/^!/, '').replace(/^-+/, '')
  const stripped = stripBrackets(base)
  if (!stripped) return null
  if (/[A-Z]/.test(stripped)) return null
  if (/[(){};,=]/.test(stripped)) return null
  if (!base) return null

  const value = base

  for (const p of STRICT_PREFIXES) {
    if (base.startsWith(p)) {
      const v = value.slice(p.length)
      if (STRICT_VALUE.test(v) || STRICT_KEYWORDS.has(v)) return token
      return null
    }
  }
  for (const p of LOOSE_PREFIXES) {
    if (base.startsWith(p)) {
      const v = value.slice(p.length)
      if (LOOSE_VALUE.test(v)) return token
      return null
    }
  }
  return null
}

/* ------------------------------------------------------------------ *
 * 3. Compiled stylesheet
 * ------------------------------------------------------------------ */

function loadCompiledCss() {
  for (const root of [join(ROOT, '.next', 'static'), join(ROOT, '.next', 'dev')]) {
    if (!existsSync(root)) continue
    const files = []
    const collect = (dir) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name)
        if (entry.isDirectory()) collect(path)
        else if (entry.name.endsWith('.css')) files.push(path)
      }
    }
    collect(root)
    if (files.length) {
      return { css: files.map((f) => readFileSync(f, 'utf8')).join('\n'), files }
    }
  }
  return null
}

function escapeSelector(token) {
  let out = ''
  for (const ch of token) out += /[a-zA-Z0-9_-]/.test(ch) ? ch : '\\' + ch
  return out
}

/* ------------------------------------------------------------------ *
 * Run
 * ------------------------------------------------------------------ */

/* Only UI source: src/app (minus api/) and src/components. Route handlers,
   middleware, lib and hooks emit no classes. */
const SCAN_ROOTS = [join(SRC, 'app'), join(SRC, 'components')]

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'api') continue // route handlers render no UI
      yield* walk(path)
    } else if (/\.(ts|tsx)$/.test(entry.name)) yield path
  }
}

const candidates = new Map() // token -> Set(file)
const tokenLiteral = new Map() // token -> example source literal (debug)
let literalCount = 0
const scannedFiles = []
for (const root of SCAN_ROOTS) {
  if (!existsSync(root)) continue
  for (const file of walk(root)) {
  scannedFiles.push(file)
  const fileLits = []
  scanFileStrings(readFileSync(file, 'utf8'), fileLits)
  literalCount += fileLits.length
  for (const body of fileLits) {
    for (const chunk of body.split(/\$\{[^}]*\}/)) {
      for (const raw of chunk.split(/\s+/)) {
        const token = shapeFilter(raw.trim())
        if (!token) continue
        if (!candidates.has(token)) {
          candidates.set(token, new Set())
          tokenLiteral.set(token, JSON.stringify(body.length > 120 ? body.slice(0, 120) + '…' : body))
        }
        candidates.get(token).add(relative(ROOT, file))
      }
    }
  }
  }
}

const compiled = loadCompiledCss()
if (!compiled) {
  console.error('No compiled CSS found. Run `npm run build` first.')
  process.exit(2)
}

const css = compiled.css
const unknown = []
for (const [token, files] of [...candidates].sort()) {
  if (!css.includes('.' + escapeSelector(token))) unknown.push([token, [...files]])
}

console.log(`Scanned ${scannedFiles.length} files, ${literalCount} string literals`)
console.log(`${candidates.size} class-shaped tokens checked against ${compiled.files.length} compiled stylesheet(s)`)
if (unknown.length === 0) {
  console.log('\nOK — zero unknown classes.')
  process.exit(0)
}
console.log(`\nUNKNOWN CLASSES (${unknown.length}):`)
for (const [token, files] of unknown) {
  console.log(`  ${token.padEnd(48)} ${files.join(', ')}`)
  if (process.env.AUDIT_DEBUG) console.log(`      literal: ${tokenLiteral.get(token)}`)
}
process.exit(1)
