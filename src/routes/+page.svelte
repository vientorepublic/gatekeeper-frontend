<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { env } from '$env/dynamic/public';
	import { onMount } from 'svelte';

	interface AuthUser {
		id: string;
		provider: string;
		subject: string;
		email: string | null;
		name: string | null;
	}

	interface SessionResponse {
		accessToken: string;
		tokenType: 'Bearer';
		user: AuthUser;
	}

	const ACCESS_TOKEN_KEY = 'gatekeeper:access-token';
	const USER_KEY = 'gatekeeper:user';
	const API_BASE = (env.PUBLIC_GATEKEEPER_API_BASE_URL || 'http://localhost:3000').replace(
		/\/$/,
		''
	);

	let accessToken = $state('');
	let user = $state<AuthUser | null>(null);
	let callbackError = $state('');

	onMount(async () => {
		restoreSessionFromStorage();

		const callbackHandled = await handleOAuthCallbackIfPresent();
		if (accessToken && user) {
			await goto(resolve('/dashboard'));
			return;
		}

		if (!callbackHandled) {
			await beginOAuthLogin();
		}
	});

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
		try {
			const result = await apiRequest<{ authorizeUrl: string; state: string }>(
				'/auth/oauth2/authorize'
			);

			if (browser) {
				window.location.assign(result.authorizeUrl);
			}
		} catch (error) {
			callbackError = error instanceof Error ? error.message : 'OAuth2 login failed.';
			console.error(callbackError);
		}
	}

	async function handleOAuthCallbackIfPresent(): Promise<boolean> {
		if (!browser) {
			return false;
		}

		const currentUrl = new URL(window.location.href);
		const code = currentUrl.searchParams.get('code');
		const state = currentUrl.searchParams.get('state');
		const oauthError = currentUrl.searchParams.get('error');

		if (oauthError) {
			callbackError = `OAuth2 error: ${oauthError}`;
			console.error(callbackError);
			return true;
		}

		if (!code) {
			return false;
		}

		try {
			if (!state) {
				throw new Error('OAuth2 state is missing in callback query.');
			}

			const callbackPath = `/auth/oauth2/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;
			const session = await apiRequest<SessionResponse>(callbackPath);

			setSession(session.accessToken, session.user);
			callbackError = '';

			const cleaned = `${currentUrl.pathname}${currentUrl.hash}`;
			window.history.replaceState({}, '', cleaned);
			await goto(resolve('/dashboard'));
			return true;
		} catch (error) {
			callbackError = error instanceof Error ? error.message : 'OAuth2 callback failed.';
			console.error(callbackError);
			return true;
		}
	}

	async function retryOAuthLogin(): Promise<void> {
		callbackError = '';
		await beginOAuthLogin();
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
</script>

{#if callbackError}
	<main class="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-slate-900">
		<section class="w-full max-w-lg rounded-2xl border border-rose-200 bg-white p-6 shadow-sm">
			<h1 class="text-xl font-semibold text-rose-700">OAuth2 콜백 처리 실패</h1>
			<p class="mt-3 text-sm leading-relaxed text-slate-700">
				인증 응답을 처리하는 중 오류가 발생했습니다. 잠시 후 다시 시도하거나 로그인 플로우를 다시
				시작해 주세요.
			</p>
			<div class="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
				{callbackError}
			</div>
			<div class="mt-5 flex gap-3">
				<button
					type="button"
					class="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
					onclick={retryOAuthLogin}
				>
					로그인 다시 시도
				</button>
				<a
					href={resolve('/')}
					class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
				>
					루트로 이동
				</a>
			</div>
		</section>
	</main>
{/if}
