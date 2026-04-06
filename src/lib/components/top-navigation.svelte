<script lang="ts">
	import { onMount } from 'svelte';
	import { cubicOut } from 'svelte/easing';
	import { fade, fly } from 'svelte/transition';
	import { resolve } from '$app/paths';
	import type { AuthUser } from '$lib/auth/auth-client';

	let { user, onSignOut } = $props<{
		user: AuthUser | null;
		onSignOut: () => void;
	}>();

	let profileOpen = $state(false);
	let menuElement: HTMLDivElement | null = null;

	function toggleProfile(): void {
		profileOpen = !profileOpen;
	}

	function closeProfile(): void {
		profileOpen = false;
	}

	onMount(() => {
		function handleDocumentClick(event: MouseEvent): void {
			if (!profileOpen || !menuElement) {
				return;
			}

			const target = event.target;
			if (target instanceof Node && !menuElement.contains(target)) {
				closeProfile();
			}
		}

		function handleEscape(event: KeyboardEvent): void {
			if (event.key === 'Escape') {
				closeProfile();
			}
		}

		document.addEventListener('click', handleDocumentClick);
		document.addEventListener('keydown', handleEscape);

		return () => {
			document.removeEventListener('click', handleDocumentClick);
			document.removeEventListener('keydown', handleEscape);
		};
	});
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

		<div class="relative z-30" bind:this={menuElement}>
			<button
				type="button"
				class="flex cursor-pointer items-center gap-3 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-left transition hover:bg-slate-50"
				onclick={toggleProfile}
				aria-expanded={profileOpen}
				aria-haspopup="menu"
				aria-controls="profile-menu"
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
				<button
					type="button"
					class="fixed inset-0 z-20 bg-slate-900/5 backdrop-blur-[1px]"
					onclick={closeProfile}
					aria-label="프로필 메뉴 닫기"
					transition:fade={{ duration: 140 }}
				></button>

				<div
					id="profile-menu"
					role="menu"
					class="absolute right-0 z-30 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-lg"
					in:fly={{ y: -8, duration: 170, easing: cubicOut }}
					out:fade={{ duration: 120 }}
				>
					<p class="text-xs font-semibold tracking-wide text-slate-500 uppercase">Signed In As</p>
					<p class="mt-2 text-sm font-semibold text-slate-900">{user?.name || '-'}</p>
					<p class="truncate text-xs text-slate-600">{user?.email || '-'}</p>
					<button
						type="button"
						role="menuitem"
						class="mt-3 w-full cursor-pointer rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
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
