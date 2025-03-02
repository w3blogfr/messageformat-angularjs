---
title: "Expression"
parent: "messageformat"
grand_parent: API Reference
---

<!-- Do not edit this file. It is automatically generated by API Documenter. -->



# Expression type

> This API is provided as a beta preview for developers and may change based on feedback that we receive. Do not use this API in a production environment.
> 

Expressions are used in declarations, as selectors, and as placeholders. Each must include at least an `arg` or an `annotation`<!-- -->, or both.

**Signature:**

```typescript
export type Expression<A extends Literal | VariableRef | undefined = Literal | VariableRef | undefined> = A extends Literal | VariableRef ? {
    type: 'expression';
    arg: A;
    annotation?: FunctionAnnotation | UnsupportedAnnotation;
    [cst]?: CST.Expression;
} : {
    type: 'expression';
    arg?: never;
    annotation: FunctionAnnotation | UnsupportedAnnotation;
    [cst]?: CST.Expression;
};
```
**References:** [Literal](./messageformat.literal.md)<!-- -->, [VariableRef](./messageformat.variableref.md)<!-- -->, [FunctionAnnotation](./messageformat.functionannotation.md)<!-- -->, [UnsupportedAnnotation](./messageformat.unsupportedannotation.md)<!-- -->, [cst](./messageformat.cst.md)

