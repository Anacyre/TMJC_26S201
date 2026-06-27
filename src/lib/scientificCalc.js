const MAX_FACTORIAL = 170

export function roundResult(n) {
  if (!Number.isFinite(n)) return null
  return Math.round((n + Number.EPSILON) * 1e10) / 1e10
}

export function formatDisplay(raw) {
  if (raw === 'Error') return raw
  const n = Number(raw)
  if (!Number.isFinite(n)) return String(raw)

  const abs = Math.abs(n)
  if (abs !== 0 && (abs >= 1e12 || abs < 1e-6)) {
    return n.toExponential(6).replace(/(?:\.0+|(\.\d*?)0+)e/, '$1e')
  }

  const str = String(raw)
  if (str.includes('e')) return str
  if (str.includes('.')) {
    const [intPart, decPart] = str.split('.')
    return `${formatInt(intPart)}.${decPart}`
  }
  return formatInt(str)
}

function formatInt(str) {
  const negative = String(str).startsWith('-')
  const digits = negative ? String(str).slice(1) : String(str)
  const normalized = digits.replace(/^0+(?=\d)/, '') || '0'
  const parts = normalized.split('')
  let out = ''
  for (let i = parts.length - 1, c = 0; i >= 0; i -= 1, c += 1) {
    if (c > 0 && c % 3 === 0) out = `,${out}`
    out = parts[i] + out
  }
  return (negative ? '-' : '') + out
}

export function normalizeExpression(raw) {
  return String(raw || '')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/π/g, 'pi')
    .replace(/√\(/g, 'sqrt(')
    .replace(/\s+/g, '')
}

function factorial(n) {
  if (!Number.isInteger(n) || n < 0) throw new Error('factorial')
  if (n > MAX_FACTORIAL) throw new Error('factorial')
  if (n <= 1) return 1
  let result = 1
  for (let i = 2; i <= n; i += 1) result *= i
  return result
}

function toRadians(value, angleMode) {
  return angleMode === 'deg' ? (value * Math.PI) / 180 : value
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
      if (word === 'pi') push('PI')
      else if (word === 'e') push('E')
      else if (['sin', 'cos', 'tan', 'log', 'ln', 'sqrt', 'exp'].includes(word)) {
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
    || type === 'LPAREN'
    || ['SIN', 'COS', 'TAN', 'LOG', 'LN', 'SQRT', 'EXP'].includes(type)
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

    if (['SIN', 'COS', 'TAN', 'LOG', 'LN', 'SQRT', 'EXP'].includes(token.type)) {
      const fn = this.consume().type.toLowerCase()
      this.consume('LPAREN')
      const arg = this.expr()
      this.consume('RPAREN')
      return { kind: 'call', fn, arg }
    }

    throw new Error('primary')
  }
}

function evalNode(node, angleMode) {
  switch (node.kind) {
    case 'number':
      return node.value
    case 'unary':
      return node.op === '-' ? -evalNode(node.arg, angleMode) : evalNode(node.arg, angleMode)
    case 'binary': {
      const left = evalNode(node.left, angleMode)
      const right = evalNode(node.right, angleMode)
      switch (node.op) {
        case '+': return left + right
        case '-': return left - right
        case '*': return left * right
        case '/':
          if (right === 0) throw new Error('div0')
          return left / right
        case '^': return Math.pow(left, right)
        default: throw new Error('op')
      }
    }
    case 'factorial': {
      const value = evalNode(node.arg, angleMode)
      return factorial(Math.trunc(value))
    }
    case 'call': {
      const value = evalNode(node.arg, angleMode)
      switch (node.fn) {
        case 'sin': return Math.sin(toRadians(value, angleMode))
        case 'cos': return Math.cos(toRadians(value, angleMode))
        case 'tan': {
          const rad = toRadians(value, angleMode)
          if (Math.abs(Math.cos(rad)) < 1e-12) throw new Error('tan')
          return Math.tan(rad)
        }
        case 'log':
          if (value <= 0) throw new Error('log')
          return Math.log10(value)
        case 'ln':
          if (value <= 0) throw new Error('ln')
          return Math.log(value)
        case 'sqrt':
          if (value < 0) throw new Error('sqrt')
          return Math.sqrt(value)
        case 'exp':
          return Math.exp(value)
        default:
          throw new Error('fn')
      }
    }
    default:
      throw new Error('node')
  }
}

export function evaluateExpression(raw, angleMode = 'deg') {
  try {
    const normalized = normalizeExpression(raw)
    if (!normalized) return { ok: false, error: 'Empty' }
    const tokens = tokenize(normalized)
    const ast = new Parser(tokens).parse()
    const value = evalNode(ast, angleMode)
    const rounded = roundResult(value)
    if (rounded === null) return { ok: false, error: 'Error' }
    return {
      ok: true,
      value: rounded,
      display: formatDisplay(String(rounded)),
    }
  } catch {
    return { ok: false, error: 'Error' }
  }
}

export const LEADING_OPERATORS = new Set(['plus', 'minus', 'multiply', 'divide', 'power'])

export function formatResultOperand(displayResult) {
  const cleaned = String(displayResult ?? '').replace(/,/g, '').trim()
  if (!cleaned || cleaned === 'Error') return ''
  const n = Number(cleaned)
  if (!Number.isFinite(n)) return cleaned
  if (n < 0) return `(${n})`
  return String(n)
}

export function isLeadingOperatorInsert(specKey) {
  return LEADING_OPERATORS.has(specKey)
}

export const CALC_INSERTS = {
  sin: { text: 'sin(', cursor: 4 },
  cos: { text: 'cos(', cursor: 4 },
  tan: { text: 'tan(', cursor: 4 },
  log: { text: 'log(', cursor: 4 },
  ln: { text: 'ln(', cursor: 3 },
  sqrt: { text: 'sqrt(', cursor: 5 },
  exp: { text: 'exp(', cursor: 4 },
  square: { text: '^2', cursor: 2 },
  power: { text: '^', cursor: 1 },
  reciprocal: { text: '1/(', cursor: 3 },
  factorial: { text: '!', cursor: 1 },
  pi: { text: 'π', cursor: 1 },
  e: { text: 'e', cursor: 1 },
  lparen: { text: '(', cursor: 1 },
  rparen: { text: ')', cursor: 1 },
  frac: { text: '()/()', cursor: 1 },
  plus: { text: '+', cursor: 1 },
  minus: { text: '−', cursor: 1 },
  multiply: { text: '×', cursor: 1 },
  divide: { text: '÷', cursor: 1 },
  dot: { text: '.', cursor: 1 },
}

export function insertAt(text, cursor, insertText, cursorOffset = insertText.length) {
  const safeCursor = Math.max(0, Math.min(cursor, text.length))
  const next = text.slice(0, safeCursor) + insertText + text.slice(safeCursor)
  return {
    text: next,
    cursor: safeCursor + cursorOffset,
  }
}

export function deleteBefore(text, cursor) {
  if (cursor <= 0) return { text, cursor }
  return {
    text: text.slice(0, cursor - 1) + text.slice(cursor),
    cursor: cursor - 1,
  }
}
