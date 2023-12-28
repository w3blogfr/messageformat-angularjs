import { MessageSyntaxError } from '../errors.js';
import type * as CST from './cst-types.js';
import type { ParseContext } from './message.js';
import { parseNameValue } from './names.js';
import { whitespaces } from './util.js';
import { parseLiteral, parseQuotedLiteral, parseVariable } from './values.js';

// expression = "{" [s] (((literal / variable) [s annotation]) / annotation) [s] "}"
export function parseExpression(
  ctx: ParseContext,
  start: number
): CST.Expression {
  let pos = start + 1; // '{'
  pos += whitespaces(ctx.source, pos);

  const arg =
    ctx.source[pos] === '$'
      ? parseVariable(ctx, pos)
      : parseLiteral(ctx, pos, false);
  if (arg) pos = arg.end;

  let body:
    | CST.Literal
    | CST.VariableRef
    | CST.FunctionRef
    | CST.ReservedAnnotation
    | CST.Junk;
  let junkError: MessageSyntaxError | undefined;
  pos += whitespaces(ctx.source, pos);
  switch (ctx.source[pos]) {
    case ':':
    case '+':
    case '-':
      body = parseFunctionRef(ctx, pos, arg);
      pos = body.end;
      break;
    case '!':
    case '@':
    case '#':
    case '%':
    case '^':
    case '&':
    case '*':
    case '<':
    case '>':
    case '?':
    case '~':
      body = parseReservedAnnotation(ctx, pos, arg);
      pos = body.end;
      break;
    default:
      if (arg) {
        body = arg;
      } else {
        const source = ctx.source.substring(pos, pos + 1);
        body = { type: 'junk', start: pos, end: pos, source };
        junkError = new MessageSyntaxError('parse-error', pos, pos + 1);
        ctx.errors.push(junkError);
      }
  }
  pos += whitespaces(ctx.source, pos);

  if (pos >= ctx.source.length) {
    ctx.onError('missing-syntax', pos, '}');
  } else if (ctx.source[pos] !== '}') {
    const errStart = pos;
    while (pos < ctx.source.length && ctx.source[pos] !== '}') pos += 1;
    if (body.type === 'junk') {
      body.end = pos;
      body.source = ctx.source.substring(body.start, pos);
      if (junkError) junkError.end = pos;
    } else {
      ctx.onError('extra-content', errStart, pos);
    }
  } else {
    pos += 1;
  }

  return { type: 'expression', start, end: pos, body };
}

// annotation = (function *(s option)) / reserved
// function = (":" / "+" / "-") name
function parseFunctionRef(
  ctx: ParseContext,
  start: number,
  operand: CST.Literal | CST.VariableRef | undefined
): CST.FunctionRef {
  const sigil = ctx.source[start];
  let pos = start + 1; // ':' | '+' | '-'
  const name = parseNameValue(ctx.source, pos);
  if (!name) ctx.onError('empty-token', pos, pos + 1);
  const options: CST.Option[] = [];
  pos += name.length;
  while (pos < ctx.source.length) {
    const ws = whitespaces(ctx.source, pos);
    if (ctx.source[pos + ws] === '}') break;
    if (ws === 0) ctx.onError('missing-syntax', pos, ' ');
    pos += ws;
    const opt = parseOption(ctx, pos);
    if (opt.end === pos) break; // error
    options.push(opt);
    pos = opt.end;
  }
  const kind = sigil === '+' ? 'open' : sigil === '-' ? 'close' : 'value';
  return { type: 'function', kind, operand, start, end: pos, name, options };
}

// option = name [s] "=" [s] (literal / variable)
function parseOption(ctx: ParseContext, start: number): CST.Option {
  const name = parseNameValue(ctx.source, start);
  let pos = start + name.length;
  pos += whitespaces(ctx.source, pos);
  if (ctx.source[pos] === '=') pos += 1;
  else ctx.onError('missing-syntax', pos, '=');
  pos += whitespaces(ctx.source, pos);
  const value =
    ctx.source[pos] === '$'
      ? parseVariable(ctx, pos)
      : parseLiteral(ctx, pos, true);
  return { start, end: value.end, name, value };
}

// reserved       = reserved-start reserved-body
// reserved-start = "!" / "@" / "#" / "%" / "^" / "&" / "*" / "<" / ">" / "?" / "~"
// reserved-body  = *( [s] 1*(reserved-char / reserved-escape / literal))
// reserved-char  = %x00-08        ; omit HTAB and LF
//                / %x0B-0C        ; omit CR
//                / %x0E-19        ; omit SP
//                / %x21-5B        ; omit \
//                / %x5D-7A        ; omit { | }
//                / %x7E-D7FF      ; omit surrogates
//                / %xE000-10FFFF
function parseReservedAnnotation(
  ctx: ParseContext,
  start: number,
  operand: CST.Literal | CST.VariableRef | undefined
): CST.ReservedAnnotation {
  const sigil = ctx.source[start] as CST.ReservedAnnotation['sigil'];
  const source = parseReservedBody(ctx, start + 1); // skip sigil
  return {
    type: 'reserved-annotation',
    start,
    end: source.end,
    operand,
    sigil,
    source
  };
}

export function parseReservedBody(
  ctx: ParseContext,
  start: number
): CST.Syntax<string> {
  let pos = start;
  loop: while (pos < ctx.source.length) {
    const ch = ctx.source[pos];
    switch (ch) {
      case '\\': {
        switch (ctx.source[pos + 1]) {
          case '\\':
          case '{':
          case '|':
          case '}':
            break;
          default:
            ctx.onError('bad-escape', pos, pos + 2);
        }
        pos += 2;
        break;
      }
      case '|':
        pos = parseQuotedLiteral(ctx, pos).end;
        break;
      case '}':
        break loop;
      default: {
        const cc = ch.charCodeAt(0);
        if (cc >= 0xd800 && cc < 0xe000) {
          // surrogates are invalid here
          ctx.onError('parse-error', pos, pos + 1);
        }
        pos += 1;
      }
    }
  }
  let prev = ctx.source[pos - 1];
  while (prev === '\r' || prev === '\n' || prev === '\t' || prev === ' ') {
    pos -= 1;
    prev = ctx.source[pos - 1];
  }
  return { start, end: pos, value: ctx.source.substring(start, pos) };
}
