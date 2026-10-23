export type Decoder<T> = (value: unknown) => T;

export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}

export function isNullableString(value: unknown): value is string | null {
	return value === null || typeof value === 'string';
}

export function isStringArray(value: unknown): value is string[] {
	return Array.isArray(value) && value.every(isNonEmptyString);
}

export function isNonNegativeInteger(value: unknown): value is number {
	return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

export function decode<T>(value: unknown, guard: (value: unknown) => value is T, name: string): T {
	if (!guard(value)) throw new Error(`Invalid ${name} response.`);
	return value;
}
