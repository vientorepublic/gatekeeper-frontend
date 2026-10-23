<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import {
		authStore,
		clearAuthError,
		getAuthSnapshot,
		handleOAuthCallbackIfPresent,
		initializeAuthState,
		startOAuthLogin
	} from '#lib/auth/auth-client.js';
	import { onMount } from 'svelte';

	const callbackError = $derived($authStore.errorMessage);
	const status = $derived($authStore.status);

	let isBootstrapping = $state(true);
	let loginInProgress = $state(false);

	const pageTitle = $derived(
		callbackError ? 'OAuth2 콜백 오류 | Gatekeeper' : '로그인 | Gatekeeper'
	);

	onMount(async () => {
		try {
			initializeAuthState();
			loginInProgress = true;

			const callbackHandled = await handleOAuthCallbackIfPresent();
			const snapshot = getAuthSnapshot();

			if (snapshot.gatewayAccessToken && snapshot.user) {
				await goto(resolve('/dashboard'));
				return;
			}

			if (!callbackHandled && snapshot.status !== 'error') {
				await startOAuthLogin();
			}
		} catch (error) {
			authStore.update((state) => ({
				...state,
				status: 'error',
				errorMessage: error instanceof Error ? error.message : 'Failed to initialize login.'
			}));
		} finally {
			isBootstrapping = false;
			loginInProgress = false;
		}
	});

	async function retryOAuthLogin(): Promise<void> {
		clearAuthError();
		loginInProgress = true;
		await startOAuthLogin();
		loginInProgress = false;
	}
</script>

<svelte:head>
	<title>{pageTitle}</title>
</svelte:head>

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
{:else}
	<main class="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-slate-900">
		<section class="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
			<p class="text-xs font-semibold tracking-[0.2em] text-slate-500 uppercase">Gatekeeper</p>
			<h1 class="mt-3 text-2xl leading-tight font-bold sm:text-3xl">인증 페이지로 이동 중입니다</h1>
			<p class="mt-3 text-sm leading-relaxed text-slate-700">
				브라우저가 자동으로 로그인 페이지로 이동합니다. 이동이 되지 않으면 아래 버튼을 눌러 다시
				시도해 주세요.
			</p>
			<div class="mt-5 flex items-center gap-2 text-sm text-slate-600">
				<span class="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-slate-900"></span>
				{#if isBootstrapping || loginInProgress || status === 'refreshing'}
					<span>OAuth2 플로우 초기화 중...</span>
				{:else}
					<span>리다이렉트 대기 중...</span>
				{/if}
			</div>
			<button
				type="button"
				class="mt-6 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
				onclick={retryOAuthLogin}
				disabled={loginInProgress}
			>
				{loginInProgress ? '로그인 페이지 여는 중...' : '로그인 다시 시도'}
			</button>
		</section>
	</main>
{/if}
