<script lang="ts">
	import { fade, fly, scale } from 'svelte/transition';
	import type { ApiKeyItem } from '#lib/api/auth-api.js';
	import { formatDateTime } from '#lib/utils/date.js';

	let {
		apiKeys,
		loadingKeys,
		isAuthenticated,
		revokingKeyId,
		onRevoke,
		currentPage,
		pageSize,
		totalApiKeys,
		totalPages,
		hasNextPage,
		hasPreviousPage,
		onPageChange
	}: {
		apiKeys: ApiKeyItem[];
		loadingKeys: boolean;
		isAuthenticated: boolean;
		revokingKeyId: string | null;
		onRevoke: (id: string) => void | Promise<void>;
		currentPage: number;
		pageSize: number;
		totalApiKeys: number;
		totalPages: number;
		hasNextPage: boolean;
		hasPreviousPage: boolean;
		onPageChange: (page: number) => void;
	} = $props();

	const visibleStart = $derived(apiKeys.length === 0 ? 0 : (currentPage - 1) * pageSize + 1);
	const visibleEnd = $derived(Math.min(currentPage * pageSize, totalApiKeys));
	const shouldShowPagination = $derived(totalApiKeys > pageSize);

	function goToPreviousPage(): void {
		if (!hasPreviousPage || loadingKeys) {
			return;
		}

		onPageChange(currentPage - 1);
	}

	function goToNextPage(): void {
		if (!hasNextPage || loadingKeys) {
			return;
		}

		onPageChange(currentPage + 1);
	}
</script>

<div class="relative mt-6 grid gap-3 md:hidden">
	{#if loadingKeys && apiKeys.length > 0}
		<div
			class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/70 backdrop-blur-[1px]"
			in:fade={{ duration: 140 }}
			out:fade={{ duration: 120 }}
		>
			<div
				class="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs text-slate-700 shadow"
				in:scale={{ duration: 140, start: 0.92 }}
			>
				<span
					class="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700"
				></span>
				<span>목록 갱신 중</span>
			</div>
		</div>
	{/if}
	{#if !isAuthenticated}
		<div class="rounded-2xl border border-slate-200 bg-white p-4 text-center text-slate-500">
			로그인 후 API 키를 관리할 수 있습니다.
		</div>
	{:else if apiKeys.length === 0}
		<div class="rounded-2xl border border-slate-200 bg-white p-4 text-center text-slate-500">
			등록된 API 키가 없습니다.
		</div>
	{:else}
		{#each apiKeys as key (key.id)}
			<article
				class="rounded-2xl border border-slate-200 bg-white p-4"
				in:fly={{ y: 6, duration: 170 }}
			>
				<div class="flex items-center justify-between">
					<p class="font-mono text-xs text-slate-700">{key.prefix}</p>
					{#if key.revokedAt}
						<span
							class="rounded-full bg-slate-200 px-2 py-1 text-xs font-medium text-slate-700"
							in:fade={{ duration: 120 }}
							out:fade={{ duration: 100 }}>Revoked</span
						>
					{:else}
						<span
							class="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700"
							in:fade={{ duration: 120 }}
							out:fade={{ duration: 100 }}>Active</span
						>
					{/if}
				</div>
				<dl class="mt-3 space-y-1 text-sm">
					<div class="flex justify-between gap-3">
						<dt class="text-slate-500">Label</dt>
						<dd class="text-slate-800">{key.label ?? '-'}</dd>
					</div>
					<div class="flex justify-between gap-3">
						<dt class="text-slate-500">Created</dt>
						<dd class="text-slate-800">{formatDateTime(key.createdAt)}</dd>
					</div>
					<div class="flex justify-between gap-3">
						<dt class="text-slate-500">Last Used</dt>
						<dd class="text-slate-800">{formatDateTime(key.lastUsedAt)}</dd>
					</div>
				</dl>
				<button
					type="button"
					class="mt-4 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
					onclick={() => onRevoke(key.id)}
					disabled={Boolean(key.revokedAt) || revokingKeyId === key.id}
				>
					{#if revokingKeyId === key.id}
						<span
							class="inline-block h-3 w-3 animate-spin rounded-full border-2 border-rose-300 border-t-rose-700"
							in:scale={{ duration: 120, start: 0.8 }}
							out:fade={{ duration: 90 }}
						></span>
					{/if}
					{revokingKeyId === key.id ? '폐기 중...' : '폐기'}
				</button>
			</article>
		{/each}
	{/if}
</div>

<div class="relative mt-6 hidden overflow-hidden rounded-2xl border border-slate-200 md:block">
	{#if loadingKeys && apiKeys.length > 0}
		<div
			class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-[1px]"
			in:fade={{ duration: 140 }}
			out:fade={{ duration: 120 }}
		>
			<div
				class="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs text-slate-700 shadow"
				in:scale={{ duration: 140, start: 0.92 }}
			>
				<span
					class="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700"
				></span>
				<span>목록 갱신 중</span>
			</div>
		</div>
	{/if}
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
					<td colspan="6" class="px-4 py-6 text-center text-slate-500">등록된 API 키가 없습니다.</td
					>
				</tr>
			{:else}
				{#each apiKeys as key (key.id)}
					<tr>
						<td class="px-4 py-3 font-mono text-xs">{key.prefix}</td>
						<td class="px-4 py-3">{key.label ?? '-'}</td>
						<td class="px-4 py-3">{formatDateTime(key.createdAt)}</td>
						<td class="px-4 py-3">{formatDateTime(key.lastUsedAt)}</td>
						<td class="px-4 py-3">
							{#if key.revokedAt}
								<span
									class="rounded-full bg-slate-200 px-2 py-1 text-xs font-medium text-slate-700"
									in:fade={{ duration: 120 }}
									out:fade={{ duration: 100 }}>Revoked</span
								>
							{:else}
								<span
									class="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700"
									in:fade={{ duration: 120 }}
									out:fade={{ duration: 100 }}>Active</span
								>
							{/if}
						</td>
						<td class="px-4 py-3">
							<button
								type="button"
								class="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-rose-300 px-3 py-1 text-xs font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
								onclick={() => onRevoke(key.id)}
								disabled={Boolean(key.revokedAt) || revokingKeyId === key.id}
							>
								{#if revokingKeyId === key.id}
									<span
										class="inline-block h-3 w-3 animate-spin rounded-full border-2 border-rose-300 border-t-rose-700"
										in:scale={{ duration: 120, start: 0.8 }}
										out:fade={{ duration: 90 }}
									></span>
								{/if}
								{revokingKeyId === key.id ? '폐기 중...' : '폐기'}
							</button>
						</td>
					</tr>
				{/each}
			{/if}
		</tbody>
	</table>
</div>

{#if isAuthenticated && totalApiKeys > 0}
	<div
		class="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
	>
		<p>
			총 {totalApiKeys}개 중 {visibleStart}-{visibleEnd} 표시
		</p>
		{#if shouldShowPagination}
			<div class="flex items-center gap-2">
				<button
					type="button"
					class="inline-flex cursor-pointer items-center rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
					onclick={goToPreviousPage}
					disabled={!hasPreviousPage || loadingKeys}
				>
					이전
				</button>
				<span class="min-w-20 text-center text-xs text-slate-600"
					>{currentPage} / {totalPages || 1}</span
				>
				<button
					type="button"
					class="inline-flex cursor-pointer items-center rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
					onclick={goToNextPage}
					disabled={!hasNextPage || loadingKeys}
				>
					다음
				</button>
			</div>
		{/if}
	</div>
{/if}
