<script lang="ts">
	import { fade, fly } from 'svelte/transition';

	import type { AuthUser, AuthState } from '$lib/auth/auth-client';

	let { user, status } = $props<{
		user: AuthUser | null;
		status: AuthState['status'];
	}>();

	const isUserLoading = $derived(user === null);
	const userLabel = $derived(user?.name ?? user?.email ?? user?.subject ?? '');
</script>

<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
	<p class="text-sm font-semibold tracking-[0.2em] text-slate-600 uppercase">
		Gatekeeper Dashboard
	</p>
	<h1 class="mt-3 text-3xl leading-tight font-bold sm:text-4xl">API Key 관리</h1>
	<p class="mt-3 max-w-3xl text-sm text-slate-600 sm:text-base">
		REST API별 API 키를 조회하고 발급/폐기할 수 있습니다.
	</p>
	<div class="mt-4 flex flex-wrap gap-3 text-xs">
		<span
			class="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700"
		>
			<span>User:</span>
			{#if isUserLoading}
				<span class="inline-block h-3 w-24 animate-pulse rounded bg-slate-300/70"></span>
			{:else}
				<span class="max-w-56 truncate">{userLabel}</span>
			{/if}
		</span>
		{#if status === 'refreshing'}
			<span
				class="rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-800"
				in:fly={{ y: -4, duration: 170 }}
				out:fade={{ duration: 120 }}>세션 리프레시 중...</span
			>
		{/if}
	</div>
</section>
