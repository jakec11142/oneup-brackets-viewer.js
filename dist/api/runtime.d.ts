/**
 * Minimal helpers required by the generated OpenAPI models.
 * The generator expects a `mapValues` utility similar to lodash.
 */
export declare function mapValues<T extends Record<string, any>, R>(input: T | null | undefined, mapper: (value: T[keyof T]) => R): Record<string, R> | null | undefined;
