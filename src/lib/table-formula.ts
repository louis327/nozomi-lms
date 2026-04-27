// Tiny spreadsheet-like formula evaluator for `table` content blocks.
// Cells that begin with "=" are formulas. Anything else is treated as text;
// when used in arithmetic it's coerced via parseCellNumber (currency + commas + % stripped).
//
// Supported:
//   - cell refs: A1, B12 (column letter, 1-indexed row including header row)
//   - ranges: A2:A6
//   - functions: sum, avg, min, max, count (case-insensitive)
//   - operators: + - * /, unary minus, parens
//   - numbers (incl. trailing % → multiplied by 0.01)
//
// Errors surface as "#ERR" (parse) or "#REF!" (cycle / out of bounds).

type Token =
  | { kind: 'num'; value: number }
  | { kind: 'cell'; col: number; row: number; raw: string }
  | { kind: 'range'; col: number; row1: number; row2: number; col2: number; raw: string }
  | { kind: 'ident'; name: string }
  | { kind: 'op'; value: '+' | '-' | '*' | '/' }
  | { kind: 'lparen' }
  | { kind: 'rparen' }
  | { kind: 'comma' }

const RE_CELL = /^([A-Z]+)([0-9]+)/
const RE_NUM = /^[0-9]+(?:\.[0-9]+)?/
const RE_IDENT = /^[a-zA-Z_][a-zA-Z0-9_]*/

function colToIndex(letters: string): number {
  let n = 0
  for (let i = 0; i < letters.length; i++) {
    n = n * 26 + (letters.charCodeAt(i) - 64)
  }
  return n - 1
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  const s = input
  while (i < s.length) {
    const ch = s[i]
    if (ch === ' ' || ch === '\t' || ch === '\n') {
      i++
      continue
    }
    if (ch === '(' ) { tokens.push({ kind: 'lparen' }); i++; continue }
    if (ch === ')' ) { tokens.push({ kind: 'rparen' }); i++; continue }
    if (ch === ',') { tokens.push({ kind: 'comma' }); i++; continue }
    if (ch === '+' || ch === '-' || ch === '*' || ch === '/') {
      tokens.push({ kind: 'op', value: ch as '+' | '-' | '*' | '/' })
      i++
      continue
    }
    // Cell ref or range — must precede number/ident checks because A1 looks like ident
    const upRest = s.slice(i).toUpperCase()
    const cellMatch = RE_CELL.exec(upRest)
    if (cellMatch) {
      const colIdx = colToIndex(cellMatch[1])
      const rowIdx = parseInt(cellMatch[2], 10)
      i += cellMatch[0].length
      // Check for range
      if (s[i] === ':') {
        const afterColon = s.slice(i + 1).toUpperCase()
        const m2 = RE_CELL.exec(afterColon)
        if (m2) {
          const col2 = colToIndex(m2[1])
          const row2 = parseInt(m2[2], 10)
          i += 1 + m2[0].length
          tokens.push({ kind: 'range', col: colIdx, row1: rowIdx, col2, row2, raw: `${cellMatch[0]}:${m2[0]}` })
          continue
        }
      }
      tokens.push({ kind: 'cell', col: colIdx, row: rowIdx, raw: cellMatch[0] })
      continue
    }
    const numMatch = RE_NUM.exec(s.slice(i))
    if (numMatch) {
      let value = parseFloat(numMatch[0])
      i += numMatch[0].length
      if (s[i] === '%') {
        value = value / 100
        i++
      }
      tokens.push({ kind: 'num', value })
      continue
    }
    const idMatch = RE_IDENT.exec(s.slice(i))
    if (idMatch) {
      tokens.push({ kind: 'ident', name: idMatch[0].toLowerCase() })
      i += idMatch[0].length
      continue
    }
    throw new Error(`Unexpected character at ${i}: ${ch}`)
  }
  return tokens
}

// ─── Parser → AST ─────────────────────────────────────────────────────────────

type Node =
  | { type: 'num'; value: number }
  | { type: 'cell'; col: number; row: number }
  | { type: 'range'; col: number; row1: number; col2: number; row2: number }
  | { type: 'binop'; op: '+' | '-' | '*' | '/'; left: Node; right: Node }
  | { type: 'unary'; op: '-'; arg: Node }
  | { type: 'call'; name: string; args: Node[] }

class Parser {
  private p = 0
  constructor(private tokens: Token[]) {}

  peek(): Token | undefined { return this.tokens[this.p] }
  consume(): Token { return this.tokens[this.p++] }

  parseExpr(): Node {
    let left = this.parseTerm()
    while (true) {
      const t = this.peek()
      if (t && t.kind === 'op' && (t.value === '+' || t.value === '-')) {
        this.consume()
        const right = this.parseTerm()
        left = { type: 'binop', op: t.value, left, right }
      } else break
    }
    return left
  }

  parseTerm(): Node {
    let left = this.parseFactor()
    while (true) {
      const t = this.peek()
      if (t && t.kind === 'op' && (t.value === '*' || t.value === '/')) {
        this.consume()
        const right = this.parseFactor()
        left = { type: 'binop', op: t.value, left, right }
      } else break
    }
    return left
  }

  parseFactor(): Node {
    const t = this.peek()
    if (!t) throw new Error('Unexpected end')
    if (t.kind === 'op' && t.value === '-') {
      this.consume()
      return { type: 'unary', op: '-', arg: this.parseFactor() }
    }
    if (t.kind === 'num') { this.consume(); return { type: 'num', value: t.value } }
    if (t.kind === 'cell') { this.consume(); return { type: 'cell', col: t.col, row: t.row } }
    if (t.kind === 'range') {
      this.consume()
      return { type: 'range', col: t.col, row1: t.row1, col2: t.col2, row2: t.row2 }
    }
    if (t.kind === 'lparen') {
      this.consume()
      const inner = this.parseExpr()
      const close = this.consume()
      if (!close || close.kind !== 'rparen') throw new Error('Missing )')
      return inner
    }
    if (t.kind === 'ident') {
      this.consume()
      const lp = this.consume()
      if (!lp || lp.kind !== 'lparen') throw new Error('Expected ( after function')
      const args: Node[] = []
      if (this.peek() && this.peek()!.kind !== 'rparen') {
        args.push(this.parseExpr())
        while (this.peek() && this.peek()!.kind === 'comma') {
          this.consume()
          args.push(this.parseExpr())
        }
      }
      const rp = this.consume()
      if (!rp || rp.kind !== 'rparen') throw new Error('Missing ) in call')
      return { type: 'call', name: t.name, args }
    }
    throw new Error('Unexpected token')
  }
}

// ─── Cell coercion ────────────────────────────────────────────────────────────

export function parseCellNumber(raw: string | undefined | null): number {
  if (raw == null) return 0
  let s = String(raw).trim()
  if (!s) return 0
  // Strip currency symbols, commas, spaces
  s = s.replace(/[$£€¥,\s]/g, '')
  let pct = false
  if (s.endsWith('%')) { pct = true; s = s.slice(0, -1) }
  const n = parseFloat(s)
  if (!Number.isFinite(n)) return 0
  return pct ? n / 100 : n
}

// ─── Evaluator ────────────────────────────────────────────────────────────────

type EvalCtx = {
  rows: string[][]
  visited: Set<string>
  // Cache of evaluated cells (key: "r,c" → number).
  cache: Map<string, number | string>
}

function getCellValue(ctx: EvalCtx, row1: number, col: number): number {
  // row1 is 1-based (matches A1-style refs, includes header row)
  const r = row1 - 1
  if (r < 0 || r >= ctx.rows.length) return 0
  if (col < 0 || col >= (ctx.rows[r]?.length ?? 0)) return 0
  const key = `${r},${col}`
  if (ctx.cache.has(key)) {
    const v = ctx.cache.get(key)!
    return typeof v === 'number' ? v : NaN
  }
  if (ctx.visited.has(key)) {
    throw new Error('#REF!')
  }
  const raw = ctx.rows[r][col]
  if (typeof raw === 'string' && isFormula(raw)) {
    ctx.visited.add(key)
    try {
      const result = evalFormulaInternal(getFormulaSrc(raw), ctx)
      const num = typeof result === 'number' ? result : NaN
      ctx.cache.set(key, num)
      return num
    } finally {
      ctx.visited.delete(key)
    }
  }
  const n = parseCellNumber(raw)
  ctx.cache.set(key, n)
  return n
}

function flattenRange(ctx: EvalCtx, n: Extract<Node, { type: 'range' }>): number[] {
  const out: number[] = []
  const rStart = Math.min(n.row1, n.row2)
  const rEnd = Math.max(n.row1, n.row2)
  const cStart = Math.min(n.col, n.col2)
  const cEnd = Math.max(n.col, n.col2)
  for (let r = rStart; r <= rEnd; r++) {
    for (let c = cStart; c <= cEnd; c++) {
      out.push(getCellValue(ctx, r, c))
    }
  }
  return out
}

function evalNode(ctx: EvalCtx, n: Node): number {
  switch (n.type) {
    case 'num': return n.value
    case 'cell': return getCellValue(ctx, n.row, n.col)
    case 'unary': return -evalNode(ctx, n.arg)
    case 'binop': {
      const l = evalNode(ctx, n.left)
      const r = evalNode(ctx, n.right)
      switch (n.op) {
        case '+': return l + r
        case '-': return l - r
        case '*': return l * r
        case '/': return r === 0 ? NaN : l / r
      }
      return NaN
    }
    case 'range':
      // Bare range evaluates to sum (sensible default).
      return flattenRange(ctx, n).reduce((a, b) => a + b, 0)
    case 'call': {
      const values: number[] = []
      for (const a of n.args) {
        if (a.type === 'range') values.push(...flattenRange(ctx, a))
        else values.push(evalNode(ctx, a))
      }
      switch (n.name) {
        case 'sum': return values.reduce((a, b) => a + b, 0)
        case 'avg':
        case 'average': return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0
        case 'min': return values.length ? Math.min(...values) : 0
        case 'max': return values.length ? Math.max(...values) : 0
        case 'count': return values.filter((v) => Number.isFinite(v)).length
        case 'product': return values.reduce((a, b) => a * b, 1)
        case 'round': {
          const [v, places = 0] = values
          const m = Math.pow(10, places)
          return Math.round(v * m) / m
        }
        default: throw new Error(`Unknown function ${n.name}`)
      }
    }
  }
}

function evalFormulaInternal(src: string, ctx: EvalCtx): number {
  const tokens = tokenize(src)
  const ast = new Parser(tokens).parseExpr()
  return evalNode(ctx, ast)
}

// ─── Public API ───────────────────────────────────────────────────────────────

export type EvalResult = { ok: true; value: number } | { ok: false; error: string }

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, '').trim()
}

export function isFormula(cell: string | undefined | null): boolean {
  if (typeof cell !== 'string') return false
  const t = cell.trim()
  if (t.startsWith('=')) return true
  // Tolerate Tiptap-wrapped formulas like "<strong>=sum(B2:B6)</strong>"
  return stripTags(t).startsWith('=')
}

function getFormulaSrc(cell: string): string {
  const t = cell.trim()
  const raw = t.startsWith('=') ? t : stripTags(t)
  return raw.slice(1)
}

export function evaluateCell(rows: string[][], rowIdx: number, colIdx: number): EvalResult {
  const cell = rows[rowIdx]?.[colIdx]
  if (!isFormula(cell)) return { ok: true, value: parseCellNumber(cell) }
  const ctx: EvalCtx = { rows, visited: new Set(), cache: new Map() }
  try {
    const value = evalFormulaInternal(getFormulaSrc(cell!), ctx)
    return Number.isFinite(value) ? { ok: true, value } : { ok: false, error: '#ERR' }
  } catch (err) {
    return { ok: false, error: err instanceof Error && err.message === '#REF!' ? '#REF!' : '#ERR' }
  }
}

export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return '—'
  // Integer-friendly formatting, otherwise up to 2 decimals
  const rounded = Math.round(n * 100) / 100
  if (Math.abs(rounded - Math.trunc(rounded)) < 1e-9) {
    return Math.trunc(rounded).toLocaleString()
  }
  return rounded.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}
