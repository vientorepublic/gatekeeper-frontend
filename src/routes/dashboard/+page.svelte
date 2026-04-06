<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import {
		authStore,
		clearSession,
		getAuthSnapshot,
		initializeAuthState
	} from '$lib/auth/auth-client';
	import {
		createApiKey,
		type ApiKeyItem,
		fetchApiKeys,
		fetchNamespaces,
		revokeApiKeyById
	} from '$lib/api/auth-api';
	import TopNavigation from '$lib/components/top-navigation.svelte';
	import { formatDateTime } from '$lib/utils/date';
	import { onMount } from 'svelte';

	let loadingNamespaces = $state(false);
	let loadingKeys = $state(false);
	let issuingKey = $state(false);
	let revokingKeyId = $state<string | null>(null);
	let copyingIssuedKey = $state(false);
	let bootstrappingDashboard = $state(true);
	let errorMessage = $state('');
	let noticeMessage = $state('');

	let namespaces = $state<string[]>([]);
	let selectedNamespace = $state('');
	let apiKeys = $state<ApiKeyItem[]>([]);
	let newLabel = $state('');
	let issuedPlainKey = $state('');
	let keyCopied = $state(false);

	const user = $derived($authStore.user);
	const isAuthenticated = $derived(
		Boolean($authStore.gatewayAccessToken) && $authStore.user !== null
	);
	const isBusy = $derived(
		loadingNamespaces || loadingKeys || issuingKey || copyingIssuedKey || Boolean(revokingKeyId)
	);

	onMount(async () => {
		try {
			initializeAuthState();
			const snapshot = getAuthSnapshot();

			if (!snapshot.gatewayAccessToken || !snapshot.user) {
				await goto(resolve('/'));
				return;
			}

			await loadNamespaces();

			if (selectedNamespace) {
				await loadApiKeys(selectedNamespace);
			}
		} finally {
			bootstrappingDashboard = false;
		}
	});

	async function handleSignOut(): Promise<void> {
		clearSession();
		apiKeys = [];
		issuedPlainKey = '';
		noticeMessage = '로그아웃되었습니다.';
		errorMessage = '';
		await goto(resolve('/'));
	}

	async function loadNamespaces(): Promise<void> {
		loadingNamespaces = true;
		try {
			namespaces = await fetchNamespaces();

			if (!selectedNamespace && namespaces.length > 0) {
				selectedNamespace = namespaces[0] as string;
			}
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Failed to load namespaces.';
		} finally {
			loadingNamespaces = false;
		}
	}

	async function loadApiKeys(namespace: string): Promise<void> {
		if (!isAuthenticated) {
			return;
		}

		loadingKeys = true;
		errorMessage = '';

		try {
			apiKeys = await fetchApiKeys(namespace);
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

		issuingKey = true;
		keyCopied = false;
		errorMessage = '';
		noticeMessage = '';

		try {
			const created = await createApiKey(selectedNamespace, newLabel);

			issuedPlainKey = created.apiKey;
			newLabel = '';
			noticeMessage = '새 API 키가 발급되었습니다. 아래 평문 키는 지금만 확인 가능합니다.';
			await loadApiKeys(selectedNamespace);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Failed to issue API key.';
		} finally {
			issuingKey = false;
		}
	}

	async function revokeApiKey(id: string): Promise<void> {
		if (!isAuthenticated || !selectedNamespace) {
			return;
		}

		const confirmed = window.confirm(
			'해당 API 키를 폐기하시겠습니까? 이 작업은 되돌릴 수 없습니다.'
		);
		if (!confirmed) {
			return;
		}

		revokingKeyId = id;
		errorMessage = '';

		try {
			await revokeApiKeyById(selectedNamespace, id);

			noticeMessage = 'API 키가 폐기되었습니다.';
			await loadApiKeys(selectedNamespace);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Failed to revoke API key.';
		} finally {
			revokingKeyId = null;
		}
	}

	async function copyIssuedKey(): Promise<void> {
		if (!issuedPlainKey) {
			return;
		}

		copyingIssuedKey = true;
		keyCopied = false;

		try {
			await navigator.clipboard.writeText(issuedPlainKey);
			keyCopied = true;
			noticeMessage = '발급된 키를 클립보드에 복사했습니다.';
		} catch {
			errorMessage = '클립보드 복사에 실패했습니다. 수동으로 복사해 주세요.';
		} finally {
			copyingIssuedKey = false;
		}
	}
</script>

<main class="min-h-screen bg-slate-50 text-slate-900">
	<TopNavigation {user} onSignOut={handleSignOut} />

	<div class="sr-only" aria-live="polite">
		{#if bootstrappingDashboard}
			대시보드 초기 데이터를 불러오는 중입니다.
		{:else if loadingKeys}
			API 키 목록을 새로 불러오는 중입니다.
		{:else if issuingKey}
			API 키를 발급하는 중입니다.
		{:else if revokingKeyId}
			API 키를 폐기하는 중입니다.
		{:else if loadingNamespaces}
			namespace 목록을 불러오는 중입니다.
		{:else}
			대시보드가 준비되었습니다.
		{/if}
	</div>

	<div class="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8" aria-busy={isBusy}>
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
				{#if $authStore.status === 'refreshing'}
					<span class="rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-800"
						>세션 리프레시 중...</span
					>
				{/if}
			</div>
		</section>

		{#if errorMessage}
			<div class="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-700">
				{errorMessage}
			</div>
		{/if}
		{#if noticeMessage}
			<div class="rounded-2xl border border-slate-300 bg-slate-100 p-4 text-sm text-slate-700">
				{noticeMessage}
			</div>
		{/if}

		<section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm" aria-busy={isBusy}>
			{#if bootstrappingDashboard}
				<div class="space-y-4">
					<div class="h-5 w-28 animate-pulse rounded bg-slate-200"></div>
					<div class="h-10 w-full animate-pulse rounded-xl bg-slate-200"></div>
					<div class="h-10 w-full animate-pulse rounded-xl bg-slate-200"></div>
					<div class="grid gap-3 md:grid-cols-2">
						<div class="h-22 animate-pulse rounded-2xl bg-slate-100"></div>
						<div class="h-22 animate-pulse rounded-2xl bg-slate-100"></div>
					</div>
				</div>
			{:else}
				<div class="flex flex-wrap items-end gap-3">
					<div class="flex min-w-55 flex-1 flex-col gap-2">
						<label class="text-sm font-medium text-slate-700" for="namespace">Namespace</label>
						<select
							id="namespace"
							class="rounded-xl border-slate-300 text-sm"
							bind:value={selectedNamespace}
							disabled={loadingNamespaces}
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
						class="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
						onclick={() => selectedNamespace && loadApiKeys(selectedNamespace)}
						disabled={!isAuthenticated || !selectedNamespace || loadingKeys || loadingNamespaces}
					>
						{#if loadingKeys}
							<span
								class="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-400 border-t-slate-700"
							></span>
						{/if}
						{loadingKeys ? '불러오는 중...' : '목록 새로고침'}
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
						class="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
						onclick={issueApiKey}
						disabled={!isAuthenticated || !selectedNamespace || issuingKey}
					>
						{#if issuingKey}
							<span
								class="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-200 border-t-white"
							></span>
						{/if}
						{issuingKey ? '발급 중...' : 'API 키 발급'}
					</button>
				</div>

				{#if issuedPlainKey}
					<div
						class="mt-4 rounded-2xl border border-slate-300 bg-slate-100 p-4 text-sm text-slate-800"
					>
						<p class="font-semibold">발급된 평문 API 키 (한 번만 표시)</p>
						<p class="mt-2 font-mono text-xs break-all sm:text-sm">{issuedPlainKey}</p>
						<div class="mt-3 flex items-center gap-3">
							<button
								type="button"
								class="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
								onclick={copyIssuedKey}
								disabled={copyingIssuedKey}
							>
								{#if copyingIssuedKey}
									<span
										class="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700"
									></span>
								{/if}
								{copyingIssuedKey ? '복사 중...' : '키 복사'}
							</button>
							{#if keyCopied}
								<p class="text-xs text-emerald-700">복사 완료</p>
							{/if}
						</div>
					</div>
				{/if}

				<div class="relative mt-6 grid gap-3 md:hidden">
					{#if loadingKeys && apiKeys.length > 0}
						<div
							class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/70 backdrop-blur-[1px]"
						>
							<div
								class="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs text-slate-700 shadow"
							>
								<span
									class="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700"
								></span>
								<span>목록 갱신 중</span>
							</div>
						</div>
					{/if}
					{#if !isAuthenticated}
						<div
							class="rounded-2xl border border-slate-200 bg-white p-4 text-center text-slate-500"
						>
							로그인 후 API 키를 관리할 수 있습니다.
						</div>
					{:else if apiKeys.length === 0}
						<div
							class="rounded-2xl border border-slate-200 bg-white p-4 text-center text-slate-500"
						>
							등록된 API 키가 없습니다.
						</div>
					{:else}
						{#each apiKeys as key (key.id)}
							<article class="rounded-2xl border border-slate-200 bg-white p-4">
								<div class="flex items-center justify-between">
									<p class="font-mono text-xs text-slate-700">{key.prefix}</p>
									{#if key.revokedAt}
										<span
											class="rounded-full bg-slate-200 px-2 py-1 text-xs font-medium text-slate-700"
											>Revoked</span
										>
									{:else}
										<span
											class="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700"
											>Active</span
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
									onclick={() => revokeApiKey(key.id)}
									disabled={Boolean(key.revokedAt) || revokingKeyId === key.id}
								>
									{#if revokingKeyId === key.id}
										<span
											class="inline-block h-3 w-3 animate-spin rounded-full border-2 border-rose-300 border-t-rose-700"
										></span>
									{/if}
									{revokingKeyId === key.id ? '폐기 중...' : '폐기'}
								</button>
							</article>
						{/each}
					{/if}
				</div>

				<div
					class="relative mt-6 hidden overflow-hidden rounded-2xl border border-slate-200 md:block"
				>
					{#if loadingKeys && apiKeys.length > 0}
						<div
							class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-[1px]"
						>
							<div
								class="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs text-slate-700 shadow"
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
									<td colspan="6" class="px-4 py-6 text-center text-slate-500"
										>등록된 API 키가 없습니다.</td
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
													>Revoked</span
												>
											{:else}
												<span
													class="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700"
													>Active</span
												>
											{/if}
										</td>
										<td class="px-4 py-3">
											<button
												type="button"
												class="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-rose-300 px-3 py-1 text-xs font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
												onclick={() => revokeApiKey(key.id)}
												disabled={Boolean(key.revokedAt) || revokingKeyId === key.id}
											>
												{#if revokingKeyId === key.id}
													<span
														class="inline-block h-3 w-3 animate-spin rounded-full border-2 border-rose-300 border-t-rose-700"
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
			{/if}
		</section>
	</div>
</main>
