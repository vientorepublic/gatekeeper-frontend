<script lang="ts">
	import type { AuthUser, AuthState } from '$lib/auth/auth-client';

	let { user, status } = $props<{
		user: AuthUser | null;
		status: AuthState['status'];
	}>();
</script>

<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
	<p class="text-sm font-semibold tracking-[0.2em] text-slate-600 uppercase">
		Gatekeeper Dashboard
	</p>
	<h1 class="mt-3 text-3xl leading-tight font-bold sm:text-4xl">API Key 관리</h1>
	<p class="mt-3 max-w-3xl text-sm text-slate-600 sm:text-base">
		인증된 사용자 컨텍스트에서 namespace별 API 키를 조회하고 발급/폐기할 수 있습니다.
	</p>
	<div class="mt-4 flex flex-wrap gap-3 text-xs">
		<span class="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700"
			>User: {user?.name ?? user?.email ?? user?.subject ?? '-'}</span
		>
		{#if status === 'refreshing'}
			<span class="rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-800"
				>세션 리프레시 중...</span
			>
		{/if}
	</div>
</section>
