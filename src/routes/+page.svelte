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
	} from '$lib/auth/auth-client';
	import { onMount } from 'svelte';

	const callbackError = $derived($authStore.errorMessage);

	onMount(async () => {
		initializeAuthState();

		const callbackHandled = await handleOAuthCallbackIfPresent();
		const snapshot = getAuthSnapshot();

		if (snapshot.gatewayAccessToken && snapshot.user) {
			await goto(resolve('/dashboard'));
			return;
		}

		if (!callbackHandled && snapshot.status !== 'error') {
			await startOAuthLogin();
		}
	});

	async function retryOAuthLogin(): Promise<void> {
		clearAuthError();
		await startOAuthLogin();
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
