import { MessageResolutionError } from '../errors.js';
import type { Context } from '../format-context.js';
import { fallback } from '../functions/fallback.js';
import { getValueSource } from './resolve-value.js';
import type { Literal, UnsupportedAnnotation, VariableRef } from './types.js';

export function resolveUnsupportedAnnotation(
  ctx: Context,
  operand: Literal | VariableRef | undefined,
  { sigil = '�' }: UnsupportedAnnotation
) {
  const msg = `Reserved ${sigil} annotation is not supported`;
  ctx.onError(new MessageResolutionError('unsupported-annotation', msg, sigil));
  return fallback(getValueSource(operand) ?? sigil);
}
