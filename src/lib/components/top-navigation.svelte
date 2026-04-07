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
	let avatarLoadFailed = $state(false);
	const isUserLoading = $derived(user === null);

	const displayName = $derived(user?.name || user?.email || '사용자');
	const secondaryIdentity = $derived(user?.email || user?.subject || '');
	const userInitial = $derived(
		(user?.name || user?.email || user?.subject || '?').slice(0, 1).toUpperCase()
	);
	const avatarUrl = $derived(user?.avatarUrl?.trim() || null);
	const showAvatarImage = $derived(Boolean(avatarUrl) && !avatarLoadFailed);

	function toggleProfile(): void {
		if (isUserLoading) {
			return;
		}

		profileOpen = !profileOpen;
	}

	function closeProfile(): void {
		profileOpen = false;
	}

	function handleAvatarError(): void {
		avatarLoadFailed = true;
	}

	$effect(() => {
		void user?.avatarUrl;
		avatarLoadFailed = false;
	});

	$effect(() => {
		if (isUserLoading && profileOpen) {
			closeProfile();
		}
	});

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
				<p class="text-[11px] text-slate-500">Developer Portal</p>
			</div>
		</a>

		<div class="relative z-30" bind:this={menuElement}>
			<button
				type="button"
				class="flex cursor-pointer items-center gap-3 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-left transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-80"
				onclick={toggleProfile}
				aria-expanded={profileOpen}
				aria-haspopup="menu"
				aria-controls="profile-menu"
				disabled={isUserLoading}
			>
				{#if isUserLoading}
					<span class="inline-flex h-8 w-8 animate-pulse rounded-full bg-slate-200"></span>
				{:else if showAvatarImage && avatarUrl}
					<img
						src={avatarUrl}
						alt="사용자 프로필 이미지"
						class="h-8 w-8 rounded-full border border-slate-200 object-cover"
						onerror={handleAvatarError}
					/>
				{:else}
					<span
						class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white"
					>
						{userInitial}
					</span>
				{/if}
				<span class="hidden min-w-0 sm:block">
					{#if isUserLoading}
						<span class="block h-3.5 w-32 animate-pulse rounded bg-slate-200"></span>
						<span class="mt-1 block h-3 w-24 animate-pulse rounded bg-slate-100"></span>
					{:else}
						<span class="block truncate text-sm font-medium text-slate-900">{displayName}</span>
						<span class="block truncate text-xs text-slate-500">{secondaryIdentity}</span>
					{/if}
				</span>
			</button>

			{#if profileOpen && !isUserLoading}
				<button
					type="button"
					class="fixed inset-0 z-20"
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
					<div class="mb-2 flex items-center gap-3">
						{#if showAvatarImage && avatarUrl}
							<img
								src={avatarUrl}
								alt="사용자 프로필 이미지"
								class="h-10 w-10 rounded-full border border-slate-200 object-cover"
								onerror={handleAvatarError}
							/>
						{:else}
							<span
								class="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white"
							>
								{userInitial}
							</span>
						{/if}
						<div class="min-w-0">
							<p class="text-xs font-semibold tracking-wide text-slate-500 uppercase">
								Signed In As
							</p>
							<p class="truncate text-sm font-semibold text-slate-900">{displayName}</p>
							<p class="truncate text-xs text-slate-600">{secondaryIdentity}</p>
						</div>
					</div>
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
