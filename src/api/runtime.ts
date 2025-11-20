/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Minimal helpers required by the generated OpenAPI models.
 * The generator expects a `mapValues` utility similar to lodash.
 *
 * @param input
 * @param mapper
 */
export function mapValues<T extends Record<string, any>, R>(
    input: T | null | undefined,
    mapper: (value: T[keyof T]) => R,
): Record<string, R> | null | undefined {
    if (input == null)
        return input ;

    return Object.keys(input).reduce<Record<string, R>>((accumulator, key) => {
        accumulator[key] = mapper(input[key]);
        return accumulator;
    }, {});
}
