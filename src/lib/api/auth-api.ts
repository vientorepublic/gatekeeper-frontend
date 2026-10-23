import { authRequest } from '#lib/auth/auth-client.js';

import type { ApiKeyListResponse, IssuedApiKey, RouteGuideResponse } from './api-types.js';
import {
	parseNamespaces,
	parseRouteGuide,
	parseApiKeys,
	parseIssuedKey,
	parseRevocation
} from './api-decoders.js';
export type {
	ApiKeyItem,
	ApiKeyListResponse,
	IssuedApiKey,
	RouteGuideNamespace,
	RouteGuideResponse
} from './api-types.js';

export async function fetchNamespaces(): Promise<string[]> {
	const result = await authRequest('/auth/namespaces', parseNamespaces);
	return result.namespaces;
}

export async function fetchRouteGuide(): Promise<RouteGuideResponse> {
	return authRequest('/auth/route-map', parseRouteGuide);
}

export async function fetchApiKeys(
	namespace: string,
	page = 1,
	pageSize = 20
): Promise<ApiKeyListResponse> {
	const params = new URLSearchParams({
		page: String(page),
		pageSize: String(pageSize)
	});

	return authRequest(
		`/auth/api-keys/${encodeURIComponent(namespace)}?${params.toString()}`,
		parseApiKeys
	);
}

export async function createApiKey(namespace: string, label: string): Promise<IssuedApiKey> {
	return authRequest(`/auth/api-keys/${encodeURIComponent(namespace)}`, parseIssuedKey, {
		method: 'POST',
		headers: {
			'content-type': 'application/json'
		},
		body: JSON.stringify({
			label
		})
	});
}

export async function revokeApiKeyById(namespace: string, id: string): Promise<void> {
	const result = await authRequest(
		`/auth/api-keys/${encodeURIComponent(namespace)}/${encodeURIComponent(id)}`,
		parseRevocation,
		{
			method: 'DELETE'
		}
	);
	if (!result.revoked) throw new Error('API key could not be revoked.');
}
