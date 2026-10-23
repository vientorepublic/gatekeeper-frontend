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
