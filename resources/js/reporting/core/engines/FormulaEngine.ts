// ════════════════════════════════════════════════════════════════════════════
// reporting/core/engines/FormulaEngine.ts
//
// Layer 1 — zero dependencies. Pure TypeScript.
//
// Custom expression evaluator for report formulas.
// No eval(), no Math.js, no external DSL.
//
// Built-in functions: IF, SUM, AVG, ROUND, CONCAT, FORMAT, TODAY,
//                     MIN, MAX, COUNT, ABS, LEN, UPPER, LOWER
//
// Expressions:
//   "Hello " + name
//   IF(total > 1000, "high", "low")
//   ROUND(SUM(lines.*.totalHt), 2)
//   FORMAT(doc.date, "YYYY-MM-DD")
//   COUNT(lines.*.totalHt > 0)
// ════════════════════════════════════════════════════════════════════════════

import type { UniversalDocumentData } from '../../data/UniversalDocumentData';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type ExpressionValue = number | string | boolean | null;

export interface EvaluationContext {
  data: UniversalDocumentData;
  computed: Record<string, ExpressionValue>;
  /** Current line index when evaluating within a line context */
  currentLineIndex?: number;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  /** Expected return type */
  returnType?: 'number' | 'string' | 'boolean' | 'any';
}

export type ExpressionFunction = (
  args: ExpressionValue[],
  context: EvaluationContext,
) => ExpressionValue;

// ─── Tokenizer ─────────────────────────────────────────────────────────────────

type TokenType =
  | 'number' | 'string' | 'identifier'
  | 'lparen' | 'rparen' | 'comma' | 'dot' | 'star'
  | 'plus' | 'minus' | 'asterisk' | 'slash'
  | 'eq' | 'neq' | 'lt' | 'lte' | 'gt' | 'gte'
  | 'and' | 'or' | 'not'
  | 'eof';

interface Token {
  type: TokenType;
  value: string;
  pos: number;
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  const peek = () => input[i] ?? '';
  const advance = () => input[i++];
  const pos = () => i;

  while (i < input.length) {
    const start = pos();
    const ch = peek();

    // Skip whitespace
    if (/\s/.test(ch)) { advance(); continue; }

    // String literal
    if (ch === '"' || ch === "'") {
      const quote = ch;
      advance();
      let str = '';
      while (i < input.length && peek() !== quote) {
        if (peek() === '\\') { advance(); str += advance(); }
        else { str += advance(); }
      }
      if (peek() === quote) advance();
      tokens.push({ type: 'string', value: str, pos: start });
      continue;
    }

    // Number
    if (/[\d.]/.test(ch) && !(ch === '.' && /[\d.]/.test(input[i + 1] ?? ''))) {
      let num = '';
      while (i < input.length && /[\d.]/.test(peek())) num += advance();
      tokens.push({ type: 'number', value: num, pos: start });
      continue;
    }

    // Identifiers and keywords
    if (/[a-zA-Z_\u0600-\u06FF]/.test(ch)) {
      let id = '';
      while (i < input.length && /[a-zA-Z0-9_\u0600-\u06FF]/.test(peek())) id += advance();
      tokens.push({ type: 'identifier', value: id, pos: start });
      continue;
    }

    // Multi-char operators
    const next2 = input.slice(i, i + 2);
    if (next2 === '==') { tokens.push({ type: 'eq', value: '==', pos: start }); i += 2; continue; }
    if (next2 === '!=') { tokens.push({ type: 'neq', value: '!=', pos: start }); i += 2; continue; }
    if (next2 === '<=') { tokens.push({ type: 'lte', value: '<=', pos: start }); i += 2; continue; }
    if (next2 === '>=') { tokens.push({ type: 'gte', value: '>=', pos: start }); i += 2; continue; }
    if (next2 === '&&') { tokens.push({ type: 'and', value: '&&', pos: start }); i += 2; continue; }
    if (next2 === '||') { tokens.push({ type: 'or', value: '||', pos: start }); i += 2; continue; }

    // Single-char operators
    const singleOps: Record<string, TokenType> = {
      '(': 'lparen', ')': 'rparen', ',': 'comma', '.': 'dot', '*': 'star',
      '+': 'plus', '-': 'minus', '/': 'slash', '<': 'lt', '>': 'gt', '!': 'not',
    };
    if (singleOps[ch]) { tokens.push({ type: singleOps[ch], value: ch, pos: start }); advance(); continue; }

    // Unknown character — skip
    advance();
  }

  tokens.push({ type: 'eof', value: '', pos: i });
  return tokens;
}

// ─── AST ───────────────────────────────────────────────────────────────────────

type ASTNode =
  | { kind: 'number'; value: number }
  | { kind: 'string'; value: string }
  | { kind: 'identifier'; name: string }
  | { kind: 'binary'; op: string; left: ASTNode; right: ASTNode }
  | { kind: 'unary'; op: string; operand: ASTNode }
  | { kind: 'call'; name: string; args: ASTNode[] }
  | { kind: 'member'; object: ASTNode; property: string }
  | { kind: 'wildcard'; prefix: string; field: string };

// ─── Parser ────────────────────────────────────────────────────────────────────

class ParseError extends Error {
  constructor(message: string, public pos: number) {
    super(`Parse error at position ${pos}: ${message}`);
  }
}

class Parser {
  private tokens: Token[];
  private pos = 0;

  constructor(input: string) {
    this.tokens = tokenize(input);
  }

  private peek(): Token { return this.tokens[this.pos] ?? { type: 'eof', value: '', pos: -1 }; }
  private advance(): Token { return this.tokens[this.pos++] ?? { type: 'eof', value: '', pos: -1 }; }
  private expect(type: TokenType): Token {
    const token = this.peek();
    if (token.type !== type) throw new ParseError(`Expected ${type}, got ${token.type} (${token.value})`, token.pos);
    return this.advance();
  }

  parse(): ASTNode {
    return this.parseOr();
  }

  private parseOr(): ASTNode {
    let left = this.parseAnd();
    while (this.peek().type === 'or') {
      this.advance();
      left = { kind: 'binary', op: '||', left, right: this.parseAnd() };
    }
    return left;
  }

  private parseAnd(): ASTNode {
    let left = this.parseComparison();
    while (this.peek().type === 'and') {
      this.advance();
      left = { kind: 'binary', op: '&&', left, right: this.parseComparison() };
    }
    return left;
  }

  private parseComparison(): ASTNode {
    let left = this.parseAdditive();
    const cmpOps: Record<string, string> = { eq: '==', neq: '!=', lt: '<', lte: '<=', gt: '>', gte: '>=' };
    const t = this.peek();
    if (cmpOps[t.type]) {
      this.advance();
      left = { kind: 'binary', op: cmpOps[t.type], left, right: this.parseAdditive() };
    }
    return left;
  }

  private parseAdditive(): ASTNode {
    let left = this.parseMultiplicative();
    while (this.peek().type === 'plus' || this.peek().type === 'minus') {
      const op = this.advance().value;
      left = { kind: 'binary', op, left, right: this.parseMultiplicative() };
    }
    return left;
  }

  private parseMultiplicative(): ASTNode {
    let left = this.parseUnary();
    while (this.peek().type === 'asterisk' || this.peek().type === 'slash') {
      const op = this.advance().value;
      left = { kind: 'binary', op, left, right: this.parseUnary() };
    }
    return left;
  }

  private parseUnary(): ASTNode {
    if (this.peek().type === 'minus') {
      this.advance();
      return { kind: 'unary', op: '-', operand: this.parsePrimary() };
    }
    if (this.peek().type === 'not') {
      this.advance();
      return { kind: 'unary', op: '!', operand: this.parsePrimary() };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): ASTNode {
    const t = this.peek();

    // Parenthesized expression
    if (t.type === 'lparen') {
      this.advance();
      const expr = this.parseOr();
      this.expect('rparen');
      return expr;
    }

    // Number literal
    if (t.type === 'number') {
      this.advance();
      return { kind: 'number', value: parseFloat(t.value) };
    }

    // String literal
    if (t.type === 'string') {
      this.advance();
      return { kind: 'string', value: t.value };
    }

    // Identifier — could be a function call, member access, or wildcard
    if (t.type === 'identifier') {
      this.advance();
      let node: ASTNode = { kind: 'identifier', name: t.value };

      // Function call: IDENTIFIER(...)
      if (this.peek().type === 'lparen') {
        this.advance();
        const args: ASTNode[] = [];
        while (this.peek().type !== 'rparen') {
          args.push(this.parseOr());
          if (this.peek().type === 'comma') this.advance();
        }
        this.expect('rparen');
        node = { kind: 'call', name: t.value, args };
      }

      // Member access: expr.property
      while (this.peek().type === 'dot') {
        this.advance();
        const prop = this.expect('identifier');
        node = { kind: 'member', object: node, property: prop.value };
      }

      // Wildcard: prefix.*.field (for array aggregation)
      if (this.peek().type === 'star') {
        this.advance();
        this.expect('dot');
        const field = this.expect('identifier');
        node = { kind: 'wildcard', prefix: t.value, field: field.value };
      }

      return node;
    }

    throw new ParseError(`Unexpected token: ${t.value}`, t.pos);
  }
}

// ─── Evaluator ─────────────────────────────────────────────────────────────────

function isTruthy(val: ExpressionValue): boolean {
  if (val === null) return false;
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val !== 0;
  return val !== '';
}

function compareValues(a: ExpressionValue, b: ExpressionValue): number {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}

// ─── FormulaEngine ─────────────────────────────────────────────────────────────

export class FormulaEngine {
  private readonly functions = new Map<string, ExpressionFunction>();
  private readonly cache = new Map<string, ExpressionValue>();
  private cacheHits = 0;
  private cacheMisses = 0;

  constructor() {
    this.registerBuiltins();
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  registerFunction(name: string, fn: ExpressionFunction): void {
    this.functions.set(name.toUpperCase(), fn);
  }

  evaluate(expression: string, context: EvaluationContext): ExpressionValue {
    const cacheKey = expression;
    const cached = this.cache.get(cacheKey);
    if (cached !== undefined) {
      this.cacheHits++;
      return cached;
    }
    this.cacheMisses++;

    try {
      const parser = new Parser(expression);
      const ast = parser.parse();
      const result = this.evaluateNode(ast, context);
      this.cache.set(cacheKey, result);
      return result;
    } catch (e) {
      if (e instanceof ParseError) return null;
      throw e;
    }
  }

  validate(expression: string): ValidationResult {
    try {
      const parser = new Parser(expression);
      parser.parse();
      return { valid: true, returnType: 'any' };
    } catch (e) {
      return { valid: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  clearCache(): void {
    this.cache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  get stats() {
    return { size: this.cache.size, hits: this.cacheHits, misses: this.cacheMisses };
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private evaluateNode(node: ASTNode, context: EvaluationContext): ExpressionValue {
    switch (node.kind) {
      case 'number':
        return node.value;

      case 'string':
        return node.value;

      case 'identifier':
        return this.resolveIdentifier(node.name, context);

      case 'binary':
        return this.evaluateBinary(node, context);

      case 'unary':
        return this.evaluateUnary(node, context);

      case 'call':
        return this.evaluateCall(node, context);

      case 'member':
        return this.evaluateMember(node, context);

      case 'wildcard':
        return this.evaluateWildcard(node, context);
    }
  }

  private resolveIdentifier(name: string, ctx: EvaluationContext): ExpressionValue {
    const d = ctx.data;

    // Top-level fields
    if (name === 'docNumber') return d.doc.number;
    if (name === 'docDate') return d.doc.date;
    if (name === 'dueDate') return d.doc.dueDate ?? null;
    if (name === 'totalHt') return d.totals.totalHt;
    if (name === 'totalTva') return d.totals.totalTva;
    if (name === 'totalTtc') return d.totals.totalTtc;
    if (name === 'paid') return d.totals.paid;
    if (name === 'change') return d.totals.change;
    if (name === 'remaining') return d.totals.remaining;
    if (name === 'fiscalStamp') return d.totals.fiscalStamp;
    if (name === 'totalDiscount') return d.totals.totalDiscount;
    if (name === 'prevBalance') return d.balance?.previous ?? null;
    if (name === 'newBalance') return d.balance?.current ?? null;

    // Computed values
    if (name in ctx.computed) return ctx.computed[name];

    // Current line field (within line iteration)
    if (ctx.currentLineIndex !== undefined) {
      const line = d.lines[ctx.currentLineIndex];
      if (!line) return null;
      if (name === 'rowNumber') return line.rowNumber;
      if (name === 'lineRef') return line.ref ?? null;
      if (name === 'lineName') return line.name;
      if (name === 'quantity') return line.quantity;
      if (name === 'unitPriceHt') return line.unitPriceHt;
      if (name === 'lineTotalHt') return line.totalHt;
      if (name === 'lineTotalTva') return line.totalTva;
      if (name === 'lineTotalTtc') return line.totalTtc;
      if (name === 'tvaRate') return line.tvaPct;
    }

    return null;
  }

  private evaluateBinary(node: { kind: 'binary'; op: string; left: ASTNode; right: ASTNode }, ctx: EvaluationContext): ExpressionValue {
    const left = this.evaluateNode(node.left, ctx);
    const right = this.evaluateNode(node.right, ctx);

    switch (node.op) {
      case '+': {
        if (typeof left === 'string' || typeof right === 'string') return String(left ?? '') + String(right ?? '');
        return (left as number ?? 0) + (right as number ?? 0);
      }
      case '-': return (left as number ?? 0) - (right as number ?? 0);
      case '*': return (left as number ?? 0) * (right as number ?? 0);
      case '/': {
        const r = right as number ?? 0;
        if (r === 0) return null;
        return (left as number ?? 0) / r;
      }
      case '==': return left === right;
      case '!=': return left !== right;
      case '<': return compareValues(left, right) < 0;
      case '<=': return compareValues(left, right) <= 0;
      case '>': return compareValues(left, right) > 0;
      case '>=': return compareValues(left, right) >= 0;
      case '&&': return isTruthy(left) && isTruthy(right);
      case '||': return isTruthy(left) || isTruthy(right);
      default: return null;
    }
  }

  private evaluateUnary(node: { kind: 'unary'; op: string; operand: ASTNode }, ctx: EvaluationContext): ExpressionValue {
    const operand = this.evaluateNode(node.operand, ctx);
    switch (node.op) {
      case '-': return -(operand as number ?? 0);
      case '!': return !isTruthy(operand);
      default: return null;
    }
  }

  private evaluateCall(node: { kind: 'call'; name: string; args: ASTNode[] }, ctx: EvaluationContext): ExpressionValue {
    const fn = this.functions.get(node.name.toUpperCase());
    if (!fn) return null;
    const argValues = node.args.map(a => this.evaluateNode(a, ctx));
    return fn(argValues, ctx);
  }

  private evaluateMember(node: { kind: 'member'; object: ASTNode; property: string }, ctx: EvaluationContext): ExpressionValue {
    const obj = this.evaluateNode(node.object, ctx);
    if (obj == null || typeof obj !== 'object') return null;
    return (obj as Record<string, unknown>)[node.property] as ExpressionValue ?? null;
  }

  private evaluateWildcard(node: { kind: 'wildcard'; prefix: string; field: string }, ctx: EvaluationContext): ExpressionValue {
    // Currently only supports lines.*.field
    if (node.prefix !== 'lines') return null;
    return ctx.data.lines.map(line => {
      const val = (line as Record<string, unknown>)[node.field];
      return typeof val === 'number' ? val : 0;
    });
  }

  // ── Built-in functions ─────────────────────────────────────────────────────

  private registerBuiltins(): void {
    this.functions.set('IF', ([cond, t, f]: ExpressionValue[]) =>
      isTruthy(cond) ? t : f,
    );

    this.functions.set('SUM', (args: ExpressionValue[]) =>
      args.reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0),
    );

    this.functions.set('AVG', (args: ExpressionValue[]) => {
      const nums = args.filter((v): v is number => typeof v === 'number');
      return nums.length > 0 ? nums.reduce((s, v) => s + v, 0) / nums.length : 0;
    });

    this.functions.set('ROUND', ([val, decimals]: ExpressionValue[]) => {
      const n = val as number ?? 0;
      const d = Math.pow(10, Math.floor(decimals as number ?? 0));
      return Math.round(n * d) / d;
    });

    this.functions.set('CONCAT', (args: ExpressionValue[]) =>
      args.map(v => v ?? '').join(''),
    );

    this.functions.set('FORMAT', ([val, fmt]: ExpressionValue[]) => {
      if (val == null) return '';
      if (fmt === 'NUMBER' || fmt === 'number') {
        const n = val as number;
        return n.toLocaleString('ar-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
      if (fmt === 'DATE' || fmt === 'date' || fmt === 'YYYY-MM-DD') {
        const d = String(val);
        if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0, 10);
        return d;
      }
      return String(val);
    });

    this.functions.set('TODAY', () =>
      new Date().toISOString().slice(0, 10),
    );

    this.functions.set('MIN', (args: ExpressionValue[]) => {
      const nums = args.filter((v): v is number => typeof v === 'number');
      return nums.length > 0 ? Math.min(...nums) : null;
    });

    this.functions.set('MAX', (args: ExpressionValue[]) => {
      const nums = args.filter((v): v is number => typeof v === 'number');
      return nums.length > 0 ? Math.max(...nums) : null;
    });

    this.functions.set('COUNT', (args: ExpressionValue[]) => args.length);

    this.functions.set('ABS', ([val]: ExpressionValue[]) =>
      Math.abs(val as number ?? 0),
    );

    this.functions.set('LEN', ([val]: ExpressionValue[]) =>
      String(val ?? '').length,
    );

    this.functions.set('UPPER', ([val]: ExpressionValue[]) =>
      String(val ?? '').toUpperCase(),
    );

    this.functions.set('LOWER', ([val]: ExpressionValue[]) =>
      String(val ?? '').toLowerCase(),
    );
  }
}

// ─── Singleton ─────────────────────────────────────────────────────────────────

export const formulaEngine = new FormulaEngine();
