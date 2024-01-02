import type { Context } from '../../format-context';
import type { MessageValue } from '../../runtime';
import type { Expression } from '../types';
import { resolveFunctionAnnotation } from './function-annotation';
import { resolveLiteral } from './literal';
import { resolveUnsupportedAnnotation } from './unsupported-annotation';
import { resolveVariableRef } from './variable-ref';

export function resolveExpression(
  ctx: Context,
  { arg, annotation }: Expression
): MessageValue {
  if (annotation) {
    return annotation.type === 'function'
      ? resolveFunctionAnnotation(ctx, arg, annotation)
      : resolveUnsupportedAnnotation(ctx, arg, annotation);
  }
  switch (arg?.type) {
    case 'literal':
      return resolveLiteral(ctx, arg);
    case 'variable':
      return resolveVariableRef(ctx, arg);
    default:
      // @ts-expect-error - should never happen
      throw new Error(`Unsupported expression: ${arg?.type}`);
  }
}
