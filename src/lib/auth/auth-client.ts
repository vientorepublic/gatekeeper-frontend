import { browser } from '$app/environment';
import { env } from '$env/dynamic/public';
import { get, writable } from 'svelte/store';

export interface AuthUser {
	id: string;
	provider: string;
	subject: string;
	email: string | null;
	name: string | null;
	avatarUrl: string | null;
}

export interface AuthSessionResponse {
	accessToken: string;
	refreshToken: string | null;
	oauthAccessTokenExpiresIn: number | null;
	tokenType: 'Bearer';
	user: AuthUser;
}

export interface AuthState {
	status: 'unknown' | 'unauthenticated' | 'authenticated' | 'refreshing' | 'error';
	gatewayAccessToken: string | null;
	refreshToken: string | null;
	oauthAccessTokenExpiresAt: number | null;
	user: AuthUser | null;
	errorMessage: string;
}

const ACCESS_TOKEN_KEY = 'gatekeeper:access-token';
const REFRESH_TOKEN_KEY = 'gatekeeper:refresh-token';
const OAUTH_EXPIRES_AT_KEY = 'gatekeeper:oauth-expires-at';
const USER_KEY = 'gatekeeper:user';

const API_BASE = (env.PUBLIC_GATEKEEPER_API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

const initialState: AuthState = {
	status: 'unknown',
	gatewayAccessToken: null,
	refreshToken: null,
	oauthAccessTokenExpiresAt: null,
	user: null,
	errorMessage: ''
};

export const authStore = writable<AuthState>(initialState);

let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let inFlightRefresh: Promise<boolean> | null = null;

function normalizeAvatarUrl(value: string | null | undefined): string | null {
	if (typeof value !== 'string') {
		return null;
	}

	const normalized = value.trim();
	if (!normalized) {
		return null;
	}

	try {
		const parsed = new URL(normalized);
		if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
			return null;
		}

		return parsed.toString();
	} catch {
		return null;
	}
}

function normalizeUser(user: AuthUser): AuthUser {
	return {
		...user,
		avatarUrl: normalizeAvatarUrl(user.avatarUrl)
	};
}

function clearRefreshTimer(): void {
	if (refreshTimer) {
		clearTimeout(refreshTimer);
		refreshTimer = null;
	}
}

function setError(message: string): void {
	authStore.update((state) => ({
		...state,
		status: 'error',
		errorMessage: message
	}));
}

function toExpiresAt(expiresInSeconds: number | null): number | null {
	if (!expiresInSeconds || expiresInSeconds <= 0) {
		return null;
	}

	return Date.now() + expiresInSeconds * 1000;
}

function persistSession(state: AuthState): void {
	if (!browser) {
		return;
	}

	if (state.gatewayAccessToken) {
		localStorage.setItem(ACCESS_TOKEN_KEY, state.gatewayAccessToken);
	} else {
		localStorage.removeItem(ACCESS_TOKEN_KEY);
	}

	if (state.refreshToken) {
		localStorage.setItem(REFRESH_TOKEN_KEY, state.refreshToken);
	} else {
		localStorage.removeItem(REFRESH_TOKEN_KEY);
	}

	if (state.user) {
		localStorage.setItem(USER_KEY, JSON.stringify(state.user));
	} else {
		localStorage.removeItem(USER_KEY);
	}

	if (state.oauthAccessTokenExpiresAt) {
		localStorage.setItem(OAUTH_EXPIRES_AT_KEY, String(state.oauthAccessTokenExpiresAt));
	} else {
		localStorage.removeItem(OAUTH_EXPIRES_AT_KEY);
	}
}

function applySession(session: AuthSessionResponse): void {
	const oauthAccessTokenExpiresAt = toExpiresAt(session.oauthAccessTokenExpiresIn);
	const normalizedUser = normalizeUser(session.user);
	const nextState: AuthState = {
		status: 'authenticated',
		gatewayAccessToken: session.accessToken,
		refreshToken: session.refreshToken,
		oauthAccessTokenExpiresAt,
		user: normalizedUser,
		errorMessage: ''
	};

	authStore.set(nextState);
	persistSession(nextState);
	scheduleRefresh();
}

export function clearSession(): void {
	clearRefreshTimer();
	const nextState: AuthState = {
		status: 'unauthenticated',
		gatewayAccessToken: null,
		refreshToken: null,
		oauthAccessTokenExpiresAt: null,
		user: null,
		errorMessage: ''
	};
	authStore.set(nextState);
	persistSession(nextState);
}

export function initializeAuthState(): void {
	if (!browser) {
		return;
	}

	const storedToken = localStorage.getItem(ACCESS_TOKEN_KEY);
	const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
	const storedUser = localStorage.getItem(USER_KEY);
	const storedExpiresAt = localStorage.getItem(OAUTH_EXPIRES_AT_KEY);

	let user: AuthUser | null = null;
	if (storedUser) {
		try {
			user = normalizeUser(JSON.parse(storedUser) as AuthUser);
		} catch {
			user = null;
		}
	}

	const oauthAccessTokenExpiresAt = storedExpiresAt ? Number(storedExpiresAt) : null;

	if (storedToken && user) {
		authStore.set({
			status: 'authenticated',
			gatewayAccessToken: storedToken,
			refreshToken: storedRefreshToken,
			oauthAccessTokenExpiresAt:
				oauthAccessTokenExpiresAt && Number.isFinite(oauthAccessTokenExpiresAt)
					? oauthAccessTokenExpiresAt
					: null,
			user,
			errorMessage: ''
		});
		scheduleRefresh();
		return;
	}

	clearSession();
}

export async function startOAuthLogin(): Promise<void> {
	try {
		const result = await plainApiRequest<{ authorizeUrl: string; state: string }>(
			'/auth/oauth2/authorize'
		);
		if (browser) {
			window.location.assign(result.authorizeUrl);
		}
	} catch (error) {
		setError(error instanceof Error ? error.message : 'OAuth2 login failed.');
	}
}

export async function handleOAuthCallbackIfPresent(): Promise<boolean> {
	if (!browser) {
		return false;
	}

	const currentUrl = new URL(window.location.href);
	const code = currentUrl.searchParams.get('code');
	const state = currentUrl.searchParams.get('state');
	const oauthError = currentUrl.searchParams.get('error');

	if (oauthError) {
		setError(`OAuth2 error: ${oauthError}`);
		return true;
	}

	if (!code) {
		return false;
	}

	if (!state) {
		setError('OAuth2 state is missing in callback query.');
		return true;
	}

	try {
		const callbackPath = `/auth/oauth2/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;
		const session = await plainApiRequest<AuthSessionResponse>(callbackPath);
		applySession(session);

		const cleaned = `${currentUrl.pathname}${currentUrl.hash}`;
		window.history.replaceState({}, '', cleaned);
		return true;
	} catch (error) {
		setError(error instanceof Error ? error.message : 'OAuth2 callback failed.');
		return true;
	}
}

function shouldRefreshSoon(expiresAt: number | null): boolean {
	if (!expiresAt) {
		return false;
	}

	return Date.now() >= expiresAt - 30_000;
}

function scheduleRefresh(): void {
	if (!browser) {
		return;
	}

	clearRefreshTimer();
	const snapshot = get(authStore);
	if (!snapshot.refreshToken || !snapshot.oauthAccessTokenExpiresAt) {
		return;
	}

	const msUntilRefresh = Math.max(snapshot.oauthAccessTokenExpiresAt - Date.now() - 60_000, 5_000);
	refreshTimer = setTimeout(() => {
		void refreshSession();
	}, msUntilRefresh);
}

export async function refreshSession(): Promise<boolean> {
	if (inFlightRefresh) {
		return inFlightRefresh;
	}

	const refreshPromise = (async () => {
		const snapshot = get(authStore);
		if (!snapshot.refreshToken) {
			clearSession();
			return false;
		}

		authStore.update((state) => ({ ...state, status: 'refreshing', errorMessage: '' }));

		try {
			const refreshed = await plainApiRequest<AuthSessionResponse>('/auth/oauth2/refresh', {
				method: 'POST',
				headers: {
					'content-type': 'application/json'
				},
				body: JSON.stringify({ refreshToken: snapshot.refreshToken })
			});
			applySession(refreshed);
			return true;
		} catch (error) {
			clearSession();
			setError(error instanceof Error ? error.message : 'OAuth2 refresh failed.');
			return false;
		}
	})();

	inFlightRefresh = refreshPromise;
	try {
		return await refreshPromise;
	} finally {
		inFlightRefresh = null;
	}
}

export async function ensureFreshSession(): Promise<boolean> {
	const snapshot = get(authStore);
	if (!snapshot.gatewayAccessToken || !snapshot.user) {
		return false;
	}

	if (!shouldRefreshSoon(snapshot.oauthAccessTokenExpiresAt)) {
		return true;
	}

	return refreshSession();
}

export function getAuthSnapshot(): AuthState {
	return get(authStore);
}

export function clearAuthError(): void {
	authStore.update((state) => ({
		...state,
		errorMessage: '',
		status: state.gatewayAccessToken && state.user ? 'authenticated' : 'unauthenticated'
	}));
}

export async function authRequest<T>(path: string, init?: RequestInit): Promise<T> {
	const isReady = await ensureFreshSession();
	if (!isReady) {
		throw new Error('Authentication is required.');
	}

	const snapshot = get(authStore);
	const headers = new Headers(init?.headers ?? {});
	headers.set('authorization', `Bearer ${snapshot.gatewayAccessToken}`);

	let response = await fetch(`${API_BASE}${path}`, {
		...init,
		headers
	});

	if (response.status === 401) {
		const refreshed = await refreshSession();
		if (refreshed) {
			const next = get(authStore);
			headers.set('authorization', `Bearer ${next.gatewayAccessToken}`);
			response = await fetch(`${API_BASE}${path}`, {
				...init,
				headers
			});
		}
	}

	if (!response.ok) {
		const payload = (await response.json().catch(() => ({}))) as {
			message?: string;
			detail?: string;
		};
		throw new Error(payload.message || payload.detail || `Request failed: ${response.status}`);
	}

	return (await response.json()) as T;
}

async function plainApiRequest<T>(path: string, init?: RequestInit): Promise<T> {
	const response = await fetch(`${API_BASE}${path}`, {
		...init
	});

	if (!response.ok) {
		const payload = (await response.json().catch(() => ({}))) as {
			message?: string;
			detail?: string;
		};
		throw new Error(payload.message || payload.detail || `Request failed: ${response.status}`);
	}

	return (await response.json()) as T;
}
