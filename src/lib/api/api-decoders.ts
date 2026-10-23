import type {
	ApiKeyItem,
	ApiKeyListResponse,
	IssuedApiKey,
	RouteGuideNamespace,
	RouteGuideResponse
} from './api-types.js';
import {
	decode,
	isRecord,
	isNonEmptyString,
	isNullableString,
	isStringArray,
	isNonNegativeInteger
} from './validation.js';

function isDateString(value: unknown): value is string {
	return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function hasKeyMetadata(value: Record<string, unknown>): boolean {
	return (
		isNonEmptyString(value.id) &&
		isNonEmptyString(value.namespace) &&
		isNonEmptyString(value.prefix) &&
		isNullableString(value.label) &&
		isDateString(value.createdAt)
	);
}

function isApiKey(value: unknown): value is ApiKeyItem {
	return (
		isRecord(value) &&
		hasKeyMetadata(value) &&
		(value.lastUsedAt === null || isDateString(value.lastUsedAt)) &&
		(value.revokedAt === null || isDateString(value.revokedAt))
	);
}

export function parseNamespaces(value: unknown): { namespaces: string[] } {
	return decode(
		value,
		(value): value is { namespaces: string[] } =>
			isRecord(value) && isStringArray(value.namespaces),
		'namespaces'
	);
}

export function parseRouteGuide(value: unknown): RouteGuideResponse {
	return decode(
		value,
		(value): value is RouteGuideResponse =>
			isRecord(value) &&
			Array.isArray(value.namespaces) &&
			value.namespaces.every(
				(entry): entry is RouteGuideNamespace =>
					isRecord(entry) &&
					isNonEmptyString(entry.namespace) &&
					typeof entry.supportsAnyVersion === 'boolean' &&
					isStringArray(entry.versions)
			),
		'route guide'
	);
}

export function parseApiKeys(value: unknown): ApiKeyListResponse {
	return decode(
		value,
		(value): value is ApiKeyListResponse =>
			isRecord(value) &&
			Array.isArray(value.items) &&
			value.items.every(isApiKey) &&
			isNonNegativeInteger(value.page) &&
			value.page > 0 &&
			isNonNegativeInteger(value.pageSize) &&
			value.pageSize > 0 &&
			value.pageSize <= 100 &&
			isNonNegativeInteger(value.total) &&
			isNonNegativeInteger(value.totalPages) &&
			typeof value.hasNext === 'boolean' &&
			typeof value.hasPrevious === 'boolean',
		'API key list'
	);
}

export function parseIssuedKey(value: unknown): IssuedApiKey {
	return decode(
		value,
		(value): value is IssuedApiKey =>
			isRecord(value) && hasKeyMetadata(value) && isNonEmptyString(value.apiKey),
		'issued API key'
	);
}

export function parseRevocation(value: unknown): { revoked: boolean } {
	return decode(
		value,
		(value): value is { revoked: boolean } => isRecord(value) && typeof value.revoked === 'boolean',
		'revocation'
	);
}
