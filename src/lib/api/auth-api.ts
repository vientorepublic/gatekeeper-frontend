import { authRequest } from '$lib/auth/auth-client';

export interface ApiKeyItem {
	id: string;
	namespace: string;
	prefix: string;
	label: string | null;
	createdAt: string;
	lastUsedAt: string | null;
	revokedAt: string | null;
}

export interface ApiKeyListResponse {
	items: ApiKeyItem[];
	page: number;
	pageSize: number;
	total: number;
	totalPages: number;
	hasNext: boolean;
	hasPrevious: boolean;
}

export interface IssuedApiKey {
	id: string;
	namespace: string;
	apiKey: string;
	prefix: string;
	createdAt: string;
	label: string | null;
}

export interface RouteGuideNamespace {
	namespace: string;
	supportsAnyVersion: boolean;
	versions: string[];
}

export interface RouteGuideResponse {
	namespaces: RouteGuideNamespace[];
}

export async function fetchNamespaces(): Promise<string[]> {
	const result = await authRequest<{ namespaces: string[] }>('/auth/namespaces');
	return result.namespaces;
}

export async function fetchRouteGuide(): Promise<RouteGuideResponse> {
	return authRequest<RouteGuideResponse>('/auth/route-map');
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

	return authRequest<ApiKeyListResponse>(
		`/auth/api-keys/${encodeURIComponent(namespace)}?${params.toString()}`
	);
}

export async function createApiKey(namespace: string, label: string): Promise<IssuedApiKey> {
	return authRequest<IssuedApiKey>(`/auth/api-keys/${encodeURIComponent(namespace)}`, {
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
	await authRequest<{ revoked: boolean }>(
		`/auth/api-keys/${encodeURIComponent(namespace)}/${encodeURIComponent(id)}`,
		{
			method: 'DELETE'
		}
	);
}
