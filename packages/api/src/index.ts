import type { AppRouter } from "../../../apps/web/src/server/api/root";

type InferProcedureInputs<T> = T extends {
  _def: { $types: { input: infer TInput } };
}
  ? TInput
  : T extends { _def: { record: infer TRecord } }
    ? { [TKey in keyof TRecord]: InferProcedureInputs<TRecord[TKey]> }
    : never;

type InferProcedureOutputs<T> = T extends {
  _def: { $types: { output: infer TOutput } };
}
  ? TOutput
  : T extends { _def: { record: infer TRecord } }
    ? { [TKey in keyof TRecord]: InferProcedureOutputs<TRecord[TKey]> }
    : never;

export type { AppRouter };
export type RouterInputs = InferProcedureInputs<AppRouter>;
export type RouterOutputs = InferProcedureOutputs<AppRouter>;
