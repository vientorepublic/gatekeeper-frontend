import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseNamespaces } from '../api/api-decoders.js';
import type { AuthSessionResponse } from './auth-types.js';

const user = {
	id: 'user-1',
	provider: 'flowauth',
	subject: 'subject-1',
	email: null,
	name: null,
	avatarUrl: null
};
const session: AuthSessionResponse = {
	accessToken: 'new-token',
	refreshToken: 'new-refresh',
	oauthAccessTokenExpiresIn: 3600,
	tokenType: 'Bearer',
	user
};

function createStorage(): Storage {
	const values = new Map<string, string>();
	return {
		get length() {
			return values.size;
		},
		clear: () => values.clear(),
		key: (index) => Array.from(values.keys())[index] ?? null,
		getItem: (key) => values.get(key) ?? null,
		setItem: (key, value) => {
			values.set(key, value);
		},
		removeItem: (key) => {
			values.delete(key);
		}
	};
}

type AuthClient = typeof import('./auth-client.js');
let auth: AuthClient;
let fetchMock = vi.fn<typeof fetch>();
let location = { href: 'http://localhost:5173/', assign: vi.fn() };
let history = { replaceState: vi.fn() };

function restoreSession(): void {
	localStorage.setItem('gatekeeper:access-token', 'old-token');
	localStorage.setItem('gatekeeper:refresh-token', 'old-refresh');
	localStorage.setItem('gatekeeper:user', JSON.stringify(user));
	localStorage.setItem('gatekeeper:oauth-expires-at', String(Date.now() + 3_600_000));
	auth.initializeAuthState();
}

beforeEach(async () => {
	vi.resetModules();
	vi.useFakeTimers();
	fetchMock = vi.fn<typeof fetch>();
	location = { href: 'http://localhost:5173/', assign: vi.fn() };
	history = { replaceState: vi.fn() };
	vi.stubGlobal('localStorage', createStorage());
	vi.stubGlobal('sessionStorage', createStorage());
	vi.stubGlobal('fetch', fetchMock);
	vi.stubGlobal('window', { location, history });
	auth = await import('./auth-client.js');
});

afterEach(() => {
	auth.clearSession();
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe('browser authentication state', () => {
	it('discards malformed persisted users', () => {
		localStorage.setItem('gatekeeper:access-token', 'token');
		localStorage.setItem('gatekeeper:user', JSON.stringify({ ...user, id: 42 }));
		auth.initializeAuthState();
		expect(auth.getAuthSnapshot().gatewayAccessToken).toBeNull();
	});
	it('handles blocked browser storage without throwing', () => {
		vi.stubGlobal('localStorage', {
			getItem() {
				throw new Error('Storage unavailable');
			},
			removeItem() {
				throw new Error('Storage unavailable');
			}
		});
		expect(() => auth.initializeAuthState()).not.toThrow();
		expect(auth.getAuthSnapshot()).toMatchObject({ status: 'error', gatewayAccessToken: null });
	});
	it('shares one refresh request between concurrent callers', async () => {
		restoreSession();
		const pending = Promise.withResolvers<Response>();
		fetchMock.mockReturnValue(pending.promise);
		const first = auth.refreshSession();
		const second = auth.refreshSession();
		pending.resolve(Response.json(session));
		expect(await Promise.all([first, second])).toEqual([true, true]);
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(auth.getAuthSnapshot().gatewayAccessToken).toBe('new-token');
	});
	it('does not resurrect a logged-out session when refresh completes later', async () => {
		restoreSession();
		const pending = Promise.withResolvers<Response>();
		fetchMock.mockReturnValue(pending.promise);
		const refreshing = auth.refreshSession();
		auth.clearSession();
		pending.resolve(Response.json(session));
		expect(await refreshing).toBe(false);
		expect(auth.getAuthSnapshot()).toMatchObject({
			status: 'unauthenticated',
			gatewayAccessToken: null
		});
		expect(localStorage.getItem('gatekeeper:access-token')).toBeNull();
	});
	it('does not let an older refresh clear the newer single-flight operation', async () => {
		restoreSession();
		const older = Promise.withResolvers<Response>();
		const newer = Promise.withResolvers<Response>();
		fetchMock.mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise);
		const first = auth.refreshSession();
		auth.clearSession();
		restoreSession();
		const second = auth.refreshSession();
		older.resolve(Response.json(session));
		await first;
		const third = auth.refreshSession();
		newer.resolve(Response.json(session));
		expect(await Promise.all([second, third])).toEqual([true, true]);
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});
	it('rejects callback state belonging to another browser and removes sensitive query parameters', async () => {
		location.href = 'http://localhost:5173/?code=secret-code&state=foreign&keep=value';
		sessionStorage.setItem('gatekeeper:oauth-state', 'expected');
		expect(await auth.handleOAuthCallbackIfPresent()).toBe(true);
		expect(fetchMock).not.toHaveBeenCalled();
		expect(history.replaceState).toHaveBeenCalledWith({}, '', '/?keep=value');
		expect(auth.getAuthSnapshot().errorMessage).toContain('state');
	});
	it('records the authorization nonce and completes only the matching callback', async () => {
		fetchMock.mockResolvedValueOnce(
			Response.json({ authorizeUrl: 'https://auth.example/authorize', state: 'expected' })
		);
		await auth.startOAuthLogin();
		expect(sessionStorage.getItem('gatekeeper:oauth-state')).toBe('expected');
		location.href = 'http://localhost:5173/?code=code&state=expected';
		fetchMock.mockResolvedValueOnce(Response.json(session));
		await auth.handleOAuthCallbackIfPresent();
		expect(auth.getAuthSnapshot().gatewayAccessToken).toBe('new-token');
		expect(sessionStorage.getItem('gatekeeper:oauth-state')).toBeNull();
	});
	it('retries a 401 once using the refreshed token and validates the response', async () => {
		restoreSession();
		fetchMock
			.mockResolvedValueOnce(Response.json({}, { status: 401 }))
			.mockResolvedValueOnce(Response.json(session))
			.mockResolvedValueOnce(Response.json({ namespaces: ['billing'] }));
		expect(await auth.authRequest('/auth/namespaces', parseNamespaces)).toEqual({
			namespaces: ['billing']
		});
		expect(fetchMock).toHaveBeenCalledTimes(3);
		const headers = fetchMock.mock.calls[2]?.[1]?.headers;
		expect(new Headers(headers).get('authorization')).toBe('Bearer new-token');
	});
});
