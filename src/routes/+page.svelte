<script lang="ts">
	import { browser } from '$app/environment';
	import { env } from '$env/dynamic/public';
	import { FlowAuthClient, type OAuth2Scope } from 'flowauth-oauth2-client';
	import { onMount } from 'svelte';

	interface AuthUser {
		id: string;
		provider: string;
		subject: string;
		email: string | null;
		name: string | null;
	}

	interface ApiKeyItem {
		id: string;
		namespace: string;
		prefix: string;
		label: string | null;
		createdAt: string;
		lastUsedAt: string | null;
		revokedAt: string | null;
	}

	interface SessionResponse {
		accessToken: string;
		tokenType: 'Bearer';
		user: AuthUser;
	}

	const ACCESS_TOKEN_KEY = 'gatekeeper:access-token';
	const USER_KEY = 'gatekeeper:user';
	const OAUTH_STATE_KEY = 'gatekeeper:oauth-state';
	const OAUTH_VERIFIER_KEY = 'gatekeeper:oauth-code-verifier';
	const API_BASE = (env.PUBLIC_GATEKEEPER_API_BASE_URL || 'http://localhost:3000').replace(
		/\/$/,
		''
	);

	const oauthScopes = parseScopes(env.PUBLIC_FLOWAUTH_SCOPES || 'openid,profile,email');
	const oauthClientSecretMock =
		env.PUBLIC_FLOWAUTH_CLIENT_SECRET_MOCK || 'mocked-browser-client-secret';

	let loading = $state(false);
	let loadingKeys = $state(false);
	let errorMessage = $state('');
	let noticeMessage = $state('');

	let accessToken = $state('');
	let user = $state<AuthUser | null>(null);
	let namespaces = $state<string[]>([]);
	let selectedNamespace = $state('');
	let apiKeys = $state<ApiKeyItem[]>([]);
	let newLabel = $state('');
	let issuedPlainKey = $state('');

	const isAuthenticated = $derived(accessToken.length > 0 && user !== null);

	onMount(async () => {
		restoreSessionFromStorage();
		await loadNamespaces();
		await handleOAuthCallbackIfPresent();

		if (isAuthenticated && selectedNamespace) {
			await loadApiKeys(selectedNamespace);
		}
	});

	function parseScopes(raw: string): OAuth2Scope[] {
		return raw
			.split(',')
			.map((scope) => scope.trim())
			.filter((scope) => scope.length > 0)
			.map((scope) => scope as OAuth2Scope);
	}

	function createFlowAuthClient(): FlowAuthClient {
		const server = env.PUBLIC_FLOWAUTH_SERVER || '';
		const clientId = env.PUBLIC_FLOWAUTH_CLIENT_ID || '';
		const redirectUri =
			env.PUBLIC_FLOWAUTH_REDIRECT_URI ||
			(browser ? `${window.location.origin}${window.location.pathname}` : '');

		if (!server || !clientId || !redirectUri) {
			throw new Error(
				'PUBLIC_FLOWAUTH_SERVER, PUBLIC_FLOWAUTH_CLIENT_ID, PUBLIC_FLOWAUTH_REDIRECT_URI are required.'
			);
		}

		return new FlowAuthClient({
			server,
			clientId,
			clientSecret: oauthClientSecretMock,
			redirectUri,
			autoRefresh: false
		});
	}

	function restoreSessionFromStorage(): void {
		if (!browser) {
			return;
		}

		const storedToken = localStorage.getItem(ACCESS_TOKEN_KEY);
		if (storedToken) {
			accessToken = storedToken;
		}

		const storedUser = localStorage.getItem(USER_KEY);
		if (storedUser) {
			try {
				user = JSON.parse(storedUser) as AuthUser;
			} catch {
				user = null;
			}
		}
	}

	async function beginOAuthLogin(): Promise<void> {
		errorMessage = '';
		noticeMessage = '';

		try {
			const client = createFlowAuthClient();
			const result = await client.createSecureAuthorizeUrl(oauthScopes);

			if (browser) {
				sessionStorage.setItem(OAUTH_STATE_KEY, result.state);
				sessionStorage.setItem(OAUTH_VERIFIER_KEY, result.codeVerifier);
				window.location.assign(result.authUrl);
			}
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'OAuth2 login failed.';
		}
	}

	async function handleOAuthCallbackIfPresent(): Promise<void> {
		if (!browser) {
			return;
		}

		const currentUrl = new URL(window.location.href);
		const code = currentUrl.searchParams.get('code');
		const state = currentUrl.searchParams.get('state');
		const oauthError = currentUrl.searchParams.get('error');

		if (oauthError) {
			errorMessage = `OAuth2 error: ${oauthError}`;
			return;
		}

		if (!code) {
			return;
		}

		loading = true;
		errorMessage = '';

		try {
			const savedState = sessionStorage.getItem(OAUTH_STATE_KEY);
			const codeVerifier = sessionStorage.getItem(OAUTH_VERIFIER_KEY);

			if (!savedState || !codeVerifier) {
				throw new Error('OAuth2 verifier/state not found in session storage.');
			}

			if (!state || state !== savedState) {
				throw new Error('OAuth2 state mismatch detected.');
			}

			const client = createFlowAuthClient();
			const tokenResult = (await client.exchangeCode(code, codeVerifier)) as {
				access_token?: string;
				scope?: string;
			};

			if (!tokenResult.access_token) {
				throw new Error('OAuth2 access token was not returned.');
			}

			const session = await apiRequest<SessionResponse>('/auth/oauth2/session', {
				method: 'POST',
				headers: {
					'content-type': 'application/json'
				},
				body: JSON.stringify({
					accessToken: tokenResult.access_token,
					scope: tokenResult.scope
				})
			});

			setSession(session.accessToken, session.user);
			noticeMessage = '인증이 완료되었습니다.';
			sessionStorage.removeItem(OAUTH_STATE_KEY);
			sessionStorage.removeItem(OAUTH_VERIFIER_KEY);

			const cleaned = `${currentUrl.pathname}${currentUrl.hash}`;
			window.history.replaceState({}, '', cleaned);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'OAuth2 callback failed.';
		} finally {
			loading = false;
		}
	}

	function setSession(token: string, authUser: AuthUser): void {
		accessToken = token;
		user = authUser;

		if (!browser) {
			return;
		}

		localStorage.setItem(ACCESS_TOKEN_KEY, token);
		localStorage.setItem(USER_KEY, JSON.stringify(authUser));
	}

	function signOut(): void {
		accessToken = '';
		user = null;
		apiKeys = [];
		issuedPlainKey = '';
		noticeMessage = '로그아웃되었습니다.';
		errorMessage = '';

		if (!browser) {
			return;
		}

		localStorage.removeItem(ACCESS_TOKEN_KEY);
		localStorage.removeItem(USER_KEY);
		sessionStorage.removeItem(OAUTH_STATE_KEY);
		sessionStorage.removeItem(OAUTH_VERIFIER_KEY);
	}

	async function loadNamespaces(): Promise<void> {
		try {
			const result = await apiRequest<{ namespaces: string[] }>('/auth/namespaces');
			namespaces = result.namespaces;

			if (!selectedNamespace && namespaces.length > 0) {
				selectedNamespace = namespaces[0] as string;
			}
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Failed to load namespaces.';
		}
	}

	async function loadApiKeys(namespace: string): Promise<void> {
		if (!isAuthenticated) {
			return;
		}

		loadingKeys = true;
		errorMessage = '';

		try {
			apiKeys = await apiRequest<ApiKeyItem[]>(`/auth/api-keys/${encodeURIComponent(namespace)}`, {
				headers: {
					authorization: `Bearer ${accessToken}`
				}
			});
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Failed to load API keys.';
		} finally {
			loadingKeys = false;
		}
	}

	async function issueApiKey(): Promise<void> {
		if (!isAuthenticated || !selectedNamespace) {
			return;
		}

		loadingKeys = true;
		errorMessage = '';
		noticeMessage = '';

		try {
			const created = await apiRequest<{
				id: string;
				namespace: string;
				apiKey: string;
				prefix: string;
				createdAt: string;
				label: string | null;
			}>(`/auth/api-keys/${encodeURIComponent(selectedNamespace)}`, {
				method: 'POST',
				headers: {
					authorization: `Bearer ${accessToken}`,
					'content-type': 'application/json'
				},
				body: JSON.stringify({
					label: newLabel
				})
			});

			issuedPlainKey = created.apiKey;
			newLabel = '';
			noticeMessage = '새 API 키가 발급되었습니다. 아래 평문 키는 지금만 확인 가능합니다.';
			await loadApiKeys(selectedNamespace);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Failed to issue API key.';
		} finally {
			loadingKeys = false;
		}
	}

	async function revokeApiKey(id: string): Promise<void> {
		if (!isAuthenticated || !selectedNamespace) {
			return;
		}

		loadingKeys = true;
		errorMessage = '';

		try {
			await apiRequest<{ revoked: boolean }>(
				`/auth/api-keys/${encodeURIComponent(selectedNamespace)}/${encodeURIComponent(id)}`,
				{
					method: 'DELETE',
					headers: {
						authorization: `Bearer ${accessToken}`
					}
				}
			);

			noticeMessage = 'API 키가 폐기되었습니다.';
			await loadApiKeys(selectedNamespace);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Failed to revoke API key.';
		} finally {
			loadingKeys = false;
		}
	}

	async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
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

	function formatDate(value: string | null): string {
		if (!value) {
			return '-';
		}

		const date = new Date(value);
		return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
	}
</script>

<main
	class="min-h-screen bg-[radial-gradient(circle_at_top_right,_#d9f99d_0%,_#fef9c3_35%,_#f8fafc_100%)] px-4 py-10 text-slate-900"
>
	<div class="mx-auto flex w-full max-w-6xl flex-col gap-6">
		<section
			class="overflow-hidden rounded-3xl border border-emerald-200 bg-white/80 p-6 shadow-xl backdrop-blur"
		>
			<p class="text-sm font-semibold tracking-[0.2em] text-emerald-700 uppercase">
				Gatekeeper Frontend Console
			</p>
			<h1 class="mt-3 text-3xl leading-tight font-bold sm:text-4xl">
				FlowAuth OAuth2 로그인과 Namespace API Key 관리
			</h1>
			<p class="mt-3 max-w-3xl text-sm text-slate-600 sm:text-base">
				브라우저에서는 FlowAuth SDK를 사용하고, 클라이언트 시크릿은 모킹 값으로 초기화됩니다. 인증
				후 Access Token을 백엔드 세션 엔드포인트로 교환해 게이트웨이 Bearer 토큰을 발급받습니다.
			</p>
			<div class="mt-4 flex flex-wrap gap-3 text-xs">
				<span class="rounded-full bg-emerald-100 px-3 py-1 font-medium text-emerald-800"
					>FlowAuth SDK in Browser</span
				>
				<span class="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700"
					>Mocked Client Secret: {oauthClientSecretMock}</span
				>
				<span class="rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-800"
					>API Base: {API_BASE}</span
				>
			</div>
		</section>

		{#if errorMessage}
			<div class="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-700">
				{errorMessage}
			</div>
		{/if}
		{#if noticeMessage}
			<div class="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-700">
				{noticeMessage}
			</div>
		{/if}

		<section class="grid gap-6 lg:grid-cols-[1.1fr_2fr]">
			<article class="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
				<h2 class="text-xl font-semibold">인증 상태</h2>
				<p class="mt-2 text-sm text-slate-600">
					현재 FlowAuth OAuth2 + Gatekeeper 세션 상태를 표시합니다.
				</p>

				<div class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
					<p>
						상태:
						<strong class={isAuthenticated ? 'text-emerald-700' : 'text-slate-700'}>
							{isAuthenticated ? 'Authenticated' : 'Signed out'}
						</strong>
					</p>
					{#if user}
						<p class="mt-2">이름: {user.name ?? '-'}</p>
						<p>이메일: {user.email ?? '-'}</p>
						<p>Subject: {user.subject}</p>
						<p>User ID: {user.id}</p>
					{/if}
				</div>

				<div class="mt-5 flex flex-wrap gap-3">
					<button
						type="button"
						class="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
						onclick={beginOAuthLogin}
						disabled={loading}
					>
						{loading ? '처리 중...' : 'FlowAuth 로그인'}
					</button>

					<button
						type="button"
						class="rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
						onclick={signOut}
						disabled={!isAuthenticated}
					>
						로그아웃
					</button>
				</div>
			</article>

			<article class="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
				<div class="flex flex-wrap items-end gap-3">
					<div class="flex min-w-[220px] flex-1 flex-col gap-2">
						<label class="text-sm font-medium text-slate-700" for="namespace">Namespace</label>
						<select
							id="namespace"
							class="rounded-xl border-slate-300 text-sm"
							bind:value={selectedNamespace}
							onchange={() => {
								if (selectedNamespace) {
									void loadApiKeys(selectedNamespace);
								}
							}}
						>
							{#if namespaces.length === 0}
								<option value="">No namespace</option>
							{:else}
								{#each namespaces as namespace (namespace)}
									<option value={namespace}>{namespace}</option>
								{/each}
							{/if}
						</select>
					</div>

					<button
						type="button"
						class="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
						onclick={() => selectedNamespace && loadApiKeys(selectedNamespace)}
						disabled={!isAuthenticated || !selectedNamespace || loadingKeys}
					>
						목록 새로고침
					</button>
				</div>

				<div class="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
					<input
						class="rounded-xl border-slate-300 text-sm"
						type="text"
						placeholder="새 API 키 라벨 (선택)"
						bind:value={newLabel}
						disabled={!isAuthenticated}
					/>
					<button
						type="button"
						class="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
						onclick={issueApiKey}
						disabled={!isAuthenticated || !selectedNamespace || loadingKeys}
					>
						API 키 발급
					</button>
				</div>

				{#if issuedPlainKey}
					<div
						class="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
					>
						<p class="font-semibold">발급된 평문 API 키 (한 번만 표시)</p>
						<p class="mt-2 font-mono text-xs break-all sm:text-sm">{issuedPlainKey}</p>
					</div>
				{/if}

				<div class="mt-6 overflow-hidden rounded-2xl border border-slate-200">
					<table class="min-w-full divide-y divide-slate-200 text-sm">
						<thead class="bg-slate-50">
							<tr>
								<th class="px-4 py-3 text-left font-semibold text-slate-700">Prefix</th>
								<th class="px-4 py-3 text-left font-semibold text-slate-700">Label</th>
								<th class="px-4 py-3 text-left font-semibold text-slate-700">Created</th>
								<th class="px-4 py-3 text-left font-semibold text-slate-700">Last Used</th>
								<th class="px-4 py-3 text-left font-semibold text-slate-700">State</th>
								<th class="px-4 py-3 text-left font-semibold text-slate-700">Action</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-100 bg-white">
							{#if !isAuthenticated}
								<tr>
									<td colspan="6" class="px-4 py-6 text-center text-slate-500"
										>로그인 후 API 키를 관리할 수 있습니다.</td
									>
								</tr>
							{:else if apiKeys.length === 0}
								<tr>
									<td colspan="6" class="px-4 py-6 text-center text-slate-500"
										>등록된 API 키가 없습니다.</td
									>
								</tr>
							{:else}
								{#each apiKeys as key (key.id)}
									<tr>
										<td class="px-4 py-3 font-mono text-xs">{key.prefix}</td>
										<td class="px-4 py-3">{key.label ?? '-'}</td>
										<td class="px-4 py-3">{formatDate(key.createdAt)}</td>
										<td class="px-4 py-3">{formatDate(key.lastUsedAt)}</td>
										<td class="px-4 py-3">
											{#if key.revokedAt}
												<span
													class="rounded-full bg-rose-100 px-2 py-1 text-xs font-medium text-rose-700"
													>Revoked</span
												>
											{:else}
												<span
													class="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700"
													>Active</span
												>
											{/if}
										</td>
										<td class="px-4 py-3">
											<button
												type="button"
												class="rounded-lg border border-rose-300 px-3 py-1 text-xs font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
												onclick={() => revokeApiKey(key.id)}
												disabled={Boolean(key.revokedAt) || loadingKeys}
											>
												폐기
											</button>
										</td>
									</tr>
								{/each}
							{/if}
						</tbody>
					</table>
				</div>
			</article>
		</section>
	</div>
</main>
