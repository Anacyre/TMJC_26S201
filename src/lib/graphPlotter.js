/** Normalize user input for graph expressions. */
import {
  deleteBefore,
  formatDisplay as formatGraphNumber,
  insertAt,
} from './scientificCalc'

export { deleteBefore, formatGraphNumber, insertAt }

export function normalizeGraphExpr(raw) {
  return String(raw || '')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/π/g, 'pi')
    .replace(/√\(/g, 'sqrt(')
    .replace(/\s+/g, '')
}

export const GRAPH_INSERTS = {
  sin: { text: 'sin(', cursor: 4 },
  cos: { text: 'cos(', cursor: 4 },
  tan: { text: 'tan(', cursor: 4 },
  log: { text: 'log(', cursor: 4 },
  ln: { text: 'ln(', cursor: 3 },
  sqrt: { text: 'sqrt(', cursor: 5 },
  exp: { text: 'exp(', cursor: 4 },
  square: { text: '^2', cursor: 2 },
  power: { text: '^', cursor: 1 },
  pi: { text: 'π', cursor: 1 },
  e: { text: 'e', cursor: 1 },
  lparen: { text: '(', cursor: 1 },
  rparen: { text: ')', cursor: 1 },
  plus: { text: '+', cursor: 1 },
  minus: { text: '−', cursor: 1 },
  multiply: { text: '×', cursor: 1 },
  divide: { text: '÷', cursor: 1 },
  dot: { text: '.', cursor: 1 },
  x: { text: 'x', cursor: 1 },
  y: { text: 'y', cursor: 1 },
  eq: { text: '=', cursor: 1 },
}

function tokenize(input) {
  const tokens = []
  let i = 0

  const push = (type, value = null) => tokens.push({ type, value })

  while (i < input.length) {
    const ch = input[i]

    if (ch >= '0' && ch <= '9') {
      let j = i + 1
      while (j < input.length && ((input[j] >= '0' && input[j] <= '9') || input[j] === '.')) j += 1
      tokens.push({ type: 'NUMBER', value: Number(input.slice(i, j)) })
      i = j
      continue
    }

    if ('+-*/^!()'.includes(ch)) {
      const map = {
        '+': 'PLUS',
        '-': 'MINUS',
        '*': 'STAR',
        '/': 'SLASH',
        '^': 'CARET',
        '!': 'FACTORIAL',
        '(': 'LPAREN',
        ')': 'RPAREN',
      }
      push(map[ch])
      i += 1
      continue
    }

    if (/[a-z]/i.test(ch)) {
      let j = i + 1
      while (j < input.length && /[a-z]/i.test(input[j])) j += 1
      const word = input.slice(i, j).toLowerCase()
      if (word === 'x' || word === 'y') push('IDENT', word)
      else if (word === 'pi') push('PI')
      else if (word === 'e') push('E')
      else if (['sin', 'cos', 'tan', 'log', 'ln', 'sqrt', 'exp', 'abs'].includes(word)) {
        push(word.toUpperCase())
      } else {
        throw new Error('unknown')
      }
      i = j
      continue
    }

    throw new Error('char')
  }

  push('EOF')
  return tokens
}

function canStartPrimary(type) {
  return type === 'NUMBER'
    || type === 'PI'
    || type === 'E'
    || type === 'IDENT'
    || type === 'LPAREN'
    || ['SIN', 'COS', 'TAN', 'LOG', 'LN', 'SQRT', 'EXP', 'ABS'].includes(type)
}

class Parser {
  constructor(tokens) {
    this.tokens = tokens
    this.pos = 0
  }

  peek() {
    return this.tokens[this.pos]
  }

  consume(expected) {
    const token = this.tokens[this.pos]
    if (expected && token.type !== expected) throw new Error('token')
    this.pos += 1
    return token
  }

  parse() {
    const node = this.expr()
    this.consume('EOF')
    return node
  }

  expr() {
    let node = this.term()
    while (this.peek().type === 'PLUS' || this.peek().type === 'MINUS') {
      const op = this.consume().type === 'PLUS' ? '+' : '-'
      node = { kind: 'binary', op, left: node, right: this.term() }
    }
    return node
  }

  term() {
    let node = this.power()
    while (this.peek().type === 'STAR' || this.peek().type === 'SLASH') {
      const op = this.consume().type === 'STAR' ? '*' : '/'
      node = { kind: 'binary', op, left: node, right: this.power() }
    }
    return node
  }

  power() {
    let node = this.unary()
    while (this.peek().type === 'CARET') {
      this.consume('CARET')
      node = { kind: 'binary', op: '^', left: node, right: this.unary() }
    }
    while (canStartPrimary(this.peek().type)) {
      node = { kind: 'binary', op: '*', left: node, right: this.unary() }
    }
    return node
  }

  unary() {
    if (this.peek().type === 'PLUS') {
      this.consume('PLUS')
      return this.unary()
    }
    if (this.peek().type === 'MINUS') {
      this.consume('MINUS')
      return { kind: 'unary', op: '-', arg: this.unary() }
    }
    return this.postfix()
  }

  postfix() {
    let node = this.primary()
    if (this.peek().type === 'FACTORIAL') {
      this.consume('FACTORIAL')
      node = { kind: 'factorial', arg: node }
    }
    return node
  }

  primary() {
    const token = this.peek()

    if (token.type === 'NUMBER') {
      this.consume('NUMBER')
      return { kind: 'number', value: token.value }
    }

    if (token.type === 'IDENT') {
      this.consume('IDENT')
      return { kind: 'ident', name: token.value }
    }

    if (token.type === 'PI') {
      this.consume('PI')
      return { kind: 'number', value: Math.PI }
    }

    if (token.type === 'E') {
      this.consume('E')
      return { kind: 'number', value: Math.E }
    }

    if (token.type === 'LPAREN') {
      this.consume('LPAREN')
      const node = this.expr()
      this.consume('RPAREN')
      return node
    }

    if (['SIN', 'COS', 'TAN', 'LOG', 'LN', 'SQRT', 'EXP', 'ABS'].includes(token.type)) {
      const fn = this.consume().type.toLowerCase()
      this.consume('LPAREN')
      const arg = this.expr()
      this.consume('RPAREN')
      return { kind: 'call', fn, arg }
    }

    throw new Error('primary')
  }
}

function evalNode(node, vars, angleMode) {
  switch (node.kind) {
    case 'number':
      return node.value
    case 'ident':
      return vars[node.name] ?? NaN
    case 'unary':
      return node.op === '-' ? -evalNode(node.arg, vars, angleMode) : evalNode(node.arg, vars, angleMode)
    case 'binary': {
      const left = evalNode(node.left, vars, angleMode)
      const right = evalNode(node.right, vars, angleMode)
      switch (node.op) {
        case '+': return left + right
        case '-': return left - right
        case '*': return left * right
        case '/':
          if (right === 0) return NaN
          return left / right
        case '^': return Math.pow(left, right)
        default: return NaN
      }
    }
    case 'factorial': {
      const value = evalNode(node.arg, vars, angleMode)
      if (!Number.isFinite(value) || value < 0 || Math.trunc(value) !== value || value > 170) return NaN
      let result = 1
      for (let i = 2; i <= value; i += 1) result *= i
      return result
    }
    case 'call': {
      const value = evalNode(node.arg, vars, angleMode)
      if (!Number.isFinite(value)) return NaN
      const rad = angleMode === 'deg' ? (value * Math.PI) / 180 : value
      switch (node.fn) {
        case 'sin': return Math.sin(rad)
        case 'cos': return Math.cos(rad)
        case 'tan': return Math.abs(Math.cos(rad)) < 1e-12 ? NaN : Math.tan(rad)
        case 'log': return value <= 0 ? NaN : Math.log10(value)
        case 'ln': return value <= 0 ? NaN : Math.log(value)
        case 'sqrt': return value < 0 ? NaN : Math.sqrt(value)
        case 'exp': return Math.exp(value)
        case 'abs': return Math.abs(value)
        default: return NaN
      }
    }
    default:
      return NaN
  }
}

function compileExpr(raw) {
  const normalized = normalizeGraphExpr(raw)
  if (!normalized) throw new Error('empty')
  const tokens = tokenize(normalized)
  const ast = new Parser(tokens).parse()
  return (vars, angleMode = 'rad') => {
    const value = evalNode(ast, vars, angleMode)
    return Number.isFinite(value) ? value : NaN
  }
}

function hasVar(raw, name) {
  const n = normalizeGraphExpr(raw)
  return new RegExp(`\\b${name}\\b`, 'i').test(n.replace(/pi/g, '').replace(/exp/g, ''))
}

function isBareIdent(raw, name) {
  return normalizeGraphExpr(raw).toLowerCase() === name
}

function subtractAst(leftFn, rightFn) {
  return (vars, angleMode) => {
    const a = leftFn(vars, angleMode)
    const b = rightFn(vars, angleMode)
    if (!Number.isFinite(a) || !Number.isFinite(b)) return NaN
    return a - b
  }
}

/** @returns {{ ok: true, spec: PlotSpec } | { ok: false, error: string }} */
export function parseGraphInput(raw, angleMode = 'rad') {
  try {
    const trimmed = String(raw || '').trim()
    if (!trimmed) return { ok: false, error: 'Enter an expression' }

    const eqIndex = trimmed.indexOf('=')
    if (eqIndex >= 0) {
      const leftRaw = trimmed.slice(0, eqIndex).trim()
      const rightRaw = trimmed.slice(eqIndex + 1).trim()
      if (!leftRaw || !rightRaw) return { ok: false, error: 'Invalid equation' }

      if (isBareIdent(leftRaw, 'y')) {
        const fn = compileExpr(rightRaw)
        fn({ x: 0, y: 0 }, angleMode)
        return { ok: true, spec: { mode: 'explicit-y', fn, label: trimmed } }
      }

      if (isBareIdent(leftRaw, 'x')) {
        const fn = compileExpr(rightRaw)
        fn({ x: 0, y: 0 }, angleMode)
        return { ok: true, spec: { mode: 'explicit-x', fn, label: trimmed } }
      }

      const leftFn = compileExpr(leftRaw)
      const rightFn = compileExpr(rightRaw)
      const fn = subtractAst(leftFn, rightFn)
      fn({ x: 0, y: 0 }, angleMode)
      return { ok: true, spec: { mode: 'implicit', fn, label: trimmed } }
    }

    const normalized = normalizeGraphExpr(trimmed)
    const fn = compileExpr(trimmed)

    if (hasVar(trimmed, 'y') && hasVar(trimmed, 'x')) {
      fn({ x: 0, y: 0 }, angleMode)
      return { ok: true, spec: { mode: 'implicit', fn, label: `${trimmed}=0` } }
    }

    if (hasVar(trimmed, 'y') && !hasVar(trimmed, 'x')) {
      return { ok: true, spec: { mode: 'explicit-x', fn, label: `x=${trimmed}` } }
    }

    fn({ x: 0, y: 0 }, angleMode)
    return { ok: true, spec: { mode: 'explicit-y', fn, label: `y=${trimmed}` } }
  } catch {
    return { ok: false, error: 'Invalid expression' }
  }
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

function interpZero(x1, y1, v1, x2, y2, v2) {
  if (!Number.isFinite(v1) || !Number.isFinite(v2)) return null
  if (v1 === 0) return { x: x1, y: y1 }
  if (v2 === 0) return { x: x2, y: y2 }
  if (v1 * v2 > 0) return null
  const t = Math.abs(v1) / (Math.abs(v1) + Math.abs(v2))
  return { x: lerp(x1, x2, t), y: lerp(y1, y2, t) }
}

/** Edge indices: 0=bottom, 1=right, 2=top, 3=left (between corners 0-1, 1-2, 2-3, 3-0). */
const MS_EDGES = [
  [],
  [[3, 0]],
  [[0, 1]],
  [[1, 3]],
  [[1, 2]],
  [[3, 0], [1, 2]],
  [[0, 2]],
  [[2, 3]],
  [[2, 3]],
  [[0, 2]],
  [[0, 1], [2, 3]],
  [[1, 2]],
  [[1, 3]],
  [[0, 1]],
  [[3, 0]],
  [],
]

function resolveMsEdges(idx, fn, x0, x1, y0, y1, angleMode) {
  if (idx !== 5 && idx !== 10) return MS_EDGES[idx]
  const center = fn({ x: (x0 + x1) / 2, y: (y0 + y1) / 2 }, angleMode)
  if (!Number.isFinite(center)) return MS_EDGES[idx]
  if (idx === 5) {
    return center < 0 ? [[3, 0], [1, 2]] : [[0, 1], [2, 3]]
  }
  return center < 0 ? [[0, 1], [2, 3]] : [[3, 0], [1, 2]]
}

/** Grid density: match pixels and cap max math-units per cell so curves survive zoom-out. */
export function resolveImplicitGrid(width, height, bounds) {
  const targetCellPx = 2.5
  const maxCellMath = 0.06

  const spanX = Math.max(bounds.xmax - bounds.xmin, 1e-9)
  const spanY = Math.max(bounds.ymax - bounds.ymin, 1e-9)

  const cols = Math.min(960, Math.max(80,
    Math.ceil(width / targetCellPx),
    Math.ceil(spanX / maxCellMath),
  ))
  const rows = Math.min(960, Math.max(80,
    Math.ceil(height / targetCellPx),
    Math.ceil(spanY / maxCellMath),
  ))
  return { cols, rows }
}

export function resolveExplicitSteps(width, height, bounds) {
  const spanX = Math.max(bounds.xmax - bounds.xmin, 1e-9)
  const spanY = Math.max(bounds.ymax - bounds.ymin, 1e-9)
  const span = Math.max(spanX, spanY)
  return Math.min(3200, Math.max(640,
    Math.ceil(Math.max(width, height) * 2.5),
    Math.ceil(span / 0.025),
  ))
}

function pointKey(p) {
  return `${Math.round(p.x * 1e5)}:${Math.round(p.y * 1e5)}`
}

function canonicalPoint(p, cache) {
  const key = pointKey(p)
  if (!cache.has(key)) cache.set(key, { x: p.x, y: p.y })
  return cache.get(key)
}

/** Merge marching-square segments into continuous polylines. */
export function mergeSegmentsToPolylines(segments) {
  if (!segments.length) return []

  const cache = new Map()
  const adj = new Map()

  const link = (a, b) => {
    const ka = pointKey(a)
    const kb = pointKey(b)
    if (!adj.has(ka)) adj.set(ka, new Set())
    if (!adj.has(kb)) adj.set(kb, new Set())
    adj.get(ka).add(kb)
    adj.get(kb).add(ka)
  }

  for (const [a, b] of segments) {
    canonicalPoint(a, cache)
    canonicalPoint(b, cache)
    link(a, b)
  }

  const visited = new Set()
  const polylines = []

  for (const startKey of adj.keys()) {
    if (visited.has(startKey)) continue

    const chain = []
    let current = startKey
    let prev = null

    while (current && !visited.has(current)) {
      visited.add(current)
      chain.push(cache.get(current))
      const neighbors = [...(adj.get(current) || [])].filter((k) => k !== prev)
      prev = current
      current = neighbors.length === 1 ? neighbors[0] : (neighbors.find((k) => !visited.has(k)) || null)
    }

    if (chain.length >= 2) polylines.push(chain)
  }

  return polylines.length ? polylines : segments.map(([a, b]) => [a, b])
}

/** Sample implicit curve segments via marching squares. */
export function sampleImplicit(fn, bounds, cols = 96, rows = 96, angleMode = 'rad') {
  const { xmin, xmax, ymin, ymax } = bounds
  const dx = (xmax - xmin) / cols
  const dy = (ymax - ymin) / rows
  const segments = []

  const vals = Array.from({ length: rows + 1 }, () => new Array(cols + 1).fill(NaN))
  for (let j = 0; j <= rows; j += 1) {
    for (let i = 0; i <= cols; i += 1) {
      const x = xmin + i * dx
      const y = ymin + j * dy
      vals[j][i] = fn({ x, y }, angleMode)
    }
  }

  for (let j = 0; j < rows; j += 1) {
    for (let i = 0; i < cols; i += 1) {
      const x0 = xmin + i * dx
      const x1 = x0 + dx
      const y0 = ymin + j * dy
      const y1 = y0 + dy

      const v = [
        vals[j][i],
        vals[j][i + 1],
        vals[j + 1][i + 1],
        vals[j + 1][i],
      ]

      if (v.some((n) => !Number.isFinite(n))) continue

      let idx = 0
      if (v[0] > 0) idx |= 1
      if (v[1] > 0) idx |= 2
      if (v[2] > 0) idx |= 4
      if (v[3] > 0) idx |= 8
      if (idx === 0 || idx === 15) continue

      const corners = [
        { x: x0, y: y0 },
        { x: x1, y: y0 },
        { x: x1, y: y1 },
        { x: x0, y: y1 },
      ]
      const edgePoints = [
        interpZero(corners[0].x, corners[0].y, v[0], corners[1].x, corners[1].y, v[1]),
        interpZero(corners[1].x, corners[1].y, v[1], corners[2].x, corners[2].y, v[2]),
        interpZero(corners[2].x, corners[2].y, v[2], corners[3].x, corners[3].y, v[3]),
        interpZero(corners[3].x, corners[3].y, v[3], corners[0].x, corners[0].y, v[0]),
      ]

      for (const pair of resolveMsEdges(idx, fn, x0, x1, y0, y1, angleMode)) {
        const [a, b] = pair
        const p1 = edgePoints[a]
        const p2 = edgePoints[b]
        if (p1 && p2) segments.push([p1, p2])
      }
    }
  }

  return mergeSegmentsToPolylines(segments)
}

/** Sample explicit y = f(x). */
export function sampleExplicitY(fn, bounds, steps = 640, angleMode = 'rad') {
  const { xmin, xmax } = bounds
  const dx = (xmax - xmin) / steps
  const points = []

  for (let i = 0; i <= steps; i += 1) {
    const x = xmin + i * dx
    const y = fn({ x, y: 0 }, angleMode)
    if (Number.isFinite(y)) points.push({ x, y })
    else if (points.length) {
      points.push(null)
    }
  }

  return points
}

/** Sample explicit x = f(y). */
export function sampleExplicitX(fn, bounds, steps = 640, angleMode = 'rad') {
  const { ymin, ymax } = bounds
  const dy = (ymax - ymin) / steps
  const points = []

  for (let i = 0; i <= steps; i += 1) {
    const y = ymin + i * dy
    const x = fn({ x: 0, y }, angleMode)
    if (Number.isFinite(x)) points.push({ x, y })
    else if (points.length) {
      points.push(null)
    }
  }

  return points
}

export function viewBoundsFromCamera(centerX, centerY, scale, width, height) {
  const halfW = width / scale / 2
  const halfH = height / scale / 2
  return {
    xmin: centerX - halfW,
    xmax: centerX + halfW,
    ymin: centerY - halfH,
    ymax: centerY + halfH,
  }
}

export function mathToScreen(x, y, centerX, centerY, scale, width, height) {
  return {
    sx: width / 2 + (x - centerX) * scale,
    sy: height / 2 - (y - centerY) * scale,
  }
}

export function screenToMath(sx, sy, centerX, centerY, scale, width, height) {
  return {
    x: centerX + (sx - width / 2) / scale,
    y: centerY - (sy - height / 2) / scale,
  }
}

export const CURVE_COLORS = [
  { light: 'rgba(46, 99, 255, 0.94)', dark: 'rgba(120, 180, 255, 0.96)' },
  { light: 'rgba(255, 87, 74, 0.94)', dark: 'rgba(255, 145, 130, 0.96)' },
  { light: 'rgba(22, 163, 74, 0.94)', dark: 'rgba(100, 220, 140, 0.96)' },
  { light: 'rgba(168, 85, 247, 0.94)', dark: 'rgba(200, 160, 255, 0.96)' },
]

const PROBE_BOUNDS = { xmin: -14, xmax: 14, ymin: -14, ymax: 14 }

function absorbPoint(extent, p) {
  if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return
  extent.xmin = Math.min(extent.xmin, p.x)
  extent.xmax = Math.max(extent.xmax, p.x)
  extent.ymin = Math.min(extent.ymin, p.y)
  extent.ymax = Math.max(extent.ymax, p.y)
}

function absorbSpecExtent(spec, extent, angleMode = 'rad') {
  if (!spec?.fn) return
  if (spec.mode === 'implicit') {
    const chains = sampleImplicit(spec.fn, PROBE_BOUNDS, 72, 72, angleMode)
    for (const chain of chains) {
      if (Array.isArray(chain[0])) {
        for (const [a, b] of chain) {
          absorbPoint(extent, a)
          absorbPoint(extent, b)
        }
      } else {
        for (const p of chain) absorbPoint(extent, p)
      }
    }
    return
  }
  if (spec.mode === 'explicit-y') {
    for (const p of sampleExplicitY(spec.fn, PROBE_BOUNDS, 240, angleMode)) absorbPoint(extent, p)
    return
  }
  for (const p of sampleExplicitX(spec.fn, PROBE_BOUNDS, 240, angleMode)) absorbPoint(extent, p)
}

/** Estimate bounding box of all plotted curves for smart zoom. */
export function estimateSpecsExtent(specs, angleMode = 'rad') {
  const extent = { xmin: Infinity, xmax: -Infinity, ymin: Infinity, ymax: -Infinity }
  for (const spec of specs) {
    if (spec) absorbSpecExtent(spec, extent, angleMode)
  }
  if (!Number.isFinite(extent.xmin)) {
    return { xmin: -6, xmax: 6, ymin: -6, ymax: 6 }
  }
  const padX = Math.max((extent.xmax - extent.xmin) * 0.12, 0.6)
  const padY = Math.max((extent.ymax - extent.ymin) * 0.12, 0.6)
  return {
    xmin: extent.xmin - padX,
    xmax: extent.xmax + padX,
    ymin: extent.ymin - padY,
    ymax: extent.ymax + padY,
  }
}

/** Zoom limits derived from curve content and canvas size. */
export function resolveZoomLimits(extent, canvasW, canvasH) {
  const spanX = Math.max(extent.xmax - extent.xmin, 0.8)
  const spanY = Math.max(extent.ymax - extent.ymin, 0.8)
  const span = Math.max(spanX, spanY)
  const minDim = Math.max(Math.min(canvasW || 320, canvasH || 320), 120)
  const fitScale = minDim / span
  const minScale = Math.max(1.2, fitScale * 0.2)
  const maxScale = Math.max(600, Math.min(3200, fitScale * 120))
  return { minScale, maxScale, fitScale }
}

function bisectZero(g, a, b, tol = 1e-9, maxIter = 80) {
  let fa = g(a)
  let fb = g(b)
  if (!Number.isFinite(fa) || !Number.isFinite(fb)) return null
  if (fa === 0) return a
  if (fb === 0) return b
  if (fa * fb > 0) return null
  for (let i = 0; i < maxIter; i += 1) {
    const m = (a + b) / 2
    const fm = g(m)
    if (!Number.isFinite(fm)) return null
    if (Math.abs(fm) <= tol || Math.abs(b - a) <= tol) return m
    if (fa * fm <= 0) {
      b = m
      fb = fm
    } else {
      a = m
      fa = fm
    }
  }
  return (a + b) / 2
}

function dedupeRoots(values, eps = 1e-4) {
  const sorted = [...values].filter(Number.isFinite).sort((a, b) => a - b)
  const out = []
  for (const v of sorted) {
    if (!out.length || Math.abs(v - out[out.length - 1]) > eps) out.push(v)
  }
  return out
}

function scanRoots(g, lo, hi, steps = 640) {
  const roots = []
  let prevX = lo
  let prevVal = g(prevX)
  for (let i = 1; i <= steps; i += 1) {
    const x = lo + ((hi - lo) * i) / steps
    const val = g(x)
    if (Number.isFinite(prevVal) && Number.isFinite(val)) {
      if (prevVal === 0) roots.push(prevX)
      else if (val === 0) roots.push(x)
      else if (prevVal * val < 0) {
        const root = bisectZero(g, prevX, x)
        if (root != null) roots.push(root)
      }
    }
    prevX = x
    prevVal = val
  }
  return dedupeRoots(roots)
}

function searchSpan(hintRange, axis) {
  if (hintRange) {
    const lo = axis === 'x' ? hintRange.xmin : hintRange.ymin
    const hi = axis === 'x' ? hintRange.xmax : hintRange.ymax
    if (Number.isFinite(lo) && Number.isFinite(hi) && hi > lo) return { lo, hi }
  }
  return { lo: -20, hi: 20 }
}

/**
 * Given one variable, approximate the other from the plotted equation.
 * @returns {{ ok: true, unknownVar: string, values: number[], display: string } | { ok: false, error: string }}
 */
export function solveGraphVariable(raw, knownVar, knownValue, angleMode = 'rad', hintRange = null) {
  try {
    if (knownVar !== 'x' && knownVar !== 'y') return { ok: false, error: 'Pick x or y' }
    const numKnown = Number(knownValue)
    if (!Number.isFinite(numKnown)) return { ok: false, error: 'Enter a number' }

    const parsed = parseGraphInput(raw, angleMode)
    if (!parsed.ok) return { ok: false, error: parsed.error }

    const unknownVar = knownVar === 'x' ? 'y' : 'x'
    const spec = parsed.spec

    if (spec.mode === 'explicit-y' && knownVar === 'x') {
      const y = spec.fn({ x: numKnown, y: 0 }, angleMode)
      if (!Number.isFinite(y)) return { ok: false, error: 'Undefined at this x' }
      return {
        ok: true,
        unknownVar,
        values: [y],
        display: `y ≈ ${formatGraphNumber(String(y))}`,
      }
    }

    if (spec.mode === 'explicit-x' && knownVar === 'y') {
      const x = spec.fn({ x: 0, y: numKnown }, angleMode)
      if (!Number.isFinite(x)) return { ok: false, error: 'Undefined at this y' }
      return {
        ok: true,
        unknownVar,
        values: [x],
        display: `x ≈ ${formatGraphNumber(String(x))}`,
      }
    }

    let g
    if (spec.mode === 'implicit') {
      g = (v) => spec.fn(
        knownVar === 'x' ? { x: numKnown, y: v } : { x: v, y: numKnown },
        angleMode,
      )
    } else if (spec.mode === 'explicit-y' && knownVar === 'y') {
      g = (x) => spec.fn({ x, y: 0 }, angleMode) - numKnown
    } else if (spec.mode === 'explicit-x' && knownVar === 'x') {
      g = (y) => spec.fn({ x: 0, y }, angleMode) - numKnown
    } else {
      return { ok: false, error: 'Cannot solve for this variable' }
    }

    const span = searchSpan(hintRange, unknownVar)
    const roots = scanRoots(g, span.lo, span.hi)
    if (!roots.length) return { ok: false, error: 'No solution found in view' }

    const labels = roots.map((v) => `${unknownVar} ≈ ${formatGraphNumber(String(v))}`)
    return {
      ok: true,
      unknownVar,
      values: roots,
      display: labels.join('  ·  '),
    }
  } catch {
    return { ok: false, error: 'Could not solve' }
  }
}
