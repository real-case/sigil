// Primitives shared by the per-widget payload guards.
//
// They exist to make a guard say the same thing its tool's zod schema says. The
// semantics below are zod v4's, verified rather than assumed:
//   • `z.number()` rejects NaN and Infinity — hence isFiniteNumber, not typeof.
//   • `z.string().min(1)` rejects "" — hence isNonEmptyString for every field
//     the schema bounds that way (titles, labels, series names, region ids).
//   • an object schema strips unknown keys rather than failing, so nothing here
//     rejects a payload for carrying extra properties.
//   • an optional field accepts an explicit `undefined` but rejects `null`,
//     which the `=== undefined` comparisons below reproduce.
//
// Why this matters more than tidiness: a dashboard tile's payload never reaches
// zod at all (`render_dashboard` types it as an opaque record), so for tiles the
// guard is not a second opinion — it is the only one.

/**
 * Narrow to an indexable record. Arrays are excluded: `typeof [] === "object"`,
 * so without the check an array would be probed for named fields and answer
 * `undefined` to each, which reads as "a record that failed validation" when it
 * is really the wrong kind of value.
 */
export function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** Matches `z.number()`: a number, but neither NaN nor ±Infinity. */
export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isOptionalFiniteNumber(value: unknown): boolean {
  return value === undefined || isFiniteNumber(value);
}

/** Matches `z.number().nonnegative()`. */
export function isNonNegativeNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0;
}

/** Matches `z.number().int().min(min).max(max)`. */
export function isIntegerInRange(value: unknown, min: number, max: number): value is number {
  return isFiniteNumber(value) && Number.isInteger(value) && value >= min && value <= max;
}

/** Matches `z.string().min(1)`. */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

export function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === "string";
}

export function isOptionalBoolean(value: unknown): boolean {
  return value === undefined || typeof value === "boolean";
}

/** Matches `z.enum([...])`. */
export function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value);
}

export function isOptionalOneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
): boolean {
  return value === undefined || isOneOf(value, allowed);
}

/** Matches `z.array(item).min(1)`. */
export function isNonEmptyArrayOf<T>(
  value: unknown,
  isItem: (item: unknown) => item is T,
): value is T[] {
  return Array.isArray(value) && value.length > 0 && value.every(isItem);
}

/** Matches `z.array(item)` — empty is legal. */
export function isArrayOf<T>(
  value: unknown,
  isItem: (item: unknown) => item is T,
): value is T[] {
  return Array.isArray(value) && value.every(isItem);
}

/** Matches `z.array(item).optional()`. */
export function isOptionalArrayOf<T>(
  value: unknown,
  isItem: (item: unknown) => item is T,
): boolean {
  return value === undefined || isArrayOf(value, isItem);
}
