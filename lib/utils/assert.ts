/**
 * Runtime assertions with narrowing.
 * Use for invariants that must hold; not for user input (use zod for that).
 */

export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

export function assertDefined<T>(value: T | null | undefined, name: string): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(`Expected "${name}" to be defined, got ${String(value)}`);
  }
}

export function unreachable(value: never, message?: string): never {
  throw new Error(message ?? `Unreachable case: ${JSON.stringify(value)}`);
}

export function expectEnv(name: string): string {
  const v = process.env[name];
  if (!v || v.length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}
