import { describe, expect, it } from 'vitest';
import {
	parseApiKeys,
	parseIssuedKey,
	parseNamespaces,
	parseRevocation,
	parseRouteGuide
} from './api-decoders.js';
import { parseSession, parseAuthorization } from '../auth/auth-types.js';
import { readJsonResponse } from './http-client.js';

const key = {
	id: 'key-1',
	namespace: 'billing',
	prefix: 'gk_prefix',
	label: null,
	createdAt: '2026-10-23T00:00:00.000Z',
	lastUsedAt: null,
	revokedAt: null
};
const page = {
	items: [key],
	page: 1,
	pageSize: 10,
	total: 1,
	totalPages: 1,
	hasNext: false,
	hasPrevious: false
};

describe('API response boundaries', () => {
	it('accepts valid paginated keys and nullable fields', () =>
		expect(parseApiKeys(page)).toEqual(page));
	it.each([
		{ ...page, items: [null] },
		{ ...page, items: [{ ...key, createdAt: 'invalid' }] },
		{ ...page, page: 0 },
		{ ...page, total: NaN },
		{ ...page, hasNext: 'false' }
	])('rejects invalid nested keys or pagination: %j', (value) => {
		expect(() => parseApiKeys(value)).toThrow('Invalid API key list');
	});
	it('validates namespaces, route guides, issued keys, and revocation flags', () => {
		expect(parseNamespaces({ namespaces: [] })).toEqual({ namespaces: [] });
		expect(() => parseNamespaces({ namespaces: [42] })).toThrow();
		expect(() =>
			parseRouteGuide({
				namespaces: [{ namespace: 'billing', versions: [42], supportsAnyVersion: false }]
			})
		).toThrow();
		expect(() => parseIssuedKey({ ...key, apiKey: '' })).toThrow();
		expect(parseRevocation({ revoked: false })).toEqual({ revoked: false });
		expect(() => parseRevocation({ revoked: 'true' })).toThrow();
	});
	it('rejects malformed sessions before authentication state is updated', () => {
		expect(() =>
			parseSession({ accessToken: 'token', tokenType: 'Bearer', user: { id: 42 } })
		).toThrow('Invalid session');
	});
	it('rejects executable authorization URLs', () => {
		expect(() =>
			parseAuthorization({ authorizeUrl: 'javascript:alert(1)', state: 'state' })
		).toThrow();
	});
	it('uses structured validation messages without trusting their types', async () => {
		await expect(
			readJsonResponse(
				Response.json({ message: ['First error', 'Second error'] }, { status: 400 }),
				parseNamespaces
			)
		).rejects.toThrow('First error; Second error');
		await expect(
			readJsonResponse(
				Response.json({ message: { secret: 'value' } }, { status: 400 }),
				parseNamespaces
			)
		).rejects.toThrow('Request failed: 400');
	});
	it('keeps invalid JSON failures distinct from valid but malformed payloads', async () => {
		await expect(readJsonResponse(new Response('not JSON'), parseNamespaces)).rejects.toThrow(
			'invalid JSON'
		);
		await expect(
			readJsonResponse(Response.json({ namespaces: 42 }), parseNamespaces)
		).rejects.toThrow('Invalid namespaces');
	});
});
