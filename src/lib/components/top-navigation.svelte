<script lang="ts">
	import { resolve } from '$app/paths';
	import type { AuthUser } from '$lib/auth/auth-client';

	let { user, onSignOut } = $props<{
		user: AuthUser | null;
		onSignOut: () => void;
	}>();

	let profileOpen = $state(false);

	function toggleProfile(): void {
		profileOpen = !profileOpen;
	}

	function closeProfile(): void {
		profileOpen = false;
	}
</script>

<header class="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
	<div class="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
		<a href={resolve('/dashboard')} class="flex items-center gap-2" onclick={closeProfile}>
			<span
				class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white"
				>GK</span
			>
			<div class="leading-tight">
				<p class="text-sm font-semibold tracking-wide text-slate-900">Gatekeeper</p>
				<p class="text-[11px] text-slate-500">API Gateway Console</p>
			</div>
		</a>

		<div class="relative">
			<button
				type="button"
				class="flex items-center gap-3 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-left transition hover:bg-slate-50"
				onclick={toggleProfile}
			>
				<span
					class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white"
				>
					{(user?.name || user?.email || user?.subject || '?').slice(0, 1).toUpperCase()}
				</span>
				<span class="hidden min-w-0 sm:block">
					<span class="block truncate text-sm font-medium text-slate-900"
						>{user?.name || user?.email || 'Unknown user'}</span
					>
					<span class="block truncate text-xs text-slate-500"
						>{user?.email || user?.subject || '-'}</span
					>
				</span>
			</button>

			{#if profileOpen}
				<div
					class="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-lg"
				>
					<p class="text-xs font-semibold tracking-wide text-slate-500 uppercase">Signed In As</p>
					<p class="mt-2 text-sm font-semibold text-slate-900">{user?.name || '-'}</p>
					<p class="truncate text-xs text-slate-600">{user?.email || '-'}</p>
					<p class="mt-1 truncate text-[11px] text-slate-500">{user?.subject || '-'}</p>
					<button
						type="button"
						class="mt-3 w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
						onclick={() => {
							closeProfile();
							onSignOut();
						}}
					>
						로그아웃
					</button>
				</div>
			{/if}
		</div>
	</div>
</header>
