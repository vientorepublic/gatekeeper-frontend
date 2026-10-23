import { browser } from '$app/env';
import { PUBLIC_GATEKEEPER_API_BASE_URL } from '$app/env/public';
import { get, writable } from 'svelte/store';

import { readJsonResponse } from '../api/http-client.js';
import type { Decoder } from '../api/validation.js';
import {
	isAuthUser,
	parseSession,
	parseAuthorization,
	type AuthUser,
	type AuthSessionResponse
} from './auth-types.js';
export type { AuthUser, AuthSessionResponse } from './auth-types.js';

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
const OAUTH_STATE_KEY = 'gatekeeper:oauth-state';

const API_BASE = (PUBLIC_GATEKEEPER_API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

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
let sessionRevision = 0;

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

	try {
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
	} catch {
		setError('Unable to persist the browser session.');
	}
}

function applySession(session: AuthSessionResponse): void {
	sessionRevision += 1;
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
	sessionRevision += 1;
	inFlightRefresh = null;
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
	try {
		const storedToken = localStorage.getItem(ACCESS_TOKEN_KEY);
		const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
		const storedUser = localStorage.getItem(USER_KEY);
		const storedExpiresAt = localStorage.getItem(OAUTH_EXPIRES_AT_KEY);
		let user: AuthUser | null = null;
		if (storedUser) {
			try {
				const parsed: unknown = JSON.parse(storedUser);
				user = isAuthUser(parsed) ? normalizeUser(parsed) : null;
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
	} catch {
		clearSession();
		setError('Unable to restore the browser session.');
	}
}

export async function startOAuthLogin(): Promise<void> {
	if (!browser) return;
	try {
		const result = await plainApiRequest('/auth/oauth2/authorize', parseAuthorization);
		if (browser) {
			sessionStorage.setItem(OAUTH_STATE_KEY, result.state);
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
	if (code || oauthError) {
		for (const key of ['code', 'state', 'error', 'error_description'])
			currentUrl.searchParams.delete(key);
		window.history.replaceState(
			{},
			'',
			`${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`
		);
	}

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

	const callbackRevision = sessionRevision;
	try {
		const expectedState = sessionStorage.getItem(OAUTH_STATE_KEY);
		if (!expectedState || expectedState !== state)
			throw new Error('OAuth2 state does not match this browser session.');
		sessionStorage.removeItem(OAUTH_STATE_KEY);
		const revision = sessionRevision;
		const callbackPath = `/auth/oauth2/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;
		const session = await plainApiRequest(callbackPath, parseSession);
		if (revision !== sessionRevision) return true;
		applySession(session);
		return true;
	} catch (error) {
		if (callbackRevision !== sessionRevision) return true;
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

	const revision = sessionRevision;
	const refreshPromise = (async () => {
		const snapshot = get(authStore);
		if (!snapshot.refreshToken) {
			clearSession();
			return false;
		}

		authStore.update((state) => ({ ...state, status: 'refreshing', errorMessage: '' }));

		try {
			const refreshed = await plainApiRequest('/auth/oauth2/refresh', parseSession, {
				method: 'POST',
				headers: {
					'content-type': 'application/json'
				},
				body: JSON.stringify({ refreshToken: snapshot.refreshToken })
			});
			if (revision !== sessionRevision) return false;
			applySession(refreshed);
			return true;
		} catch (error) {
			if (revision !== sessionRevision) return false;
			clearSession();
			setError(error instanceof Error ? error.message : 'OAuth2 refresh failed.');
			return false;
		}
	})();

	inFlightRefresh = refreshPromise;
	try {
		return await refreshPromise;
	} finally {
		if (inFlightRefresh === refreshPromise) inFlightRefresh = null;
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

export async function authRequest<T>(
	path: string,
	decoder: Decoder<T>,
	init?: RequestInit
): Promise<T> {
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

	return readJsonResponse(response, decoder);
}

async function plainApiRequest<T>(
	path: string,
	decoder: Decoder<T>,
	init?: RequestInit
): Promise<T> {
	const response = await fetch(`${API_BASE}${path}`, { ...init });
	return readJsonResponse(response, decoder);
}
