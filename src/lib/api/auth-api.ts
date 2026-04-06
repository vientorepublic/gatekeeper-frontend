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

export interface IssuedApiKey {
	id: string;
	namespace: string;
	apiKey: string;
	prefix: string;
	createdAt: string;
	label: string | null;
}

export async function fetchNamespaces(): Promise<string[]> {
	const result = await authRequest<{ namespaces: string[] }>('/auth/namespaces');
	return result.namespaces;
}

export async function fetchApiKeys(namespace: string): Promise<ApiKeyItem[]> {
	return authRequest<ApiKeyItem[]>(`/auth/api-keys/${encodeURIComponent(namespace)}`);
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
